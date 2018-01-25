
/**
 * This file contains code for a matrix visualization.
 */
class Matrix extends View {
	constructor(params) {
		super(params);

		// subscribed events
		DISPATCH.on(`initializeView.${this.name}`, param => {
			if (param.includes(this.name)) {
				// config dependent attributes can only be set here
				this.activate();
				// set sizes
				this.setStyleSelectors(lib.getSelectorsForColumnType(CONFIG.UI.viewColumns), false);
				this.setHeight(Math.floor(VIEW_CONTAINER_HEIGHT / CONFIG.UI.viewRows), false);
				// initialize selection rectangle
				this.draggingRectangle = {
					dragging: false,
					dx: 0,
					dy: 0,
					originX: 0,
					originY: 0,
					contains: (x, y) => {
						const ox = this.draggingRectangle.originX + Math.min(0, this.draggingRectangle.dx);
						const oy = this.draggingRectangle.originY + Math.min(0, this.draggingRectangle.dy);
						const width = Math.abs(this.draggingRectangle.dx);
						const height = Math.abs(this.draggingRectangle.dy);
						return x >= ox && x <= ox + width &&
							y >= oy && y <= oy + height;
					}
				};

				// set main drawing function
				this.setDrawFunction(this.drawMatrix);
				// set settings function
				this.setSettingsFunction(this.settingsFunction);

				// draw view
				this.createCanvas();
				this.draw();
			}
		});

		// react to region filtering
		DISPATCH.on(`onRegionFiltered.${this.name}`, () => this.draw());
		// show data according to timeline brush
		DISPATCH.on(`onTimeFiltered.${this.name}`, (finished) => {
			if (CRXFILTER.currentData.model.properties.dynamicTransitions) {
				this.draw();
			}
		});
		// highlight nodes
		DISPATCH.on(`onRegionHighlight.${this.name}`, (id) => this.drawHighlight());
		DISPATCH.on(`onHighlightEnd.${this.name}`, () => {
			if (!this.active || this.draggingRectangle.dragging) {
				return;
			}
			this.highlightCanvas.style.visibility = "hidden";
		});
		// highlight transitions
		DISPATCH.on(`onTransitionHighlight.${this.name}`, (id) => this.drawHighlight());
		DISPATCH.on(`onFilterReset.${this.name}`, () => this.draw());
		DISPATCH.on(`onCommunityUpdate.${this.name}`, () => this.draw());
	}

	/**
	 * Draws highlighted links on an second canvas.
	 */
	drawHighlight() {
		if (!this.active || this.draggingRectangle.dragging) {
			return;
		}
		this.highlightCanvas.style.visibility = "visible";
		this.drawCanvas(this.highlightCanvas);
	}

	/**
	 * Reacts to resizing.
	 */
	resized() {
		this.createCanvas();
		this.draw();
	}

	/**
	 * get a region element from a pixel position
	 */
	getElementFromPosition(x, y) {
		if (!this.xRangeBands) {
			return;
		}
		const width = this.xRangeBands.rangeBand();
		// consider margin
		const margin = this.showNames ? 80 : 0;

		// keep Math.floor as ~~ produces wrong results with negative numbers
		const xRet = Math.floor((x - margin) / width);
		const yRet = Math.floor((y - margin) / width);
		// labels are hitable too
		if (xRet < 0 || yRet < 0) {
			const pos = xRet < 0 ? yRet : xRet;
			return this.labels.get(this.orders[CONFIG.matrix.order][pos]);
		}

		let key = `${this.orders[CONFIG.matrix.order][xRet]}, ${this.orders[CONFIG.matrix.order][yRet]}`;
		let value = this.transitionMap.get(key);

		// if matrix is symmetric, items are only stored once
		if (value === undefined && this.symmetric) {
			key = `${this.orders[CONFIG.matrix.order][yRet]}, ${this.orders[CONFIG.matrix.order][xRet]}`;
			value = this.transitionMap.get(key);
		}
		return value;
	}

	/**
	 * create canvas
	 */
	createCanvas() {
		if (!this.active) {
			return;
		}
		while (this.viewDiv.node().firstChild) {
			this.viewDiv.node().removeChild(this.viewDiv.node().firstChild);
		}

		this.canvasWidth = this.canvasHeight = Math.min(this.width, this.height) - 5;
		const tempCanvas = [];
		for (let i = 0; i < 2; i++) {
			const canvas = document.createElement("canvas");
			canvas.id = `matrixCanvas${i}`;
			canvas.style.position = "absolute";
			canvas.style.left = `${(this.width - this.canvasWidth) / 2}px`;
			canvas.height = this.canvasWidth;
			canvas.width = this.canvasHeight;
			tempCanvas.push(canvas);
			this.viewDiv.node().appendChild(canvas);
		}

		this.matrixCanvas = tempCanvas[0];
		this.highlightCanvas = tempCanvas[1];

		// add listener for mousemove and mouseout to handle tooltips and selection
		this.matrixCanvas.addEventListener("mousemove", this.handleMousemove(), false);
		this.matrixCanvas.addEventListener("mouseout", () => this.handleMouseout(), false);
		this.matrixCanvas.addEventListener("touchend", () => {
			if (typeof this.highlightCanvas !== "undefined") {
				this.highlightCanvas.style.visibility = "hidden";
			}
		}, false);
		this.matrixCanvas.addEventListener("mouseup", () => {
			if (typeof this.highlightCanvas !== "undefined") {
				this.highlightCanvas.style.visibility = "hidden";
			}
		}, false);

		this.highlightCanvas.style.pointerEvents = "none";

		this.draggingSVG = this.viewDiv.append("svg").attr("class", "draggingRectangleSVG")
			.style("left", (this.width - this.canvasWidth) / 2)
			.attr("width", this.canvasWidth)
			.attr("height", this.canvasHeight);

		this.draggingSVG.append("rect")
			.attr("class", "draggingRectangle")
			.style("visibility", "hidden")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", 10)
			.attr("height", 10);

		// add tooltip
		this.tip = this.viewDiv.append("div")
			.attr("class", "viewTooltip")
			.style("display", "none");
	}

	/**
	 * lazily compute the ordering for the matrix, storing only the last accessed one
	 */
	getOrder(nodesRemap) {
		const rMap = CRXFILTER.currentData.regionMap;
		// use sorting by name as secondary sorting
		const byName = (a, b) => {
			return d3.ascending(
				rMap.get(nodesRemap[a]).properties.name,
				rMap.get(nodesRemap[b]).properties.name);
		};

		let last = -1;
		const order = d3.range(nodesRemap.length);
		const compareFunctions = [
			byName,
			(a, b) => {
				return (rMap.get(nodesRemap[b]).properties.transitionNumber -
					rMap.get(nodesRemap[a]).properties.transitionNumber) ||
					byName(a, b);
			},
			(a, b) => {
				return (rMap.get(nodesRemap[b]).properties.amount -
					rMap.get(nodesRemap[a]).properties.amount) ||
					byName(a, b);
			},
			(a, b) => {
				return (rMap.get(nodesRemap[b]).community -
					rMap.get(nodesRemap[a]).community) ||
					byName(a, b);
			}];

		const ordering = {};

		["name", "weight", "amount", 'community'].forEach((d, i) => {
			Object.defineProperty(ordering, d, {
				get: () => {
					if (last !== i) {
						last = i;
						order.sort(compareFunctions[i]);
					}
					return order;
				}
			});
		});

		return ordering;
	}

	/**
	 * Main draw function
	 * @param {Matrix} this
	 */
	drawMatrix() {
		if (!this.viewDiv) {
			return;
		}
		this.viewDiv.selectAll("p").remove();

		const data = CRXFILTER.currentData;
		const ctx = this.matrixCanvas.getContext("2d");

		let hasElements = true;
		if (data.regions.length === 0 || data.reducedTransitions.length === 0) {
			ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
			this.showNoItemsMessage();
			hasElements = false;
		} else if (data.regions.length > 10 * this.canvasWidth) {
			this.showTooManyItemsMessage();
			hasElements = false;
		}

		// abort if matrix is empty or too large
		if (!hasElements && this.matrixCanvas) {
			ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
			return;
		}

		// use symmetry to increase performance
		this.symmetric = !data.model.properties.directedTransitions;

		const nodes = new Map();

		// create a map from current to original IDs to make reordering possible
		const nodesRemap = [];
		data.regions.forEach((value, index) => {
			nodes.set(+value.properties.id, index);
			nodesRemap[index] = +value.properties.id;
		});
		this.orders = this.getOrder(nodesRemap);

		const width = this.width;

		// show names only if there is enough space
		this.showNames = nodesRemap.length < width / 12;
		this.transitionMap = new Map();
		this.labels = new Map();

		// preprocess links
		this.links = data.reducedTransitions.map((link) => {
			const source = link.source;
			const target = link.target;
			const sid = +link.source.properties.id;
			const tid = +link.target.properties.id;
			// assign communities if source and target are in the same one
			let comm = -1;
			if (CONFIG.filter.showCommunities && source.community === target.community) {
				comm = source.community;
			}

			const x = nodes.get(sid);
			const y = nodes.get(tid);

			// h is true if the link is currently highlighted
			this.labels.set(x, {
				r: source
			});
			this.labels.set(y, {
				r: target
			});
			this.transitionMap.set(`${x}, ${y}`, {
				id: +link.id,
				weight: +link.weight
			});

			return {
				x: x,
				y: y,
				c: comm,
				z: +link.weight,
				highlight: link.highlight,
				sid: sid,
				tid: tid,
				id: +link.id
			};
		});

		this.drawCanvas(this.matrixCanvas);

		// add selection rectangle as d3 dragging behavior
		const drag = d3.behavior.drag()
			.on("dragstart", () => this.dragstarted(this))
			.on("drag", () => this.dragged(this))
			.on("dragend", () => this.dragended(this));

		this.viewDiv.select("canvas").call(drag);
	}

	/**
	 * Draws view content.
	 */
	drawCanvas(canvas) {
		this.viewDiv.selectAll("p").remove();
		// clear canvas
		const ctx = canvas.getContext("2d");
		const data = CRXFILTER.currentData;
		const highlighted = canvas === this.highlightCanvas;
		ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
		if (highlighted) {
			ctx.fillStyle = CONFIG.UI.darkTheme ? "rgba(34, 34, 34, 0.3)" : "rgba(255, 255, 255, 0.3)";
			ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
		}

		// limit item size so be more than 0.1 pixels
		if (data.regions.length > 10 * this.canvasWidth) {
			this.showTooManyItemsMessage();
			return;
		}

		// margins needed for labels
		const offset = this.showNames ? 80 : 0;

		// get scale
		this.xRangeBands = d3.scale.ordinal()
			.rangeBands([offset, this.canvasWidth])
			.domain(this.orders[CONFIG.matrix.order]);

		this.yRangeBands = d3.scale.ordinal()
			.rangeBands([offset, this.canvasHeight])
			.domain(this.orders[CONFIG.matrix.order]);

		// get real and drawn size of links (width and height are equal)
		const rectSize = this.xRangeBands.rangeBand();
		const drawSize = (this.showNames) ? rectSize - 1 : rectSize;

		const baseColor = CONFIG.UI.darkTheme ? "rgba(255, 255, 255, 1)" : "rgba(0, 0, 0, 1)";

		const links = highlighted ? this.links.filter(d => d.highlight && d.highlight.h) : this.links;

		const epsilonCompare = lib.floatCompareRelativeAndAbs(data.transitionWeights.min, data.transitionWeights.max);

		const opacity = epsilonCompare ? MAPPING.linkOpacity : d3.scale.log()
			.range([0.01, 1])
			.domain([data.transitionWeights.min, data.transitionWeights.max]);

		// draw links depending on current highlight
		links.forEach((link) => {
			const xPos = this.xRangeBands(link.x);
			const yPos = this.yRangeBands(link.y);

			ctx.fillStyle = highlighted ? baseColor : `${MAPPING.communityRGBcached(link.c)}${opacity(link.z)}`;
			ctx.fillRect(xPos, yPos, drawSize, drawSize);

			// if matrix is symmetric, draw both halves at the same time
			// (they are only stored once in the data structure)
			if (this.symmetric) {
				ctx.fillRect(yPos, xPos, drawSize, drawSize);
			}
		});

		// draw region names
		for (const j of this.labels.entries()) {
			if (highlighted && !(j[1].r.highlight && j[1].r.highlight.h)) {
				continue;
			}

			const yPos = this.yRangeBands(j[0]) + rectSize / 2;

			// draw labels on the left
			ctx.fillStyle = highlighted ? baseColor : `${MAPPING.communityRGBcached(j[1].r.community)}0.7`;
			ctx.textAlign = "end";
			ctx.fillText(j[1].r.properties.name, offset - 5, yPos, offset);
			ctx.save();
			// draw labels at the top
			ctx.translate(this.canvasHeight / 2, this.canvasHeight / 2);
			ctx.rotate(-Math.PI / 2);
			ctx.translate(-this.canvasHeight / 2, -this.canvasHeight / 2);
			ctx.textAlign = "start";
			ctx.fillText(j[1].r.properties.name, this.canvasWidth - offset + 5, yPos, offset);
			ctx.restore();
		}
	}

	/**
	 * Set / change order of nodes in the matrix
	 */
	order(value) {
		this.xRangeBands.domain(this.orders[value]);
		this.yRangeBands.domain(this.orders[value]);
		this.drawCanvas(this.matrixCanvas);
	}


	/**
	 * Listener for mousemove to handle tooltips and selection
	 * when the cursor hovers over the matrix
	 */
	handleMousemove() {
		// timer since last mouse move
		let timed;
		return (e) => {
			if (this.draggingRectangle.dragging) {
				return;
			}
			clearTimeout(timed);
			const element = this.getElementFromPosition(e.offsetX, e.offsetY);
			if (!element) {
				// only dispatch events when the last event happened more than 150 ms ago,
				// prevents firing of end events when quickly hovering to another element
				timed = setTimeout(() => {
					this.tip.style("display", "none");
					DISPATCH.endHighlight();
				}, 150);
				return;
			}
			if (element.r) {
				DISPATCH.startRegionHighlight(element.r.properties.id);
				this.tip
					.html(CONNECTOR.tooltipNode(element.r))
					.style("display", "block")
					.style("top", `${e.clientY + 20}px`)
					.style("left", `${e.clientX + 20}px`);
				return;
			}
			const link = element;
			const t = CRXFILTER.currentData.model.transitionMap.get(+ link.id);
			if (!t) {
				this.tip.style("display", "none");
				DISPATCH.endHighlight();
				return;
			}
			const t_cp = Object.assign(t);
			t_cp.weight = link.weight;

			// show tooltip
			this.tip
				.html(CONNECTOR.tooltipLink(t_cp))
				.style("display", "block")
				.style("top", `${e.clientY + 20}px`)
				.style("left", `${e.clientX + 20}px`);

			DISPATCH.startTransitionHighlight(+link.id);
		};
	}

	/**
	 * Listener for mouseout to handle tooltips and selection
	 * when the cursor leaves the matrix
	 */
	handleMouseout(e) {
		this.tip.style("display", "none");
		DISPATCH.endHighlight();
	}

	/**
	 * react to start of dragging
	 */
	dragstarted(_this) {
		const e = d3.event.sourceEvent;
		e.stopPropagation();
		_this.tip.style("display", "none");
		_this.draggingRectangle.dragging = true;
		_this.draggingRectangle.dx = 0;
		_this.draggingRectangle.dy = 0;
		if (e.targetTouches) {
			// touch event
			const rect = e.target.getBoundingClientRect();
			_this.draggingRectangle.originX = e.touches[0].clientX - rect.left;
			_this.draggingRectangle.originY = e.touches[0].clientY - rect.top;
		} else {
			// mouse event
			_this.draggingRectangle.originX = e.offsetX;
			_this.draggingRectangle.originY = e.offsetY;
		}
	}

	/**
	 * react to dragging
	 */
	dragged(_this) {
		if (!_this.draggingRectangle.dragging) {
			return;
		}
		_this.tip.style("display", "none");
		_this.draggingRectangle.dx += d3.event.dx;
		_this.draggingRectangle.dy += d3.event.dy;
		_this.draggingSVG.select(".draggingRectangle")
			.attr("x", () => {
				return _this.draggingRectangle.originX + Math.min(0, _this.draggingRectangle.dx);
			})
			.attr("y", () => {
				return _this.draggingRectangle.originY + Math.min(0, _this.draggingRectangle.dy);
			})
			.attr("width", Math.abs(_this.draggingRectangle.dx))
			.attr("height", Math.abs(_this.draggingRectangle.dy))
			.style("visibility", "visible");

		_this.links.forEach(d => {
			const x = _this.xRangeBands(d.x);
			const y = _this.xRangeBands(d.y);
			if (_this.draggingRectangle.contains(x, y) || (_this.symmetric && _this.draggingRectangle.contains(y, x))) { d.highlight.h = true; }
			else { d.highlight.h = false; }
		});
		for (const j of _this.labels.entries()) {
			if (_this.draggingRectangle.contains(_this.xRangeBands(j[0]), _this.draggingRectangle.originY) ||
				_this.draggingRectangle.contains(_this.draggingRectangle.originX, _this.yRangeBands(j[0]))) { j[1].r.highlight.h = true; }
			else { j[1].r.highlight.h = false; }
		}

		_this.drawCanvas(_this.highlightCanvas);
	}

	/**
	 * react to end of dragging
	 */
	dragended(_this) {
		if (!_this.draggingRectangle.dragging) {
			return;
		}
		_this.draggingRectangle.dragging = false;
		_this.draggingSVG.selectAll(".draggingRectangle").style("visibility", "hidden");

		// all currently highlighted items are selected
		const regions = [];
		for (const j of _this.labels.entries()) {
			if (j[1].r.highlight.h) {
				regions.push(j[1].r);
			}
		}

		// only filter if something has been selected
		if (regions.length > 0) {
			DISPATCH.onRegionSelection(regions);
		}
	}

	/**
	 * add options to the view settings panel
	 */
	settingsFunction() {
		const _this = this;
		const box = _this.settingsPanel;

		box.append("label").text("Arrange nodes by ");
		const select = box.append("select")
			.attr("size", 1)
			.on("change", function () {
				const selection = this.options[this.selectedIndex].value;
				CONFIG.matrix.order = selection;
				_this.order(selection);
			});
		if (CONFIG.filter.showCommunities) {
			select.append("option")
				.attr("value", "community")
				.text("community");
		}
		select.append("option")
			.attr("value", "name")
			.text("name");
		select.append("option")
			.attr("value", "weight")
			.text("transition count");
		select.append("option")
			.attr("value", "amount")
			.text("weight");
	}
}


const matrixView = new Matrix({
	name: "matrix",
	title: "Adjacency Matrix",
	icon: "<i class=\"glyphicon glyphicon-th fa-fw\"></i>",
	infoText: `<p>This view shows the network's links.</p>
               <p>You can filter for the corresponding nodes by dragging a rectangle.</p>
               <p>When community detection is enabled, links within communities are colored in the communities color and links between communities are colored gray.</p>`
});
