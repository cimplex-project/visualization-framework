/**
 * This file contains code for a force-directed graph view.
 */
class Graph extends View {
	constructor(params) {
		super(params);

		// subscribed events
		DISPATCH.on(`initializeView.${this.name}`, param => {
			if (param.includes(this.name)) {
				// config dependent attributes can only be set here
				this.dragging = false;
				this.oldLayoutNumber = 0;
				this.oldModelNr = 0;
				this.activate();
				this.setStyleSelectors(lib.getSelectorsForColumnType(CONFIG.UI.viewColumns), false);
				this.setHeight(VIEW_CONTAINER_HEIGHT / CONFIG.UI.viewRows, false);

				// add tooltip div
				this.tip = this.viewDiv.append("div")
					.attr("class", "viewTooltip")
					.style("position", "fixed")
					.style("display", "none");

				// internal data
				this.links = [];
				this.nodes = new Map();
				this.nodeHasLink = new Map();
				this.scale = 1;
				this.scaleInv = 1;

				// add button for labels
				this.labelButton = this.addButton({
					title: "Show or hide labels",
					icon: "<i class=\"fa fa-font fa-fw\"></i>",
					clickFunction: () => {
						CONFIG.graph.showLabels = !CONFIG.graph.showLabels;
						if (CONFIG.graph.showLabels) {
							this.drawLabels();
						} else {
							this.draw();
						}
					}
				});

				// add button for community coloring
				this.communityButton = this.addButton({
					title: "Show or hide communities",
					icon: "<i class=\"fa fa-group fa-fw\"></i>",
					clickFunction: () => {
						if (CONFIG.filter.showCommunities) {
							CONFIG.graph.showCommunities = !CONFIG.graph.showCommunities;
							this.draw();
						}
					}
				});

				// add button for edge bundling
				this.edgeBundlingButton = this.addButton({
					title: "Enable or disable edge bundling (time-consuming)",
					icon: "<i class=\"fa fa-code-fork fa-fw\"></i>",
					clickFunction: () => {
						CONFIG.graph.edgeBundling = !CONFIG.graph.edgeBundling;
						this.oldLayoutNumber = -1;
						this.draw();
					}
				});

				// add community filter button
				this.communityFilterButton = this.addButton({
					title: "Click here to activate the community picker, then click on a node to filter on its community",
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

				// add selection button
				this.selectButton = this.addButton({
					title: "Click here to select nodes",
					icon: "<i class=\"fa fa-instagram fa-fw\"></i>",
					clickFunction: () => {
						this.viewDiv.style("cursor", this.dragging ? "default" : "crosshair");
						this.dragging = !this.dragging;
					}
				});

				// add canvas
				this.createCanvas();
				// this.draw();
			}
		});

		DISPATCH.on(`onRegionFiltered.${this.name}`, () => this.draw());
		DISPATCH.on(`onFilterReset.${this.name}`, () => this.draw());
		DISPATCH.on(`onTransitionLimitChanged.${this.name}`, () => this.draw());
		DISPATCH.on(`onTimeFiltered.${this.name}`, () => this.draw());
		DISPATCH.on(`onRegionHighlight.${this.name}`, id => this.drawHighlights(id));
		DISPATCH.on(`onTransitionHighlight.${this.name}`, () => this.drawHighlights());
		DISPATCH.on(`onHighlightEnd.${this.name}`, () => this.endHighlight());
		DISPATCH.on(`onCommunityUpdate.${this.name}`, () => this.redraw());
		DISPATCH.on(`onSimulationCompleted.${this.name}`, () => this.createCanvas());

		/**
		 * react on mousemove diffently depending on context
		 */
		this.handleMousemove = (() => {
			let timed;
			return (graph, e) => {
				clearTimeout(timed);
				if (graph.canvas.clicked) {
					// dragging and panning
					if (graph.dragging) {
						// draw selection rectangle
						graph.selectionRect(e.offsetX, e.offsetY);
					} else {
						// panning
						graph.translate(e.offsetX, e.offsetY);
					}
				} else {
					// highlighting and tooltips
					timed = setTimeout(() => graph.getHighlight(e), 5);
				}
			};
		})();

		// set main drawing function
		this.setDrawFunction(this.drawGraph);
		// set settings function
		this.setSettingsFunction(this.settingsFunction);


		/**
		 * Draws directed links either as double lines, double lines with half arrows or
		 * curved.
		 */
		this.drawDirectedLink = (() => {
			// control point for bezier curved links:
			// rotate middle point by -60 degree
			const controlPoint = (x1, y1, x2, y2) => {
				// get middle point and translate rotation point to 0
				// (x1 + x2) / 2 - x2;
				const x = (x1 - x2) / 2;
				const y = (y1 - y2) / 2;
				// rotate (-60°)
				const sinVal = 0.86602540378;
				const cosVal = 0.5;
				const xR = cosVal * x - sinVal * y;
				const yR = sinVal * x + cosVal * y;
				// translate back and return
				return {
					x: xR + x2,
					y: yR + y2
				};
			};

			// function for drawing one directed link, is passed on to other functions
			return (canvas, d, linkWidth, highlightMode) => {
				const ctx = canvas.getContext("2d");
				const indicator = CONFIG.graph.linkDirectionIndicator;

				if (indicator == "curvature") {
					// bezier curve
					// get control point
					const cp = controlPoint(d.source.x, d.source.y, d.target.x, d.target.y);
					ctx.beginPath();
					ctx.moveTo(d.source.x, d.source.y);
					ctx.quadraticCurveTo(cp.x, cp.y, d.target.x, d.target.y);
					ctx.stroke();
				} else if (indicator == "doubleLines" || indicator == "halfArrows") {
					// draw double lines (offset each link to its right)
					// link vector
					let lx = d.target.x - d.source.x;
					let ly = d.target.y - d.source.y;
					// normalize link vector
					const norm = 1 / Math.sqrt(lx * lx + ly * ly);
					lx *= norm;
					ly *= norm;
					// get translation vector (pointing in the direction -90 degrees rotated from link vector)
					// in order to move the line to its "right" by half its width
					let tx = ly * linkWidth * 0.7;
					let ty = -lx * linkWidth * 0.7;
					ctx.beginPath();
					ctx.moveTo(d.source.x - tx, d.source.y - ty);
					ctx.lineTo(d.target.x - tx, d.target.y - ty);
					ctx.stroke();
					// add half arrows
					if (indicator == "halfArrows") {
						// normalize translation vector
						const norm2 = 1 / Math.sqrt(tx * tx + ty * ty);
						tx *= norm2;
						ty *= norm2;
						let targetNodeRadius = 0;
						if (!(highlightMode && !d.target.highlight.h)) {
							// arrows all point at circle boundaries
							targetNodeRadius = MAPPING.nodeRadius(d.target.amount);
						}
						// get points of triangle
						const x1 = d.target.x - (linkWidth + 1) * tx - targetNodeRadius * lx;
						const y1 = d.target.y - (linkWidth + 1) * ty - targetNodeRadius * ly;
						const x2 = x1 - 10 * lx * this.scaleInv;
						const y2 = y1 - 10 * ly * this.scaleInv;
						const x3 = x2 - 5 * tx * this.scaleInv;
						const y3 = y2 - 5 * ty * this.scaleInv;
						ctx.beginPath();
						ctx.moveTo(x1, y1);
						ctx.lineTo(x2, y2);
						ctx.lineTo(x3, y3);
						ctx.closePath();
						ctx.fill();
					}
				}
			};
		})();
	}

	/**
	 * creates canvas and adds event listeners
	 */
	createCanvas() {
		if (!this.active) {
			return;
		}
		this.viewDiv.selectAll("canvas").remove();
		this.width = this.viewDiv.node().getBoundingClientRect().width;

		const canvas = document.createElement("canvas");
		canvas.id = "graphCanvas";
		canvas.originX = 0;
		canvas.originY = 0;
		canvas.style.position = "absolute";
		canvas.style.left = "0px";
		canvas.height = this.height;
		canvas.width = this.width;

		// add event handlers (mouse)
		canvas.addEventListener("mouseover", (e) => this.handleMouseover(this, e), false);
		canvas.addEventListener("mousedown", (e) => this.handleMousedown(this, e), false);
		canvas.addEventListener("mouseup", (e) => this.handleMouseup(this, e), false);
		canvas.addEventListener("mousemove", (e) => this.handleMousemove(this, e), false);
		canvas.addEventListener("mouseout", (e) => this.handleMouseout(this, e), false);
		canvas.addEventListener("mousewheel", (e) => this.handleMousewheel(this, e), false);

		// add event handlers (touch)
		// this enables tapping on nodes to highlight them
		canvas.addEventListener("touchstart", (e) => this.handleMousedown(this, e), false);
		canvas.addEventListener("touchend", (e) => this.handleMouseup(this, e), false);
		canvas.addEventListener("touchcancel", (e) => this.handleTouchcancel(this, e), false);
		canvas.addEventListener("touchmove", (e) => this.handleTouchmove(this, e), false);

		this.viewDiv.node().appendChild(canvas);
		this.canvas = canvas;

		// add second canvas for highlighting
		const highlightCanvas = document.createElement("canvas");
		highlightCanvas.id = "graphHighlightCanvas";
		highlightCanvas.originX = 0;
		highlightCanvas.originY = 0;
		highlightCanvas.style.position = "absolute";
		highlightCanvas.style.left = "0px";
		highlightCanvas.height = canvas.height;
		highlightCanvas.width = canvas.width;
		highlightCanvas.style.pointerEvents = "none";

		this.viewDiv.node().appendChild(highlightCanvas);
		this.highlightCanvas = highlightCanvas;
	}

	/**
	 * override prototype resized function
	 */
	resized() {
		if (!this.active)
			return;
		this.createCanvas();
		this.oldLayoutNumber = -1;
		this.draw();
	}

	/**
	 * override prototype reactivated function
	 */
	reactivated() {
		this.resized();
	}

	/**
	 * creates the view
	 */
	drawGraph() {
		if (!this.active) {
			return;
		}

		this.viewDiv.selectAll("p").remove();
		const data = CRXFILTER.currentData;

		if (CRXFILTER.currentData.model.properties.dynamicTransitions && !data.finished) {
			return;
		}

		// process nodes (copy important attributes)
		const nodes = new Map(
			data.regions
				.filter(d => CONNECTOR.filter.nodes(d, this.name))
				.map(
				d => {
					const amount = data.states ? data.states[d.properties.id] : d.properties.transitionNumber;
					return [+d.properties.id, {
						id: +d.properties.id,
						name: d.properties.name,
						amount: +amount,
						transitionNumber: +d.properties.transitionNumber,
						community: +d.community,
						highlight: d.highlight,
					}];
				}
				)
		);

		const w = this.width;
		const h = this.height;

		// choose initial positions
		nodes.forEach(d => {
			const centroid = data.regionMap.get(+ d.id).properties.centroid;
			// use geographical coordinates (if available) or random positions
			if (centroid) {
				d.x = ((180 + centroid[0]) / 360) * w;
				d.y = h - ((90 + centroid[1]) / 180) * h;
			} else if (!this.nodesChanged && this.oldLayout && this.oldLayout.has(+d.id)) {
				// use old layout
				const e = this.oldLayout.get(+d.id);
				d.x = e.x;
				d.y = e.y;
				d.old = true;
			} else {
				// let d3 figure out an initial layout
			}
		});

		// limit links for better performance
		let links;
		if (CRXFILTER.currentData.model.additionalData.network == "completeGraph") {
			links = [];
		} else if (CONFIG.filter.limitTransitionCount) {
			links = data.reducedTransitions.slice(0, CONFIG.filter.limitTransitionCount);
		} else {
			links = data.reducedTransitions;
		}

		// create own link representation for d3 force
		this.links = [];
		links.forEach(d => {
			const source = nodes.get(+d.source.properties.id);
			const target = nodes.get(+d.target.properties.id);
			if (!(source && target)) {
				return;
			}
			this.links.push({
				id: +d.id,
				source: source,
				target: target,
				weight: d.weight,
				highlight: d.highlight,
			});
		});

		// create array from map as d3 does not support maps
		this.nodes = Array.from(nodes.values());

		// check if a redraw is needed
		if (this.oldLayout)
			this.nodesChanged = !((this.oldLayoutNumber == nodes.size) && (this.oldModelNr == MODEL_COUNT));

		// if graph is static, layout has to be calculated only once,
		// as long as the nodes do not change due to filtering
		if (!this.resizedDiv && !CRXFILTER.currentData.model.properties.dynamicTransitions && this.oldLayout && !this.nodesChanged) {
			this.drawOnlyNew(true);
			return;
		}

		// reset zoom and panning
		this.scale = 1;
		this.scaleInv = 1;
		[this.canvas, this.highlightCanvas].forEach(canvas => {
			const ctx = canvas.getContext("2d");
			canvas.originX = 0;
			canvas.originY = 0;
			ctx.setTransform(1, 0, 0, 1, 0, 0);
		});

		// terminate any current running worker and recreate
		if (this.layoutTask) {
			THREAD_POOL.stopTask(this.layoutTask);
			this.layoutTask = undefined;
		}
		this.showLoadingIndicator();
		this.ready = false;
		this.layoutTask = new Task(
			"./views/graph/graph_layoutWorker.js",
			{
				action: "calculate",
				nodes: this.nodes,
				links: this.links,
				width: w,
				height: h,
				currentMaxTransitionNumber: data.transitionsPerRegion.max,
				currentMaxTransitionWeight: data.transitionWeights.max,
				showCommmunities: CONFIG.filter.showCommunities,
				timeout: CONFIG.graph.timeout
			},
			(event) => {
				if (event.data.selection) {
					/*  check if the mouse is still in the canvas object, or if it left during
						the calculation of the WebWorker
					*/
					if (event.data.selectedNode && this.isMouseIn) {
						this.selectedNode = event.data.selectedNode;
						this.tip.style("display", "block")
							.html(CONNECTOR.tooltipNode(data.regionMap.get(+event.data.selectedNode.id)));
						DISPATCH.startRegionHighlight(event.data.selectedNode.id);
					} else if (CRXFILTER.currentData.highlightMode) {
						this.tip.style("display", "none");
						DISPATCH.endHighlight();
					}
					return;
				}
				// hide tooltip
				this.tip.style("display", "none");
				// set highlight flag
				event.data.nodes.forEach(d => {
					d.highlight = CRXFILTER.currentData.regionMap.get(d.id).highlight;
				});
				event.data.links.forEach(d => {
					d.highlight = CRXFILTER.currentData.model.transitionMap.get(d.id).highlight;
				});
				this.nodes = event.data.nodes;
				this.links = event.data.links;
				this.redraw();
			},
			true
		);
		THREAD_POOL.executeTask(this.layoutTask);
		return;
	}

	/**
	 * Completely clears the canvas and draws all content again.
	 */
	redraw() {
		this.highlightCanvas.style.visibility = "hidden";
		const ctx = this.canvas.getContext("2d");
		ctx.clearRect(
			this.canvas.originX,
			this.canvas.originY,
			this.width * this.scaleInv,
			this.height * this.scaleInv
		);
		this.drawOnlyNew();

		if (CRXFILTER.currentData.highlightMode) {
			this.drawHighlights();
		}
	}

	/**
	 * Draws graph (or only the nodes and labels) over the existing canvas content.
	 */
	drawOnlyNew(drawOnlyNodes) {
		// reset flag
		this.nodesChanged = false;
		if (drawOnlyNodes) {
			this.drawNodes(this.nodes, this.canvas);
			this.drawLabels(this.canvas);
		} else if (CONFIG.graph.edgeBundling) {
			this.edgeBundlingDraw(this.nodes, this.links, this.canvas);
		} else {
			this.drawComplete(this.drawLinks);
		}
	}

	/**
	 * Draws only the currently highlighted nodes and links.
	 */
	drawHighlights() {
		if (!this.active || !this.ready) {
			return;
		}

		this.highlightCanvas.style.visibility = "visible";
		const ctx = this.highlightCanvas.getContext("2d");

		ctx.clearRect(
			this.canvas.originX,
			this.canvas.originY,
			this.width * this.scaleInv,
			this.height * this.scaleInv
		);

		// fade everything a bit
		ctx.fillStyle = CONFIG.UI.darkTheme ? "rgba(34, 34, 34, 0.5)" : "rgba(255, 255, 255, 0.5)";
		ctx.fillRect(this.canvas.originX,
			this.canvas.originY,
			this.width * this.scaleInv,
			this.height * this.scaleInv);

		if (CONFIG.graph.edgeBundling) {
			this.drawLinksFD(
				this,
				this.bundledLinks.filter(d => d.oLink.highlight && d.oLink.highlight.h),
				this.highlightCanvas,
				true
			);
		} else {
			this.drawLinks(
				this,
				this.links.filter(d => d.highlight && d.highlight.h),
				this.highlightCanvas,
				true
			);
		}
		const filteredNodes = this.nodes.filter(d => d.highlight && d.highlight.h);
		this.drawNodes(filteredNodes, this.highlightCanvas, true);
		this.drawLabels(this.highlightCanvas, filteredNodes);
	}

	/**
	 * Ends current higlighting.
	 */
	endHighlight() {
		if (!this.active || this.minimized) {
			return;
		}
		this.selectedNode = null;
		this.tip.style("display", "none");
		this.highlightCanvas.style.visibility = "hidden";
	}

	/**
	 * Draws the graph after the layout has changed.
	 *
	 * @param linkFunc
	 *    function for link drawing (either this.drawLinks() or this.drawLinksFD())
	 *
	 * @param edgeBundled
	 *    in case linkFunc is this.drawLinksFD(), this contains the bundled links
	 */
	drawComplete(linkFunc, edgeBundled) {
		// draw whole graph
		this.drawCommunities(this.nodes, this.width, this.height);
		const links = edgeBundled || this.links;
		linkFunc(this, links, this.canvas, false);
		this.drawNodes(this.nodes, this.canvas);
		this.drawLabels(this.canvas);

		// save layout in order to re-use it later
		const oldNodes = this.nodes;
		this.oldLayout = new Map();
		this.oldModelNr = MODEL_COUNT;

		// create map for faster look up
		oldNodes.forEach(d => {
			this.oldLayout.set(d.id, {
				x: d.x,
				y: d.y
			});
		});
		this.oldLayoutNumber = oldNodes.length;
		this.hideLoadingIndicator();
		this.ready = true;
	}

	/**
	 * Preprocesses data in order to be able to use d3.ForceBundle plugin, then runs
	 * edge bundling and draws the graph.
	 */
	edgeBundlingDraw(nodes, links) {
		if (!this.active || !nodes || !links || !CONFIG.graph.edgeBundling)
			return;

		// only recalculate if needed (graph has changed)
		if (this.bundledLinks && this.oldLayout && !this.nodesChanged &&
			this.bundledLinks.length == this.links.length) {

			// check if graph size has changed (and rescale layout if it has)
			const oldSize = this.edgeBundlingCanvasSize;
			if (oldSize.width == this.canvas.width && oldSize.height == this.canvas.height) {
				this.drawComplete(this.drawLinksFD, this.bundledLinks);
				return;
			}
		}

		this.ready = false;
		this.showLoadingIndicator();

		// convert data
		const nodes_new = {};
		nodes.forEach(d => {
			nodes_new[d.id] = {
				x: d.x,
				y: d.y
			};
		});
		const linkMap = {};
		const links_new = links.map(d => {
			linkMap[`sx${d.source.x}sy${d.source.y}tx${d.target.x}ty${d.target.y}`] = d;
			return {
				source: d.source.id,
				target: d.target.id
			};
		});

		// stop existing webworkers
		if (this.edgeBundlingTask) {
			THREAD_POOL.stopTask(this.edgeBundlingTask);
			this.edgeBundlingTask = undefined;
		}

		// save current graph size to be able to detect changes
		this.edgeBundlingCanvasSize = {
			width: this.canvas.width,
			height: this.canvas.height
		};

		// start webworker
		this.edgeBundlingTask = new Task("./lib/edgeBundlingWorker.js",
			{
				links: links_new,
				nodes: nodes_new,
				ss: 0.3,
				ct: 0.6,
				timeout: CONFIG.graph.timeout
			},
			(event) => {
				if (event.data.error) {
					// in case of error use unbundled links
					CONFIG.graph.edgeBundling = false;
					this.drawComplete(this.drawLinks);
				} else {
					event.data.links.forEach(d => {
						d.oLink = linkMap[`sx${d[0].x}sy${d[0].y}tx${d[d.length - 1].x}ty${d[d.length - 1].y}`];
					});
					this.bundledLinks = event.data.links;
					this.drawComplete(this.drawLinksFD, event.data.links);
				}
			});
		THREAD_POOL.executeTask(this.edgeBundlingTask);
	}

	/**
	 * Draws community voronoi areas.
	 */
	drawCommunities(nodes, width, height) {
		if (!CONFIG.filter.showCommunities || !CONFIG.graph.showCommunities)
			return;

		// calculate voronio
		const voronoi = d3.geom.voronoi()
			.x(d => d.x)
			.y(d => d.y)
			.clipExtent([
				[-width, -height],
				[width * 2, height * 2]
			]);

		const ctx = this.canvas.getContext("2d");

		// draw cells
		voronoi(this.nodes).forEach(d => {
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(d[0][0], d[0][1]);
			for (let i = 1; i < d.length; i++) {
				ctx.lineTo(d[i][0], d[i][1]);
			}
			ctx.clip();
			ctx.beginPath();
			ctx.arc(d.point.x, d.point.y, 30, 0, 2 * Math.PI);
			ctx.fillStyle = `${MAPPING.communityRGBcached(d.point.community)}0.15)`;
			ctx.fill();
			ctx.restore();
		});
	}

	/**
	 * Draws the graph's links
	 *
	 * Directed links are drawn either as double lines, double lines with half arrows or
	 * curved with bias towards the target node as proposed by Fekete et al.
	 * The mode is set in the graph's config
	 *
	 * (read "Overlaying Graph Links on Treemaps" by Fekete et al. for more information on the curved links)
	 */
	drawLinks(graph, links, canvas, highlightMode) {
		const ctx = canvas.getContext("2d");
		const directed = CONFIG.graph.linkDirection && CRXFILTER.currentData.model.properties.directedTransitions;
		// do not scale linearly, so graph becomes less
		// cluttered the more the user zooms in
		const zoomScaling = 1 / Math.sqrt(graph.scale);
		ctx.save();

		links.forEach(d => {
			if (!d.source || !d.target)
				return;

			const opacity = highlightMode ? 1 : MAPPING.linkOpacity(d.weight);
			const styleString = CONFIG.UI.darkTheme ? `rgba(255, 255, 255, ${opacity}` : `rgba(0, 0, 0, ${opacity})`;
			const linkWidth = MAPPING.linkWidth(d.weight) * zoomScaling;

			ctx.strokeStyle = styleString;
			ctx.fillStyle = styleString;
			ctx.lineWidth = linkWidth;

			// draw link
			if (directed) {
				graph.drawDirectedLink(canvas, d, linkWidth, highlightMode);
			} else {
				// undirected links are displayed as straight lines
				ctx.beginPath();
				ctx.moveTo(d.source.x, d.source.y);
				ctx.lineTo(d.target.x, d.target.y);
				ctx.stroke();
			}
		});
		ctx.restore();
	}

	/**
	 * Draws links (force directed). No direction indicator available yet.
	 */
	drawLinksFD(graph, edgeBundledLinks, canvas, highlightMode) {
		const ctx = canvas.getContext("2d");
		ctx.save();
		// do not scale linearly, so graph becomes less
		// cluttered the more the user zooms in
		const zoomScaling = 1 / Math.sqrt(graph.scale);

		edgeBundledLinks.forEach(line => {
			// draw link as polyline
			ctx.beginPath();
			ctx.moveTo(line[0].x, line[0].y);
			for (let j = 1; j < line.length; j++) {
				ctx.lineTo(line[j].x, line[j].y);
			}

			const opacity = highlightMode ? 1 : MAPPING.linkOpacity(line.oLink.weight);

			ctx.strokeStyle = CONFIG.UI.darkTheme ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`;
			ctx.lineWidth = MAPPING.linkWidth(line.oLink.weight) * zoomScaling;
			ctx.stroke();
		});
		ctx.restore();
	}

	/**
	 * Draws nodes.
	 */
	drawNodes(nodes, canvas, highlightMode) {
		const ctx = canvas.getContext("2d");
		ctx.save();
		ctx.strokeStyle = CONFIG.UI.darkTheme ? "#fff" : "#000";
		// do not scale linearly, so graph becomes less
		// cluttered the more the user zooms in
		const zoomScaling = 1 / Math.sqrt(this.scale);
		const arc = 2 * Math.PI;
		nodes.forEach(d => {
			ctx.fillStyle = MAPPING.nodeColor(d.amount);
			const r = MAPPING.nodeRadius(d.amount) * zoomScaling;
			ctx.beginPath();
			ctx.arc(d.x, d.y, r, 0, arc);
			ctx.stroke();
			ctx.fill();
		});
		ctx.restore();
	}

	/**
	 * Draws node labels.
	 */
	drawLabels(currentCanvas = this.canvas, nodes) {
		if (!CONFIG.graph.showLabels || !CRXFILTER.currentData.model.properties.showRegionNames) {
			return;
		}

		// display labels for the nodes with the highest amounts and additionally for the
		// node with the highest amount in its community
		let filteredNodes = nodes ? nodes : this.nodes;
		// for small numbers of nodes all labels can be shown,
		// so only filter if necessary
		if (filteredNodes.length > CONFIG.graph.labelLimit) {
			// if there are many nodes, sort by importance, filter and slice

			// spacial margin for labels
			const margin = {
				top: 15,
				right: 25,
				bottom: 5,
				left: 5
			};

			filteredNodes = this.nodes
				.sort((a, b) => {
					// sort first by amount, then by transitionNumber,
					// then by name and as last resort by id
					return d3.descending(a.amount, b.amount) ||
						d3.descending(a.transitionNumber, b.transitionNumber) ||
						d3.ascending(a.name, b.name) ||
						d3.ascending(a.id, b.id);
				})
				.filter(d => {
					// get screen pixel coordinates
					const x = (d.x) * this.scale - this.canvas.originX * this.scale;
					const y = (d.y) * this.scale - this.canvas.originY * this.scale;
					// filter nodes, to show only labels for nodes that are currently visible
					const inside = x > margin.left
						&& y > margin.top
						&& x < this.canvas.width - margin.right
						&& y < this.canvas.height - margin.bottom;
					return inside;
				})
				// limit label count to avoid clutter
				.slice(0, CONFIG.graph.labelLimit);
		}

		// prepare canvas, get style and size
		const ctx = currentCanvas.getContext("2d");
		ctx.save();
		const textSize = 12 / this.scale;
		ctx.font = `${textSize}px sans-serif`;
		ctx.fillStyle = CONFIG.UI.darkTheme ? "#fff" : "#000";
		ctx.strokeStyle = CONFIG.UI.darkTheme ? "#000" : "#fff";

		// draw labels
		filteredNodes.forEach(d => {
			ctx.strokeText(d.name, d.x, d.y);
			ctx.fillText(d.name, d.x, d.y);
		});
		ctx.restore();
	}

	/**
	 * this is needed as we react to events from the WebWorker
	 * which can cause drawing even after leaving the canvas
	 */
	handleMouseover(graph) {
		graph.isMouseIn = true;
	}

	/**
	 * detect zooming and panning and disable default browser zooming
	 * or history navigation
	 */
	handleTouchmove(graph, e) {
		e.preventDefault();
		const canvas = graph.canvas;
		const rect = canvas.currentBoundingRect;

		if (e.targetTouches.length == 1) {
			// one finger: panning or selection
			if (canvas.clicked) {
				const dx = e.targetTouches[0].pageX - rect.left;
				const dy = e.targetTouches[0].pageY - rect.top;
				if (graph.dragging) {
					// draw selection rectangle
					graph.selectionRect(dx, dy);
				} else {
					// panning
					graph.translate(dx, dy);
				}
			}
		} else if (e.targetTouches.length == 2) {
			// two fingers: zooming
			const t1 = e.targetTouches[0];
			const t2 = e.targetTouches[1];
			const t1old = canvas.previousTouches[0];
			const t2old = canvas.previousTouches[1];
			// zoom center
			const x = (t1.pageX + t2.pageX) / 2.0;
			const y = (t1.pageY + t2.pageY) / 2.0;
			// zoom factor (new finger distance / old finger distance)
			const dx = (t1.pageX - t2.pageX);
			const dy = (t1.pageY - t2.pageY);
			const dist = Math.sqrt(dx * dx + dy * dy);
			const dxold = (t1old.pageX - t2old.pageX);
			const dyold = (t1old.pageY - t2old.pageY);
			const distold = Math.sqrt(dxold * dxold + dyold * dyold);
			const zoom = dist / distold;
			graph.zoom(x, y, zoom);
		} else {
			// 3 or more touch points: do nothing
			return;
		}
		canvas.previousTouches = e.targetTouches;
	}

	/**
	 * Reacts to the cursor leaving the canvas.
	 */
	handleMouseout(graph) {
		// set this flag so the delayed message from the WebWorker doesnt cause a redraw
		graph.isMouseIn = false;
		const canvas = graph.canvas;
		graph.tip.style("display", "none");
		canvas.clicked = false;
		if (graph.dragging) {
			graph.dragging = false;
			canvas.getContext("2d").putImageData(canvas.before, 0, 0);
		} else {
			// cancel highlighting
			DISPATCH.endHighlight();
		}
		// reset community picker and cursor
		graph.communityPicker = false;
		graph.viewDiv.style("cursor", "default");
	}

	/**
	 * Reacts to scrolling by zooming in or out, depending on scroll direction.
	 */
	handleMousewheel(graph, e) {
		e.preventDefault();
		const x = e.offsetX;
		const y = e.offsetY;
		// wheel delta in [-1,+1]
		const w = e.wheelDelta / 120;
		const zoom = Math.exp(w * 0.2);
		graph.zoom(x, y, zoom);
	}

	/**
	 * Removes tooltip and prepares for dragging.
	 */
	handleMousedown(graph, e) {
		const canvas = graph.canvas;
		graph.tip.style("display", "none");
		canvas.clicked = true;
		if (graph.dragging) {
			canvas.before = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
		}
		if (e.targetTouches) {
			// in case of touchmove (also calls this handler)
			// get relative start of possible selection rectangle
			const rect = canvas.currentBoundingRect = e.target.getBoundingClientRect();
			canvas.startDragX = e.targetTouches[0].pageX - rect.left;
			canvas.startDragY = e.targetTouches[0].pageY - rect.top;
			canvas.previousTouches = e.targetTouches;
		} else {
			// mousemove
			canvas.startDragX = e.offsetX;
			canvas.startDragY = e.offsetY;
		}
	}

	/**
	 * Filters nodes after dragging ends.
	 */
	handleMouseup(graph, e) {
		const canvas = graph.canvas;
		canvas.clicked = false;

		// if selection rectangle was used, filter on regions
		if (graph.dragging) {
			// distinguish mouse and touch
			const dx = e.targetTouches ? canvas.previousTouches[0].pageX : e.offsetX;
			const dy = e.targetTouches ? canvas.previousTouches[0].pageY : e.offsetY;

			canvas.getContext("2d").putImageData(canvas.before, 0, 0);

			let x = canvas.startDragX * graph.scaleInv + canvas.originX;
			let y = canvas.startDragY * graph.scaleInv + canvas.originY;
			let w = (dx - canvas.startDragX) * graph.scaleInv;
			let h = (dy - canvas.startDragY) * graph.scaleInv;

			// handle dragging other than starting from top-left
			if (w < 0) {
				x = x + w;
				w = -w;
			}
			if (h < 0) {
				y = y + h;
				h = -h;
			}

			const regions = [];

			graph.nodes
				// filter nodes (check if inside selection rectangle)
				.filter(d => d.x >= x && d.x <= x + w && d.y >= y && d.y <= y + h)
				// get region objects from ids
				.forEach(d => {
					regions.push(CRXFILTER.currentData.model.regionMap.get(d.id));
				});

			// finish dragging
			graph.dragging = false;

			// filter on regions
			if (regions.length) {
				DISPATCH.onRegionSelection(regions);
			}
		} else if (graph.selectedNode && graph.communityPicker) {
			// filter on the community of the clicked node
			CRXFILTER.applyFilter("community", graph.selectedNode.community);
		}
		// reset community picker and cursor
		graph.communityPicker = false;
		graph.viewDiv.style("cursor", "default");
	}

	/**
	 * Highlight a hovered node (and adjacent edges) and present its attributes
	 * in a tooltip.
	 */
	getHighlight(e) {
		// tooltip
		this.tip
			.style("top", `${e.clientY + 20}px`)
			.style("left", `${e.clientX + 20}px`);

		// highlight
		if (this.layoutTask.thread._worker) {
			const x = e.offsetX * this.scaleInv + this.canvas.originX;
			const y = e.offsetY * this.scaleInv + this.canvas.originY;

			this.layoutTask.thread._worker.postMessage({
				x: x,
				y: y,
				r: 50 * this.scaleInv
			});
		}
	}

	/**
	 * Draws the current selection rectangle.
	 */
	selectionRect(dx, dy) {
		const canvas = this.canvas;
		const ctx = canvas.getContext("2d");
		const x = canvas.startDragX * this.scaleInv + canvas.originX;
		const y = canvas.startDragY * this.scaleInv + canvas.originY;
		const w = (dx - canvas.startDragX) * this.scaleInv;
		const h = (dy - canvas.startDragY) * this.scaleInv;

		// save canvas to avoid redrawing
		ctx.putImageData(canvas.before, 0, 0);
		ctx.strokeStyle = CONFIG.UI.darkTheme ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)";
		ctx.strokeRect(x, y, w, h);
	}

	/**
	 * Translates the canvas content when the user performs panning.
	 */
	translate(dx, dy) {
		const x = (dx - this.canvas.startDragX) * this.scaleInv;
		const y = (dy - this.canvas.startDragY) * this.scaleInv;
		[this.canvas, this.highlightCanvas].forEach(canvas => {
			// set start to current position
			canvas.startDragX = dx;
			canvas.startDragY = dy;
			// translate
			canvas.getContext("2d").translate(x, y);
			// update origin
			canvas.originX -= x;
			canvas.originY -= y;
		});
		this.redraw();
	}

	/**
	 * Zooms the canvas content centered to (x, y) with the given zoom factor.
	 *
	 * @param x
	 *    x coordinate of the zoom center
	 *
	 * @param y
	 *    y coordinate of the zoom center
	 *
	 * @param zoom
	 *    zoom factor
	 */
	zoom(x, y, zoom) {
		// update scale state
		this.scale *= zoom;
		this.scaleInv = 1 / this.scale;

		// translate, scale
		[this.canvas, this.highlightCanvas].forEach(canvas => {
			const ctx = canvas.getContext("2d");
			ctx.translate(canvas.originX, canvas.originY);
			ctx.scale(zoom, zoom);

			// update origin
			canvas.originX -= (1 - zoom) * x * this.scaleInv;
			canvas.originY -= (1 - zoom) * y * this.scaleInv;

			// translate back
			ctx.translate(-canvas.originX, -canvas.originY);
		});
		this.redraw();
	}

	/**
	 * add options to the view settings panel
	 */
	settingsFunction() {
		const _this = this;
		const box = this.settingsPanel;

		// label count
		const labelLimit = box.append("label")
			.text("Label limit ")
			.append("input")
			.attr("type", "number")
			.attr("min", "0")
			.attr("max", "100")
			.attr("step", "1")
			.attr("value", CONFIG.graph.labelLimit)
			.on("change", function () {
				const valueInt = parseInt(this.value);
				if (isNaN(valueInt)) {
					alert(`no valid integer: ${this.value}`);
				} else {
					CONFIG.graph.labelLimit = valueInt;
					_this.redraw();
				}
			});

		// show link direction
		const label = box.append("label").text("Visualize link direction ");
		const showDirection = label.append("input")
			.attr("type", "checkbox")
			.property("checked", CONFIG.graph.linkDirection)
			.on("click", function () {
				CONFIG.graph.linkDirection = !CONFIG.graph.linkDirection;
				_this.redraw();
			});

		// selection for direction indicator
		box.append("label").text("Visualize link direction via ");
		const select = box.append("select")
			.attr("size", 1)
			.on("change", function () {
				CONFIG.graph.linkDirectionIndicator = this.options[this.selectedIndex].value;
				_this.redraw();
			});
		select.append("option")
			.attr("disabled", "true")
			.text("choose an option (will take time to redraw)");
		select.append("option")
			.attr("value", "halfArrows")
			.text("half-arrows (and double lines)");
		select.append("option")
			.attr("value", "doubleLines")
			.text("double lines (links always go right)");
		select.append("option")
			.attr("value", "curvature")
			.text("curvature");

		// hide settings that are not applicable
		if (!CONFIG.graph.showLabels) {
			labelLimit.attr("disabled", "true");
		}
		if (!CRXFILTER.currentData.model.properties.directedTransitions) {
			showDirection.attr("disabled", "true");
			select.attr("disabled", "true");
		}

		// timeout
		const timeout = box.append("label")
			.text("Timeout (in ms, 0 to disable) ")
			.append("input")
			.attr("type", "number")
			.attr("min", "0")
			.attr("max", "60000")
			.attr("step", "100")
			.attr("value", CONFIG.graph.timeout)
			.on("change", function () {
				const valueInt = parseInt(this.value);
				if (isNaN(valueInt)) {
					alert(`no valid integer: ${this.value}`);
				} else {
					CONFIG.graph.timeout = valueInt;
				}
			});
	}
}


const graphView = new Graph({
	name: "graph",
	title: "Graph",
	icon: "<i class=\"fa fa-share-alt fa-fw\"></i>",
	infoText:
		`<p>This view shows the network topology in a force directed layout.</p>
		<p>You can use zooming and panning as in a map or highlight nodes by hovering over them.</p>
		<p>The after clicking the selection button<i class="fa fa-instagram"></i>, nodes can be selected with a dragging rectangle.</p>
		<p><i class="fa fa-crosshairs"></i> Activates the community picker, clicking on a nodes then filters on its community.</p>
		<p><i class="fa fa-code-fork"></i> enables or disables edge bundling.</p>
		<p><i class="fa fa-font"></i> enables or disables the display of labels for nodes.</p>
        <p>In the graph settings, you can choose different modes for link direction indicators
         (only for directed networks). Double lines display one line per link (similar to roadways
         the right lane is used), optionally with half-arrows. Curvature shows a bias in link
         curvature towards the target node.</p>`
});
