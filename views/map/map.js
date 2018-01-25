
/**
 * This file contains code for the leaflet map view.
 */
class GeoMap extends View {
	constructor(params) {
		super(params);

		// subscribed events
		DISPATCH.on(`initializeView.${this.name}`, param => {
			if (param.includes(this.name)) {
				this.oldModelNr = 0;
				this.selectionActive = false;
				// config dependent attributes can only be set here
				this.activate();
				this.setStyleSelectors(lib.getSelectorsForColumnType(CONFIG.UI.viewColumns), false);
				this.setHeight(Math.floor(VIEW_CONTAINER_HEIGHT / CONFIG.UI.viewRows), false);

				// add button for community coloring
				this.communityButton = this.addButton({
					title: "Color shows communities / number of transitions",
					icon: "<i class=\"fa fa-group fa-fw\"></i>",
					clickFunction: () => {
						// reset community pickker and cursor
						this.communityPicker = false;
						this.viewDiv.style("cursor", "default");

						if (CONFIG.filter.showCommunities) {
							CONFIG.map.showCommunities = !CONFIG.map.showCommunities;
							this.drawRegions();
						}
					}
				});
				// add button for edge bundling
				this.edgeBundlingButton = this.addButton({
					title: "Enable or disable edge bundling (time-consuming)",
					icon: "<i class=\"fa fa-code-fork fa-fw\"></i>",
					clickFunction: () => {
						// reset community pickker and cursor
						this.communityPicker = false;
						this.viewDiv.style("cursor", "default");

						CONFIG.map.edgeBundling = !CONFIG.map.edgeBundling;
						if (CONFIG.map.edgeBundling) {
							this.edgeBundlingPreprocess();
						}
						this.drawTransitions(true);
					}
				});
				// add community filter button
				this.communityFilterButton = this.addButton({
					title: "Click here to activate the community picker, then click on a region to filter on its community",
					icon: "<i class=\"fa fa-crosshairs fa-fw\"></i>",
					clickFunction: () => {
						if (this.communityPicker) {
							this.communityPicker = false;
							this.viewDiv.style("cursor", "default");
						} else {
							this.communityPicker = true;
							this.viewDiv.style("cursor", "crosshair");
						}
					}
				});

				this.draw();
			}
		});

		DISPATCH.on(`onFilterReset.${this.name}`, () => {
			if (!this.active) {
				return;
			}
			// fit map to geo bounds of data
			if (CRXFILTER.currentData.geographicBounds) {
				this.mapObj.map.fitBounds(CRXFILTER.currentData.geographicBounds);
			}
			this.drawRegions();
			this.drawTransitions(true);
		});

		DISPATCH.on(`onRegionFiltered.${this.name}`, () => {
			if (!this.active) {
				return;
			}
			// fit map to geo bounds of data
			if (CRXFILTER.currentData.geographicBounds) {
				this.mapObj.map.fitBounds(CRXFILTER.currentData.geographicBounds);
			}
			this.drawRegions();
			this.drawTransitions(true);
		});

		DISPATCH.on(`onTimeFiltered.${this.name}`, (finished) => {
			if (!this.active) {
				return;
			}
			this.drawRegions();
			if (CRXFILTER.currentData.model.properties.dynamicTransitions) {
				this.drawTransitions(finished);
			}
		});

		DISPATCH.on(`onTransitionLimitChanged.${this.name}`, () => {
			if (!this.active) {
				return;
			}
			this.drawTransitions(true);
		});

		DISPATCH.on(`onRegionHighlight.${this.name}`, (id) => {
			if (!this.active) {
				return;
			}
			// region (can have multiple polygons)
			this.regionsGroup.selectAll(`.r${id}`)
				.style("fill-opacity", 1);
			this.regionsGroup.selectAll(`.region:not(.r${id})`)
				.style("fill-opacity", 0.1);
			// transitions
			this.canvas.regionHighlightStart(id);

		});

		DISPATCH.on(`onHighlightEnd.${this.name}`, () => {
			if (!this.active) {
				return;
			}
			// region (can have multiple polygons)
			this.regionsGroup.selectAll(".region")
				.style("fill-opacity", 0.7);
			// transitions
			this.canvas.regionHighlightEnd();
		});

		DISPATCH.on(`onTransitionHighlight.${this.name}`, (id) => {
			if (!this.active) {
				return;
			}
			const t = CRXFILTER.currentData.model.transitionMap.get(+id);
			// both nodes
			this.regionsGroup.selectAll(".region").style("fill-opacity", 0.1);
			const sid = t.source.properties.id;
			const tid = t.target.properties.id;
			this.regionsGroup.selectAll(`.r${sid}, .r${tid}`)
				.style("fill-opacity", 1);
			// link
			this.canvas.linkHighlightStart(id);
		});

		DISPATCH.on(`onCommunityUpdate.${this.name}`, () => {
			if (!this.active) {
				return;
			}
			CONFIG.map.showCommunities = CONFIG.filter.showCommunities;
			this.drawRegions();
		});

		// set main drawing function
		this.setDrawFunction(this.drawMap);
		// set settings function
		this.setSettingsFunction(this.settingsFunction);
	}

	/**
	 * Sets up all necessary parts of the map.
	 */
	drawMap() {
		// TODO: this prevents mltiple map instances
		this.viewDiv.attr("id", "map")
			.on("mouseout", () => {
				graphView.communityPicker = false;
				graphView.viewDiv.style("cursor", "default");
			});

		// if map onbject is missing, create it
		// TODO: replace mapObj.map by map
		this.mapObj = this.mapObj ? this.mapObj : {
			map: L.map("map", { zoomControl: false }).setView([0, 0], 1)
		};

		// update map if zoomed
		this.mapObj.map.on("viewreset", () => {
			this.drawRegions(true);
			this.drawTransitions(true);
		});

		// add an SVG element for a rectangle selection to Leaflet’s overlay pane
		L.Control.rectangleSelect().addTo(this.mapObj.map);

		// when a "rectangular" part of the world has been selected, call filter
		this.mapObj.map.on("rectangleselected", (e) => {
			DISPATCH.onMapRectangleSelection({
				bounds: e.bounds
			});
		});

		// creates the SVG necessary for all other objects, only remove
		// when SVG is added in an other way..
		L.geoJson(
			[{
				type: "Feature",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[0.0, 0.0]
						]
					]
				}
			}],
			{
				onEachFeature: (feature) => {
					// TODO: is this enough?
					L.polygon(feature.geometry.coordinates).addTo(this.mapObj.map);
				}
			}
		);
		d3.select(".leaflet-overlay-pane")
			.select("svg")
			.selectAll("g")
			.remove();

		// add variable for SVG and transition group
		this.svg = this.viewDiv.select(".leaflet-overlay-pane").select("svg");

		/**
		 * Helper function for force-directed links.
		 */
		this.forceDirectedLine = d3.svg.line()
			.x(d => d.x)
			.y(d => d.y)
			.interpolate("linear");

		// add canvas layer for transitions
		const map = this;
		const CanvasLayer = function () {
			this.onLayerDidMount = function () {
				this.transitions = [];
				this.linkFunc = () => 0;
			};

			this.regionHighlightStart = function (id) {
				this.transitionsProc = CRXFILTER.currentData.highlighted.transitions;
				if (CONFIG.map.edgeBundling && map.edgeBundlePoints) {
					this.edgeBundlePointsProc = map.edgeBundlePoints.filter(
						d => (d.source.properties.id === id || d.target.properties.id === id)
					);
				}
				this.needRedraw();
			};

			this.regionHighlightEnd = function () {
				this.transitionsProc = undefined;
				this.edgeBundlePointsProc = undefined;
				this.needRedraw();
			};

			this.linkHighlightStart = function (id) {
				this.transitionsProc = ([CRXFILTER.currentData.model.transitionMap.get(+id)]);
				if (CONFIG.map.edgeBundling && map.edgeBundlePoints) {
					this.edgeBundlePointsProc = map.edgeBundlePoints.filter(d => (d.id === id));
				}
				this.needRedraw();
			};

			this.setData = function (data) {
				this.transitions = data.transitions;
				this.linkFunc = data.linkFunc;
				this.onDrawLayer();
			};

			this.onDrawLayer = function () {
				const transitions = this.transitionsProc || this.transitions;
				const ebLinks = this.edgeBundlePointsProc || map.edgeBundlePoints;
				map.drawTransitionsCanvas(transitions, this.linkFunc, this._canvas, ebLinks);
			};
		};
		CanvasLayer.prototype = new L.CanvasLayer();
		this.canvas = new CanvasLayer();
		this.canvas.addTo(this.mapObj.map);
		this.regionsGroup = this.svg.append("g");

		// set tile layer and copyright remark
		this.setTileLayer(CONFIG.map.tileLayer);

		this.viewDiv.style("height", `${this.height}px`);

		// adapt map size to containing div
		this.mapObj.map.invalidateSize();

		// fit map to geographical bounds of current data
		if (CRXFILTER.currentData.geographicBounds) {
			this.mapObj.map.fitBounds(CRXFILTER.currentData.geographicBounds);
		}

		// draw map
		this.drawRegions();
		this.drawTransitions(true);
	}

	/**
	 * Preprocesses data in order to be able to use d3.ForceBundle plugin,
	 * then runs edge bundling and store the results.
	 */
	edgeBundlingPreprocess() {
		const nodes = CRXFILTER.currentData.regions;
		let links;
		if (CONFIG.filter.limitTransitionCount) {
			links = CRXFILTER.currentData.reducedTransitions.slice(0, CONFIG.filter.limitTransitionCount);
		} else {
			links = CRXFILTER.currentData.reducedTransitions;
		}
		if (!this.active || !nodes || !links || !CONFIG.map.showTransitions || !CONFIG.map.edgeBundling) {
			return;
		}

		// convert data
		const nodes_new = {};
		const links_new = links.map(t => {
			return {
				source: +t.source.properties.id,
				target: +t.target.properties.id
			};
		});

		nodes.forEach((d) => {
			nodes_new[d.properties.id] = {
				x: d.properties.centroid[1],
				y: d.properties.centroid[0]
			};
		});


		// stop existing webworkers
		if (this.edgeBunglingTask) {
			THREAD_POOL.stopTask(this.edgeBunglingTask);
			this.edgeBunglingTask = undefined;
		}

		// start webworker
		this.edgeBunglingTask = new Task("./lib/edgeBundlingWorker.js",
			{
				links: links_new,
				nodes: nodes_new,
				ss: 0.01,
				ct: 0.3
			},
			(event) => {
				if (event.data.error) {
					CONFIG.map.edgeBundling = false;
					return;
				} else {
					this.edgeBundlePoints = [];
					this.edgeBundleLength = event.data.links.length;

					for (let i = 0; i < this.edgeBundleLength; i++) {
						const originalLink = links[i];
						const ebLink = event.data.links[i];
						ebLink.source = originalLink.source;
						ebLink.target = originalLink.target;
						ebLink.id = originalLink.id;
						this.edgeBundlePoints.push(ebLink);
					}

					this.drawTransitions(true);
				}
			});
		THREAD_POOL.executeTask(this.edgeBunglingTask);
	}

	/**
	 * Sets tile layer and copyright remark.
	 */
	setTileLayer(layerName) {
		if (!this.active) {
			return;
		}

		let newTileLayer;
		switch (layerName) {
			case "lightGray":
				newTileLayer = L.tileLayer("http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
					attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
				});
				break;
			case "lightGray_nolabel":
				newTileLayer = L.tileLayer("http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png", {
					attribution: "&copy; <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a> &copy; <a href=\"http://cartodb.com/attributions\">CartoDB</a>"
				});
				break;
			case "darkGray":
				newTileLayer = L.tileLayer("http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
					attribution: "&copy; <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a> &copy; <a href=\"http://cartodb.com/attributions\">CartoDB</a>"
				});
				break;
			case "darkGray_nolabel":
				newTileLayer = L.tileLayer("http://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png", {
					attribution: "&copy; <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a> &copy; <a href=\"http://cartodb.com/attributions\">CartoDB</a>"
				});
				break;
			case "esri":
				newTileLayer = L.tileLayer("http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
					attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
				});
				break;
			case "blank":
				newTileLayer = L.tileLayer("");
				break;
			default:
				// standard layer
				newTileLayer = L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
					attribution: "&copy; <a href=\"http:// openstreetmap.org\">OpenStreetMap</a> contributors"
				});
		}

		if (this.tileLayer) {
			this.mapObj.map.removeLayer(this.tileLayer);
		}
		this.mapObj.map.addLayer(newTileLayer);
		this.tileLayer = newTileLayer;
	}

	/**
	 * Converts simple and multi-polygon regions" geometries into a set of polygons.
	 */
	createPolygons() {
		if (!this.active) {
			return;
		}

		if (!CONFIG.map.showRegions) {
			// simply hide the SVG
			this.viewDiv.select("svg").style("display", "none");
			return;
		}
		this.viewDiv.select("svg").style("display", "block");

		// convert multi-polygons to polygons (is there a better way on dealing with multi-polygons?)
		const polygons = [];
		const regions = CRXFILTER.currentData.regions;

		if (!regions) {
			return;
		}

		// filter regions and split multi-polygons
		for (let i = 0, n = regions.length; i < n; i++) {
			const region = regions[i];

			// skip regions with certain values as defined by CONNECTOR.filter.nodes(node);
			if (!CONNECTOR.filter.nodes(region, this.name)) {
				continue;
			}

			if (!region.geometry) {
				console.warn(`region has no geometry! id: ${region.properties.id}`);
				continue;
			}

			if (!region.geometry.type || region.geometry.type === "Polygon") {
				polygons.push(region);
			} else {
				// split multi-polygon regions but keep properties
				for (let j = 0, m = region.geometry.coordinates[0].length; j < m; j++) {
					// copy
					const newRegion = jQuery.extend({}, regions[i]);
					// overwrite geometry
					newRegion.geometry = {
						type: "Polygon",
						coordinates: [newRegion.geometry.coordinates[0][j]]
					};
					polygons.push(newRegion);
				}
			}
		}
		this.polygons = polygons;
	}

	/**
	 * Handles region display.
	 */
	drawRegions(zoomed) {
		if (
			!this.polygons
			|| this.polygons.length === 0
			|| this.oldModelNr !== MODEL_COUNT
		) {
			this.createPolygons();
		}

		this.updatePolygons();
		this.drawPolygons(zoomed);
		this.oldModelNr = MODEL_COUNT;
	}

	/**
	 * update active attribute of polygons
	 *
	 * only active polygons are drawn, while all are kept in memory for faster
	 * processing and reduced redundance
	 */
	updatePolygons() {
		this.polygons.forEach(d => {
			d.active = CRXFILTER.currentData.regionMap.has(+d.properties.id);
		});
	}

	/**
	 * Draws all active region polygons.
	 */
	drawPolygons(zoomed) {
		// draw polygons
		const regionPolygons = this.regionsGroup.selectAll("polygon")
			.data(this.polygons.filter(d => d.active), d => d.properties.id);

		// converts geographic locations into screen coordinates
		const pointFunc = (d) => {
			return d.geometry.coordinates[0].map((point) => {
				const layerPoint = this.mapObj.map.latLngToLayerPoint([point[1], point[0]]);
				return `${layerPoint.x}, ${layerPoint.y}`;
			}).join(" ");
		};

		// remove polygons that are no longer filtered
		regionPolygons.exit().remove();

		// highlight timeout
		let timed;

		// draw new polygons
		regionPolygons.enter()
			.append("polygon")
			.attr("class", (d) => {
				return `region selected r${d.properties.id}`;
			})
			.attr("points", pointFunc)
			.on("mouseover", (d) => {
				if (!this.selectionActive) {
					clearTimeout(timed);
					DISPATCH.startRegionHighlight(d.properties.id);
				}
			})
			.on("mouseout", (d) => {
				clearTimeout(timed);
				if (!this.selectionActive) {
					timed = setTimeout(() => DISPATCH.endHighlight(d.properties.id));
				}
			})
			.on("click", (d) => {
				if (this.communityPicker) {
					CRXFILTER.applyFilter("community", d.community);
				}
			})
			.append("title").html((d) => {
				return CONNECTOR.tooltipNode(d, 0, this.name);
			});

		// recalculate polygon screen coordiantes if zoomed
		if (zoomed) {
			regionPolygons.attr("points", pointFunc);
		}

		// change color of polygons to reflect current data values
		regionPolygons
			.style("fill", d => {
				let amount;
				if (CONFIG.map.showCommunities) {
					return MAPPING.communityColor(d.community);
				} else if (CRXFILTER.currentData.states) {
					amount = CRXFILTER.currentData.states[d.properties.id];
				} else {
					amount = d.properties.transitionNumber;
				}
				return MAPPING.nodeColor(amount);
			})
			.style("fill-opacity", 0.7);
	}

	/**
	 * Handles transition drawing.
	 *
	 * Updates map after filtering by crossfilter:
	 * shows transitions depending on the brushed time interval.
	 */
	drawTransitions(timeFinished) {
		if (!this.active) {
			return;
		}
		if (!CONFIG.map.showTransitions) {
			// hide canvas
			this.viewDiv.select("canvas").style("display", "none");
			return;
		}
		this.viewDiv.select("canvas").style("display", "block");

		let reducedTransitions;
		if (CONFIG.filter.limitTransitionCount) {
			reducedTransitions = CRXFILTER.currentData.reducedTransitions.slice(0, CONFIG.filter.limitTransitionCount);
		} else {
			reducedTransitions = CRXFILTER.currentData.reducedTransitions;
		}

		let linkFunc;

		if (CONFIG.map.edgeBundling && timeFinished) {
			// draw egde bundled links
			if (
				!this.edgeBundlePoints
				|| this.edgeBundleLength
				!== reducedTransitions.length
			) {
				this.edgeBundlingPreprocess();
				return;
			}
			linkFunc = (d, i, links) => {
				const value = links[i];
				return value.map(e => {
					return this.mapObj.map.latLngToContainerPoint(L.latLng([e.x, e.y]));
				});
			};
		} else {
			// draw non-bundled links
			linkFunc = (d) => {
				// get coordinates of start and target region
				const c1 = d.source.properties.centroid;
				const c2 = d.target.properties.centroid;
				// convert lat-lng to pixel coordinates
				const p1 = this.mapObj.map.latLngToContainerPoint(new L.LatLng(c1[1], c1[0]));
				const p2 = this.mapObj.map.latLngToContainerPoint(new L.LatLng(c2[1], c2[0]));
				return [p1, p2];
			};
		}
		this.canvas.setData({
			transitions: reducedTransitions,
			linkFunc: linkFunc
		});
	}

	/**
	 * Draw transitions on a canvas overlay.
	 */
	drawTransitionsCanvas(transitions, pathFunc, canvas, ebLinks) {
		const ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		transitions.forEach((t, i) => {
			const path = pathFunc(t, i, ebLinks);
			ctx.beginPath();
			ctx.moveTo(path[0].x, path[0].y);
			for (let j = 1; j < path.length; j++) {
				ctx.lineTo(path[j].x, path[j].y);
			}

			ctx.lineWidth = MAPPING.linkWidth(t.weight);
			const opacity = MAPPING.linkOpacity(t.weight);
			ctx.strokeStyle = CONFIG.UI.darkTheme ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`;
			ctx.stroke();
		});
	}

	/**
	 * Overwrite default resized function.
	 */
	resized() {
		if (!this.active || !this.mapObj) {
			return;
		}
		this.mapObj.map.invalidateSize();
		this.drawRegions(true);
		this.drawTransitions(true);
		// fit bounds again when view is resized
		if (CRXFILTER.currentData.geographicBounds) {
			this.mapObj.map.fitBounds(CRXFILTER.currentData.geographicBounds);
		}
	}

	/**
	 * Overwrite default reactivate function.
	 */
	reactivated() {
		// remove old data
		if (this.regionsGroup && this.linesGroup) {
			this.regionsGroup.selectAll("*").remove();
		}
		// if no geographic data available, deactivate immediately
		if (!CRXFILTER.currentData.model.properties.geographicNodes) {
			this.deactivate();
			return;
		}
		this.mapObj.map.invalidateSize();
		this.drawRegions(true);
		this.drawTransitions(true);

		// fit bounds again when view is resized
		if (CRXFILTER.currentData.geographicBounds) {
			this.mapObj.map.fitBounds(CRXFILTER.currentData.geographicBounds);
		}
	}

	/**
	 * add options to the view settings panel
	 */
	settingsFunction() {
		const _this = this;
		const box = _this.settingsPanel;

		// show regions
		box.append("label")
			.text("Show regions ")
			.append("input")
			.attr("type", "checkbox")
			.property("checked", CONFIG.map.showRegions)
			.on("click", function () {
				CONFIG.map.showRegions = !CONFIG.map.showRegions;
				_this.viewDiv.select("svg").style("display", CONFIG.map.showRegions ? "block" : "none");
			});

		// show transitions
		box.append("label")
			.text("Show transitions ")
			.append("input")
			.attr("type", "checkbox")
			.property("checked", CONFIG.map.showTransitions)
			.on("click", function () {
				CONFIG.map.showTransitions = !CONFIG.map.showTransitions;
				_this.viewDiv.select("canvas").style("display", CONFIG.map.showTransitions ? "block" : "none");
			});

		// tile layer
		box.append("label").text("Tile layer ");
		const select = box.append("select")
			.attr("size", 1)
			.on("change", function () {
				const layerName = this.options[this.selectedIndex].value;
				_this.setTileLayer(layerName);
			});
		select.append("option")
			.attr("value", "lightGray")
			.text("light gray");
		select.append("option")
			.attr("value", "lightGray_nolabel")
			.text("light gray (no labels)");
		select.append("option")
			.attr("value", "darkGray")
			.text("dark gray");
		select.append("option")
			.attr("value", "darkGray_nolabel")
			.text("dark gray (no labels)");
		select.append("option")
			.attr("value", "esri")
			.text("satellite");
		select.append("option")
			.attr("value", "blank")
			.text("blank");
	}
}


const mapView = new GeoMap({
	name: "map",
	title: "World Map",
	icon: "<i class=\"fa fa-map fa-fw\"></i>",
	infoText: `<p>This view shows the geographic location and shape of regions.</p>
			       <p>You can highlight them by hovering or select regions after pressing the selection button in the top left corner.</p>
			       <p><i class="fa fa-code-fork\"></i> enables or disables edge bundling.</p>
			       <p><i class="fa fa-group\"></i> toggles community coloring.</p>`
});
