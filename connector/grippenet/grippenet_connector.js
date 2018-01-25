/**
 * contains functions, parameters and URLs necessary to retrieve data from a
 * server
 */


class GrippeNetConnector extends Connector {
    constructor(params) {
        super(params);
    }

    _processStates(data) {
        const nodesState = [],
            lastKnownState = [],
            beginDate = lib.baseTimestamp;

        for (let i = 0, numberOfIterations = data.additionalData.allIterations.length; i < numberOfIterations; i++) {
            const n = [0, 0];
            const iteration = data.additionalData.allIterations[i].status;

            // sum up node states
            for (let j = 0, nodes = data.additionalData.nodes; j < nodes; j++) {
                let state = iteration[j] <= 0 ? undefined : iteration[j];
                if (state == undefined) {
                    if (lastKnownState[j] == undefined) {
                        state = 0;
                    } else {
                        state = lastKnownState[j];
                    }
                } else {
                    lastKnownState[j] = state;
                }
                n[1] += state;
            }
            
            nodesState[i] = {
                amount: n,
                // set a pseudo date
                date: lib.addDays(beginDate, i)
            };
        }
        return nodesState;
    };

    _getData(response, body) {
        const iterations = [];

        // overwrite ids of geojson with continuous indices
        response.features.forEach((region, index) => {
            region.properties.id = index;
        });

        // process iterations
        for (let i = 0; i < body.numberOfDays; ++i) {
            const status = [];

            response.features.forEach(feature => {
                if (feature.properties.ili[i] > 0) {
                    status[feature.properties.id] = feature.properties.ili[i];
                }
            });

            iterations.push({
                iteration: i + 1,
                status
            });
        }

        return {
            additionalData: {
                startIteration: 1,
                start: 1,
                end: body.numberOfDays,
                simulationId: 666,
                allIterations: iterations,
                iterations: iterations.length,
                nodes: response.features.length,
                infectionModelDiscrete: false
            }
        }
    }

    /**
     * retrieve all necessary data from server and create a new data model
     */
    getDataModel(settings) {
        const startDate = document.getElementById("startDate").value;
        const numberOfDays = +document.getElementById("numberOfDays").value;
        const daysPerValue = +document.getElementById("daysPerValue").value;
   
        const body = {
            startDate,
            numberOfDays,
            daysPerValue
        }
        
        fetch("https://dfki-3061.dfki.de/vis/ilidata/calculate", {
                method: "post",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "X-Access-Token": $("#apiKey").val(),
                },
                body: JSON.stringify(body)
            })
            .then(response => response.json())
            .then(response => {

                const data = this._getData(response, body);
                const states = this._processStates(data)

                const param = {
                    serviceName: "grippenet",
                    regions: response.features,
                    states,
                    transitions: [],
                    additionalData: data.additionalData,
                    dynamicTransitions: false,
                    geographicNodes: true,
                    showRegionNames: false,
                    dataServiceParameters: settings
                };

                controller.connectorCallback(new Model(param));
            });
    }

    showSettings() {
        if (typeof abm_isifbk_Connector !== "undefined") {
            abm_isifbk_Connector.filterDFKI = true;
        }
        const box = d3.select("#dataParameterPanel");
        box.append("label")
            .text("Start Date")
            .attr("class", "col-sm-5");
        box.append("div").attr("class", "col-sm-3")
            .append("input")
            .attr("class", "form-control")
            .attr("id", "startDate")
            .attr("type", "date")
            .attr("value", "2017-12-01")
        box.append("label")
            .text("Number of Days")
            .attr("class", "col-sm-5");
        box.append("div").attr("class", "col-sm-3")
            .append("input")
            .attr("class", "form-control")
            .attr("id", "numberOfDays")
            .attr("type", "number")
            .attr("min", 1)
            .attr("max", 30)
            .attr("value", 30)
        box.append("label")
            .text("Days per Value")
            .attr("class", "col-sm-5");
        box.append("div").attr("class", "col-sm-3")
            .append("input")
            .attr("class", "form-control")
            .attr("id", "daysPerValue")
            .attr("type", "number")
            .attr("min", 1)
            .attr("max", 21)
            .attr("value", 14)
        box.append("label")
            .text("API Key")
            .attr("class", "col-sm-5");
        box.append("div").attr("class", "col-sm-3")
            .append("input")
            .attr("class", "form-control")
            .attr("id", "apiKey")
            .attr("value", "insert valid api key")
    };
}

const grippenet_Connector = new GrippeNetConnector({
    name: "grippenet_data",
    title: "GrippeNET Data",
    type: "data",
    description: "ISI + DFKI + ETH",
    previewUrl: "./img/grippenet.png",
    supportedSimulations: ["abm_isifbk"],
    hiddenViews: ["graph", "matrix", "scarfplot", "wordCloud"]
});