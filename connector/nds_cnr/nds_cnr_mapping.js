/**
 * Map a value to a node color index in [0, colorTable.length-1]
 */
ndlibConnector.mapNodeColor = (min, max, colorTable) => {
	const im = ndlibConnector.infectionModel;
	if (ndlibConnector.colorMaps && ndlibConnector.colorMaps[im]) {
		return (value) => ndlibConnector.colorMaps[im](value);
	}
};

/**
 * Map a value to a node radius in [0.0, infinity]
 */
ndlibConnector.mapNodeRadius = (min, max) => {
	return () => 4;
};

/**
 * Map a value to a link width in [0.0, infinity]
 */
ndlibConnector.mapLinkWidth = (min, max) => {
	return () => 0.5;
};

/**
 * Map a value to a link opacity value in [0.0, 1.0]
 */
ndlibConnector.mapLinkOpacity = (min, max) => {
	return () => 0.5;
};

/**
 * The timeline may have multiple lines (one for each state attribute)
 */
ndlibConnector.mapTimelineColors = [
	ndlibConnector.colors.infected,
	ndlibConnector.colors.recovered,
	ndlibConnector.colors.susceptible
];
