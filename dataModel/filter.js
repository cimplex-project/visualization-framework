/**
 * This file contains the implementation of a crossfilter-based filter.
 */

// subscribed events
DISPATCH.on("onTimelineBrushed.filter", (interval, finished) => CRXFILTER.applyFilter("time", { interval, finished }));
DISPATCH.on("onMapRectangleSelection.filter", rectangle => CRXFILTER.applyFilter("geoRange", rectangle));
DISPATCH.on("onRegionSelection.filter", regions => CRXFILTER.applyFilter("regions", { regions }));

/**
 * Data filter object using crossfilter.
 */
class Filter {
	constructor(model) {
		const filter = this;
		this.baseData = null;

		// filter history is saved as stack
		this.history = {
			stack: [],
			index: -1
		};

		this.model = model;

		this.transitions = {
			filter: crossfilter(model.transitions)
		};

		this.transitions.dimRegions = this.transitions.filter.dimension(d => {
			return {
				source: d.source.properties.id,
				target: d.target.properties.id
			};
		});

		if (this.model.properties.dynamicTransitions) {
			this.transitions.dimTime = this.transitions.filter.dimension(d => {
				return {
					start: d.startTimestamp || 0,
					end: d.endTimestamp || 0
				};
			});
		}

		this.regions = {
			filter: crossfilter(model.regions)
		};

		this.regions.dimCommunity = this.regions.filter.dimension(d => d);

		if (this.model.properties.geographicNodes) {
			this.regions.dimGeo = this.regions.filter.dimension(d => {
				// get centroid of all selected regions
				return {
					lat: d.properties.centroid[1],
					lng: d.properties.centroid[0]
				};
			});
		}

		// reset filter at initialization
		this.applyFilter("remove", {
			time: true,
			regions: true
		});
		filter.baseData = filter.history.stack[0];
	}

	/**
	 * Returns true if time is currently filtered.
	 */
	isTimeFiltered() {
		const current = this.currentData.timeRange;
		const whole = this.history.stack[0].timeRange;
		return current && (current[0] !== whole[0] || current[1] !== whole[1]);
	}

	/**
	 * Returns true if regions are currently filtered.
	 */
	isRegionsFiltered() {
		return this.currentData.regions.length < this.baseData.regions.length;
	}

	/**
	 * Returns true if the current filter is on the bottom of the filter history stack.
	 */
	isHistoryAtBottom() {
		return this.history.index == 0;
	}

	/**
	 * Returns true if the current filter is on the top of the filter history stack.
	 */
	isHistoryAtTop() {
		return this.history.index >= this.history.stack.length - 1;
	}

	/**
	 * A central place to call the other filter functions, so we can maintain a
	 * filter history.
	 * Handles undo and redo directly and calls a specialized function if a new
	 * filter is needed.
	 */
	applyFilter(type, data) {
		let event;
		let next;

		if (type === "undo") {
			if (this.isHistoryAtBottom()) {
				console.warn("HISTORY: Already at bottom");
				return;
			}
			next = this.history.stack[--this.history.index];
			event = next.event;
		} else if (type === "redo") {
			if (this.isHistoryAtTop()) {
				console.warn("FILTER: Already at top");
				return;
			}
			next = this.history.stack[++this.history.index];
			event = next.event;
		} else {
			next = this.createNewFilter(type, data);
			if (!next) {
				return;
			}

			// only push finished filter, no live updates on stack
			if (next.finished) {
				// remove invalid redo states
				this.history.stack = this.history.stack.slice(0, ++this.history.index);
				this.history.stack[this.history.index] = next;
			}
			event = next.event;
		}

		// count number of transitions for each region
		next.updateRegions()
			.updateStates();

		if (next.finished && type !== "time") {
			next.updateCommunities();
		}

		this.currentData = next;
		MAPPING.update(next);
		event[0].call(this, event.slice(1));
	}

	/**
	 * Creates a new filter.
	 */
	createNewFilter(type, data) {
		// get previous filter to copy initial attributes to new filter
		let prev = this.history.stack[this.history.index];

		// ugly workaround, timeline throws multiple filter on time events with the same range
		if (
			prev
			&& type === "time"
			&& data.interval[0] === prev.timeRange[0]
			&& data.interval[1] === prev.timeRange[1]
		) {
			return false;
		}

		let next = new FilteredData(this.model, prev);

		// get last element
		prev = prev || next;

		let funcP;
		// the filter Functions return a new FilteredData - Object
		switch (type) {
			case "regions":
				funcP = this.filterOnRegions;
				break;
			case "time":
				funcP = this.filterOnDateInterval;
				break;
			case "geoRange":
				funcP = this.filterOnGeoRange;
				break;
			case "remove":
				funcP = this.removeFilter;
				break;
			case "community":
				funcP = this.filterOnCommunity;
				break;
		}

		next = funcP.bind(this, data, prev, next).call();
		// the filtered items have to be aggregated for the timeline
		// only overwrite old data if successful
		next.aggregatedTransitions = AGGREGATOR.aggregate(next) || next.aggregatedTransitions;

		// save type
		next.type = type;
		return next;
	}

	/**
	 * Removes one or multiple filters.
	 *
	 * gets called with for example: dimensions = {time : true}
	 */
	removeFilter(dimensions, prev, next) {
		next.timeRange = dimensions.time ? this.model.timeRange : prev.timeRange;

		// reset filtered regions
		const regions = dimensions.regions ? this.model.regions : (prev.regions || this.model.regions);

		// apply new filters
		next = this.filterOnRegions({
			regions: regions,
			supressEvent: true
		}, prev, next);

		if (!next) {
			return false;
		}
		if (this.model.properties.dynamicTransitions) {
			next = this.filterOnDateInterval({
				interval: next.timeRange,
				finished: true,
				supressEvent: true
			},
				prev, next);
		}
		if (!next) {
			return false;
		}

		// DISPATCHING EVENTS FOR FILTER REMOVAL NOW CENTRALLY
		if (dimensions.time && dimensions.regions) {
			next.event = [DISPATCH.onFilterReset];
		} else if (dimensions.time) {
			next.event = [DISPATCH.onTimeFiltered, true];
		} else if (dimensions.regions) {
			next.event = [DISPATCH.onRegionFiltered];
		}

		return next;
	};

	/**
	 * Filters all region that belong to <community>.
	 * @param {*} community
	 * @param {*} prev
	 * @param {*} next
	 */
	filterOnCommunity(community, prev, next) {
		if (community === null) {
			return false;
		}

		this.regions.dimCommunity.filterAll();
		this.regions.dimCommunity.filter(d => d.community === community);
		const regions = this.regions.dimCommunity.top(Infinity);

		return this.filterOnRegions({
			regions: regions
		}, prev, next);
	};

	/**
	 * Time dependent filtering: transitions and events are filtered
	 * based on their start and end date
	 */
	filterOnDateInterval(data, prev, next) {
		if (!data.interval) {
			return false;
		}

		next.timeRange = data.interval;

		// reset filter
		if (this.model.properties.dynamicTransitions) {
			this.transitions.dimTime.filterAll();

			// filter transitions within the date interval
			if (data.interval) {
				const start = data.interval[0];
				const end = data.interval[1];
				// filter either on transitions that are completely or partially
				// inside the date interval
				let filterTime;
				if (CONFIG.filter.startAndEndSelected) {
					filterTime = d => {
						return d.start >= start && d.end <= end;
					};
				} else {
					filterTime = d => {
						return (d.start >= start && d.start <= end) || (d.end >= start && d.end <= end);
					};
				}
				this.transitions.dimTime.filter(filterTime);
			}
		}

		// save selected data
		const transitions = this.transitions.dimRegions.top(Infinity) || this.model.transitions;
		next.setTransitions(transitions);

		const t = next.regions || prev.regions;
		next.setRegions(t);

		// fire an event, "onTimeFiltered" so the map can update the
		// transition lines
		if (!data.supressEvent) {
			next.event = [DISPATCH.onTimeFiltered, data.finished, next.timeRange];
		}

		// update data for the timeline
		next.updateTimelineData();

		next.finished = data.finished;
		return next;
	}

	/**
	 * Space dependent filtering: regions are filtered based on
	 * a geographical rectangle and the position of their centroid
	 *
	 * @data {geoRange : } range to filter on
	 */
	filterOnGeoRange(data, prev, next) {
		// reset filter
		this.regions.dimGeo.filterAll();

		// get all regions inside the bounds
		const ne = data.bounds._northEast;
		const sw = data.bounds._southWest;

		// check if centroid of region is contained within the selected georange
		this.regions.dimGeo.filter(d => {
			return (d.lat >= sw.lat && d.lat <= ne.lat)
				&& (d.lng >= sw.lng && d.lng <= ne.lng);
		});

		// save selected regions for further filtering
		const regions = this.regions.dimGeo.top(Infinity);

		return this.filterOnRegions({ regions }, prev, next);
	}

	/**
	 * Region dependent filtering: transitions and events are filtered
	 * depending on their regions
	 *
	 * @data {regions : Array,
	 * 		supressEvent : boolean}
	 */
	filterOnRegions(data, previous, next) {
		next.setRegions(data.regions);
		this.transitions.dimRegions.filterAll();

		// if no regions specified, just reset the filter and return
		if (data.regions && data.regions.length) {
			// transitions
			// check if source and / or target region is in geoData
			// (for one region this would not be sensible)
			const sw = data.regions.length > 1;
			this.transitions.dimRegions.filter((t) => {
				const a = next.regionMap.has(+t.source);
				const b = next.regionMap.has(+t.target);
				return sw ? a && b : a || b;
			});
		}

		// sometimes it returns null even if we want all transitions
		const transitions = this.transitions.dimRegions.top(Infinity) || this.model.transitions;

		// save selected data in next Filter
		next.setTransitions(transitions);
		next.timeRange = next.timeRange.length ? next.timeRange : previous.timeRange;
		next.updateGeoBounds()
			.updateTimelineData();

		// fire an event so the timeline can show new data
		if (!data.supressEvent) {
			next.event = [DISPATCH.onRegionFiltered, data.regions];
		}

		return next;
	}
}
