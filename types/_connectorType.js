"use strict";
/**
 * This file contains code for a connector super class
 * from which all connectors are derived.
 */
/**
 * Constructor:
 *
 * Parameters are given as object with the following attributes.
 * [param] indicates optional parameters that will be set to default values if undefined.
 *
 * @param name
 *    the name will be used in DOM IDs and has to follow JS variable naming conventions
 *
 * @param title
 *    the title can contain any characters and HTML code
 *
 * @param [hiddenViews]
 *    the connector can specify the views that should be hidden
 *    (e.g. disable those not appropriate for the data)
 *    parameter is an array of view names: ["timeline", "map"]
 *    (default: [])
 *
 * @param [aggregationLevel]
 *    "auto": automatically, 0: minutes, 1: hours, 2: days
 *    (default: "auto")
 *
 * @param [timelinePlayerSteps]
 *    the number of steps (bin sizes) the timeline player proceeds each time
 *    (default: 1)
 */
class Connector {
	constructor(params) {
		// connector registers itself in a global list
		registerConnector(this);

		// general attributes
		this.name = params.name;
		this.title = params.title;
		this.description = params.description;

		// new settings panel parameters
		this.previewUrl = params.previewUrl;
		this.type = params.type; // "data", "simulation"
		this.supportedSimulations = params.supportedSimulations || [];
		this.supportedVisualizations = params.supportedVisualizations || ["visframework"];

		// description of region states
		this.stateValues = params.stateValues;

		// the connector can specify the views that should be shown
		this.hiddenViews = params.hiddenViews || [];

		// influencing model and view behavior
		this.aggregationLevel = params.aggregationLevel || "auto";
		this.timelinePlayerSteps = params.timelinePlayerSteps || 1;

		/**
		 * Defines filtering functions in order to omit specific items
		 *
		 * functions must return true for all items that should be displayed
		 */
		// TODO: do not encapsule in an object
		this.filter = {
			/**
			 * filter nodes
			 */
			nodes(node, viewName) {
				return true;
			},

			/**
			 * filter links
			 */
			links(link, viewName) {
				return true;
			}
		};

		/**
		 * Map a community id to a color
		 */
		this.communityColors = [
			"#2ca02c",
			"#17becf",
			"#8c564b",
			"#bcbd22",
			"#aec7e8",
			"#ff7f0e",
			"#ffbb78",
			"#98df8a",
			"#d62728",
			"#ff9896",
			"#9467bd",
			"#c5b0d5",
			"#c49c94",
			"#e377c2",
			"#f7b6d2",
			"#dbdb8d",
			"#9edae5",
			"#1f77b4"
		];

		/**
		 * The timeline may have multiple lines (one for each state attribute)
		 * Define their colors here.
		 */
		this.mapTimelineColors = ["#37a4c8", "#53af50", "#d5912a", "#778b92"];


		/**
		 * Descriptions for all data attributes
		 */
		this.tooltipDataAttributes = ["Number of transitions"];
	}

	/**
	 * Defines mapping functions in order to appropriately show data attributes
	 * They return a function which accepts a single argument
	 */

	/**
	 * Map a value to a node color index in [0, colorTable.length-1]
	 */
	mapNodeColor(min, max) {
		const colorTable = CONFIG.UI.darkTheme ? colorbrewer.Blues[9].slice(0).reverse() : colorbrewer.Oranges[9];
		const scale = d3.scale.pow().domain([min, max]).rangeRound([0, colorTable.length - 1]);
		return value => colorTable[scale(value)];
	}

	/**
	 * Map a value to a node radius in [0.0, infinity]
	 */
	mapNodeRadius(min, max) {
		if (max >= 1)
			return value => 1 + Math.sqrt(value / max) * 20;
		return () => 1;
	}

	/**
	 * Map a value to a node radius in [0.0, infinity]
	 */
	mapNodeOpacity(min, max) {
		return 1;
	}

	/**
	 * Map a value to a link width in [0.0, infinity]
	 */
	mapLinkWidth(min, max) {
		if (min >= max)
			return () => 1.0;
		if (max != 0) {
			if (max == 1)
				return value => 0.5 + value * 2.5;
			return value => 0.01 + Math.pow((value / max), 0.5) * 6.99;
		} else {
			return () => 0.5;
		}
	}

	/**
	 * Map a value to a link opacity value in [0.0, 1.0]
	 */
	mapLinkOpacity(min, max) {
		if (min >= max || max == 0) {
			return () => 0.25;
		}
		const alpha = 0.01;
		return value => (alpha + (value / max) ** 0.5 / (1 + alpha));
	}

	/**
	 * Assign each community a color.
	 */
	mapCommunityColor(numberOfCommunities) {
		const communityColors = this.communityColors;
		return id => communityColors[id % communityColors.length];
	}

	/**
	 * Tooltip text for a node, concerning attribute <attributeId>
	 * and displayed in <viewName>
	 */
	tooltipNode(item, attributeId, viewName) {
		return `${item.properties.name}<br>${item.properties.transitionNumber} transitions<br>community ${item.community}`;
	}

	/**
	 * Tooltip text for a link, concerning attribute <attributeId>
	 * and displayed in <viewName>
	 */
	tooltipLink(item, attributeId, viewName) {
		const source = item.source.properties.name;
		const target = item.target.properties.name;
		return `${source} &rarr; ${target}<br>weight: ${item.weight}`;
	}

	/**
	 * Retrieves all necessary data from server and create a new data model.
	 *
	 * @return
	 *    returns the created model
	 */
	getDataModel(settings) {
		// implement this function in order to retrieve and preprocess data and create a new data model
		alert(`${this.title} connector: getDataModel() not implemented!`);
	}

	/***
	 * Displays service settings in settingsPanel view.
	 */
	showSettings() {
		// implement this in order to show service specific settings
		const panel = d3.select("#networkParameterPanel");
		panel.selectAll("*").remove();
	}
}
