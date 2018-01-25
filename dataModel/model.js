/**
 * This class contains the data model used in this visualization tool.
 *
 * Selections, aggregations and maps are created and cached for increased performance.
 *
 * @param {serviceName, regions, transitions, states, additionalData, dataServiceParameters, networkName, directedTransitions, geographicNodes}
 */
class Model {
	constructor(param) {
		const states = param.states || null;
		const transitions = param.transitions || [];

		// parameters that were used to load data from a data service
		this.dataServiceParameters = param.dataServiceParameters;

		// custom data stored by the connector
		this.additionalData = param.additionalData || {};

		// common information about the data model
		this.properties = {
			serviceName: param.serviceName || "serviceName",
			networkName: param.networkName || "networkName",
			geographicNodes: param.geographicNodes || false,
			directedTransitions: param.directedTransitions || false,
			dynamicTransitions: param.dynamicTransitions || false,
			showRegionNames: param.showRegionNames || false
		};

		this.regions = param.regions || [];
		this.regionMap = new Map();

		this.transitions;
		this.transitionMap = new Map();

		// Preprocess regions and populate map
		this.regions.forEach(r => {
			if (this.properties.geographicNodes) {
				this.preprocessGeoRegion(r);
			}
			r.highlight = { h: false };
			this.regionMap.set(+r.properties.id, r);
		});

		// Preprocess transitions (if needed)
		// and populate map.
		this.transitions = transitions.map(t => {
			const tr = {
				id: +t.id,
				weight: +t.weight,
				oWeight: +t.weight,
				highlight: { h: false },
				startTimestamp: t.startTimestamp,
				endTimestamp: t.endTimestamp,
				source: this.regionMap.get(+t.sourceRegionId),
				target: this.regionMap.get(+t.targetRegionId),
				sourceRegionId: t.sourceRegionId,
				targetRegionId: t.targetRegionId,
				text: t.text
			};
			this.transitionMap.set(+t.id, tr);
			return tr;
		});

		/**
		 * Preprocessing steps for states.
		 */
		// aggregated data array, each entry looks like this: {<date> timestamp, <Array> amount}
		this.states;
		this.timeRange = [
			-8640000000000000,
			8640000000000000
		];

		if (states) {
			// set date ranges
			const minDate = lib.baseTimestamp;
			const maxDate = lib.addDays(minDate, states.length + 1);
			this.timeRange = [minDate, maxDate];
			this.states = states;
		}
	}

	/**
	 * Preprocessing steps for geographical regions such as computing
	 * geographical bounding boxes returns array of regions
	 */
	preprocessGeoRegion(r) {
		// calculate centroid
		r.properties.centroid = d3.geo.centroid(r);
		// calculate bounding box
		r.properties.bbox = d3.geo.bounds(r);
	}


	/**
	 * Serialization for [_broadcaster.js](..types/_broadcaster.js),
	 * so model can be shared between browser windows.
	 */
	serialize() {
		const clone = {
			additionalData: {},
			serviceName: this.properties.serviceName,
			networkName: this.properties.networkName,
			geographicNodes: this.properties.geographicNodes,
			directedTransitions: this.properties.directedTransitions,
			dynamicTransitions: this.properties.dynamicTransitions,
			showRegionNames: this.properties.showRegionNames,
			dataServiceParameters: this.dataServiceParameters
		};

		clone.transitions = this.transitions.map((transition) => {
			const result = {
				id: transition.id,
				text: transition.text,
				weight: transition.weight,
				sourceRegionId: transition.source.properties.id,
				targetRegionId: transition.target.properties.id
			};

			if (transition.endTimestamp) {
				result.endTimestamp = transition.endTimestamp;
			}

			if (transition.startTimestamp) {
				result.startTimestamp = transition.startTimestamp;
			}

			return result;
		});

		clone.regions = this.regions.map((region) => {
			const result = {
				properties: {
					code: region.properties.code,
					id: region.properties.id,
					name: region.properties.name
				}
			};

			if (region.geometry) {
				result.geometry = {
					coordinates: region.geometry.coordinates,
					type: region.geometry.type
				};
			}

			if (region.type) {
				result.type = region.type;
			}

			return result;
		});

		if (this.states) {
			clone.states = this.states.map((state) => {
				return {
					amount: state.amount,
					date: state.date
				};
			});
		}

		Object.assign(clone.additionalData, this.additionalData);

		return clone;
	};
}
