/**
 * Handle login
 */
nds_isi_Connector.handleLogin = function () {
	const username = $("#ndsIsiUsername").val();
	const password = $("#ndsIsiPassword").val();
	return GleamViz.logout()
		.then(() => GleamViz.login(username, password))
		.catch(() => GleamViz.login(username, password));
};

/**
 * handles if the settings page was removed (by selecting another connector
 */
nds_isi_Connector.handleSettingsViewRemoved = function () {
	// if this view gets removed by selecting another controller
	// -> logout user and show apply button again
	if (nds_isi_Connector.observer) {
		nds_isi_Connector.observer.disconnect();
		nds_isi_Connector.observer = undefined;
	}

	// use a mutationobserver to listen so changes to the settings view
	nds_isi_Connector.observer = new MutationObserver(mutations => {
		mutations.forEach(mutation => {
			mutation.removedNodes.forEach(element => {
				if (element.id === "isiSettings") {
					$("#serviceButton").show();
					nds_isi_Connector.observer.disconnect();
					nds_isi_Connector.observer = undefined;
				}
			});
		});
	});

	nds_isi_Connector.observer.observe(document.getElementById("simulationParameterPanel"), {
		childList: true
	});
};

/**
 * Removes the interval for fetching simulation updates
 */
nds_isi_Connector.clearInterval = function () {
	// clear current running intervals
	if (nds_isi_Connector.intervalId) {
		clearInterval(nds_isi_Connector.intervalId);
		nds_isi_Connector.intervalId = undefined;
	}
};

/**
 * Handles if a completed simulation was selected
 */
nds_isi_Connector.handleCompletedSimulation = function () {
	// remove current compartments from select boxes
	$("#isiOutputSelect").find("option").remove();
	$("#isiTravelSelect").find("option").remove();
	// append compartment to select boxes
	nds_isi_Connector.selectedSimulation.compartments.forEach(compartment => {
		$("#isiOutputSelect").append(`<option value="${compartment}">${compartment}</option>`);
		$("#isiTravelSelect").append(`<option value="${compartment}">${compartment}</option>`);
	});
	$("#isiCreateSimulationView").hide();
	$("#isiSimulationEditView").show();
	$("#isiVisualizationSettingsView").show();
	$("#serviceButton").show();
	$("#isiSimulationProgress").addClass("progress-bar-success");
	$("#isiSimulationProgress").removeClass("progress-striped");
	$("#isiProgressText").text("Completed");
};

/**
 * Handles if a running simulation was selected
 */
nds_isi_Connector.handleRunningSimulation = function () {
	$("#isiCreateSimulationView").hide();
	$("#isiSimulationEditView").show();
	$("#isiVisualizationSettingsView").hide();
	$("#isiSimulationProgress").removeClass("progress-bar-success");
	$("#isiSimulationProgress").addClass("progress-striped");
	$("#isiProgressText").text("Running");

	// register an interval that checks every 10 seconds if the
	// simulation has finished
	nds_isi_Connector.intervalId = setInterval(() => {
		GleamViz.getinfo(nds_isi_Connector.selectedSimulation.id)
			.then(data => {
				if (data.status !== "running") {
					// update status & trigger update
					const index = nds_isi_Connector.filteredSimulations.findIndex(simulation => data.id === simulation.id);
					nds_isi_Connector.filteredSimulations[index].status = data.status;
					$("#isiIdSelect").trigger("change");
				}
			});
	}, 10000);
};

/**
 * handles if a new simulation was selected
 */
nds_isi_Connector.handleNewSimulation = function () {
	$("#serviceButton").hide();
	$("#isiCreateSimulationView").show();
	$("#isiVisualizationSettingsView").hide();
	$("#isiSimulationEditView").hide();
};

/**
 * Handles if a simulation was selected from the select element
 */
nds_isi_Connector.handleSimulationSelected = function () {
	$("#isiIdSelect").change(event => {
		const index = event.target.selectedIndex;

		// if select has changed clear all remaining intervals, if any
		nds_isi_Connector.clearInterval();

		if (index !== 0) {
			// valid simulation was selected
			nds_isi_Connector.selectedSimulation = nds_isi_Connector.filteredSimulations[index];
			if (nds_isi_Connector.selectedSimulation.status === "completed") {
				nds_isi_Connector.handleCompletedSimulation();
			} else {
				nds_isi_Connector.handleRunningSimulation();
			}
		} else {
			// new simulation was selected
			nds_isi_Connector.handleNewSimulation();
		}
	});
};

/**
 * Handles the click on the delete simulation button
 */
nds_isi_Connector.handleDeleteSimulation = function () {
	$("#isiDelete").click(() => {
		if (nds_isi_Connector.selectedSimulation) {
			const id = nds_isi_Connector.selectedSimulation.id;
			GleamViz.remove(id)
				.then(() => {
					$(`#isiIdSelect option[value="${id}"]`).each(function () {
						$(this).remove();
					});
					// find current selected id in array and remove it
					const index = nds_isi_Connector.filteredSimulations.findIndex(simulation => simulation.id === id);
					nds_isi_Connector.filteredSimulations.splice(index, 1);
					nds_isi_Connector.selectedSimulation = undefined;
					// trigger update
					$("#isiIdSelect").val("0").change();
				});
		}
	});
};

/**
 * Handles the click on the create simulation button
 */
nds_isi_Connector.handleCreateSimulation = function () {
	$("#isiCreate").click(() => {
		// craete a new simulation & select it
		GleamViz.create(nds_isi_Connector.settings.templates[$("#isiTemplateSelect").prop("selectedIndex")].simulation)
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
							name: xml.querySelector("definition").getAttribute("name"),
							duration: +xml.querySelector("parameters").getAttribute("duration"),
							start: new Date(xml.querySelector("parameters").getAttribute("startDate")),
							compartments: []
						};
						xml.querySelectorAll("resultCompartments > id").forEach(d => {
							simulation.compartments.push(d.innerHTML);
						});
						nds_isi_Connector.filteredSimulations.push(simulation);
						// append new simulation to selection & trigger update
						$("#isiIdSelect").append(`<option value="${simulation.id}">${simulation.name}</option>`);
						$("#isiIdSelect").val(value[0].id).change();
					});
			});
	});
};

/**
 * Fetch all current simulations and add them to the select box
 */
nds_isi_Connector.fetchSimulations = function () {
	GleamViz.listall()
		.then(simulations => {
			const promises = [];
			nds_isi_Connector.filteredSimulations = [{
				name: "Create new simulation",
				id: 0
			}];
			simulations.forEach(simulation => {
				if (simulation.type === "single-run") {
					nds_isi_Connector.filteredSimulations.push({
						id: simulation.id,
						status: simulation.status
					});
					promises.push(GleamViz.getdef(simulation.id));
				}
			});

			// wait until all simulation info is received
			Promise.all(promises)
				.then(values => {
					const domParser = new DOMParser();
					values.forEach((value, index) => {
						const xml = domParser.parseFromString(value, "application/xml");
						nds_isi_Connector.filteredSimulations[index + 1].definition = value;
						nds_isi_Connector.filteredSimulations[index + 1].name = xml.querySelector("definition").getAttribute("name");
						nds_isi_Connector.filteredSimulations[index + 1].duration = +xml.querySelector("parameters").getAttribute("duration");
						nds_isi_Connector.filteredSimulations[index + 1].start = new Date(xml.querySelector("parameters").getAttribute("startDate"));
						nds_isi_Connector.filteredSimulations[index + 1].compartments = [];
						xml.querySelectorAll("resultCompartments > id").forEach(id => {
							nds_isi_Connector.filteredSimulations[index + 1].compartments.push(id.innerHTML);
						});
					});

					// reenable selection and add simulation to select
					$("#isiIdSelect").prop("disabled", false);
					nds_isi_Connector.filteredSimulations.forEach(simulation => {
						$("#isiIdSelect").append(`<option value="${simulation.id}">${simulation.name}</option>`);
					});

					// always select new
					$("#isiIdSelect").val("0").change();
				});
		});
};

/**
 * Display service settings in settingsPanel view
 */
nds_isi_Connector.showSettings = function () {
	nds_isi_Connector.template
		.then((rendered) => {
			// stamp template to view
			$("#simulationParameterPanel").html(rendered);

			// show login view
			$("#isiSimulationLoginView").show();

			// login button pressed
			$("#ndsIsiLogin").click(() => {
				// login in to gleamviz
				nds_isi_Connector.handleLogin()
					.then(() => {
						$("#isiSimulationLoginView").hide();
						$("#isiSimulationListView").show();

						$("#isiInfo").click(() => {
							$("#isiInformationDialogContent").text(nds_isi_Connector.selectedSimulation.definition);
						});

						nds_isi_Connector.handleSettingsViewRemoved();
						nds_isi_Connector.handleSimulationSelected();
						nds_isi_Connector.handleDeleteSimulation();
						nds_isi_Connector.handleCreateSimulation();
						nds_isi_Connector.fetchSimulations();
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