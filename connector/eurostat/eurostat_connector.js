/**
 * contains functions, parameters and URLs necessary to retrieve data from a
 * server
 */
const eurostat_Connector = new Connector({
    name: "eurostat_data",
    title: "Eurostat Data",
    type: "data",
    description: "Eurostat",
    previewUrl: "./img/ic_explore_black_48dp_2x.png",
    supportedVisualizations: [],
    supportedSimulations: ["abm_isifbk"]
});

eurostat_Connector.showSettings = function () {
    if (typeof abm_isifbk_Connector !== "undefined") {
        abm_isifbk_Connector.filterDFKI = false;
    }
};
