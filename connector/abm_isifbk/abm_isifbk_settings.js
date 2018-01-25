/**
 * Handle login
 */
abm_isifbk_Connector.handleLogin = function () {
	const username = $("#isifbkUsername").val();
	const password = $("#isifbkPassword").val();
	return GleamViz.logout()
		.then(() => GleamViz.login(username, password))
		.catch(() => GleamViz.login(username, password));
};

/**
 * handles if the settings page was removed (by selecting another connector
 */
abm_isifbk_Connector.handleSettingsViewRemoved = function () {
	// if this view gets removed by selecting another controller
	// -> logout user and show apply button again
	if (abm_isifbk_Connector.observer) {
		abm_isifbk_Connector.observer.disconnect();
		abm_isifbk_Connector.observer = undefined;
	}

	// use a mutationobserver to listen so changes to the settings view
	abm_isifbk_Connector.observer = new MutationObserver(mutations => {
		mutations.forEach(mutation => {
			mutation.removedNodes.forEach(element => {
				if (element.id === "isifbkSettings") {
					$("#serviceButton").show();
					abm_isifbk_Connector.observer.disconnect();
					abm_isifbk_Connector.observer = undefined;
				}
			});
		});
	});

	abm_isifbk_Connector.observer.observe(document.getElementById("simulationParameterPanel"), {
		childList: true
	});
};

/**
 * Removes the interval for fetching simulation updates
 */
abm_isifbk_Connector.clearInterval = function () {
	// clear current running intervals
	if (abm_isifbk_Connector.intervalId) {
		clearInterval(abm_isifbk_Connector.intervalId);
		abm_isifbk_Connector.intervalId = undefined;
	}
};

/**
 * Handles if a completed simulation was selected
 */
abm_isifbk_Connector.handleCompletedSimulation = function () {
	$("#isifbkCreateSimulationView").hide();
	$("#isifbkSimulationEditView").show();
	$("#isifbkVisualizationSettingsView").show();
	$("#serviceButton").show();
	$("#isifbkSimulationProgress").addClass("progress-bar-success");
	$("#isifbkSimulationProgress").removeClass("progress-striped");
	$("#isifbkProgressText").text("Completed");
};

/**
 * Handles if a running simulation was selected
 */
abm_isifbk_Connector.handleRunningSimulation = function () {
	$("#isifbkCreateSimulationView").hide();
	$("#isifbkSimulationEditView").show();
	$("#isifbkVisualizationSettingsView").hide();
	$("#isifbkSimulationProgress").removeClass("progress-bar-success");
	$("#isifbkSimulationProgress").addClass("progress-striped");
	$("#isifbkProgressText").text("Running");

	// register an interval that checks every 10 seconds if the
	// simulation has finished
	abm_isifbk_Connector.intervalId = setInterval(() => {
		GleamViz.getinfo(abm_isifbk_Connector.selectedSimulation.id)
			.then(data => {
				if (data.status !== "running") {
					// update status & trigger update
					const index = abm_isifbk_Connector.filteredSimulations.findIndex(simulation => data.id === simulation.id);
					abm_isifbk_Connector.filteredSimulations[index].status = data.status;
					$("#isifbkIdSelect").trigger("change");
				}
			});
	}, 10000);
};

/**
 * handles if a new simulation was selected
 */
abm_isifbk_Connector.handleNewSimulation = function () {
	$("#serviceButton").hide();
	$("#isifbkCreateSimulationView").show();
	$("#isifbkVisualizationSettingsView").hide();
	$("#isifbkSimulationEditView").hide();
};

/**
 * Handles if a simulation was selected from the select element
 */
abm_isifbk_Connector.handleSimulationSelected = function () {
	$("#isifbkIdSelect").change(event => {
		const index = event.target.selectedIndex;

		// if select has changed clear all remaining intervals, if any
		abm_isifbk_Connector.clearInterval();

		if (index !== 0) {
			// valid simulation was selected
			abm_isifbk_Connector.selectedSimulation = abm_isifbk_Connector.filteredSimulations[index];
			if (abm_isifbk_Connector.selectedSimulation.status === "completed") {
				abm_isifbk_Connector.handleCompletedSimulation();
			} else {
				abm_isifbk_Connector.handleRunningSimulation();
			}
		} else {
			// new simulation was selected
			abm_isifbk_Connector.handleNewSimulation();
		}
	});
};

/**
 * Handles the click on the delete simulation button
 */
abm_isifbk_Connector.handleDeleteSimulation = function () {
	$("#isifbkDelete").click(() => {
		if (abm_isifbk_Connector.selectedSimulation) {
			const id = abm_isifbk_Connector.selectedSimulation.id;
			GleamViz.remove(id)
				.then(() => {
					$(`#isifbkIdSelect option[value="${id}"]`).each(function () {
						$(this).remove();
					});
					// find current selected id in array and remove it
					const index = abm_isifbk_Connector.filteredSimulations.findIndex(simulation => simulation.id === id);
					abm_isifbk_Connector.filteredSimulations.splice(index, 1);
					abm_isifbk_Connector.selectedSimulation = undefined;
					// trigger update
					$("#isifbkIdSelect").val("0").change();
				});
		}
	});
};

/**
 * Hanldes the click on the create simulation button
 */
abm_isifbk_Connector.handleCreateSimulation = function () {
	$("#isifbkCreate").click(() => {
		// craete a new simulation & select it
		GleamViz.create(abm_isifbk_Connector.settings.templates[$("#isifbkTemplateSelect").prop("selectedIndex")].simulation)
			.then(response => {
				const id = response.id;
				const promises = [GleamViz.getinfo(id), GleamViz.getdef(id)];
				Promise.all(promises)
					.then(value => {
						// gather definition and information of the simulation and create a new simulation entry
						const xml = new DOMParser().parseFromString(value[1], "application/xml");
						const simulation = {
							id: value[0].id,
							status: value[0].status,
							definition: value[1],
							name: xml.querySelector("definition").getAttribute("name")
						};
						abm_isifbk_Connector.filteredSimulations.push(simulation);
						// append new simulation to selection & trigger update
						$("#isifbkIdSelect").append(`<option value="${simulation.id}">${simulation.name}</option>`);
						$("#isifbkIdSelect").val(value[0].id).change();
					});
			});
	});

};

/**
 * Fetch all current simulations and add them to the select box
 */
abm_isifbk_Connector.fetchSimulations = function () {
	GleamViz.listall()
		.then(simulations => {
			const promises = [];
			abm_isifbk_Connector.filteredSimulations = [{
				name: "Create new simulation",
				id: 0
			}];
			simulations.forEach(simulation => {
				if (simulation.type === "multi-run") {
					abm_isifbk_Connector.filteredSimulations.push({
						id: simulation.id,
						status: simulation.status
					});
					promises.push(GleamViz.getdef(simulation.id));
				}
			});

			// wait until all simulation info is received
			Promise.all(promises)
				.then(values => {
					const removeIds = [];
					const domParser = new DOMParser();
					values.forEach((value, index) => {
						const xml = domParser.parseFromString(value, "application/xml");
						abm_isifbk_Connector.filteredSimulations[index + 1].definition = value;
						abm_isifbk_Connector.filteredSimulations[index + 1].name = xml.querySelector("definition").getAttribute("name");
						const abmId = xml.querySelector("definition").getAttribute("abm_id");
						if (abm_isifbk_Connector.filterDFKI) {
							if (abmId !== "FBK-IT-DFKI") {
								removeIds.push(index + 1);
							}
						} else {
							if (abmId === "FBK-IT-DFKI") {
								removeIds.push(index + 1);
							}
						}
					});

					// remove ids from simulations (needed for dkfi)
					abm_isifbk_Connector.filteredSimulations =
						abm_isifbk_Connector.filteredSimulations.filter((simulation, index) => {
							return removeIds.indexOf(index) === -1;
						});

					// reenable selection and add simulation to select
					$("#isifbkIdSelect").prop("disabled", false);
					abm_isifbk_Connector.filteredSimulations.forEach(simulation => {
						$("#isifbkIdSelect").append(`<option value="${simulation.id}">${simulation.name}</option>`);
					});

					// always select new
					$("#isifbkIdSelect").val("0").change();
				});
		});
};

/**
 * Display service settings in settingsPanel view
 */
abm_isifbk_Connector.showSettings = function () {
	abm_isifbk_Connector.template
		.then((template) => {

			// switch presets based on dfki or abm
			if (abm_isifbk_Connector.filterDFKI) {
				abm_isifbk_Connector.settings.templates = abm_isifbk_Connector.templatesDFKI;
			} else {
				abm_isifbk_Connector.settings.templates = abm_isifbk_Connector.templatesFBK;
			}

			// stamp template to view
			const rendered = Mustache.render(template, abm_isifbk_Connector.settings);
			$("#simulationParameterPanel").html(rendered);

			// show login view
			$("#isifbkSimulationLoginView").show();

			// login button pressed
			$("#isifbkLogin").click(() => {
				// login in to gleamviz
				abm_isifbk_Connector.handleLogin()
					.then(() => {
						$("#isifbkSimulationLoginView").hide();
						$("#isifbkSimulationListView").show();

						$("#isifbkInfo").click(() => {
							$("#isifbkInformationDialogContent").text(abm_isifbk_Connector.selectedSimulation.definition);
						});

						abm_isifbk_Connector.handleSettingsViewRemoved();
						abm_isifbk_Connector.handleSimulationSelected();
						abm_isifbk_Connector.handleDeleteSimulation();
						abm_isifbk_Connector.handleCreateSimulation();
						abm_isifbk_Connector.fetchSimulations();
					}).catch((e) => {
						if (e === "UNAUTHORIZED") {
							UI.showAlert("Error", "Wrong username or password provided.", "danger");
						} else {
							UI.showAlert("Error", "Cannot connect to server. Please check if the SSL certificate has been added.", "danger");
						}
					});

			});
		});
};