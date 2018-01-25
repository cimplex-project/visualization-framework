/**
 * This file contains code for color and other visual mappings.
 *
 * Mapping functions are provided by the connectors and are cached here for
 * better performance.
 *
 * Mapping is only the constructor, the global variable MAPPING has to be
 * used in order to access mapping functions.
 */
class Mapping {
	constructor() { }

	/**
	 * cache RGB colors additionally to hex codes (since canvas views need RGB)
	 */
	communityRGBcachedConstructor() {
		// 18 is the number of colors (see connectorType.js)
		const colors = new Array(18).fill(0).map((d, i) => {
			const { r, g, b } = lib.hexColorToRGB(this.communityColor(i));
			return `rgba(${r}, ${g}, ${b},`;
		});
		colors[-1] = CONFIG.UI.darkTheme ? "rgba(255,255,255," : "rgba(0,0,0,";
		return community => colors[community % colors.length];
	};

	/**
	 * Sets the current connector, since it contains the various mapping functions.
	 */
	setConnector(c) {
		this.connector = c;
	}

	/**
	 * Updates mappings for the current filter, since min, max, etc. might have
	 * changed and therefore the mappings have to be adapted.
	 */
	update(data) {
		if (
			!CONNECTOR
			|| !CONNECTOR.mapNodeColor
			|| !CONNECTOR.mapNodeRadius
			|| !CONNECTOR.mapNodeOpacity
			|| !CONNECTOR.mapLinkWidth
			|| !CONNECTOR.mapLinkOpacity
			|| !CONNECTOR.mapCommunityColor
		) {
			// connector not yet ready when page first loads
			return;
		}

		// get current and total maximum node value
		const currentMax = data.states ? data.maxState : data.transitionsPerRegion.max;
		const totalMax = data.model.additionalData.max || currentMax;

		// console.log(`max ${currentMax} tmax ${totalMax}`);

		// create node color mapping for current and total maximum
		this.nodeColor = CONNECTOR.mapNodeColor(0, currentMax);
		this.nodeColorTotal = CONNECTOR.mapNodeColor(0, totalMax);
		this.nodeRadius = CONNECTOR.mapNodeRadius(0, currentMax);
		this.nodeOpacity = CONNECTOR.mapNodeOpacity(0, currentMax);

		// links
		this.linkWidth = CONNECTOR.mapLinkWidth(data.transitionWeights.min, data.transitionWeights.max);
		this.linkOpacity = CONNECTOR.mapLinkOpacity(data.transitionWeights.min, data.transitionWeights.max);

		// communities
		this.communityColor = CONNECTOR.mapCommunityColor();
		this.communityRGBcached = this.communityRGBcachedConstructor();

		this.timelineGradient = CONNECTOR.mapNodeColor(0, 100);
	}
}
