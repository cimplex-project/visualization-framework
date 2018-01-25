/**
 * contains functions, parameters and URLs necessary to retrieve data from a
 * server
 */
const cnr_data_Connector = new Connector({
    name: "cnr_data",
    title: "CNR Mobility Data",
    type: "data",
    description: "CNR",
    previewUrl: "./img/cnr.png",
    supportedSimulations: ["nds_cnr"],
    supportedVisualizations: []
});
