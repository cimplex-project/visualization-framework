/**
 * contains functions, parameters and URLs necessary to retrieve data from a
 * server
 */
const nasa_Connector = new Connector({
    name: "sedac_data",
    title: "SEDAC",
    type: "data",
    description: "NASA",
    previewUrl: "./img/ic_explore_black_48dp_2x.png",
    supportedSimulations: ["nds_isi", "abm_isifbk"],
    supportedVisualizations: []
});

nasa_Connector.showSettings = function () {
    if (typeof abm_isifbk_Connector !== "undefined") {
        abm_isifbk_Connector.filterDFKI = false;
    }
};
