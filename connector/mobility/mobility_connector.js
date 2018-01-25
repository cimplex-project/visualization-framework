/**
 * This class contains functions, parameters and URLs necessary to
 * retrieve data from a server.
 */
class MobilityConnector extends Connector {
	constructor(params) {
		super(params);

		// Base URL for the Vis Data Service
		this._dataServiceUrl = "connector/mobility/data/";

		// specify datasets and their names to include in the dropdown here
		this.datasets = ["gb1week", "de1week", "eu1day", "eu4days", "us1hour"];
		this.datasetNames = ["VIS Mobility Data UK", "VIS Mobility Data DE", "VIS Mobility Data EU (1 Day)", "VIS Mobility Data EU (4 days)", "VIS Mobility Data US"];
	}

	/**
	 * retrieve all necessary data from server and create a new data model
	 */
	getDataModel(settings) {
		const dataset = settings.dataset;
		let regionUrl;
		let transitionUrl;

		regionUrl = `${this._dataServiceUrl}regions_${dataset}.json`;
		transitionUrl = `${this._dataServiceUrl}transitions_${dataset}.json`;
		
		// request data
		$.when(
			$.ajax({
				method: "GET",
				url: regionUrl,
				crossDomain: true,
				data: {
					"dataset": dataset
				},
				cache: true
			}),
			$.ajax({
				method: "GET",
				url: transitionUrl,
				crossDomain: true,
				data: {
					"dataset": dataset
				},
				cache: true
			})
		).then(
			(regions, transitions) => {
				const data = {
					serviceName: this.title,
					regions: regions[0],
					transitions: this.preprocessTransitions(transitions[0]),
					dynamicTransitions: true,
					directedTransitions: true,
					geographicNodes: true,
					showRegionNames: true,
					additionalData: AGGREGATOR.aggregateScarfplot(regions[0], transitions[0], "hours"),
					dataServiceParameters: settings
				};
				controller.connectorCallback(new Model(data));
			},
			() => UI.showAlert("No Data", "The service is not available.", "danger")
			);
	}

	/**
	 * Parses dates into timestamps.
	 */
	preprocessTransitions(transitions) {
		transitions.forEach(t => {
			t.startTimestamp = Date.parse(t.startDate);
			if (t.endDate) {
				t.endTimestamp = Date.parse(t.endDate);
			}
		});
		return transitions;
	}

	/**
	 * Tooltip text for a node, concerning attribute <attributeId>
	 * and displayed in <viewName>
	 */
	tooltipNode(item, attributeId, viewName) {
		if (!item) {
			return;
		}
		return `${item.properties.name}<br>code: ${item.properties.code}<br>community: ${item.community}<br>transitions: ${item.properties.transitionNumber}`;
	}

	// TODO: please comment / document this
	showSyntheticData() {
		const box = d3.select("#modelSelector");
		const block = box.append("div")
			.attr("class", "d-inline-block col-sm-3");
		block.append("h4")
			.text("Synthetic Data");
		const select = block.append("div")
			.append("select")
			.attr("id", "dataServiceSyntheticSelect")
			.attr("size", 1)
			.attr("name_", "dataset");
		select.append("option")
			.attr("value", "mockCNR")
			.text("CNR Mobility Data");
	}

	// TODO: please comment / document this
	showParticipatoryData() {
		const box = d3.select("#modelSelector");
		const block = box.append("div")
			.attr("class", "d-inline-block col-sm-3");
		block.append("h4")
			.text("Parcitipatory Data");
		const select = block.append("div")
			.append("select")
			.attr("id", "dataServiceParticipatorySelect")
			.attr("size", 1)
			.attr("name_", "dataset");
		select.append("option")
			.attr("value", "mockDFKI")
			.text("DFKI grippeNET");
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
				.text(this.datasetNames[i]);
		};
	}
}


const mobility_connector = new MobilityConnector({
	name: "mobility_data",
	title: "Mobility Data",
	type: "data",
	description: "University of Stuttgart",
	previewUrl: "./img/ustutt.png",
	hiddenViews: ["wordCloud"]
});
