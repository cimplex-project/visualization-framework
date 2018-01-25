// first create a new Connector object
/**
 * contains functions, parameters and URLs necessary to retrieve data from a
 * server
 */
const example_Connector = new Connector({
	// name must be unique
	name: "example",
	// title is arbitrary
	title: "Exampe Connector",
	stateValues: [
		{
			description: "some value",
			value: 1
		},
		{
			description: "some other value",
			value: 2
		}
	],
	// views to exclude from the UI when data from this connector is shown
	hiddenViews: ["matrix"]
});

// views may be influenced by flags
example_Connector.forceTimelineGradient = true;

// data sets used in the connector"s settings (see below)
example_Connector.datasets = ["a", "b", "c"];
example_Connector.datasetNames = ["Dataset A", "Dataset B", "Dataset C"];

// implement the getDataModel function
/**
 * Retrieves all necessary data from server and create a new data model.
 *
 * @return
 *    returns the created model
 */
example_Connector.getDataModel = function (settings) {
	regions = [];
	transitions = [];
	states = [];
	additionalData = {};

	// retrieve data and convert it to the format used in the data model
	// ...

	const param = {
		serviceName: example_Connector.title,
		regions: regions,
		transitions: transitions,
		dynamicTransitions: true,
		directedTransitions: true,
		geographicNodes: true,
		showRegionNames: true,
		additionalData: {},
		dataServiceParameters: settings
	};
	controller.connectorCallback(new Model(param));
};

// overwrite a default visual mapping
/**
 * Map a value to a node color index in [0, colorTable.length-1]
 */
example_Connector.mapNodeColor = function (min, max, colorTable) {
	colorTable = CONFIG.UI.darkTheme ? colorbrewer.Blues[9].slice(0).reverse() : colorbrewer.Oranges[9];
	const scale = d3.scale.pow().domain([min, max]).rangeRound([0, colorTable.length - 1]);
	return value => colorTable[scale(value)];
};

// implement settings for this connector
/**
 * Display service settings in settingsPanel view
 */
example_Connector.showSettings = function () {
	const box = d3.select("#simulationParameterPanel");
	box.append("label")
		.text("Dataset")
		.attr("class", "col-sm-5");
	const select = box.append("div").attr("class", "col-sm-7").append("select")
		.attr("id", "dataServiceDatasetSelect")
		.attr("size", 1)
		.attr("name", "dataset");
	for (let i = 0; i < example_Connector.datasets.length; i++) {
		select.append("option")
			.attr("value", example_Connector.datasets[i])
			.text(example_Connector.datasetNames[i]);
	};
};
