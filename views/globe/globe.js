"use strict";
/**
 * This file contains code for the globe view.
 */
class Globe extends View {
	constructor(params) {
		super(params);

		// subscribed events
		DISPATCH.on(`initializeView.${this.name}`, param => {
			if (param.includes(this.name)) {
				this.activate();
				this.viewDiv.html(`
				<div style="display: block; float: right; position: absolute; bottom: 0px; right: 20px; background: rgba(255, 255, 255, 0.7); font-size: 11px;">
					<p> Tileset light_gray, light_gray(no labels), dark and dark(no labels) &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a></p>
					<p> Tileset sattelite &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community
				</div>
				`);
				const container = this.viewDiv[0][0];
				try {
					this.app = new CimplexGlobeView(container, {
						enableGlobe: true,
						showStats: false,
						enableVR: true,
						basinsLoaded: () => {
							if (CRXFILTER.currentData.model.regions && !this.app.ready) {
								this.app.ready = true;
								this.app.loadRegions({
									features: CRXFILTER.currentData.model.regions
								}, {
										idGenerator: this.idGenerator
									});
							}
							this.app.ready = true;
							this.app.showBoundaries = false;
							this.updateGlobe(this);
						}
					});
				} catch (x) {
					const errorMsg = "Error creating Globe, probably WebGL is not supported";
					console.error(errorMsg);
					console.error(x);
					this.app = {
						error: x,
						errorMsg: errorMsg
					};
					this.deactivate();
					return;
				}

				this.setStyleSelectors(lib.getSelectorsForColumnType(CONFIG.UI.viewColumns), false);
				this.setHeight(Math.floor(VIEW_CONTAINER_HEIGHT / CONFIG.UI.viewRows), false);
				this.draw();
				this.app.urlCallback = (level, x, y) => {
					if (CONFIG.globe.tileLayer === "darkGray") {
						return `http://s.basemaps.cartocdn.com/dark_all/${level}/${x}/${y}.png`;
					}
					return `http://s.basemaps.cartocdn.com/light_nolabels/${level}/${x}/${y}.png`;
				};

				this.transitionsSettings = {
					lines: CONFIG.globe.transitionsAsLines,
					height: CONFIG.globe.transitionHeight,
					width: CONFIG.globe.transitionWidth,
					animate: CONFIG.globe.transitionsAnimated,
					color: CONFIG.globe.transitionColor
				};

				this.app.showBasins = CONFIG.globe.showBasins;
				this.app.showBoundaries = CONFIG.globe.showBoundaries;
				this.app.showGLobe = CONFIG.globe.showGlobe;
				this.app.showTransitions = CONFIG.globe.showTransitions;
				this.app.basinsHeight = CONFIG.globe.maxBasinHeight;
				this.app.enablePostprocessing = CONFIG.globe.postProcessing;
				this.app.sphericalMapping = CONFIG.globe.sphericalMapping;
				// TODO: globe should use MAPPING.nodeColor(valueToMap) instead for consistency
				// probably need to create an array so this.app can use it
				this.app.basinsColorLookup = CONFIG.UI.darkTheme ? this.toHexArray(colorbrewer.Blues[9].slice(0).reverse()) :
					this.toHexArray(colorbrewer.Oranges[9]);
				this.currentHighlightTransitions = [];

				// add button for community display
				this.communityButton = this.addButton({
					title: "Color shows communities / number of transitions",
					icon: "<i class=\"fa fa-group fa-fw\"></i>",
					clickFunction: () => {
						if (CONFIG.filter.showCommunities) {
							CONFIG.globe.showCommunities = !CONFIG.globe.showCommunities;
							this.updateGlobe(this);
						}
					}
				});

				// add button for camera reset
				this.resetCamera = this.addButton({
					title: "Reset Camera",
					icon: "<i class=\"fa fa-eraser fa-fw\"></i>",
					clickFunction: () => {
						if (this.app) {
							this.app.resetCamera();
						}
					}
				});

				// add button for projection
				this.switchProjection = this.addButton({
					title: "Switch Projection",
					icon: "<i class=\"fa fa-map fa-fw\"></i>",
					clickFunction: () => {
						if (this.app) {
							this.app.sphericalMapping = !this.app.sphericalMapping;
							// TODO: @DFKI: would you like to keep this? if not please remove
							// this.querySelector("i").classList.toggle("fa-map");
							// this.querySelector("i").classList.toggle("fa-globe");
						}
					}
				});

				// add button to switch to vr
				this.toggleVR = this.addButton({
					title: "Toggle VR",
					icon: "<i class=\"glyphicon glyphicon-sunglasses fa-fw\"></i>",
					clickFunction: () => {
						if (this.app) {
							this.app.toggleVR();
						}
					}
				});

				container.addEventListener("basin-picked", event => DISPATCH.startRegionHighlight(event.detail, true));
				container.addEventListener("basin-released", event => DISPATCH.endHighlight());
			}
		});

		DISPATCH.on(`onRegionFiltered.${this.name}`, () => this.updateGlobe(this));
		DISPATCH.on(`onTimeFiltered.${this.name}`, () => this.updateGlobe(this));
		DISPATCH.on(`onFilterReset.${this.name}`, () => this.updateGlobe(this));
		DISPATCH.on(`onCommunityUpdate.${this.name}`, () => {
			CONFIG.globe.showCommunities = CONFIG.filter.showCommunities;
			this.updateGlobe(this);
		});

		DISPATCH.on(`onRegionHighlight.${this.name}`, (id, self) => {
			if (this.active && this.app.ready) {
				// BUG? missing end event. delete all current hightlights before adding next
				this.currentHighlightTransitions.forEach(transitionsId => {
					this.app.removeTransitionsById(transitionsId);
				});
				this.currentHighlightTransitions = [];

				const filteredTransitions = CRXFILTER.currentData.reducedTransitions.filter(transition => {
					return +id === +transition.sourceRegionId ||
						+id === +transition.targetRegionId;
				});

				const transitions = filteredTransitions.map(transition => {
					return {
						from: +transition.sourceRegionId,
						to: +transition.targetRegionId
					};
				});

				this.currentHighlightTransitions.push(this.app.addTransitions(transitions, this.transitionsSettings));
				this.app.hideTransitionsById(this.currentTransitionsId);
			}
		});

		DISPATCH.on(`onHighlightEnd.${this.name}`, () => {
			if (this.active && this.app.ready && this.currentHighlightTransitions) {
				this.currentHighlightTransitions.forEach(id => {
					this.app.removeTransitionsById(id);
				});
				this.currentHighlightTransitions = [];
				this.app.showTransitionsById(this.currentTransitionsId);
			}
		});

		DISPATCH.on(`onTransitionHighlight.${this.name}`, id => {
			if (this.active && this.app.ready) {
				// BUG? missing end event. delete all current hightlights before adding next
				this.currentHighlightTransitions.forEach(id => {
					this.app.removeTransitionsById(id);
				});
				this.currentHighlightTransitions = [];

				const filteredTransitions = CRXFILTER.currentData.reducedTransitions.filter(transition => {
					return +CRXFILTER.currentData.model.transitionMap.get(+id).sourceRegionId === +transition.sourceRegionId &&
						+CRXFILTER.currentData.model.transitionMap.get(+id).targetRegionId === +transition.targetRegionId;
				});

				const transitions = filteredTransitions.map(transition => {
					return {
						from: +transition.sourceRegionId,
						to: +transition.targetRegionId
					};
				});

				this.currentHighlightTransitions.push(this.app.addTransitions(transitions, this.transitionsSettings));
				this.app.hideTransitionsById(this.currentTransitionsId);
			}
		});

		DISPATCH.on(`deactivateView.${this.name}`, params => {
			if (params.includes(this.name)) {
				if (this.app) {
					this.app.render = false;
				}
				this.deactivate();
			}
		});

		DISPATCH.on(`reactivateView.${this.name}`, params => {
			if (params.includes(this.name) && CRXFILTER.currentData.model.properties.geographicNodes) {
				if (this.app.error) {
					console.error(this.app.errorMsg);
					return;
				}
				this.app.render = true;
				this.reactivate();

				if (this.currentRegions !== CRXFILTER.currentData.model.regions.length) {
					this.app.loadRegions({
						features: CRXFILTER.currentData.model.regions
					}, {
							idGenerator: this.idGenerator
						});
					this.currentRegions = CRXFILTER.currentData.model.regions.length;
				}

				this.updateGlobe(this);
			}
		});

		// set main drawing function
		this.setDrawFunction(() => this.app.resize(this.width, this.height));
		// set settings function
		this.setSettingsFunction(this.settingsFunction);

		this.updateGamepad();
	}

	buildBasinValues(view) {
		const data = CRXFILTER.currentData;
		const basinValues = new Array(CRXFILTER.baseData.regions.length).fill(undefined);
		const colorValues = new Array(CRXFILTER.baseData.regions.length).fill(undefined);

		data.regions.forEach(region => {
			if (data.states && data.states.length > 0) {
				const value = data.states[+region.properties.id];
				if (value > 0) {
					basinValues[+region.properties.id] = value;
					if (CONFIG.globe.showCommunities) {
						colorValues[+region.properties.id] =
							parseInt(MAPPING.communityColor(region.community, data.communityNumber, mapView.name).replace(/^#/, ""), 16);
					}
				}
			} else {
				const value = region.properties.transitionNumber;
				if (value > 0) {
					basinValues[+region.properties.id] = region.properties.transitionNumber;
					if (CONFIG.globe.showCommunities) {
						colorValues[+region.properties.id] =
							parseInt(MAPPING.communityColor(region.community, data.communityNumber, mapView.name).replace(/^#/, ""), 16);
					}
				}
			}
		});
		return view.app.updateBasinValues(basinValues, colorValues);
	}

	buildTransitions(view) {
		const data = CRXFILTER.currentData;
		const transitions = [];
		data.reducedTransitions.forEach(transition => {
			transitions.push({
				from: +transition.source.properties.id,
				to: +transition.target.properties.id,
				weight: +transition.weight
			});
		});

		view.app.clearTransitions();
		view.currentTransitionsId = view.app.addTransitions(transitions, view.transitionsSettings);
	}

	updateGlobe(view) {
		if (this.active && this.app.ready) {
			this.buildBasinValues(view);
			this.buildTransitions(view);
		}
	}

	idGenerator(basin) {
		return +basin.properties.id;
	}

	toHexArray(colorTable) {
		return colorTable.map(color => {
			return parseInt(color.substring(1), 16);
		});
	}

	updateGamepad() {
		if (this.app && this.app._activeVR) {
			const gamepads = navigator.getGamepads();
			const update = false;
			if (gamepads.length > 0) {
				for (let n = 0; n < gamepads.length; ++n) {
					const gamepad = gamepads[n];
					if (gamepad) {
						const axes = gamepad.axes;

						if (axes[0] > 0.5) {
							if (typeof timelineView !== 'undefined') {
								timelineView.pausePlayer();
								timelineView.proceed(CONNECTOR.timelinePlayerSteps, false);
							}
						} else if (axes[0] < -0.5) {
							if (typeof timelineView !== 'undefined') {
								timelineView.pausePlayer();
								timelineView.proceed(CONNECTOR.timelinePlayerSteps, true);
							}
						}

						const buttons = gamepad.buttons;
						const buttonIndex = 3;

						if (buttons.length > 0) {
							if (buttons[buttonIndex].pressed) {
								this._lastPressed = buttons[buttonIndex].pressed;
							}

							if (!buttons[buttonIndex].pressed && this._lastPressed) {
								if (this.app) {
									this.app.sphericalMapping = !this.app.sphericalMapping;
								}
								this._lastPressed = false;
							}
						}
					}
				}
			}
		}

		setTimeout(() => {
			this.updateGamepad();
		}, 100);
	}


	/**
	 * Function to create view settings
	 */
	settingsFunction() {
		const box = this.settingsPanel;

		//
		// globe settings
		//

		box.append("label")
			.attr("for", "showGlobe_gv")
			.text("Show Globe ")
			.append("input")
			.attr("type", "checkbox")
			.attr("id", "showGlobe_gv")
			.property("checked", true)
			.on("click", function () {
				globeView.app.showGlobe = !globeView.app.showGlobe;
			});


		box.append("label")
			.attr("for", "showBoundaries_gv")
			.text("Show Boundaries ")
			.append("input")
			.attr("type", "checkbox")
			.attr("id", "showBoundaries_gv")
			.property("checked", false)
			.on("click", function () {
				globeView.app.showBoundaries = !globeView.app.showBoundaries;
			});


		//
		// basins settings
		//

		box.append("label")
			.attr("for", "showBasins_gv")
			.text("Show Basins ")
			.append("input")
			.attr("type", "checkbox")
			.attr("id", "showBasins_gv")
			.property("checked", true)
			.on("click", function () {
				globeView.app.showBasins = !globeView.app.showBasins;
			});

		box.append("label")
			.attr("for", "basinsHeight_gv")
			.text("Max. Basin Height ")
			.append("input")
			.attr("type", "number")
			.attr("id", "basinsHeight_gv")
			.attr("min", "0.0")
			.attr("max", "2.0")
			.attr("step", "0.01")
			.attr("value", "0.04")
			.on("change", function () {
				globeView.app.basinsHeight = +$("#basinsHeight_gv").val();
			});

		//
		// transitions
		//

		box.append("label")
			.attr("for", "showTransitions_gv")
			.text("Show Transitions ")
			.append("input")
			.attr("type", "checkbox")
			.attr("id", "showTransitions_gv")
			.property("checked", true)
			.on("click", function () {
				globeView.app.showTransitions = !globeView.app.showTransitions;
			});

		box.append("label")
			.attr("for", "drawLines_gv")
			.text("Draw Transitions as Lines ")
			.append("input")
			.attr("type", "checkbox")
			.attr("id", "drawLines_gv")
			.property("checked", true)
			.on("click", function () {
				globeView.transitionsSettings.lines = !globeView.transitionsSettings.lines;
				globeView.buildTransitions(globeView);
			});

		box.append("label")
			.attr("for", "animateTransitions_gv")
			.text("Animate Transitions ")
			.append("input")
			.attr("type", "checkbox")
			.attr("id", "animateTransitions_gv")
			.property("checked", false)
			.on("click", function () {
				globeView.transitionsSettings.animate = !globeView.transitionsSettings.animate;
				globeView.buildTransitions(globeView);
			});

		box.append("label")
			.attr("for", "transitionsHeight_gv")
			.text("Transitions Height ")
			.append("input")
			.attr("type", "number")
			.attr("id", "transitionsHeight_gv")
			.attr("min", "1.0")
			.attr("max", "2.0")
			.attr("step", "0.05")
			.attr("value", "1.05")
			.on("change", function () {
				globeView.transitionsSettings.height = +$("#transitionsHeight_gv").val();
				globeView.buildTransitions(globeView);
			});

		box.append("label")
			.attr("for", "transitionsWidth_gv")
			.text("Transitions Width ")
			.append("input")
			.attr("type", "number")
			.attr("id", "transitionsWidth_gv")
			.attr("min", "0.001")
			.attr("max", "0.10")
			.attr("step", "0.001")
			.attr("value", "0.006")
			.on("change", function () {
				globeView.transitionsSettings.width = +$("#transitionsWidth_gv").val();
				globeView.buildTransitions(globeView);
			});

		//
		// rendering
		//

		box.append("label")
			.attr("for", "enablePostprocessing_gv")
			.text("Enable Postprocessing ")
			.append("input")
			.attr("type", "checkbox")
			.attr("id", "enablePostprocessing_gv")
			.property("checked", true)
			.on("click", function () {
				globeView.app.enablePostprocessing = !globeView.app.enablePostprocessing;
			});

		//
		// tile layer
		//

		box.append("label")
			.attr("for", "tileLayerSelect")
			.text("Tile layer");

		const select = box
			.append("select")
			.attr("size", 1)
			.on("change", function () {
				switch (this.value) {
					case "lightGray":
						globeView.app.urlCallback = (level, x, y) => {
							return `http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${level}/${y}/${x}`;
						};
						break;
					case "lightGray_nolabel":
						globeView.app.urlCallback = (level, x, y) => {
							return `http://s.basemaps.cartocdn.com/light_nolabels/${level}/${x}/${y}.png`;
						};
						break;
					case "esri":
						globeView.app.urlCallback = (level, x, y) => {
							return `http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${level}/${y}/${x}`;
						};
						break;
					case "dark":
						globeView.app.urlCallback = (level, x, y) => {
							return `http://s.basemaps.cartocdn.com/dark_all/${level}/${x}/${y}.png`;
						};
						break;
					case "dark_nolabel":
						globeView.app.urlCallback = (level, x, y) => {
							return `http://s.basemaps.cartocdn.com/dark_nolabels/${level}/${x}/${y}.png`;
						};
						break;
				}
			});
		select.append("option")
			.attr("value", "lightGray")
			.text("light gray");
		select.append("option")
			.attr("value", "lightGray_nolabel")
			.text("light gray (no labels)");
		select.append("option")
			.attr("value", "dark")
			.text("dark gray");
		select.append("option")
			.attr("value", "dark_nolabel")
			.text("dark gray (no labels)");
		select.append("option")
			.attr("value", "esri")
			.text("satellite");
	}
}


const globeView = new Globe({
	name: "globe",
	title: "Globe",
	icon: "<i class=\"fa fa-globe fa-fw\"></i>",
	infoText: `<p>This view shows a webGL globe.</p>
			   <p><i class="fa fa-map"></i> switches the projection between 2D map and 3D globe.</p>
			   <p><i class="fa fa-eraser"></i> resets the camera to its inital position and orientation.</p>
			   <p><i class="fa fa-group"></i> toggles community coloring.</p>
			   <p>Several other visualization features are available in the view's settings panel.</p>`
});
