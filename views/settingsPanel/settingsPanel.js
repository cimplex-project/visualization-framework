
/**
 * A view with settings that allow the user to choose data source,
 * simulation and presentation.
 */
class SettingsPanel extends View {
	constructor(params) {
		super(params);

		/**
		 * Data for Settings GUI
		 */
		this.settings = {};

		/**
		 * Load templates
		 */
		this.template = $.get("./views/settingsPanel/settingsPanel_template.html").promise().then(template => {
			return Mustache.render(template, this.settings);
		});

		this.childWindowTemplate = $.get("./views/settingsPanel/settingsPanel_loading.html").promise().then(template => {
			return Mustache.render(template, this.settings);
		});

		// subscribed events
		DISPATCH.on(`initializeView.${this.name}`, param => {
			if (param.includes("settingsPanel")) {
				if (isChildWindow()) {
					broadcaster.getInit();
				}
				this.modelSettings = {};
				// config dependent attributes can only be set here
				this.activate();
				this.setStyleSelectors(lib.getSelectorsForColumnType(CONFIG.UI.viewColumns), false);
				this.setHeight(Math.floor(VIEW_CONTAINER_HEIGHT / CONFIG.UI.viewRows) + 10, false);
				this.maximizeView();
				this.views = getRegisteredViews().map(view => {
					return {
						name: view.name,
						icon: view.icon,
						active: true
					};
				});
				UI.hideLeftToolbar();
				this.draw();
			}
		});

		/**
		 * Hides the settings panel and shows selected (supported) views.
		 */
		DISPATCH.on(`onSimulationCompleted.${this.name}`, () => {
			if (!isChildWindow()) {
				// hide and show views based on selection
				if (this.views) {
					const activeViews = [];
					const notActiveViews = [];
					this.views.forEach(view => {
						view.active ? activeViews.push(view.name) : notActiveViews.push(view.name);
					});
					DISPATCH.reactivateView(activeViews);
					DISPATCH.deactivateView(notActiveViews);
				}
			}

			// always hide settings
			DISPATCH.deactivateView(this.name);

			// reactivate apply button
			$("#serviceButton").prop("disabled", false);
		});

		/**
		 * Deactivate settings panel and shows toolbar.
		 */
		DISPATCH.on(`deactivateView.${this.name}`, param => {
			if (param.includes("settingsPanel")) {
				// redraw toolbar if view was deactivated
				if (!isChildWindow()) {
					UI.showLeftToolbar();
					UI.drawToolbar();
				}
				this.deactivate();

				if (isChildWindow()) {
					const viewName = window.location.href.substring(window.location.href.indexOf("#") + 1);
					if (viewName.length > 0) {
						{
							getRegisteredViews().forEach(view => {
								if (view.name !== viewName) {
									//  DISPATCH.deactivateView([view.name]);
								}
								else {
									DISPATCH.reactivateView([view.name]);
									view.maximize();
								}
							});
						}
					}

				}
			}
		});

		/**
		 * Reactivate settings panel and hides toolbar.
		 */
		DISPATCH.on(`reactivateView.${this.name}`, param => {
			if (param.includes("settingsPanel")) {
				UI.hideLeftToolbar();
				this.visibleViews = getRegisteredViews().filter(view => view.active);
				this.reactivate();
			}
		});

		this.setDrawFunction(this.drawSettingsPanel);
	}

	/**
	 * Disables all inputs for a given selector.
	 */
	disableAll(selector) {
		$(selector).find("input").prop("disabled", true);
	}

	/**
	 * Sets the settings graph used for data services.
	 */
	setDataGraph() {
		if (this.selectedConnector) {
			document.querySelectorAll("#simulations > * > input[type=\"radio\"]").forEach(input => {
				if (this.selectedConnector.supportedSimulations.indexOf(input.value) > -1) {
					input.disabled = false;
				} else {
					input.disabled = true;
				}
			});

			document.querySelectorAll("#visualizations > * > input[type=\"radio\"]").forEach(input => {
				if (this.selectedConnector.supportedVisualizations.indexOf(input.value) > -1) {
					input.disabled = false;
				} else {
					input.disabled = true;
				}
			});
		}
	}

	/**
	 * Sets the settings graph used for simulation services.
	 */
	setSimulationGraph() {
		if (this.selectedConnector) {
			document.querySelectorAll("#visualizations > * > input[type=\"radio\"]").forEach(input => {
				if (this.selectedConnector.supportedVisualizations.indexOf(input.value) > -1) {
					input.disabled = false;
				} else {
					input.disabled = true;
				}
			});
		}
	}

	/**
	 * Resets the data panel.
	 */
	resetDataPanel() {
		document.querySelectorAll("#datas > * > input[type=\"radio\"]").forEach(input => {
			input.disabled = false;
			input.checked = false;
		});
	}

	/**
	 * Resets the simulations panel.
	 */
	resetSimulationsPanel() {
		document.querySelectorAll("#simulations > * > input[type=\"radio\"]").forEach(input => {
			input.disabled = false;
			input.checked = false;
		});
	}

	/**
	 * Resets the visualization panel.
	 */
	resetVisualizationPanel() {
		$("#serviceButton").prop("disabled", true);
		$("#visframeworkPanel").hide();
		document.querySelectorAll("#visualizations > * > input[type=\"radio\"]").forEach(input => {
			input.disabled = false;
			input.checked = false;
		});
	}

	/**
	 * Deactivates all views except the settings panel.
	 */
	hideOtherViews() {
		DISPATCH.deactivateView(getRegisteredViews().filter(view => {
			return view.name !== this.name;
		}).map(view => {
			return view.name;
		}));
	}

	/**
	 * Serializes the form input fields.
	 */
	serializeForm() {
		const graphForm = $("#graphForm").serializeArray();
		$.each(graphForm, (i, v) => {
			if (v.name === "data") {
				// handle mobility service exception (pure data service which can be shown in the tool)
				this.modelSettings["service"] = v.value;
			} else if (v.name === "simulations") {
				// convert "simulation" property to "service"
				this.modelSettings["service"] = v.value;
			}
			this.modelSettings[v.name] = v.value;
		});
	}

	/**
	 * Maximizes the settingspanel to full width and height.
	 */
	maximizeView() {
		// call with true to maximize to 100%
		this.maximize(true);
		this.heightChanged = true;
		this.widthChanged = true;
	}

	/**
	 * Creates the view.
	 */
	drawSettingsPanel() {
		if (!isChildWindow()) {
			this.template
				.then(rendered => {
					if (this.rendered === undefined) {
						this.clear();
						this.hideOtherViews();

						// append template to view
						$("#settingsPanelContainer > .view").html(rendered);

						// if no connector was selected up until now hide the cancel button
						if (CONNECTOR.name === undefined) {
							$("#cancelButton").hide();
						} else {
							$("#cancelButton").show();
						}

						// render all data_sources
						const dataSourceDiv = document.getElementById("data");
						getRegisteredDataSources().forEach(connector => {
							dataSourceDiv.insertAdjacentHTML("afterbegin", `
							<label style="text-align: center;">
								<input type="radio" name="data" value="${connector.name}">
								<div class="graphItem">
									<img src="${connector.previewUrl}" height="64">
									<h6 style="margin-bottom: 0px">${connector.title}</h6>
									<small>${connector.description}</small>
								</div>
							</label>
						`);
						});

						// render all simulations
						const simulationServicesDiv = document.getElementById("simulations");
						getRegisteredSimulationServices().forEach(connector => {
							simulationServicesDiv.insertAdjacentHTML("afterbegin", `
							<label style="text-align: center;">
								<input type="radio" name="simulations" value="${connector.name}">
								<div class="simulationItem">
									<img src="${connector.previewUrl}" height="64">
									<h6 style="margin-bottom: 0px">${connector.title}</h6>
									<small>${connector.description}</small>
								</div>
							</label>
						`);
						});

						// only enable data sources / disable simulation and visualization panel
						this.disableAll("#simulationsPanel");
						this.disableAll("#visualizationPanel");

						// wait for change events from the data source panel
						$("#data > * > input").change(event => {
							$("#dataParameterPanel").empty();
							$("#simulationParameterPanel").empty();
							this.resetSimulationsPanel();
							this.resetVisualizationPanel();
							this.selectedConnector = getConnector(event.target.value);
							this.setDataGraph();
							if (this.selectedConnector) {
								this.selectedConnector.showSettings();
							}
						});

						// wait for change events from the simulation panel
						$("#simulations > * > input").change(event => {
							$("#simulationParameterPanel").empty();
							this.resetVisualizationPanel();
							this.selectedConnector = getConnector(event.target.value);
							this.setSimulationGraph();
							if (this.selectedConnector) {
								this.selectedConnector.showSettings();
							}
						});

						// check radio input on visualization panel
						$("#visualizations > * > input").change(event => {
							$("#serviceButton").prop("disabled", false);
							if (event.target.value === "visframework") {
								$("#visframeworkPanel").show();
								// append the available views to the panel
								const availableViews = getRegisteredViews()
									.map(d => d.name)
									.filter(d => d !== this.name && !this.selectedConnector.hiddenViews.includes(d));
								this.drawViewButtons(availableViews);
							} else {
								$("#visframeworkPanel").hide();
							}
						});

						// cancel button
						$("#cancelButton").click(event => {
							DISPATCH.deactivateView(this.name);
							if (this.visibleViews) {
								this.visibleViews.forEach(view => {
									DISPATCH.reactivateView([view.name]);
								});
								this.visibleViews = undefined;
								// redraw toolbar if view was deactivated
								UI.showLeftToolbar();
								UI.drawToolbar();
							}
						});

						// check if form was submitted
						$("#graphForm").submit(event => {
							event.preventDefault();

							// disable apply button
							$("#serviceButton").prop("disabled", true);

							$("#cancelButton").hide();
							UI.hideLeftToolbar();
							this.serializeForm();

							// visualize all
							controller.getModel(this.modelSettings);
						});
						this.rendered = true;
					} else {
						this.hideOtherViews();
						if (CONNECTOR.name === undefined) {
							$("#cancelButton").hide();
						} else {
							$("#cancelButton").show();
						}
					}
				});
		} else {
			this.childWindowTemplate.then(rendered => {
				if (this.rendered === undefined) {
					this.clear();
					this.hideOtherViews();
					$("#settingsPanelContainer > .view").html(rendered);
				}
			});
		}
	}

	/**
	 * Creates a button representing a supported view.
	 */
	createViewButton(view) {
		const button = document.createElement("button");
		button.setAttribute("type", "button");
		button.innerHTML = `${view.icon} ${view.title}`;
		button.style.color = view.active ? "steelblue" : "gray";
		button.addEventListener("click", event => {
			view.active = !view.active;
			button.style.color = view.active ? "steelblue" : "gray";
		});
		return button;
	}

	/**
	 * Shows which views are supported by the currently selected service and data.
	 */
	drawViewButtons(availableViews) {
		// only render buttons that are enabled in the controller
		this.views = getRegisteredViews()
			.filter(view => availableViews.indexOf(view.name) > -1)
			.map(view => {
				return {
					name: view.name,
					title: view.title,
					icon: view.icon,
					active: true
				};
			});

		$("#visframeworkPanelViews").empty();
		this.views.forEach(view => {
			const button = this.createViewButton(view);
			document.getElementById("visframeworkPanelViews").appendChild(button);
		});
	}

	/**
	 * Overwrites prototype function.
	 */
	resized() {
		// just do nothing (stay full size)
	}
}


const settingsPanelView = new SettingsPanel({
	name: "settingsPanel",
	title: "Data Source, Simulation and Visualization Settings",
	icon: "<i class=\"fa fa-cog fa-fw\"></i>",
	hasSettings: false,
	canChangeHeight: false,
	canChangeWidth: false,
	canMaximize: false,
	cannotOpenInNewWindow: true
});
