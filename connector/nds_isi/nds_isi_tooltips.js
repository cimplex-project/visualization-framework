/**
 * Defines the Strings used in tooltips depending on the data type and attributes
 */

/**
 * Tooltip text for a node, concerning attribute <attributeId>
 * and displayed in <viewName>
 */
nds_isi_Connector.tooltipNode = (item, attributeId, viewName) => {
	return `${item.properties.name}<br>code: ${item.properties.code}<br>community: ${item.community}<br>infected: ${CRXFILTER.currentData.states[item.properties.id].toFixed(4)}<br>transitions: ${item.properties.transitionNumber}`;
};
