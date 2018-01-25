
/**
 * Map a value to a link width in [0.0, infinity]
 */
nds_isi_Connector.mapLinkWidth = (min, max) => {
	// all links have the same weight
	return () => 0.5;
};

/**
 * Map a value to a link opacity value in [0.0, 1.0]
 */
nds_isi_Connector.mapLinkOpacity = (min, max) => {
	// all links have the same weight
	return () => 0.2;
};
