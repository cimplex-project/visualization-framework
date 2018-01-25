
/**
 * This class is used to save the currentFilter state.
 * Views should only access this data structure.
 */
class FilteredData {
	constructor(model, previous) {
		if (model) {
			this.model = model;
		}
		
		const prev = previous || {};

		// those are the properties meant for public access
		this.regions;
		this.regionMap;
		this.geographicBounds = prev.geographicBounds || null;
		this.finished = true;
		this.transitions;
		this.aggregatedTransitions;
		this.reducedTransitions;

		this.highlighted = {
			regions: [],
			transitions: []
		};

		this.transitionCount = {
			all: 0,
			reduced: 0
		};
		this.transitionsPerRegion = {
			min: Infinity,
			max: -Infinity,
			avg: null
		};
		this.transitionWeights = {
			min: Infinity,
			max: -Infinity,
			avg: null
		};

		this.states;
		this.maxState;
		this.iterationCount = 0;

		this.timeRange = prev.timeRange || [];
		this.communityCount = prev.communityCount || 1;

		// size of the timeline bins in ms (may be overwritten by AGGREGATOR)
		this.timeBinSize = prev.timeBinSize || lib.toMillis.day;

		/**
		 * Selects the transition and both target and source nodes
		 * and sets their flags for highlighting.
		 *
		 * @param id
		 *    the id of the transition being highlighted
		 */
		DISPATCH.on("startTransitionHighlight", id => {
			const t = this.model.transitionMap.get(+id);
			this.startHighlight(t);
			this.highlighted = {
				regions: [],
				transitions: [t]
			};
			// use map lookup for faster access
			[t.source, t.target].forEach(node => {
				node.highlight.h = true;
				this.highlighted.regions.push(node);
			});
			DISPATCH.onTransitionHighlight(id);
		});

		/**
		 * Selects multiple transitions and all target and source nodes
		 * and sets their flags for highlighting.
		 *
		 * @param ids
		 *    the ids of the transitions being highlighted
		 */
		DISPATCH.on("startTransitionHighlightMulti", ids => {
			this.highlightMode = true;
			this.clearHighlight();
			this.highlighted = {
				regions: [],
				transitions: []
			};
			ids.forEach(id => {
				const t = this.model.transitionMap.get(+id);
				t.highlight.h = true;
				this.highlighted.transitions.push(t);
			});
			DISPATCH.onTransitionHighlight(ids[0]);
		});

		/**
		 * Selects the region and all incoming and outgoing transitions
		 * and sets their flags for highlighting.
		 *
		 * @param id
		 * 	the id of the region being highlighted
		 */
		DISPATCH.on("startRegionHighlight", id => {
			// get region object from id
			const region = this.regionMap.get(+id);
			if (!region) {
				console.error(`undefined region for id ${id}`);
				return;
			}
			this.startHighlight(region);
			this.highlighted = {
				regions: [region],
				transitions: []
			};
			// highlight all transitions of this region
			[region.incTransitions, region.outTransitions].forEach(tr => {
				tr.forEach(d => {
					if (!d.highlight) {
						return;
					}

					d.highlight.h = true;
					this.highlighted.transitions.push(d);
				});
			});
			DISPATCH.onRegionHighlight(id);
		});

		/**
		 * Ends highlighting and clears all highlighting flags on all Elements.
		 */
		DISPATCH.on("endHighlight", () => {
			this.highlightMode = false;
			this.clearHighlight();
			this.highlighted = {
				regions: [],
				transitions: []
			};
			DISPATCH.onHighlightEnd();
		});
	}

	/**
	 * Calculates the geographic bounds of all selected regions.
	 */
	updateGeoBounds() {
		if (!this.model.properties.geographicNodes) {
			return this;
		}

		let minX = 180;
		let maxX = -180;
		let minY = 90;
		let maxY = -90;
		this.regions.forEach(r => {
			const bbox = r.properties.bbox;
			if (bbox[0][0] < minX) { minX = bbox[0][0]; }
			if (bbox[0][1] < minY) { minY = bbox[0][1]; }
			if (bbox[1][0] > maxX) { maxX = bbox[1][0]; }
			if (bbox[1][1] > maxY) { maxY = bbox[1][1]; }
		});
		// bounds are saved as lat lon
		this.geographicBounds = [
			[minY, minX],
			[maxY, maxX]
		];
		return this;
	}

	/**
	 * Updates the current (time filtered) state for each node
	 * and stores it in states.
	 */
	updateStates() {
		if (!(this.model.states && this.model.additionalData.allIterations)) {
			return this;
		}

		const interval = this.timeRange;
		const allStates = this.model.additionalData.allIterations;

		// get first and last iteration
		let first = 0;
		let last = this.model.states.length - 1;
		if (interval) {
			first = Math.max(0, Math.floor(lib.daysBetween(lib.baseTimestamp, interval[0])));
			last = Math.min(Math.floor(lib.daysBetween(lib.baseTimestamp, interval[1])), this.model.states.length) - 1;
		}

		if (first > last) {
			const t = first;
			first = last;
			last = t;
		}

		if (first < 0 || last >= allStates.length) {
			console.error(`invalid interval [${first}, ${last}] max. index is ${allStates.length - 1}`);
			console.error(this.timeRange);
			return this;
		}

		this.iterationCount = last - first + 1;

		const currentStates = new Array(this.model.regions.length).fill(0);
		// original edit by sax, refactored
		// convert status update: consider only the status at the last time instant of the interval
		if (this.model.additionalData.infectionModelDiscrete) {
			return this._populateStateArrayLast(currentStates, last);
		}
		return this._populateAggregatedStateArray(currentStates, first, last);
	}

	/**
	 * This function caluclates the state-array using the average state
	 * for the selected timespan.
	 *
	 * Do not alter the variable declerations from var to let/const
	 * there is a bug in chrome preventing optimization, so the resulting
	 * code runs much slower!
	 */
	_populateAggregatedStateArray(currentStates, first, last) {
		this.maxState = 0;
		// use forEach now as allIterations contains all arrays
		for (let i = first; i <= last; i++) {
			const status = this.model.additionalData.allIterations[i].status;
			if(typeof status === "Array") {
				status.forEach((value, index) => {
					currentStates[index] += value;
					if (value > this.maxState) {
						this.maxState = value;
					}
				});
			} else {
				// handle objects too
				for(let index in status) {
					const value = status[index];
					currentStates[index] += value;
					if (value > this.maxState) {
						this.maxState = value;
					}
				}
			}
		}

		// divide by number of iterations
		if (this.iterationCount === 0) {
			// do not divide by 0!
			return;
		}

		// or rather multiply inverse
		const multiplier = 1 / this.iterationCount;
		currentStates.forEach((t, i, arr) => {
			arr[i] *= multiplier;
		});
		this.states = currentStates;
		return this;
	}

	/**
	 * Calculates the state array, only looking at the last state
	 * in the given time span.
	 */
	_populateStateArrayLast(currentStates, last) {
		const status = this.model.additionalData.allIterations[last].status;
		this.maxState = -1;
		for (let j = 0; j < currentStates.length; j++) {
			if (this.maxState < status[j]) {
				this.maxState = status[j];
			}
		}
		this.states = status;
		return this;
	}

	/**
	 * Runs commnity detection and updates the community attribute of all nodes.
	 * Stores the number of detected communities in this.communityCount.
	 */
	updateCommunities() {
		const nodes = this.regions;
		const links = this.reducedTransitions;
		// convert data-structure for jLouvain
		const nodes2 = [];
		const links2 = [];
		const nodesRemap = [];

		nodes.forEach((node, index) => {
			nodes2[index] = index;
			nodesRemap[node.properties.id] = index;
		});

		links.forEach((edge, index) => {
			const sid = edge.source.properties.id;
			const tid = edge.target.properties.id;
			links2[index] = {
				source: nodesRemap[sid],
				target: nodesRemap[tid],
				weight: Math.sqrt(edge.weight * 10) / 3.0
			};
		});

		// only do this if community detection is enabled in config
		// calculate communities
		const community_assignment_result = CONFIG.filter.showCommunities ? jLouvain().nodes(nodes2).edges(links2)() : null;

		// apply communities
		let max = 0;
		for (let i = 0; i < nodes2.length; i++) {
			const community = community_assignment_result ? community_assignment_result[i] : 0;
			nodes[i].community = community;
			max = community > max ? community : max;
		}

		// save number of communities
		// 0 is valid too
		this.communityCount = max + 1;
	}

	/**
	 * Sets transitions and reduces them to one representing transtion per
	 * source - target pair.
	 */
	setTransitions(transitions) {
		this.transitions = transitions;
		// reduce transitions between the same nodes
		this.reducedTransitions = this.reduceTransitions();
		this.transitionCount = {
			all: transitions.length,
			reduced: this.reducedTransitions.length
		};
		return this;
	};

	/**
	 * Sets the Regions and calculates a Map for faster lookups.
	 */
	setRegions(regions) {
		this.regions = regions;
		// create map and reset values
		const map = new Map();
		const len = this.regions.length;
		for (let i = 0; i < len; i++) {
			regions[i].highlight = {
				h: false
			};
			const index = +this.regions[i].properties.id;
			map.set(index, this.regions[i]);
		}
		this.regionMap = map;
		return this;
	}

	/**
	 * Updates the number of all transitions that are connected to a region,
	 * for all regions. Updates region objects directly.
	 *
	 * CONFIG.filter.transitionCountMode determines the mode:
	 * only get transitions to region, from region, or both.
	 */
	updateRegions() {
		this.regions.forEach(r => {
			r.properties.transitionNumber = 0;
			r.outTransitions = [];
			r.incTransitions = [];
		});

		this.transitions.forEach(tr => {
			// go through all selected transitions and update region.transitionNumber attributes
			// skip in or outgoing transitions dependent on CONFIG
			let s;
			if (CONFIG.filter.transitionCountMode !== "in") {
				s = tr.source;
				s && s.properties.transitionNumber++;
			}
			if (CONFIG.filter.transitionCountMode !== "out") {
				const t = tr.target;
				t && t !== s && t.properties.transitionNumber++;
			}
		});

		this.reducedTransitions.forEach(tr => {
			tr.source.outTransitions.push(tr);
			tr.target.incTransitions.push(tr);
		});

		// set min max and average values
		let min = Infinity;
		let max = 0;
		let sum = 0;
		let num = 0;
		this.regions.forEach(item => {
			if (item.properties.transitionNumber > max) {
				max = item.properties.transitionNumber;
			}
			if (item.properties.transitionNumber < min) {
				min = item.properties.transitionNumber;
			}
			sum += item.properties.transitionNumber;
			num++;
		});
		this.transitionsPerRegion = {
			max: max,
			min: min,
			avg: num > 0 ? sum / num : 0
		};
		return this;
	}

	/**
	 * Updates the timeline data (this.states) when states are shown.
	 *
	 * this.states is an array that consists of objects {<string> date, <Array> amount}.
	 */
	updateTimelineData() {
		if (!this.model.additionalData || !this.model.additionalData.allIterations) {
			return;
		}
		// states are saved incrementally, so we need to keep the last known value
		const nodesState = [];
		const lastKnownState = [];
		const nodes = this.model.regions.length;
		const beginDate = this.model.timeRange[0];
		this.model.additionalData.allIterations.forEach((iter, i) => {
			//TODO: quick hack for cnr cognitive opinion dynamic
			const n = !this.model.additionalData.infectionModelDiscrete && !this.model.additionalData.infectionModel ? [0, 0] : [0, 0, 0];
			const iteration = iter.status;

			// sum over all nodes
			this.regions.forEach(region => {
				// get state
				const j = region.properties.id;
				let state = iteration[j];
				if (state === null || state === undefined) {
					lastKnownState[j] = lastKnownState[j] || 0;
					state = lastKnownState[j];
				} else {
					lastKnownState[j] = state;
				}

				// add state to sum
				if (!this.model.additionalData.infectionModelDiscrete) {
					// for continuous models like cognitive opinion dynamics,
					// values just added up
					n[1] += state;
				} else {
					// models with concrete integer values are sorted into arrays
					n[state]++;
				}
			});
			nodesState[i] = {
				amount: n,
				// set a pseudo date
				date: lib.addDays(beginDate, i)
			};
		});

		this.timeStates = nodesState;
	}

	/**
	 * Reduces transitions into a single transition per source-target pair.
	 *
	 * Reduced transitions are sorted by weight descending to allow easy splicing,
	 * if we want to limit the number of drawn transitions.
	 *
	 * If directed is true (default is false), edges are considered different if
	 * source and target are switched.
	 *
	 * this.model.properties.directedTransitions specifies if the network is
	 * directed or not. In case of directed transitions, they are not aggregated
	 * if they share the same regions but differ in direction.
	 * For undirected transitions only the regions are considered, is does not
	 * matter which one is the source region.
	 */
	reduceTransitions() {
		const directed = this.model.properties.directedTransitions;
		const transitions = this.transitions;
		const map = new Map();

		transitions.forEach(t => {
			const sid = t.source.properties.id;
			const tid = t.target.properties.id;
			let key = `${sid} ${tid}`;
			let contained = map.has(key);
			// if transitions are undirected, also try the opposite pair of regions
			if (!contained && !directed) {
				key = `${tid} ${sid}`;
				contained = map.has(key);
			}
			// if the pair of regions is not yet contained,
			// create a new map item
			if (!contained) {
				// reset references to reduced transitions
				t.transitions = [t];
				// reset weight of inserted nodes
				t.weight = t.oWeight;
				map.set(key, t);
				return;
			} else {
				// else update the existing item
				const item = map.get(key);
				// store reference to a transitions that are reduced into this one
				item.transitions.push(t);
				// update weight using original weights
				item.weight += t.oWeight;
			}
		});

		// write map to array and find min and max values
		let maxWeightTemp = 0.0;
		let minWeightTemp = Number.MAX_VALUE;
		const result = [];
		let sum = 0;
		for (const value of map.values()) {
			value.highlight = {
				h: false
			};
			result.push(value);
			// get max weight
			const weight = +value.weight;
			if (weight < minWeightTemp) {
				minWeightTemp = weight;
			}
			if (weight > maxWeightTemp) {
				maxWeightTemp = weight;
			}
			sum += weight;
		};
		// give filter min and max values
		this.transitionWeights = {
			min: minWeightTemp,
			max: maxWeightTemp,
			avg: sum / result.length
		};

		// sort results descending
		return result.sort((a, b) => b.weight - a.weight);
	}

	/**
	 * Clears the previous highlight states and sets the highlight
	 * flag on the primary target.
	 *
	 * @param item
	 *     a transition or region object from the current filter, the primary highlight target
	 */
	startHighlight(item) {
		this.highlightMode = true;
		this.clearHighlight();
		item.highlight.h = true;
	}

	/**
	 * Clears the highlight flag on all currently highlighted elements
	 */
	clearHighlight() {
		for (const x in this.highlighted) {
			this.highlighted[x].forEach(d => d.highlight.h = false);
		}
	};
}
