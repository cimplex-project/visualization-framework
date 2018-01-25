/**
 * contains functions, parameters and URLs necessary to retrieve data from a
 * server
 */
const nds_isi_Connector = new Connector({
	name: "nds_isi",
	title: "Network Diffusion (ISI)",
	type: "simulation",
	hiddenViews: ["matrix", "wordCloud"],
	description: "ISI",
	previewUrl: "./img/isi.svg"
});

// force color gradient in timeline
nds_isi_Connector.forceTimelineGradient = true;

/**
 * Data for Settings GUI
 */

nds_isi_Connector.settings = {
	cases: ["New", "Cumulative"],
	templates: []
};

/**
 * Load templates
 */
nds_isi_Connector.template = $.get("./connector/nds_isi/nds_isi_templates.html").promise().then(template => {
	return Mustache.render(template, nds_isi_Connector.settings);
});

/**
 * Updates the progress bar
 */
nds_isi_Connector.progress = function (items) {
	$("#isiProgressBar").width(`${items / nds_isi_Connector.selectedSimulation.duration * 100}%`);
};

/**
 * retrieve all necessary data from server and create a new data model
 */
nds_isi_Connector.getDataModel = function (settings) {
	if (nds_isi_Connector.selectedSimulation) {
		$("#isiProgressView").show();
		GleamViz.getsimulationdata(nds_isi_Connector.selectedSimulation.id, nds_isi_Connector.progress, 1, nds_isi_Connector.selectedSimulation.duration)
			.then(simulation => {
				$("#isiProgressView").hide();
				$("#isiProgressBar").width(`0%`);

				const data = nds_isi_Connector.preprocessData(GleamViz.regions, simulation);
				data.additionalData.start = 1;
				data.additionalData.end = nds_isi_Connector.selectedSimulation.duration;
				data.additionalData.simulationID = nds_isi_Connector.selectedSimulation.id;
				data.additionalData.nodes = GleamViz.regions.length;
				data.additionalData.infectionModelDiscrete = false;
				data.serviceName = nds_isi_Connector.title;
				data.regions = GleamViz.regions;
				[data.states, data.additionalData.max] = nds_isi_Connector.processStates(data);
				data.dynamicTransitions = true;
				data.geographicNodes = true;
				data.dataServiceParameters = settings;

				controller.connectorCallback(new Model(data));
			});
	}
};

/**
 * create the states array
 */
nds_isi_Connector.processStates = function (data) {
	const nodesState = [];
	const lastKnownState = [];
	const startDate = lib.baseTimestamp;

	let maxState = 0;
	// go through all iterations
	for (let i = 0, numberOfIterations = data.additionalData.allIterations.length; i < numberOfIterations; i++) {
		const n = [0, 0];
		// iteration is data per day (object, key is region id)
		const iteration = data.additionalData.allIterations[i].status;
		// calculate max value per basin; nodes is region count
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
			if (state > maxState) {
				maxState = state;
			}
		}

		nodesState[i] = {
			amount: n, // amount contains min and max value
			date: lib.addDays(startDate, i)
		};
	}
	return [nodesState, maxState]; // maxValue contains max value for ALL basins
};


/**
 * retrieve all necessary data from server and create a new data model
 */
nds_isi_Connector.preprocessData = function (regions, data) {
	const selectedCase = document.getElementById("isiCaseSelect").selectedIndex === 0 ? "newCases" : "cumulativeCases";
	const selectedOutputCompartment = nds_isi_Connector.selectedSimulation.compartments[document.getElementById("isiOutputSelect").selectedIndex];
	const selectedTravelCompartment = nds_isi_Connector.selectedSimulation.compartments[document.getElementById("isiTravelSelect").selectedIndex];
	const iterations = [];
	const transitions = [];
	let transitionId = 0;

	data.forEach(simulation => {
		// create a sparse array with length of all regions
		const status = new Array(regions.length);
		for (const regionId in simulation[selectedCase]) {
			const value = simulation[selectedCase][regionId][selectedOutputCompartment];
			if (value > 0) {
				status[regionId] = value;
			}
		}

		iterations.push({
			iteration: simulation.dayNumber,
			status
		});

		// read transitions values
		if (simulation.travelRecords.length > 0) {
			const startTimestamp = lib.addDays(lib.baseTimestamp, simulation.dayNumber - 1);
			const endTimestamp = lib.addDays(startTimestamp, 1);
			simulation.travelRecords.forEach(t => {
				transitions.push({
					id: transitionId++,
					sourceRegionId: t.originBasin.toString(),
					targetRegionId: t.destinationBasin.toString(),
					startTimestamp: startTimestamp,
					endTimestamp: endTimestamp,
					weight: 1.0,
					text: ""
				});
			});
		}
	});

	return {
		transitions: transitions,
		additionalData: {
			startIteration: 1,
			allIterations: iterations,
			iterations: iterations.length,
			nodes: regions.length
		}
	};
};
