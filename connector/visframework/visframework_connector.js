class VisframeworkConnector extends Connector {
    constructor(params) {
        super(params);

        this._synchronized = false;
        this._syncronizeAllViews = false;

        // called when a new channel was received
        DISPATCH.on("onNewChannel", (data) => {
            this.updateSettings();
        });

        // called when a channel was removed
        DISPATCH.on("onRemoveChannel", (data) => {
            this.updateSettings();
        });

        // called when hosting was started
        DISPATCH.on("onStartHosting", () => {
            const connector = document.querySelector(`input[value="visframework_data"]`)
            if (connector) {
                connector.parentNode.style.display = "none";
                if (typeof settingsPanelView !== "undefined") {
                    settingsPanelView.resetDataPanel();
                    settingsPanelView.resetSimulationsPanel();
                    settingsPanelView.resetVisualizationPanel();
                    settingsPanelView.setDataGraph();
                    settingsPanelView.setSimulationGraph();
                    $("#dataParameterPanel").empty();
                }
            }
        });

        DISPATCH.on("onChannelJoined", () => {
            const button = document.querySelector("#shareVisualizationButton");
            if (button) {
                button.parentElement.style.display = "none";
            }
        });

        DISPATCH.on("onChannelLeft", () => {
            const button = document.querySelector("#shareVisualizationButton");
            if (button) {
                button.parentElement.style.display = "block";
            }
        });

        DISPATCH.on("onStopHosting", () => {
            const connector = document.querySelector(`input[value="visframework_data"]`)
            if (connector) {
                connector.parentNode.style.display = "inline-block";
                if (typeof settingsPanelView !== "undefined") {
                    this.showSettings()
                }
            }
        });

        // called when a simulation is completed
        DISPATCH.on(`onSimulationCompleted`, () => {
            // check if the simulation was created using the synchronization connector
            if (typeof settingsPanelView !== "undefined") {
                if (settingsPanelView.selectedConnector === this) {
                    this._synchronized = true;
                } else {
                    this._synchronized = false;
                    // if the simulation was not created using the visframework connector
                    // leave the current channel.
                    if (broadcaster.getChannel()) {
                        broadcaster.leaveChannel()
                    }
                }
            }
        });

        DISPATCH.on(`reactivateView`, params => {
            if (this._synchronized && !this._syncronizeAllViews) {
                const singleView = document.querySelector("#synchronizeAllViews");
                let currentView = undefined;

                let hiddenViews = getRegisteredViews().filter(view => {
                    if (view.name === params[0]) {
                        currentView = view;
                    }

                    return CONNECTOR.hiddenViews.indexOf(view.name) === -1 &&
                        view.name !== params[0];
                });

                // hide all views except the current selected
                hiddenViews.forEach(view => {
                    DISPATCH.deactivateView([view.name]);
                });

                // maximize view
                if (typeof currentView !== "undefined") {
                    if (!currentView.maximized) {
                        currentView.maximize();
                    }
                }
            } else {
                getRegisteredViews()
                    .forEach(view => {
                        if (view.name !== "settingsPanel") {
                            if (view.maximized) {
                                view.deMaximize();
                            }
                        }
                    });
            }
        });
    }

    getDataModel(settings) {
        this._syncronizeAllViews = document.querySelector("#synchronizeAllViews").checked;

        const index = this._select[0][0].selectedIndex;
        broadcaster.joinChannel(broadcaster.channels[index]);
    }

    updateSettings() {
        if (typeof settingsPanelView !== "undefined") {
            if (typeof visframework_Connector !== "undefined") {
                if (settingsPanelView.selectedConnector === visframework_Connector) {
                    visframework_Connector.showSettings();
                }
            }
        }
    }

    showSettings() {
        $("#dataParameterPanel").empty();

        const box = d3.select("#dataParameterPanel");
        box.append("label")
            .text("Select Channel")
            .attr("for", "dataset")
            .attr("class", "col-sm-5");
        this._select = box.append("div")
            .attr("class", "col-sm-7")
            .append("select")
            .attr("id", "channelDatasetSelect")
            .attr("size", 1)
            .attr("name", "channel");
        for (let i = 0; i < broadcaster.channels.length; i++) {
            this._select.append("option")
                .attr("value", broadcaster.channels[i])
                .text(broadcaster.channels[i]);
        };

        box.append("label")
            .text("Synchronize All Views")
            .attr("class", "col-sm-5");
        this._checkbox = box.append("div")
            .attr("class", "col-sm-7")
            .append("input")
            .attr("type", "checkbox")
            .attr("id", "synchronizeAllViews")
            .append("select")
    }
};

const visframework_Connector = new VisframeworkConnector({
    name: "visframework_data",
    title: "Synchronized VF-Clients",
    type: "data",
    description: "DFKI + USTUTT",
    previewUrl: "./img/favicon.ico",
    hiddenViews: ["graph", "matrix", "scarfplot", "wordCloud", "timeline", "globe", "map", "filterInfo"],
    supportedSimulations: []
});
