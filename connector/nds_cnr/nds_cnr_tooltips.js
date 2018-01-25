/**
 * Defines the Strings used in tooltips depending on the data type and attributes
 */
/**
 * Tooltip text for a node, concerning attribute <attributeId>
 * and displayed in <viewName>
 */
ndlibConnector.tooltipNode = (item, attributeId, viewName) => {
	if (viewName === "scarfplot") {
		return item.properties.name;
	}
	const amount = CRXFILTER.currentData.states[item.properties.id];
	const community = CONFIG.filter.showCommunities ? `<br><br>community ${item.community}` : "";
	if (amount === 0) {
		return `${item.properties.name} - susceptible${community}`;
	} else if (amount === 1) {
		return `${item.properties.name} - infected${community}`;
	} else if (amount === 2) {
		return `${item.properties.name} - recovered${community}`;
	} else {
		return `${item.properties.name} - ${amount}${community}`;
	}
};

/**
 * Descriptions for all data attributes
 */
ndlibConnector.tooltipDataAttributes = ["Infected nodes", "Recovered nodes", "Susceptible nodes"];
