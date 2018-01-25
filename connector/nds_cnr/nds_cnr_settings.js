/**
 * Display service settings in settingsPanel view
 */
ndlibConnector.showSettings = function () {
	// show select with all models
	const box = d3.select("#simulationParameterPanel");
	const storedURL = localStorage.getItem("cnrServiceURL");
	box.append("label")
		.text("Service-URL")
		.attr("for", "serviceURL")
		.attr("class", "col-sm-5");
	box.append("div").attr("class", "col-sm-7")
		.append("input")
		.attr("id", "cnrServiceURL")
		.attr("value", storedURL ? storedURL : baseURL)
		.attr("placeholder", baseURL);
	box.append("label")
		.attr("for", "dataServiceModelSelect")
		.text("Model")
		.attr("class", "col-sm-5");
	const modelSelect = box.append("div").attr("class", "col-sm-7").append("select")
		.attr("id", "dataServiceModelSelect")
		.attr("size", 1)
		.attr("name", "model")
		.on("change", function () {
			ndlibConnector.showNdlibModelParameters();
		});
	for (let i = 0; i < ndlibConnector.displayModels.length; i++) {
		modelSelect.append("option")
			.attr("value", ndlibConnector.displayModels[i])
			.text(ndlibConnector.displayModelsNames[i]);
	}

	// show parameters for selected model
	box.append("p").attr("id", "modelParameterPanel");
	ndlibConnector.showNdlibModelParameters();

	box.append("label")
		.attr("for", "dataServiceNetworkSelect")
		.text("Network")
		.attr("class", "col-sm-5");
	const networkSelect = box.append("div").attr("class", "col-sm-7").append("select")
		.attr("name", "network")
		.attr("id", "dataServiceNetworkSelect")
		.attr("size", 1)
		.on("change", function () {
			ndlibConnector.showNdlibNetworkParameters();
		});
	for (let j = 0; j < ndlibConnector.displayNetworks.length; j++) {
		networkSelect.append("option")
			.attr("value", ndlibConnector.displayNetworks[j])
			.text(ndlibConnector.displayNetworksNames[j]);
	}
	networkSelect.append("option")
		.attr("value", "customNetwork")
		.text("Custom network");

	// show parameters for selected model
	box.append("p").attr("id", "networkParameterPanel");
	ndlibConnector.showNdlibNetworkParameters();
};

/**
 * Shows options for NDlib models
 */
ndlibConnector.showNdlibModelParameters = function () {
	const sel = document.getElementById("dataServiceModelSelect");
	const model = sel.options[sel.selectedIndex].value;

	const panel = d3.select("#modelParameterPanel");
	panel.selectAll("*").remove();

	if (model !== "" && model !== "CognitiveOpinionDynamic") {
		lib.addFormInput(panel, "infected", "initial infected", 0.01);
	}
	switch (model) {
		case "SI":
			lib.addFormInput(panel, "beta", "infection rate &beta;", 0.1);
			break;
		case "SIR":
			lib.addFormInput(panel, "beta", "infection rate &beta;", 0.1);
			lib.addFormInput(panel, "gamma", "recovery rate &gamma;", 0.1);
			break;
		case "SIS":
			lib.addFormInput(panel, "beta", "infection rate &beta;", 0.1);
			lib.addFormInput(panel, "lambda", "recovery rate &lambda;", 0.1);
			break;
		case "Threshold":
			lib.addFormInput(panel, "threshold", "threshold", 0.1);
			break;
		case "Profile":
			lib.addFormInput(panel, "profile", "profile", 0.1);
			break;
		case "ProfileThreshold":
			lib.addFormInput(panel, "profile", "profile", 0.1);
			lib.addFormInput(panel, "threshold", "threshold", 0.1);
			break;
		case "KerteszThreshold":
			lib.addFormInput(panel, "threshold", "threshold", 0.1);
			lib.addFormInput(panel, "adopter_rate", "adopter_rate", 0.1);
			lib.addFormInput(panel, "blocked", "blocked", 0.1);
			break;
		case "CognitiveOpinionDynamic":
			lib.addFormInput(panel, "I", "External Information", 0.15);
			lib.addFormInput(panel, "T_range_min", "range initial values for T", 0.0);
			lib.addFormInput(panel, "T_range_max", "range initial values for T", 1.0);
			lib.addFormInput(panel, "B_range_min", "range initial values for B", 0.0);
			lib.addFormInput(panel, "B_range_max", "range initial values for B", 1.0);
			lib.addFormInput(panel, "R_fraction_negative", "fraction of nodes having R=-1", 1 / 3.0);
			lib.addFormInput(panel, "R_fraction_neutral", "fraction of nodes having R=0", 1 / 3.0);
			lib.addFormInput(panel, "R_fraction_positive", "fraction of nodes having R=1", 1 / 3.0);
			break;
		case "QVoter":
		// both do the same
		case "MajorityRule":
			lib.addFormInput(panel, "q", "group size q", 5, 0, 1000, 1);
			break;
		default:
	}
};

/**
 * Shows options for NDlib network
 */
ndlibConnector.showNdlibNetworkParameters = function () {
	const sel = document.getElementById("dataServiceNetworkSelect");
	const network = sel.options[sel.selectedIndex].value;

	const panel = d3.select("#networkParameterPanel");
	panel.selectAll("*").remove();

	switch (network) {
		case "completeGraph":
			lib.addFormInput(panel, "n", "number of nodes", 50, 1, 1000, 1);
			break;
		case "ERGraph":
			lib.addFormInput(panel, "n", "number of nodes", 200, 200, 1000, 1);
			lib.addFormInput(panel, "p", "rewiring probability", 0.01);
			panel.append("label")
				.attr("for", "networDirectedCheckbox")
				.text("directed")
				.attr("class", "col-xs-5 col-sm-5 col-md-5 col-lg-5");
			panel.append("div").attr("class", "col-xs-7 col-sm-7 col-md-7 col-lg-7").append("input")
				.attr("type", "checkbox")
				.attr("id", "networDirectedCheckbox");
			break;
		case "BAGraph":
			lib.addFormInput(panel, "n", "number of nodes", 200, 200, 1000, 1);
			lib.addFormInput(panel, "m", "edges for each<br> new node", 10, 0, 100, 1);
			break;
		case "WSGraph":
			lib.addFormInput(panel, "n", "number of nodes", 200, 200, 1000, 1);
			lib.addFormInput(panel, "k", "number of neighbors", 10, 0, 100, 1);
			lib.addFormInput(panel, "p", "rewiring probability", 0.01);
			break;
		case "customNetwork":
			panel.append("label")
				.attr("for", "networkFileInput")
				.text("Custom network")
				.attr("class", "col-sm-5");
			panel.append("div").attr("class", "col-sm-7").append("input")
				.attr("type", "file")
				.attr("name", "networkFileInput")
				.attr("id", "networkFileInput")
				.attr("accept", ".json")
				.on("change", function () {
					if (typeof (Storage) === "undefined") {
						UI.showAlert("No local Storage supported.", "Custom graph usage is only possible if data can be stored locally. Please activate this feature in your browser.", "danger");
					} else {
						const file = $("#networkFileInput")[0].files[0];
						const reader = new FileReader();
						reader.onload = function (e) {
							let contents = e.target.result;
							// need to remove whitespace for correct and efficient transmission
							contents = contents.replace(/ |\r?\n|\r/g, "");
							// store network data locally
							localStorage.setItem("networkData", contents);
						};
						reader.readAsText(file);
					}
				});
			break;
		default:
	}
};
