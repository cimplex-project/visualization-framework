/**
 * This file contains code for aggregation.
 *
 * AGGREGATOR.aggregate() aggregates items in discrete time bins
 *
 * AGGREGATOR.reduceTransitions() aggregates transitions with the same source
 * and target into a single transition
 */
const AGGREGATOR = {
	/**
	 * returns the size of a discrete time bin in ms
	 */
	getBinMs: (durationMillis, levelP) => {
		const level = levelP || (CONFIG.timeline.aggregationLevel == "model" ? CONNECTOR.aggregationLevel : CONFIG.timeline.aggregationLevel);
		switch (level) {
			case "minutes":
				return lib.toMillis.minute;
			case "hours":
				return lib.toMillis.hour;
			case "days":
				return lib.toMillis.day;
			case "auto": default:
				if (durationMillis < lib.toMillis.hour * 7) {
					// if < 7 hours: minutes
					return lib.toMillis.minute;
				} else if (durationMillis < lib.toMillis.day) {
					// if < 1 day: 5 minutes
					return lib.toMillis.minute * 5;
				} else if (durationMillis < lib.toMillis.day * 2) {
					// if < 3 days: 10 minutes
					return lib.toMillis.minute * 10;
				} else if (durationMillis < lib.toMillis.day * 8) {
					// if < 8 days: 30 min
					return lib.toMillis.minute * 30;
				} else if (durationMillis < lib.toMillis.day * 32) {
					// if < 32 days: hours
					return lib.toMillis.hour;
				} else if (durationMillis < lib.toMillis.day * 370) {
					// if < 370 days: 6 hours
					return lib.toMillis.hour * 6;
				} else if (durationMillis < lib.toMillis.year * 3) {
					// if < 3 years: days
					return lib.toMillis.day;
				} else {
					// else: years
					return lib.toMillis.year;
				}
		}
	},

	/**
	 * Calculates the time range of a collection of items.
	 *
	 * @param items
	 *     an array of objects with startTimestamp and endTimestamp attributes
	 */
	getTimeRange: (items, level) => {
		// determine the min and max date
		let minDate = Number.MAX_VALUE;
		let maxDate = -1;

		items.forEach(d => {
			let start = d.startTimestamp;
			let end = d.endTimestamp;
			if (start > end) {
				const t = start;
				start = end;
				end = t;
			}
			minDate = start < minDate ? start : minDate;
			maxDate = end > maxDate ? end : maxDate;
		});
		const duration = maxDate - minDate;
		// choose an appropriate aggregation level, depending on the data
		const deltaTimeMillis = AGGREGATOR.getBinMs(duration, level);

		// floor and ceil minDate and maxDate to fit bin sizes
		const rounded = lib.roundTimeInterval([minDate, maxDate], deltaTimeMillis);

		return {
			min: rounded[0],
			max: rounded[1] + deltaTimeMillis,
			binCount: Math.floor(duration / deltaTimeMillis),
			binSizeMs: deltaTimeMillis
		};
	},

	/**
	 * Aggregates items to a specified level of timespans.
	 */
	aggregate: (filteredData) => {
		const items = filteredData.transitions;
		const timeRange = AGGREGATOR.getTimeRange(items);
		if (
			items.length === 0
			|| (
				filteredData.model
				&& filteredData.model.properties
				&& !filteredData.model.properties.dynamicTransitions
			)
		) {
			return null;
		}

		const deltaTimeMillis = timeRange.binSizeMs;
		// store data
		filteredData.timeRange = [timeRange.min, timeRange.max];
		filteredData.timeBinSize = deltaTimeMillis;
		const aggregatedItems = [];
		// build aggregated items array
		for (let j = 0; j <= timeRange.binCount; j++) {
			aggregatedItems[j] = {
				date: new Date(j * deltaTimeMillis + timeRange.min),
				amount: 0
			};
		};
		// calculate the amount in the aggregatedItems
		items.forEach(item => {
			// calculated time-stamps to the indices in aggregatedItems.
			const start = Math.floor((item.startTimestamp - timeRange.min) / deltaTimeMillis);
			const end = Math.floor((item.endTimestamp - timeRange.min) / deltaTimeMillis);
			// add to each time-stamp which is overlapped by this item 1 to amount.
			if (CONFIG.timeline.aggregateOverTime) {
				for (let index = start; index <= end && index < aggregatedItems.length; index++) {
					aggregatedItems[index].amount++;
				}
			} else if (start < aggregatedItems.length) {
				aggregatedItems[start].amount++;
			}
		});
		return aggregatedItems;
	},

	/**
	 * Aggregates transitions to a specified level of timespans
	 *
	 * @param transitions
	 *    an array of objects with startDate and endDate attributes
	 */
	aggregateScarfplot: (regions, transitions, level = "auto") => {
		const timeRange = AGGREGATOR.getTimeRange(transitions, level);
		const minDate = timeRange.min;
		const maxDate = timeRange.max;
		const deltaTimeMillisInv = 1 / timeRange.binSizeMs;
		const binCount = timeRange.binCount + 2;
		// create an allIterations object as used in all views
		const allIterations = new Array(binCount);
		const statusObj = {};
		regions.forEach(r => {
			statusObj[+r.properties.id] = 0;
		});
		let maxState = 0;
		// prepare bin array
		for (let iter = 0; iter < binCount; iter++) {
			allIterations[iter] = {
				iteration: iter,
				status: Object.assign({}, statusObj)
			};
		}

		// fill bin array
		transitions.forEach(t => {
			const start = Math.floor((+t.startTimestamp - minDate) * deltaTimeMillisInv);
			const end = Math.floor((+t.endTimestamp - minDate) * deltaTimeMillisInv);
			const weight = +t.weight;
			for (let index = start; index <= end; index++) {
				const status = allIterations[index].status;
				status[t.sourceRegionId] += weight;
				status[t.targetRegionId] += weight;
				maxState = status[t.sourceRegionId] > maxState ? status[t.sourceRegionId] : maxState;
				maxState = status[t.targetRegionId] > maxState ? status[t.targetRegionId] : maxState;
			};
		});

		return {
			allIterations: allIterations,
			max: maxState
		};
	}
};
