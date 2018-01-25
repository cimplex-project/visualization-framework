nds_isi_Connector.filter = {
	/**
	 * filter nodes
	 */
	nodes(node, viewName) {
		// TODO: is this limit sensible? should it be user defined or specified
		// somewhere more prominent?
		return CRXFILTER.currentData.states[+node.properties.id] > 0.1;
	},

	/**
	 * filter links
	 */
	links(link, viewName) {
		return true;
	}
};
