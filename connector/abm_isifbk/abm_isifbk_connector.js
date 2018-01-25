
/**
 * contains functions, parameters and URLs necessary to retrieve data from a
 * server
 */
const abm_isifbk_Connector = new Connector({
	name: "abm_isifbk",
	title: "Agent Based Model (ISI+FBK)",
	description: "ISI + FBK",
	previewUrl: "./img/fbk.png",
	type: "simulation",
	hiddenViews: ["graph", "matrix", "scarfplot", "wordCloud"]
});

// force color gradient in timeline
abm_isifbk_Connector.forceTimelineGradient = true;
abm_isifbk_Connector.start = 1;
abm_isifbk_Connector.end = 365;
abm_isifbk_Connector.cases = 0;
abm_isifbk_Connector.compartment = "Infectious";
abm_isifbk_Connector.ageBracket = 4;
abm_isifbk_Connector.intervalId = undefined;
abm_isifbk_Connector.filterDFKI = false;
abm_isifbk_Connector.templatesFBK = [];
abm_isifbk_Connector.templatesDFKI = [];

/**
 * Data for Settings GUI
 */
abm_isifbk_Connector.settings = {
	cases: ["New", "Cumulative"],
	ageBrackets: [
		"0-5",
		"6-12",
		"13-19",
		"20-39",
		"40-59",
		"60+"
	],
	compartments: [
		"Asymptomatic",
		"Exposed",
		"Infectious",
		"Infectious_sympt_AV",
		"Recovered",
		"Susceptible",
		"Vaccinated"
	],
	value: ["LowerVal", "MedianVal", "UpperVal"],
	templates: []
};

/**
 * Load templates
 */
abm_isifbk_Connector.template = $.get("./connector/abm_isifbk/abm_isifbk_templates.html").promise().then(template => {
	return template;
});


/**
 * Updates the progress bar
 */
abm_isifbk_Connector.progress = function (items) {
	const width = items / (abm_isifbk_Connector.end - abm_isifbk_Connector.start + 1) * 100;
	$("#isifbkProgressBar").width(`${width}%`);
};

/**
 * retrieve all necessary data from server and create a new data model
 */
abm_isifbk_Connector.getDataModel = function (settings) {
	if (abm_isifbk_Connector.selectedSimulation) {
		$("#isifbkProgressView").show();
		GleamViz.getsimulationdata(abm_isifbk_Connector.selectedSimulation.id, abm_isifbk_Connector.progress, abm_isifbk_Connector.start, abm_isifbk_Connector.end)
			.then(simulation => {
				$("#isifbkProgressView").hide();
				$("#isifbkProgressBar").width(`0%`);

				const data = abm_isifbk_Connector.preprocessData(GleamViz.regions, simulation);
				data.additionalData.start = 1;
				data.additionalData.end = abm_isifbk_Connector.end;
				data.additionalData.simulationID = abm_isifbk_Connector.selectedSimulation.id;
				data.additionalData.nodes = GleamViz.regions.length;
				data.serviceName = abm_isifbk_Connector.title;
				data.states = abm_isifbk_Connector.processStates(data);
				data.regions = GleamViz.regions;
				data.dynamicTransitions = true;
				data.geographicNodes = true;
				data.dataServiceParameters = settings;

				controller.connectorCallback(new Model(data));
			});
	}
};

/**
 * Preprocesses region state data.
 */
abm_isifbk_Connector.processStates = function (data) {
	const nodesState = [];
	const lastKnownState = [];
	const beginDate = lib.baseTimestamp;
	// go through all iterations
	for (let i = 0, numberOfIterations = data.additionalData.allIterations.length; i < numberOfIterations; i++) {
		const n = [0, 0];
		const iteration = data.additionalData.allIterations[i].status;
		// sum up node states
		for (let j = 0, nodes = data.additionalData.nodes; j < nodes; j++) {
			let state = iteration[j] <= 0 ? undefined : iteration[j];
			if (state === undefined) {
				if (lastKnownState[j] === undefined) {
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

/**
 * retrieve all necessary data from server and create a new data model
 */
abm_isifbk_Connector.preprocessData = function (regions, data) {
	const selectedCases = document.getElementById("isifbkCasesSelect").selectedIndex;
	const selectedAgeBracket = document.getElementById("isifbkAgeBracketSelect").selectedIndex;
	const selectedCompartment = abm_isifbk_Connector.settings.compartments[document.getElementById("isifbkCompartmentSelect").selectedIndex];
	const selectedValue = abm_isifbk_Connector.settings.value[document.getElementById("isifbkValueSelect").selectedIndex];
	const iterations = [];

	data.forEach((simulation, day) => {
		const status = new Array(regions.length);
		simulation[selectedCases].data.forEach(region => {
			const value = region.ageBrackets[selectedAgeBracket][selectedCompartment][selectedValue];
			if (value > 0) {
				status[region.geographicalID] = value;
			}
		});
		iterations.push({ iteration: day + 1, status });
	});

	return {
		transitions: [],
		additionalData: {
			startIteration: 1,
			allIterations: iterations,
			iterations: iterations.length,
			nodes: regions.length
		}
	};
};
