/**
 * contains functions, parameters and URLs necessary to retrieve data from
 * a server
 */
const baseURL = "http://localhost:5000/";

// TODO: rename to nds_cnr_connector
const ndlibConnector = new Connector({
	name: "nds_cnr",
	title: "Network Diffusion Service (CNR)",
	type: "simulation",
	hiddenViews: ["map", "globe", "wordCloud"],
	stateValues: [{
		description: "susceptible",
		value: 0
	},
	{
		description: "infected",
		value: 1
	},
	{
		description: "recovered",
		value: 2
	}
	],
	description: "CNR",
	previewUrl: "./img/cnr.png"
});

// specify all shown models and networks here
ndlibConnector.displayModels = ["SIR", "SI", "SIS", "Threshold", "Profile", "ProfileThreshold", "IndependentCascades", "Voter", "QVoter", "MajorityRule", "Sznajd",
	"KerteszThreshold", "CognitiveOpinionDynamic"
];
ndlibConnector.displayModelsNames = ["SIR", "SI", "SIS", "Threshold", "Profile", "Profile-Threshold", "Independent Cascades", "Voter", "Q-Voter", "Majority Rule", "Sznajd",
	"Kertesz-Threshold", "Cognitive Opinion Dynamic"
];
ndlibConnector.displayNetworks = ["WSGraph", "completeGraph", "ERGraph", "BAGraph"];
ndlibConnector.displayNetworksNames = ["Generator: Watts-Strogatz Graph", "Generator: Complete Graph", "Generator: Erdos-Renyi Graph", "Generator: Barabasi-Albert Graph"];

/**
 * Change order of states in timeline.
 */
ndlibConnector.remapStatesForTimeline = (states) => {
	return states.map(d => {
		const copy = Object.assign({}, d);
		const x = d.amount[0];
		copy.amount[0] = d.amount[1];
		copy.amount[1] = d.amount[2];
		copy.amount[2] = x;
		return copy;
	});
};

// default parameters for all models
ndlibConnector.models = {
	chosenModel: "SIR",
	// initial proportion of infected nodes
	infected: 0.01,
	// infection rate
	beta: 0.1,
	// recovery rate
	gamma: 0.1,
	// recovery rate
	lambda: 0.1,
	threshold: 0.1,
	profile: 0.1,
	// number of neighbors that affect the opinion of an agent
	q: 0.1,
	adopter_rate: 0.1,
	blocked: 0.1,
	I: 0.1,
	T_range_min: 0,
	T_range_max: 1,
	B_range_min: 0,
	B_range_max: 1,
	R_fraction_negative: 1 / 3.0,
	R_fraction_neutral: 1 / 3.0,
	R_fraction_positive: 1 / 3.0
};

// scales for color mapping
if (DARK_THEME) {
	ndlibConnector.colors = {
		susceptible: "#444444",
		infected: "#E08214",
		recovered: "#8073AC"
	};
} else {
	ndlibConnector.colors = {
		susceptible: "#f7f7f7",
		infected: "#E08214",
		recovered: "#8073AC"
	};
}
ndlibConnector.sequential_scale = colorbrewer.Oranges[9];

ndlibConnector.twoStatesScale = d3.scale.ordinal()
	.domain([0, 1])
	.range([
		ndlibConnector.colors.susceptible,
		ndlibConnector.colors.infected
	]);
ndlibConnector.threeStatesSIR = d3.scale.ordinal()
	.domain([0, 1, 2])
	.range([
		ndlibConnector.colors.susceptible,
		ndlibConnector.colors.infected,
		ndlibConnector.colors.recovered
	]);
ndlibConnector.threeStatesKert = d3.scale.ordinal()
	.domain([-1, 0, 1])
	.range([
		ndlibConnector.colors.susceptible,
		ndlibConnector.colors.infected,
		ndlibConnector.colors.recovered
	]);
ndlibConnector.twoStatesContinuous = d3.scale.linear()
	.domain([0, 1])
	.range([
		ndlibConnector.sequential_scale[1],
		ndlibConnector.sequential_scale[7]
	]);

// color maps
ndlibConnector.colorMaps = {
	SI: ndlibConnector.twoStatesScale,
	SIR: ndlibConnector.threeStatesSIR,
	SIS: ndlibConnector.twoStatesScale,
	Threshold: ndlibConnector.twoStatesScale,
	Profile: ndlibConnector.twoStatesScale,
	ProfileThreshold: ndlibConnector.twoStatesScale,
	QVoter: ndlibConnector.twoStatesScale,
	MajorityRule: ndlibConnector.twoStatesScale,
	KerteszThreshold: ndlibConnector.threeStatesKert,
	CognitiveOpinionDynamic: ndlibConnector.twoStatesContinuous
};

// default parameters for all network types
ndlibConnector.networks = {
	chosenNetwork: "ERGraph",
	// number of nodes
	n: 200,
	// re-wiring probability
	p: 0.01,
	directed: false,
	// number of edges attached to each new node
	m: 3,
	// each node is connected to k nearest neighbors in ring topology
	k: 5
};

// contains a list of exploratories
// the dictionary is populated dynamically retrieving the entries
// from the RESTful server  (see method ndlibConnector.listExploratories)
ndlibConnector.exploratories = {};

// FIX: static loading of exploratories
// TODO: load from server
const exploratoryList = [{
	"node_initial_status": [
		"infected"
	],
	"description": "Initial status of nodes, community outbreak (Threshold model)",
	"name": "ToyCore_Com",
	"network": "ToyCore"
},
{
	"node_initial_status": [
		"infected"
	],
	"description": "Initial status of nodes, global outbreak (Threshold model)",
	"name": "ToyPeri_Com",
	"network": "ToyPeri"
},
{
	"node_initial_status": [
		"blocked"
	],
	"description": "Initial status of the  10%-top degree nodes is set to blocked (Kertesz Threshold)",
	"name": "ClusteredBA_top",
	"network": "ClusteredBA"
},
{
	"node_initial_status": [
		"blocked"
	],
	"description": "Initial status of the 10%-bottom degree nodes is set to blocked (Kertesz Threshold)",
	"name": "ClusteredBA_bottom",
	"network": "ClusteredBA"
},
{
	"node_initial_status": [
		"blocked"
	],
	"description": "Initial status of the 30% of nodes is set to blocked (Kertesz Threshold)",
	"name": "ClusteredBA_random",
	"network": "ClusteredBA"
},
{
	"description": "Network having powerlaw degree distribution with exponent b=1.6 (Cognitive Opinion Dynamic)",
	"name": "CogOp_1",
	"network": "CogOp"
}
];


for (const e of exploratoryList) {
	ndlibConnector.displayNetworks.push(`Expl_${e.name}`);
	ndlibConnector.displayNetworksNames.push(`Exploratory: ${e.name}`);
	ndlibConnector.exploratories[`Expl_${e.name}`] = e;
};


ndlibConnector.calculateURLs = function () {
	const host = $("#cnrServiceURL").val();
	// service URLs
	ndlibConnector.urls = {
		// experiment
		createExperiment: {
			url: `${host}api/Experiment`,
			type: "GET"
		},
		describeExperiment: {
			url: `${host}api/ExperimentStatus`,
			type: "POST"
		},
		resetExperiment: {
			url: `${host}api/ExperimentStatus`,
			type: "PUT"
		},
		deleteExperiment: {
			url: `${host}api/Experiment`,
			type: "DELETE"
		},
		configureExperiment: {
			url: `${host}api/Configure`,
			type: "PUT"
		},
		// exploratory
		exploratoryGetConfiguration: {
			url: `${host}api/Exploratory`,
			type: "POST"
		},
		// networks
		getNetwork: {
			url: `${host}api/GetGraph`,
			type: "POST"
		},
		deleteNetwork: {
			url: `${host}api/Networks`,
			type: "DELETE"
		},
		completeGraph: {
			url: `${host}api/Generators/CompleteGraph`,
			type: "PUT"
		},
		ERGraph: {
			url: `${host}api/Generators/ERGraph`,
			type: "PUT"
		},
		BAGraph: {
			url: `${host}api/Generators/BarabasiAlbertGraph`,
			type: "PUT"
		},
		WSGraph: {
			url: `${host}api/Generators/WattsStrogatzGraph`,
			type: "PUT"
		},
		uploadNetwork: {
			url: `${host}api/UploadNetwork`,
			type: "PUT"
		},
		// model
		modelSI: {
			url: `${host}api/SI`,
			type: "PUT"
		},
		modelSIR: {
			url: `${host}api/SIR`,
			type: "PUT"
		},
		modelSIS: {
			url: `${host}api/SIS`,
			type: "PUT"
		},
		modelThreshold: {
			url: `${host}api/Threshold`,
			type: "PUT"
		},
		modelProfile: {
			url: `${host}api/Profile`,
			type: "PUT"
		},
		modelProfileThreshold: {
			url: `${host}api/ProfileThreshold`,
			type: "PUT"
		},
		modelIndependentCascades: {
			url: `${host}api/IndependentCascades`,
			type: "PUT"
		},
		modelVoter: {
			url: `${host}api/Voter`,
			type: "PUT"
		},
		modelQVoter: {
			url: `${host}api/QVoter`,
			type: "PUT"
		},
		modelMajorityRule: {
			url: `${host}api/MajorityRule`,
			type: "PUT"
		},
		modelSznajd: {
			url: `${host}api/Sznajd`,
			type: "PUT"
		},
		modelKerteszThreshold: {
			url: `${host}api/KerteszThreshold`,
			type: "PUT"
		},
		modelCognitiveOpinionDynamic: {
			url: `${host}api/CognitiveOpinionDynamic`,
			type: "PUT"
		},
		// iterators (simulation)
		iteration: {
			url: `${host}api/Iteration`,
			type: "POST"
		},
		iterationBunch: {
			url: `${host}api/IterationBunch`,
			type: "POST"
		},
		completeRun: {
			url: `${host}api/CompleteRun`,
			type: "POST"
		},
		exploratory: {
			url: `${host}api/Exploratory`,
			type: "POST"
		},
		listExploratories: {
			url: `${host}api/Exploratory`,
			type: "GET"
		}
	};
};

/**
 * retrieve all necessary data from server and create a new data model
 *
 * settings
 *     setting object from init.js
 *
 * the function just parses the arguments and tries to receive a token,
 * on success contDataModel is called
 */
ndlibConnector.parseSettings = function (settings) {
	// get model parameters
	if (settings.model) {
		ndlibConnector.models.chosenModel = settings.model;
	}
	if (settings.infected) {
		ndlibConnector.models.infected = settings.infected;
	}
	if (settings.beta) {
		ndlibConnector.models.beta = settings.beta;
	}
	if (settings.gamma) {
		ndlibConnector.models.gamma = settings.gamma;
	}
	if (settings.lambda) {
		ndlibConnector.models.lambda = settings.lambda;
	}
	if (settings.threshold) {
		ndlibConnector.models.threshold = settings.threshold;
	}
	if (settings.profile) {
		ndlibConnector.models.profile = settings.profile;
	}
	if (settings.q) {
		ndlibConnector.models.q = settings.q;
	}
	if (settings.I) {
		ndlibConnector.models.I = settings.I;
		ndlibConnector.models.T_range_min = settings.T_range_min;
		ndlibConnector.models.T_range_max = settings.T_range_max;
		ndlibConnector.models.B_range_min = settings.B_range_min;
		ndlibConnector.models.B_range_max = settings.B_range_max;
		ndlibConnector.models.R_fraction_negative = settings.R_fraction_negative;
		ndlibConnector.models.R_fraction_neutral = settings.R_fraction_neutral;
		ndlibConnector.models.R_fraction_positive = settings.R_fraction_positive;
	}
	if (settings.adopter_rate) {
		ndlibConnector.models.adopter_rate = settings.adopter_rate;
	}
	if (settings.blocked) {
		ndlibConnector.models.blocked = settings.blocked;
	}

	// get graph parameters
	if (settings.network) {
		ndlibConnector.networks.chosenNetwork = settings.network;
	}
	if (settings.n) {
		ndlibConnector.networks.n = settings.n;
	}
	if (settings.p) {
		ndlibConnector.networks.p = settings.p;
	}
	if (settings.m) {
		ndlibConnector.networks.m = settings.m;
	}
	if (settings.k) {
		ndlibConnector.networks.k = settings.k;
	}
	if (settings.networkFileInput) {
		ndlibConnector.networkFileInput = settings.networkFileInput;
	}
};

/**
 * retrieve all necessary data from server and create a new data model
 *
 * settings
 *     setting object from init.js
 */
ndlibConnector.getDataModel = function (settings) {
	ndlibConnector.settings = settings;
	ndlibConnector.parseSettings(settings);
	$.when(ndlibConnector.createExperiment()).then(
		(result) => {
			ndlibConnector.contDataModel(result.token);
		},
		() => {
			UI.showAlert("No Token Data", "The service is not available.", "danger");
		}
	);
};

/**
 * continue the model creation with a token
 *
 * token
 *    the token of the current experiment, expected to be valid
 *
 * chosenModel
 *    the model that is to be used
 */
ndlibConnector.contDataModel = function (token) {
	const customNetwork = (ndlibConnector.networkFileInput && localStorage.getItem("networkData") !== "");
	console.log(`custom network: ${customNetwork}`);
	const dfd = $.Deferred();

	dfd.done(function (networkFunc) {
		$.when(networkFunc(token)).then(
			function (result) {
				ndlibConnector.setModel(token).then(
					function () {
						ndlibConnector.runSimulation(token, 0, result, ndlibConnector.models.chosenModel);
					},
					function () {
						UI.showAlert("Cannot send Model", "The service is not available.", "danger");
						ndlibConnector.cleanUp(token);
					});
			},
			function () {
				UI.showAlert("No Network Data", "The service is not available.", "danger");
				ndlibConnector.cleanUp(token);
			});
	});
	if (customNetwork) {
		dfd.resolve(ndlibConnector.getCustomNetwork);
	} else {
		$.when(ndlibConnector.setNetwork(token)).done(function () {
			dfd.resolve(ndlibConnector.getRemoteNetwork);
		});
	}
};

/**
 * preprocess the data from the web service and create the model
 *
 * tempRegions
 *    region data from server
 *
 * tempTransitions
 *   transition data from server
 *
 * allIterations
 * 	 iterationData from server
 */
ndlibConnector.createModel = function (tempRegions, tempTransitions, allIterations) {
	// parameters
	const serviceName = "Network Diffusion Service (CNR)";
	// set pseudo dates, every iteration is assumed to take one day
	const beginDate = lib.baseTimestamp;
	// get iterations array from first model
	if (!allIterations || allIterations[Object.keys(allIterations)[0]] === undefined) {
		UI.showAlert("Server error", "Server did not send iteration data.", "danger");
		allIterations = [];
	} else {
		allIterations = allIterations[Object.keys(allIterations)[0]];
	}

	// preprocess graph data to match data format
	const regions = [];
	const transitions = [];
	const events = [];

	tempRegions.forEach(function (value) {
		regions.push({
			properties: {
				id: value.id,
				name: `region ${value.id}`,
				code: value.id
			}
		});
	});
	tempTransitions.forEach(function (value, index) {
		transitions.push({
			id: index,
			sourceRegionId: value.source,
			targetRegionId: value.target,
			weight: 1.0,
			text: ""
		});
	});

	const currentStates = [];
	const currentStatesStartTime = [];

	// initialize states "iteration 0" with 0s
	regions.forEach(function (region) {
		currentStates[region.properties.id] = 0;
		currentStatesStartTime[region.properties.id] = lib.baseTimestamp;
	});

	// check if a state has changed, if yes create new event
	const nodes = regions.length;
	let lastIteration;
	const allIterationsArray = [];

	allIterations.forEach(function (iteration, iterationIndex) {
		if (!iteration) {
			return;
		}
		for (let key = 0; key < nodes; key++) {
			// if nothing has changed, there is no entry
			if (!iteration.status.hasOwnProperty(key)) {
				iteration.status[key] = lastIteration.status[key];
			}
			// make sure there has been a change
			if (iteration.status[key] !== currentStates[key]) {
				// create event for the state that has just ended
				const startDate = currentStatesStartTime[key];
				// add some days and subtract 1 second so durations are complete but disjunct partitions
				const endDate = lib.addDays(startDate, iterationIndex + 1) - 1000;
				events.push({
					regionId: key,
					startTimestamp: startDate,
					endTimestamp: endDate,
					text: iteration.status[key]
				});
				// update current states
				currentStates[key] = iteration.status[key];
				currentStatesStartTime[key] = endDate;
			}
		}
		lastIteration = iteration;
		allIterationsArray[iterationIndex] = iteration;
	});

	// count number of nodes for each state and iteration
	// saved values: nodesState[iteration][state] = number
	// that means that the timeline knows for each iteration,
	// how many nodes are sick etc.
	// TODO: remove this code since it is handled by the model, beware of side effects!
	const nodesState = [];
	const lastKnownState = [];
	for (let i = 0, numberOfIterations = allIterations.length; i < numberOfIterations; i++) {
		const n = [0, 0, 0];
		const iteration = allIterations[i].status;

		for (let j = 0; j < nodes; j++) {
			let state = iteration[j];
			if (state == undefined) {
				if (lastKnownState[j] == undefined) {
					lastKnownState[j] = 0;
				}
				state = lastKnownState[j];
			} else {
				lastKnownState[j] = state;
			}

			if (ndlibConnector.models.chosenModel === "CognitiveOpinionDynamic") {
				// for cognitive opinion dynamic models, values are continuous and are therefore just added up
				n[1] += state;
			} else {
				// models with concrete integer values are sorted into arrays
				n[state]++;
			}
		}
		nodesState[i] = {
			amount: n,
			// set a pseudo date
			date: lib.addDays(beginDate, i)
		};
	}

	this.infectionModel = ndlibConnector.models.chosenModel;

	const additionalData = {
		allIterations: allIterations,
		iterations: allIterations.length,
		nodes: nodes,
		infectionModel: ndlibConnector.models.chosenModel,
		infectionModelParameters: ndlibConnector.models,
		// add info if model has discrete or continuous values
		infectionModelDiscrete: (ndlibConnector.models.chosenModel !== "CognitiveOpinionDynamic"),
		network: ndlibConnector.networks.chosenNetwork,
		networkParameters: ndlibConnector.networks
	};

	const data = {
		serviceName: serviceName,
		regions: regions,
		transitions: transitions,
		states: nodesState,
		additionalData: additionalData,
		dataServiceParameters: ndlibConnector.settings
	};

	// create model
	localStorage.setItem("cnrServiceURL", $("#cnrServiceURL").val());
	controller.connectorCallback(new Model(data));
};

/**
 * creates a new experiment and returns the token
 */
ndlibConnector.createExperiment = function () {
	ndlibConnector.calculateURLs();
	// create experiment
	const url = ndlibConnector.urls.createExperiment;
	const token = $.ajax({
		method: url.type,
		url: url.url,
		crossDomain: true,
		cache: false
	}).done(function () {
		const tkn = token.responseJSON.token;
		// load list of exploratories
		ndlibConnector.listExploratories(tkn);
	});
	return token;
};

/**
 * creates a list of exploratories from a request to the server REST api.
 */
ndlibConnector.listExploratories = function (token) {
	const url = ndlibConnector.urls.listExploratories;
	const exploratories = $.ajax({
		method: url.type,
		url: url.url,
		crossDomain: true,
		cache: false
	}).done(function () {
		// Array[]
		const expls = exploratories.responseJSON.exploratory;
		for (const e of expls) {
			ndlibConnector.displayNetworks.push(`Expl_${e.name}`);
			ndlibConnector.displayNetworksNames.push(`Exploratory: ${e.name}`);
			ndlibConnector.exploratories[`Expl_${e.name}`] = e;
		}
	});
};

/**
 * parses the customNetwork and uploads it to the ndlib server
 *
 * @param token
 *    the token of the current experiment
 */
ndlibConnector.getCustomNetwork = function (token) {
	// handle custom network upload
	const network = localStorage.getItem("networkData");
	if (network === undefined) {
		return null;
	}
	// get network as object from JSON
	const networkObj = JSON.parse(network);
	const dfd = $.Deferred();
	const url = ndlibConnector.urls.uploadNetwork;
	$.ajax({
		method: url.type,
		url: url.url,
		crossDomain: true,
		data: {
			"token": token,
			"file": network,
			"directed": networkObj.directed
		},
		cache: false
	}).done(function (result) {
		console.log("Uploaded network, response:");
		console.log(result);
		dfd.resolve({
			nodes: networkObj.nodes,
			links: networkObj.links
		});
	});
	return dfd;
};

/**
 * downloads the remote network from the server
 *
 * @param token
 * 	  the token of the current experiment
 */
ndlibConnector.getRemoteNetwork = function (token) {
	const url = ndlibConnector.urls.getNetwork;
	return $.ajax({
		method: url.type,
		url: url.url,
		crossDomain: true,
		data: {
			"token": token
		},
		cache: false
	});
};

/**
 * runs the simulation on the server and creates the data Model
 *
 * @param token
 * 	  the token of the current experiment
 *
 * @param iterations
 * 	  amount of iterations to simulate
 * 	  TODO: actually use this value to make different calls to the server
 *
 * @param network
 *     the network which is used in the experiment
 *
 * @param chosenModel
 *     the model that is to be used (only for storage in the model)
 */
ndlibConnector.runSimulation = function (token, iterations, network, chosenModel) {
	// run simulation and get results
	const url = ndlibConnector.urls.iterationBunch;
	$.ajax({
		method: url.type,
		url: url.url,
		data: {
			"token": token,
			"bunch": 35
		},
		crossDomain: true,
		cache: false
	}).always(function () {
		ndlibConnector.cleanUp(token);
	}).then(function (iter) {
		ndlibConnector.createModel(network.nodes, network.links, iter, chosenModel);
	}, function () {
		UI.showAlert("No Iteration Data", "The service is not available.", "danger");
	});
};

/**
 * set a simulation model with parameters on the server
 *
 * @param token
 *    the token of the current experiment
 */
ndlibConnector.setModel = function (token) {
	let data, url;
	const urls = ndlibConnector.urls;
	const infected = ndlibConnector.models.infected;
	const model = ndlibConnector.models;

	switch (ndlibConnector.models.chosenModel) {
		case "SI":
			url = urls.modelSI;
			data = {
				"token": token,
				"beta": model.beta,
				"infected": infected
			};
			break;
		case "SIR":
			url = urls.modelSIR;
			data = {
				"token": token,
				"beta": model.beta,
				"gamma": model.gamma,
				"infected": infected
			};
			break;
		case "SIS":
			url = urls.modelSIS;
			data = {
				"token": token,
				"beta": model.beta,
				"lambda": model.lambda,
				"infected": infected
			};
			break;
		case "Threshold":
			url = urls.modelThreshold;
			data = {
				"token": token,
				"threshold": model.threshold,
				"infected": infected
			};
			break;
		case "Profile":
			url = urls.modelProfile;
			data = {
				"token": token,
				"profile": model.profile,
				"infected": infected
			};
			break;
		case "ProfileThreshold":
			url = urls.modelProfileThreshold;
			data = {
				"token": token,
				"profile": model.profile,
				"threshold": model.threshold,
				"infected": infected
			};
			break;
		case "IndependentCascades":
			url = urls.modelIndependentCascades;
			data = {
				"token": token,
				"infected": infected
			};
			break;
		case "Voter":
			url = urls.modelVoter;
			data = {
				"token": token,
				"infected": infected
			};
			break;
		case "QVoter":
			url = urls.modelQVoter;
			data = {
				"token": token,
				"q": model.q,
				"infected": infected
			};
			break;
		case "MajorityRule":
			url = urls.modelMajorityRule;
			data = {
				"token": token,
				"q": model.q,
				"infected": infected
			};
			break;
		case "Sznajd":
			url = urls.modelSznajd;
			data = {
				"token": token,
				"infected": infected
			};
			break;
		case "KerteszThreshold":
			url = urls.modelKerteszThreshold;
			data = {
				"token": token,
				"infected": infected,
				"adopter_rate": model.adopter_rate,
				"blocked": model.blocked,
				"threshold": model.threshold
			};
			break;
		case "CognitiveOpinionDynamic":
			url = urls.modelCognitiveOpinionDynamic;
			data = {
				"token": token,
				"I": model.I,
				"T_range_min": model.T_range_min,
				"T_range_max": model.T_range_max,
				"B_range_min": model.B_range_min,
				"B_range_max": model.B_range_max,
				"R_fraction_negative": model.R_fraction_negative,
				"R_fraction_neutral": model.R_fraction_neutral,
				"R_fraction_positive": model.R_fraction_positive
			};
			break;
		default:
			UI.showAlert("No valid model specified!", "No valid model has been specified!", "danger");
			return null;
	}
	return $.ajax({
		method: url.type,
		url: url.url,
		crossDomain: true,
		data: data,
		cache: false
	});
};

/**
 * set a simulation network with parameters on the server
 *
 * @param token
 *    the token of the current experiment
 */
ndlibConnector.setNetwork = function (token) {
	let data, url;
	const network = ndlibConnector.networks;
	const urls = ndlibConnector.urls;

	switch (ndlibConnector.networks.chosenNetwork) {
		case "completeGraph":
			url = urls.completeGraph;
			data = {
				"token": token,
				"n": network.n
			};
			break;
		case "ERGraph":
			url = urls.ERGraph;
			data = {
				"token": token,
				"n": network.n,
				"p": network.p,
				"directed": network.directed
			};
			break;
		case "BAGraph":
			url = urls.BAGraph;
			data = {
				"token": token,
				"n": network.n,
				"m": network.m
			};
			break;
		case "WSGraph":
			url = urls.WSGraph;
			data = {
				"token": token,
				"n": network.n,
				"p": network.p,
				"k": network.k
			};
			break;
		default:
			// check if one of the exploratories has been selected
			const selectedExploratory = ndlibConnector.exploratories[ndlibConnector.networks.chosenNetwork];
			if (selectedExploratory) {
				url = urls.exploratory;
				data = {
					"token": token,
					"exploratory": selectedExploratory.name
				};
				break;
			}
			UI.showAlert("No valid network specified!", "No valid network has been specified!", "danger");
			return null;
	}
	return $.ajax({
		method: url.type,
		url: url.url,
		crossDomain: true,
		data: data,
		cache: false
	});
};

/**
 * deletes all data from the server to free up resources
 *
 * @param token
 *    the token of the current experiment
 */
ndlibConnector.cleanUp = function (token) {
	let url = ndlibConnector.urls.deleteNetwork;
	return $.ajax({
		method: url.type,
		url: url.url,
		crossDomain: true,
		data: {
			"token": token
		},
		cache: false
	}).then(function () {
		url = ndlibConnector.urls.resetExperiment;
		$.ajax({
			method: url.type,
			url: url.url,
			crossDomain: true,
			data: {
				"token": token
			},
			cache: false
		}).then(function () {
			url = ndlibConnector.urls.deleteExperiment;
			$.ajax({
				method: url.type,
				url: url.url,
				crossDomain: true,
				data: {
					"token": token
				},
				cache: false
			});
		});
	});
};
