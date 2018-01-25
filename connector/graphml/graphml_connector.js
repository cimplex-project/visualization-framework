/**
 * This class contains functions, parameters and URLs necessary to
 * retrieve data from a server.
 */
class GraphMlConnector extends Connector {
	constructor(params) {
		super(params);
	}

	/**
	 * retrieve all necessary data from server and create a new data model
	 */
	getDataModel(settings) {
		const dataset = settings.dataset;
		// request data
		$.when(
			$.ajax({
				method: "GET",
				url: $("#graphMlUrl").val(),
				crossDomain: true,
				data: {
					"dataset": dataset
				},
				cache: false
			})
		).then(
			(graphData) => {
				console.info("data received");
				localStorage.setItem("graphMlUrl", $("#graphMlUrl").val());

				let parser;
				if (typeof window.DOMParser != "undefined") {
					parser = function (xmlStr) {
						return (new window.DOMParser()).parseFromString(xmlStr, "text/xml");
					};
				} else {
					UI.showAlert("No XML Parser found", "Browsers without XML parser are not supported.", "danger");
					return;
				}

				const xml = parser(graphData);

				// if there are multiple graphs, they are merged into one
				const graphs = xml.getElementsByTagName("graph");

				if (graphs.length > 1) {
					// if multigraphs are used, show merge info
					UI.showAlert("Multi-Graph Detected", "All graphs will be merged into one graph.", "info");
				}

				const nodes = [];
				const links = [];

				// separate nodes and links
				for (let i = 0; i < graphs.length; i++) {
					let graph = graphs[i];
					for (let x of graph.children) {
						if (x.tagName === "node") {
							nodes.push(x);
						} else if (x.tagName === "edge") {
							links.push(x);
						}
					}
				}

				// preprocess and analyse
				const dataKeys = this.readDataKeys(xml);
				const dataProps = this.getDataProperties(graphs, nodes, links);
				const { nodesPrep, nameIdMap } = this.preprocessNodes(nodes, dataKeys);
				const linksPrep = this.preprocessLinks(
					links,
					nameIdMap,
					dataProps.graphDirectedDefault,
					dataProps.directedTransitions,
					dataKeys
				);

				// create model and callback
				const data = {
					serviceName: this.title,
					regions: nodesPrep,
					transitions: linksPrep,
					dynamicTransitions: dataProps.dynamicTransitions,
					directedTransitions: dataProps.directedTransitions,
					geographicNodes: dataProps.geographicNodes,
					showRegionNames: true,
					dataServiceParameters: settings
				};
				controller.connectorCallback(new Model(data));
			},
			() => UI.showAlert("No Data", "The service at this URL is not available.", "danger")
			);
	}

	/**
	 * Parses data attribute keys.
	 * http://graphml.graphdrawing.org/primer/graphml-primer.html#AttributesExample
	 *
	 * @return a map key.id -> key
	 */
	readDataKeys(xml) {
		// TODO:
		const keyMap = new Map();
		let keys = xml.getElementsByTagName("key");
		for (let x of keys) {
			keyMap.set(x.id, {
				id: x.getAttribute("id"),
				for: x.getAttribute("for"),
				attrname: x.getAttribute("attr.name"),
				attrtype: x.getAttribute("attr.type")
			});
		}
		return keyMap;
	}

	/**
	 * Analyses data for dynamic and geographic properties
	 * @param {graphML graph element array} graphs
	 * @param {graphML node element array} nodes
	 * @param {graphML link element array} links
	 */
	getDataProperties(graphs, nodes, links) {
		// get default edge directed value
		let directed = false;
		for (let i = 0; i < graphs.length; i++) {
			if (graphs[i].getAttribute("edgedefault") === "directed") {
				directed = true;
				break;
			}
		}
		const directedDefault = directed;
		// check if some edges are directed
		if (!directed) {
			for (let i = 0; i < links.length; i++) {
				if (links[i].getAttribute("directed") === "true") {
					directed = true;
					break;
				}
			}
		}
		return {
			graphDirectedDefault: directedDefault,
			dynamicTransitions: false, // TODO:
			directedTransitions: directed,
			geographicNodes: false,// TODO:
		};
	}

	/**
	 * Parses nodes.
	 */
	preprocessNodes(nodes) {
		const nameIdMap = new Map();
		let id = 0;
		const nodesPrep = nodes.map(x => {
			const r = new Region(id, x.id);
			nameIdMap.set(x.id, id);
			id++;
			return r;
		});
		return {
			nodesPrep,
			nameIdMap
		};
	}

	/**
	 * Parses links.
	 * @param {graphML link element array} links
	 * @param {Map} nameIdMap
	 * @param {boolean} directedDefault - graph default for directed edges
	 * @param {boolean} directed - true if there exist directed edges
	 * @param {Map} dataKeys - maps key ids to key objects
	 */
	preprocessLinks(links, nameIdMap, directedDefault, directed, dataKeys) {
		let id = 0;
		const linksPrep = [];
		for (let i = 0; i < links.length; i++) {
			const x = links[i];
			const sourceId = nameIdMap.get(x.getAttribute("source"));
			const targetId = nameIdMap.get(x.getAttribute("target"));
			// use default or explicit edge direction attribute if present
			let dir = directedDefault;
			if (x.getAttribute("directed") === "false") {
				dir = false;
			} else if (x.getAttribute("directed") === "true") {
				dir = true;
			}
			// get weight
			let weight = 1;
			for (let c of x.children) {
				if (c.tagName === "data") {
					let key = c.getAttribute("key");
					let attribute = dataKeys.get(key);
					if (attribute.attrname === "weight") {
						weight = +c.innerHTML;
					}
				}
			}
			if (dir || !directed) {
				// create transition object
				linksPrep.push(new Transition(id++, sourceId, targetId, weight));
			} else {
				// add 2 transitions in opposite direction to emulate a undirected one
				linksPrep.push(new Transition(id++, sourceId, targetId, weight / 2));
				linksPrep.push(new Transition(id++, targetId, sourceId, weight / 2));
			}
		}
		return linksPrep;
	}

	/**
	 * Tooltip text for a node, concerning attribute <attributeId>
	 * and displayed in <viewName>
	 */
	tooltipNode(item, attributeId, viewName) {
		if (!item) {
			return;
		}
		return `${item.properties.name}<br>community: ${item.community}<br>transitions: ${item.properties.transitionNumber}`;
	}

	/**
	 * Display service settings in settingsPanel view
	 */
	showSettings() {
		const box = d3.select("#dataParameterPanel");
		const storedURL = localStorage.getItem("graphMlUrl");
		const placeholder = "insert URL for a graphML file or API here";
		box.append("label")
			.text("URL")
			.attr("for", "graphMlUrl")
			.attr("class", "col-sm-5");
		box.append("div").attr("class", "col-sm-7")
			.append("input")
			.attr("id", "graphMlUrl")
			.attr("value", storedURL ? storedURL : "")
			.attr("placeholder", placeholder);
	}
}


const graphml_connector = new GraphMlConnector({
	name: "graphml",
	title: "GraphML Data",
	type: "data",
	description: "Graph ML",
	previewUrl: "./img/ustutt.png",
	hiddenViews: ["wordCloud", "map"]
});
