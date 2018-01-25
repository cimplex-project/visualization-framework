/**
 * contains functions, parameters and URLs necessary to retrieve data from a
 * server
 */
const oag_Connector = new Connector({
    name: "oag_data",
    title: "Flight Analytics Data",
    type: "data",
    description: "OAG",
    previewUrl: "./img/ic_explore_black_48dp_2x.png",
    supportedSimulations: ["nds_isi", "abm_isifbk"],
    supportedVisualizations: []
});

oag_Connector.showSettings = function () {
    if (typeof abm_isifbk_Connector !== "undefined") {
        abm_isifbk_Connector.filterDFKI = false;
    }
};;
