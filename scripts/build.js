/**
 * This file provides a build system for Node.js.
 * Instruction are found in README.txt.
 *
 * All files included in the build have to be specified in the lists below.
 */

const concat = require("concat");
const UglifyJS = require("uglify-es");
const fs = require("fs");

// list of library and misc. files to include
const files = [
    "./lib/dfkiDecoder/srdecoder.js",
    "./lib/dfkiDecoder/gleamviz.js",
    "./lib/WebWorkerPool/WebWorkerPool.js",
    "./lib/lib.js",
    "./controller/globalVars.js",
    "./lib/ui.js",
    "./lib/vectorSimilarity/levenshteinSimilarity.js",
    "./types/_regionType.js",
    "./types/_transitionType.js",
    "./types/_connectorType.js",
    "./connector/visframework/visframework_connector.js",
    "./types/_broadcaster.js",
    "./types/_viewType.js",
    "./config/config.js",
    "./dataModel/filteredData.js",
    "./dataModel/aggregator.js",
    "./dataModel/model.js",
    "./dataModel/filter.js",
    "./controller/mapping.js",
    "./controller/init.js",
    "./views/settingsPanel/settingsPanel.js"
];

// list of files from connectors to include
const connectors = new Map([
    ["oag", ["./connector/oag/oag_connector.js"]],
    ["nasa", ["./connector/nasa/nasa_connector.js"]],
    ["eurostat", ["./connector/eurostat/eurostat_connector.js"]],
    ["grippenet", ["./connector/grippenet/grippenet_connector.js"]],
    ["mobility", [
        "./connector/mobility/mobility_connector.js",
    ]],
    ["graphml", [
        "./connector/graphml/graphml_connector.js",
    ]],
    ["author_network", [
        "./connector/author_network/author_network_connector.js",
    ]],
    ["cnr_data", [
        "./connector/cnr_data/cnr_data_connector.js"
    ]],
    ["nds_cnr", [
        "./connector/nds_cnr/nds_cnr_connector.js",
        "./connector/nds_cnr/nds_cnr_mapping.js",
        "./connector/nds_cnr/nds_cnr_settings.js",
        "./connector/nds_cnr/nds_cnr_tooltips.js"
    ]],
    ["nds_isi", [
        "./connector/nds_isi/nds_isi_connector.js",
        "./connector/nds_isi/nds_isi_filter.js",
        "./connector/nds_isi/nds_isi_mapping.js",
        "./connector/nds_isi/nds_isi_settings.js",
        "./connector/nds_isi/nds_isi_tooltips.js",
        "./connector/nds_isi/nds_isi_template_simulation.js"
    ]],
    ["abm_isifbk", [
        "./connector/abm_isifbk/abm_isifbk_connector.js",
        "./connector/abm_isifbk/abm_isifbk_mapping.js",
        "./connector/abm_isifbk/abm_isifbk_settings.js",
        "./connector/abm_isifbk/abm_isifbk_template_simulation.js"
    ]],
    ["dummy", [
        "./connector/dummy/dummy_connector.js"
    ]],
    ["dummy2", [
        "./connector/dummy2/dummy_connector2.js"
    ]]
]);

// list of files from views to include
const views = new Map([
    ["graph", [
        "./views/graph/graph.js"
    ]],
    ["timeline", [
        "./views/timeline/timeline.js"
    ]],
    ["map", [
        "./views/map/map.js",
        "./views/map/map_interaction.js"
    ]],
    ["scarfplot", [
        "./views/scarfplot/scarfplot.js"
    ]],
    ["matrix", [
        "./views/matrix/matrix.js"
    ]],
    ["filterInfo", [
        "./views/filterInfo/filterInfo.js"
    ]],
    ["globe", [
        "./views/globe/globe.js",
        "./views/globe/app.js"
    ]],
    ["wordCloud", [
        "./views/wordCloud/wordCloud.js"
    ]]
]);

// switch between normal and production build (minified)
const productionBuild = process.argv.includes("--production");
const connectorsToInclude = [];
const viewsToInclude = [];

// include all files in sub-arrays
if (process.argv.includes("--connectors")) {
    let idx = process.argv.indexOf("--connectors") + 1;
    while (process.argv[idx] && process.argv[idx][0] !== "-") {
        connectorsToInclude.push(process.argv[idx++]);
    }
} else {
    connectorsToInclude.push(...connectors.keys());
}

if (process.argv.includes("--views")) {
    let idx = process.argv.indexOf("--views") + 1;
    while (process.argv[idx] && process.argv[idx][0] !== "-") {
        viewsToInclude.push(process.argv[idx++]);
    }
} else {
    viewsToInclude.push(...views.keys());
}

connectorsToInclude.forEach(name => {
    if (connectors.has(name)) {
        files.push(...connectors.get(name));
    } else {
        console.error("unknown connector", name);
    }
});
viewsToInclude.forEach(name => {
    if (views.has(name)) {
        files.push(...views.get(name));
    } else {
        console.error("unknown view", name);
    }
});

// concatenate and minify all files
concat(files)
    .then((result) => {
        if (productionBuild) {
            const minified = UglifyJS.minify(result);
            minified.code = `${fs.readFileSync("./views/globe/fastlane.js", "utf8")} ${result}`;
            fs.writeFileSync("./dist/visframework.js", minified.code);
        } else {
            fs.writeFileSync("./dist/visframework.js", `${fs.readFileSync("./views/globe/fastlane.js", "utf8")} ${result}`);
        }
    });
