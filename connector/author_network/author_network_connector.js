/**
 * This class contains functions, parameters and URLs necessary to
 * retrieve data from a server.
 */
class AuthorNetworkConnector extends Connector {
    constructor(params) {
        super(params);

        /**
         * Descriptions for all data attributes
         */
        this.tooltipDataAttributes = ["Number of papers"];

        // specify datasets and their names to include in the dropdown here
        this.datasets = ["author-network_10", "author-network_5", "author-network_2", "author-network_1"];
        this.baseUrl = "./connector/author_network/data/";
        // enable text appending in reduceTransitions()
        this.appendTextOnReduce = true;
    }

    /**
     * Retrieves all necessary data from server and create a new data model.
     */
    getDataModel(settings) {
        const dataset = settings.dataset;
        const urlAuthors = `${this.baseUrl + dataset}_authors.csv`;
        const urlPapers = `${this.baseUrl + dataset}_papers.csv`;

        // download authors
        d3.csv(urlAuthors, (d) => {
            return {
                properties: {
                    id: +d.id,
                    name: d.name2 ? `${d.name1}, ${d.name2}` : d.name1
                }
            };
        }, (error, authors) => {
            if (error) {
                UI.showAlert("No Data", "Cannot download author data. The service is not available.", "danger");
                console.error(error);
                return;
            }

            // download papers
            let id = 0;
            d3.csv(
                urlPapers,
                (d) => {
                    if (!+d.year1) {
                        console.log(d);
                    }
                    return {
                        id: id++,
                        sourceRegionId: +d.source,
                        targetRegionId: +d.target,
                        // remove HTML tags
                        text: d.title.replace(/<\/?[^>]+(>|$)/g, ""),
                        conference: d.conference.replace(/<\/?[^>]+(>|$)/g, ""),
                        weight: 1,
                        startTimestamp: new Date(+d.year1, 0, 1).getTime(),
                        endTimestamp: new Date(+d.year1, 11, 15).getTime()
                    };
                },
                (err, papers) => {
                    if (err) {
                        UI.showAlert("No Data", "Cannot download paper data. The service is not available.", "danger");
                        console.error(err);
                        return;
                    }

                    console.info("data received");

                    const param = {
                        serviceName: this.title,
                        regions: authors,
                        transitions: papers,
                        dynamicTransitions: true,
                        directedTransitions: false,
                        geographicNodes: false,
                        showRegionNames: true,
                        additionalData: AGGREGATOR.aggregateScarfplot(authors, papers),
                        dataServiceParameters: settings
                    };
                    CONFIG.filter.startAndEndSelected = false;
                    controller.connectorCallback(new Model(param));
                });
        });
    }


    /**
     * Display service settings in settingsPanel view
     */
    showSettings() {
        const box = d3.select("#dataParameterPanel");
        box.append("label")
            .text("Dataset")
            .attr("for", "dataset")
            .attr("class", "col-sm-5");
        const select = box.append("div").attr("class", "col-sm-7").append("select")
            .attr("id", "dataServiceDatasetSelect")
            .attr("size", 1)
            .attr("name", "dataset");
        for (let i = 0; i < this.datasets.length; i++) {
            select.append("option")
                .attr("value", this.datasets[i])
                .text(this.datasets[i]);
        };
    }

    /**
     * Map a value to a node radius in [0.0, infinity]
     */
    mapNodeRadius(min, max) {
        if (max !== 0 && max > 1) {
            return value => 2 + Math.sqrt(value / max) * 10;
        }
        return () => 5;
    }

    /**
     * Tooltip text for a node, concerning attribute <attributeId>
     * and displayed in <viewName>
     */
    tooltipNode(item, attributeId, viewName) {
        if (!item) {
            return;
        }

        // count papers (multiple links may represent the same paper)
        const transitions = item.incTransitions.concat(item.outTransitions);
        const map = new Map();
        transitions.forEach(x => {
            if (!map.has(x.text)) {
                map.set(x.text);
            }
        });

        const numPapers = map.size;

        let papers = "";
        if (viewName !== "scarfplot") {
            let i = 1;
            map.forEach((value, key) => {
                papers = `${papers}<br><br>${i++}) ${key}`;
            });
        }

        return `${item.properties.name}<br>community: ${item.community}<br>links: ${item.properties.transitionNumber}<br>papers: ${numPapers}${papers}`;
    }

    /**
     * Tooltip text for a link, concerning attribute <attributeId>
     * and displayed in <viewName>
     */
    tooltipLink(item, attributeId, viewName) {
        const rMap = CRXFILTER.currentData.model.regionMap;
        const names = [+ item.sourceRegionId, item.targetRegionId].map(
            id => rMap.has(id) ? rMap.get(id).properties.name : ""
        );
        // if this is a reduced transition, show text of all contained transitions
        if (item.transitions && item.transitions.length > 0) {
            let text = "";
            item.transitions.forEach((t, i) => {
                text += `<br><br>${i + 1}) ${t.text}`;
            });
            return `${names[0]} & ${names[1]}<br><br>papers: ${item.weight}${text}`;
        } else {
            return `${names[0]} & ${names[1]}<br><br>papers: ${item.weight}<br><br>${item.text}`;
        }
    }
}

const authorNetworkConnector = new AuthorNetworkConnector({
    name: "author_network",
    title: "Author Data",
    type: "data",
    description: "University of Stuttgart",
    previewUrl: "./img/ustutt.png",
    hiddenViews: ["globe", "map"]
});
