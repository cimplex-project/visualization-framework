/**
 * This file contains code for a scarf plot visualization.
 */
class ScarfPlot extends View {
	constructor(params) {
		super(params);

		// subscribed events
		DISPATCH.on(`initializeView.${this.name}`, param => this.initScarfplot(param));
		DISPATCH.on(`onRegionFiltered.${this.name}`, () => this.draw(true));
		DISPATCH.on(`onRegionHighlight.${this.name}`, id => this.drawCanvas(id));
		DISPATCH.on(`onHighlightEnd.${this.name}`, () => this.canvas2 ? this.canvas2.style.visibility = "hidden" : null);
		DISPATCH.on(`onFilterReset.${this.name}`, () => this.draw());
		DISPATCH.on(`onCommunityUpdate.${this.name}`, () => this.drawCanvas());

		// get margins (left is set later depending on labels)
		this.margin = {
			top: 5,
			right: 5,
			bottom: 25
		};
	}

	/**
	 * Initializes the view.
	 * @param {any} params
	 */
	initScarfplot(params) {
		if (params.includes(this.name)) {
			// configuration dependent attributes can only be set here
			this.activate();
			this.setStyleSelectors(lib.getSelectorsForColumnType(CONFIG.UI.viewColumns), false);
			this.setHeight(Math.floor(VIEW_CONTAINER_HEIGHT / CONFIG.UI.viewRows), false);
			this.width = this.viewDiv.node().getBoundingClientRect().width;

			// initialize selection rectangle
			this.draggingRectangle = {
				dragging: false,
				dy: 0,
				originY: 0,
				contains: y => {
					const oy = this.draggingRectangle.originY + Math.min(0, this.draggingRectangle.dy);
					const height = Math.abs(this.draggingRectangle.dy);
					return y >= oy && y <= oy + height;
				}
			};

			// add button for selection reset
			this.resetButton = this.addButton({
				title: "Reset ordering",
				icon: "<i class=\"fa fa-eraser fa-fw\"></i>",
				clickFunction: () => this.draw()
			});

			// create tooltip
			this.tip = this.viewDiv.append("div")
				.attr("class", "viewTooltip")
				.style("display", "none");

			// set main drawing function
			this.setDrawFunction(this.drawScarfplot);
			// set settings function
			this.setSettingsFunction(this.settingsFunction);

			// draw view
			this.draw();
		}
	}

	drawScarfplot(reSort = false) {
		// remove all old elements
		this.viewDiv.selectAll("p").remove();
		this.viewDiv.selectAll("svg").remove();
		this.viewDiv.selectAll("canvas").remove();

		// show warning if no or too many items are to be displayed
		const data = CRXFILTER.currentData;
		if (data.regions.length === 0 || !CRXFILTER.currentData.model.additionalData.allIterations) {
			this.showNoItemsMessage();
		} else {
			// get filtered data and create own sorted data structure (necessary for similarity sorting)
			this.nodes = data.regions.slice(0);
			this.remapNodes();
			// sort data if it previously was sorted
			if (reSort && CONFIG.scarfplot.activeSorting !== undefined) {
				const { mode, parameter } = CONFIG.scarfplot.activeSorting;
				this.order(mode, parameter);
			}
			// draw view
			this.createCanvas();
			this.drawCanvas();
		}
	}

	/**
	 * react to reactivation
	 */
	reactivated() {
		if (!CRXFILTER.currentData.model.additionalData.allIterations) {
			this.deactivate();
			return;
		}
		// may have changed meanwhile
		this.width = this.viewDiv.node().getBoundingClientRect().width;
		this.draw();
	}

	/**
	 * draw view content
	 */
	createCanvas() {
		// may have changed meanwhile
		this.width = this.viewDiv.node().getBoundingClientRect().width;
		this.canvasWidth = this.width;
		this.canvasHeight = this.height;

		// add canvas
		this.canvas = document.createElement("canvas");
		this.canvas.width = this.width;
		this.canvas.height = this.height;
		this.canvas.style.position = "absolute";
		this.canvas.style.left = `${(this.width - this.canvasWidth) / 2}px`;

		// add highlight canvas
		this.canvas2 = document.createElement("canvas");
		this.canvas2.width = this.width;
		this.canvas2.height = this.height;
		this.canvas2.style.position = "absolute";
		this.canvas2.style.left = this.canvas.style.left;
		this.canvas2.style.pointerEvents = "none";

		// add event handlers (mouse)
		this.canvas.addEventListener("mouseup", (e) => this.handleMouseup(e, this), false);
		this.canvas.addEventListener("mousemove", (e) => this.handleMousemove(e, this), false);
		this.canvas.addEventListener("mouseout", (e) => this.handleMouseout(e, this), false);

		// add event handlers (touch)
		this.canvas.addEventListener("touchstart", (e) => this.handleMousemove(e.touches[0], this), false);
		this.canvas.addEventListener("touchmove", (e) => this.handleMousemove(e.touches[0], this), false);
		this.canvas.addEventListener("touchend", (e) => this.handleMouseup(e.changedTouches[0], this), false);

		this.viewDiv.node().appendChild(this.canvas);
		this.viewDiv.node().appendChild(this.canvas2);

		// add dragging rectangle
		this.draggingSVG = this.viewDiv.append("svg").attr("class", "draggingRectangleSVG")
			.style("left", 0)
			.attr("width", this.canvasWidth)
			.attr("height", this.canvasHeight);

		this.draggingSVG.append("rect")
			.attr("class", "draggingRectangle")
			.style("visibility", "hidden")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", this.canvasWidth)
			.attr("height", 0);

		// add selection rectangle as d3 dragging behavior
		const drag = d3.behavior.drag()
			.on("dragstart", () => this.dragstarted(this))
			.on("drag", () => this.dragged(this))
			.on("dragend", () => this.dragended(this));
		this.viewDiv.select("canvas").call(drag);
	}

	/**
	 * draw view content
	 */
	drawCanvas(highlightedRegion) {
		if (
			!this.active
			|| !this.nodes
			|| this.viewDiv.selectAll("canvas").length === 0) {
			return;
		}

		const ctx = this.canvas.getContext("2d");
		const iterations = CRXFILTER.currentData.model.additionalData.allIterations;
		const n = this.nodes.length;
		const m = this.margin;
		const itemHeight = this.itemHeight = (this.canvasHeight - m.top - m.bottom) / n;
		const showLabels = this.showLabels = itemHeight >= 10;
		if (showLabels) {
			// get size of labels so no text is cut
			let labelSize = 0;
			this.nodes.forEach((node, index) => {
				const textWidth = ctx.measureText(node.properties.name).width;
				if (textWidth > labelSize) {
					labelSize = textWidth;
				}
			});
			// set left margin
			m.left = labelSize + 17;
		} else {
			m.left = 15;
		}
		const itemWidth = this.itemWidth = (this.canvasWidth - m.left - m.right) / iterations.length;

		// only draw full view if nothing is highlighted
		if (highlightedRegion === undefined) {
			ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

			// hide highlight canvas
			this.canvas2.style.visibility = "hidden";
			const baseColor = CONFIG.UI.darkTheme ? "rgba(255, 255, 255, 1)" : "rgba(0, 0, 0, 1)";
			// draw region name labels
			if (showLabels) {
				ctx.textAlign = "end";
				this.nodes.forEach((node, index) => {
					if (CONFIG.filter.showCommunities) {
						const color = lib.hexColorToRGB(MAPPING.communityColor(+node.community));
						ctx.fillStyle = `rgba(${color.r},${color.g},${color.b}, 1)`;
					} else {
						ctx.fillStyle = baseColor;
					}
					ctx.fillText(node.properties.name, m.left - 5, m.top + itemHeight / 2 + index * itemHeight);
				});
			}

			// draw region values
			iterations.forEach((iteration, index) => {
				for (let i = 0; i < n; i++) {
					const value = MAPPING.nodeColorTotal(+iteration.status[+this.nodes[i].properties.id]);
					if (value) {
						const color = lib.hexColorToRGB(value);
						if (color) {
							ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
							ctx.fillRect(
								m.left + index * itemWidth,
								m.top + i * itemHeight,
								itemWidth,
								itemHeight
							);
						}
					}
				}
			});

			// draw time legend
			const step = Math.ceil(30 / itemWidth);
			ctx.fillStyle = CONFIG.UI.darkTheme ? "#fff" : "#000";
			ctx.textAlign = "center";
			iterations.forEach((iteration, index) => {
				if (index % step === 0) {
					ctx.fillText(
						index + 1,
						m.left + (index + 0.5) * itemWidth,
						this.canvasHeight - 10);
				}
			});
		} else {
			// show highlight canvas
			this.canvas2.style.visibility = "visible";

			const ctx2 = this.canvas2.getContext("2d");
			ctx2.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

			// dim everything
			ctx2.fillStyle = CONFIG.UI.darkTheme ? "rgba(0, 0, 0, 0.33)" : "rgba(255, 255, 255, 0.33)";
			ctx2.fillRect(m.left, 0, this.canvasWidth, this.canvasHeight);

			// draw highlighted region
			iterations.forEach((iteration, index) => {
				for (let i = 0; i < n; i++) {
					const id = +this.nodes[i].properties.id;
					// draw only highlighted region
					if (id === +highlightedRegion) {
						// indicator line left of region
						ctx2.fillStyle = CONFIG.UI.darkTheme ? "#fff" : "#000";
						ctx2.fillRect(5, m.top + i * itemHeight, 5, itemHeight);
						// region itself
						const value = MAPPING.nodeColorTotal(+iteration.status[id]);
						if (value) {
							const color = lib.hexColorToRGB(value);
							if (color) {
								ctx2.fillStyle = `rgba(${color.r},${color.g},${color.b}, 1)`;
								ctx2.fillRect(
									m.left + index * itemWidth,
									m.top + i * itemHeight,
									itemWidth,
									itemHeight
								);
							}
						}
						continue;
					}
				}
			});

			// draw time legend highlight
			ctx2.textAlign = "center";
			iterations.forEach((iteration, index) => {
				if (index + 1 === this.highlightIteration) {
					const x = m.left + (index + 0.5) * itemWidth;
					const y = this.canvasHeight - 10;
					const textWidth = ctx2.measureText(index + 1).width;
					// background (in case there are labels overlapping)
					ctx2.fillStyle = CONFIG.UI.darkTheme ? "#000" : "#fff";
					ctx2.fillRect(x - textWidth, y - 15, textWidth * 2.0, 25);
					// text
					ctx2.fillStyle = CONFIG.UI.darkTheme ? "#fff" : "#000";
					ctx2.fillText(index + 1, x, y);
					// underline
					ctx2.fillRect(x - 0.5 * textWidth - 1, y + 2, textWidth + 2, 5);
				}
			});
		}
	}

	/**
	 * get map from new to old indices
	 */
	remapNodes() {
		const nodesRemap = new Map();
		const n = this.nodes.length;
		for (let i = 0; i < n; i++) {
			nodesRemap.set(this.nodes[i].properties.id, i);
		}
		this.nodesRemap = nodesRemap;
	}

	/**
	 * react on mousemove diffently depending on context
	 */
	handleMousemove(e, _this) {
		// do nothing if user is currently dragging
		if (_this.draggingRectangle.dragging) {
			return;
		}

		// calculate offsetx & y (touches)
		const rect = e.target.getBoundingClientRect();
		const offsetX = e.clientX - rect.left;
		const offsetY = e.clientY - rect.top;

		// get currently hovered region and iteration
		const region = _this.getRegion(offsetY, _this);
		const it = _this.getIteration(offsetX, _this);

		if (!region) {
			_this.tip.style("display", "none");
			DISPATCH.endHighlight();
		} else {
			// trigger highlighting
			DISPATCH.startRegionHighlight(region.properties.id);
			// show tooltip
			let value = "-";
			if (it > 0 && CRXFILTER.currentData.model.additionalData.allIterations[it - 1]) {
				value = CRXFILTER.currentData.model.additionalData.allIterations[it - 1].status[region.properties.id];
			}

			const iterationText = it > 0 ? `<br><br>iteration ${it}<br>value in this iteration: ${value}<br><br>(click to order by similarity to this)` : "";
			_this.tip
				.style("display", "block")
				.html(CONNECTOR.tooltipNode(region, null, _this.name) + iterationText)
				.style("z-Index", 1000)
				.style("top", `${e.clientY + 20}px`)
				.style("left", `${e.clientX + 20}px`);
		}
	}

	/**
	 * react to the cursor leaving the canvas
	 */
	handleMouseout(e, _this) {
		_this.tip.style("display", "none");
		_this.draggingSVG.select(".draggingRectangle").style("visibility", "hidden");
		_this.highlightIteration = null;
		_this.draggingRectangle.dragging = false;
		DISPATCH.endHighlight();
	}

	/**
	 * react to clicks - show clicked region on top and order by similarity
	 */
	handleMouseup(e, _this) {
		// do nothing if user is currently dragging
		if (Math.abs(_this.draggingRectangle.dy) > 5) {
			return;
		}

		// calculate  y (touches)offset
		const rect = e.target.getBoundingClientRect();
		const offsetY = e.clientY - rect.top;
		_this.order("similarity", _this.getRegion(offsetY, _this));
	}

	/**
	 * get currently hovered region from y position
	 */
	getRegion(yPos, _this) {
		const index = Math.floor((yPos - _this.margin.top) / _this.itemHeight);
		return _this.nodes[index];
	}

	/**
	 * get currently hovered iteration
	 */
	getIteration(offsetX, _this) {
		return _this.highlightIteration = Math.ceil((offsetX - _this.margin.left) / _this.itemWidth);
	}

	/**
	 * order regions by similarity or the first occurrence of a given value,
	 * then redraw the canvas
	 *
	 * @param mode
	 *    ordering mode, either "similarity" or "firstOccurrence"
	 *
	 * @param parameter
	 *    either a region object to compare others to or
	 *    a value for which first occurrences are compared
	 */
	order(mode, parameter) {
		// when user has clicked, dragging has been wrongly set to true
		this.draggingRectangle.dragging = false;

		if (
			!mode
			|| !parameter
			|| (mode !== "similarity" && mode !== "firstOccurrence")
		) {
			return;
		}

		const iterations = CRXFILTER.currentData.model.additionalData.allIterations;
		const n = this.nodes.length;

		this.showLoadingIndicator();

		// convert iteration > region to region > iterations
		// array with one value array for each region
		const regionArray = new Array(n);
		for (let i = 0; i < n; i++) {
			// array with one value for each iteration
			const valueArray = new Array(iterations.length);
			iterations.forEach((iteration, index) => {
				const value = iteration.status[+this.nodes[i].properties.id];
				valueArray[index] = value;
			});
			regionArray[i] = valueArray;
		};

		// sort either by similarity of by first occurrence of some value
		const orderFunc = mode === "similarity" ? this.orderSimilar : this.orderSorted;
		orderFunc(parameter, regionArray, this);

		// save current sorting
		CONFIG.scarfplot.activeSorting = { mode, parameter };
	}

	/**
	 * Orders all regions in regioArray according to their similarity to region.
	 */
	orderSimilar(region, regionArray, _this) {
		// calculate similarities
		const mainRegion = regionArray[_this.nodesRemap.get(region.properties.id)];
		// start webworker
		const similarityTask = new Task("./lib/vectorSimilarity/vectorSimilarityWorker.js", {
			measure: CONFIG.scarfplot.measure,
			vectors: regionArray,
			candidate: mainRegion
		},
			event => {
				const similarities = event.data.result;
				// sort by similarities (descending)
				_this.nodes.sort((a, b) => {
					const aIndex = _this.nodesRemap.get(a.properties.id);
					const bIndex = _this.nodesRemap.get(b.properties.id);
					return similarities[bIndex] - similarities[aIndex];
				});
				_this.orderFinish(_this);
			});
		THREAD_POOL.executeTask(similarityTask);
	}

	/**
	 * Sorts all regions in regionArray by the first occurrence (ascending) of
	 * <value>, then updates scarfplot"s canvas.
	 */
	orderSorted(value, regionArray, _this) {
		// sort stable
		_this.nodes.sort((a, b) => {
			const aIndex = _this.nodesRemap.get(a.properties.id);
			const bIndex = _this.nodesRemap.get(b.properties.id);
			const aPos = lib.tolerantIndexOf(regionArray[aIndex], value);
			const bPos = lib.tolerantIndexOf(regionArray[bIndex], value);
			// if aPos == bPos use existing position
			return (aPos - bPos) || (aIndex - bIndex);
		});
		_this.orderFinish(_this);
	}

	/**
	 * Updates scarfplot's data structure and canvas.
	 */
	orderFinish(_this) {
		// map new IDs to old IDs
		_this.remapNodes();
		// redraw canvas
		_this.drawCanvas();
		_this.hideLoadingIndicator();
	}

	/**
	 * Reacts to start of dragging.
	 */
	dragstarted(_this) {
		const e = d3.event.sourceEvent;
		e.stopPropagation();
		_this.tip.style("display", "none");
		_this.draggingRectangle.dragging = true;
		_this.draggingRectangle.dy = 0;
		if (e.targetTouches) {
			// touch event
			const rect = e.target.getBoundingClientRect();
			_this.draggingRectangle.originY = e.targetTouches[0].clientY - rect.top;
		} else {
			// mouse event
			_this.draggingRectangle.originY = e.offsetY - _this.margin.top;
		}
	}

	/**
	 * React to ongoing dragging interaction.
	 */
	dragged(_this) {
		if (!_this.draggingRectangle.dragging) {
			return;
		}
		_this.tip.style("display", "none");
		_this.draggingRectangle.dy += d3.event.dy;
		_this.draggingSVG.select(".draggingRectangle")
			.attr("x", 3)
			.attr("y", () => _this.draggingRectangle.originY + Math.min(0, _this.draggingRectangle.dy))
			.attr("width", _this.canvas.width - 6)
			.attr("height", Math.abs(_this.draggingRectangle.dy))
			.style("visibility", "visible");
	}

	/**
	 * React to end of dragging (filter on selected regions).
	 */
	dragended(_this) {
		// only do something if user has dragged (not clicked)
		if (!_this.draggingRectangle.dragging || Math.abs(_this.draggingRectangle.dy) < 5) {
			return;
		}
		d3.event.sourceEvent.stopPropagation();

		// stop dragging rectangle
		_this.draggingRectangle.dragging = false;
		_this.draggingSVG.select(".draggingRectangle").style("visibility", "hidden");

		// get selected regions
		const tempRegions = [];
		const m = _this.margin;
		const itemHeight = _this.itemHeight;
		_this.nodes.forEach((node, index) => {
			const yPos = m.top + index * itemHeight;
			if (_this.draggingRectangle.contains(yPos - 0.4 * itemHeight) ||
				_this.draggingRectangle.contains(yPos + 0.4 * itemHeight)) {
				// avoid double entries
				const r = _this.getRegion(yPos, _this);
				tempRegions[r.properties.id] = r;
			}
		});
		// push all regions to new array to avoid double regions and still have a continuous array
		const regions = [];
		tempRegions.forEach(d => regions.push(d));

		// only filter if something has been selected
		if (regions.length) {
			DISPATCH.onRegionSelection(regions);
		}
	}

	/**
	 * add options to the view settings panel
	 */
	settingsFunction() {
		const _this = this;
		const box = _this.settingsPanel;

		// order by first occurence
		const stateValues = CONNECTOR.stateValues;
		if (stateValues) {
			box.append("label")
				.text("Arrange by earliest occurence of value ");
			const select = box.append("select")
				.attr("size", 1)
				.on("change", function () {
					const selection = this.options[this.selectedIndex].value;
					_this.order("firstOccurrence", selection);
				});
			for (let i = 0; i < stateValues.length; i++) {
				select.append("option")
					.attr("value", stateValues[i].value)
					.text(stateValues[i].description);
			}
		}

		// similarity measure
		box.append("label").text("Similarity metric ");
		const select = box.append("select")
			.attr("size", 1)
			.on("change", function () {
				const selection = this.options[this.selectedIndex].value;
				CONFIG.scarfplot.measure = selection;
			});

		select.append("option")
			.attr("value", CONFIG.scarfplot.measure)
			.text(CONFIG.scarfplot.measure)
			.attr("disabled", "true");

		select.append("option")
			.attr("value", "cosine")
			.text("cosine");

		select.append("option")
			.attr("value", "euklidean")
			.text("euklidean");

		select.append("option")
			.attr("value", "levenshtein")
			.text("levenshtein");
	}
}


const scarfplotView = new ScarfPlot({
	name: "scarfplot",
	title: "Scarf Plot",
	icon: "<i class=\"glyphicon glyphicon-tasks fa-fw\"></i>",
	infoText: `<p>This view shows the state of all regions over time.</p>
			   <p>Hover it for more information or click on some region to order the rest by similarity.</p>
			   <p>Click <i class="fa fa-eraser"></i> to reset the view.</p>
			   <p>Drag up or down with the mouse in order to select regions.</p>`
});
