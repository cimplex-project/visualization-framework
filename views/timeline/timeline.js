/**
 * This file contains code for the timeline view.
 */
class Timeline extends View {
	constructor(params) {
		super(params);

		// relative height of the timeline context area (lower timeline graph)
		this.contextHeightRatio = 0.16;

		// subscribed events
		DISPATCH.on(`initializeView.${this.name}`, param => {
			if (param.includes(this.name)) {
				this.initializeTimeline();
			}
		});
		DISPATCH.on(`onRegionFiltered.${this.name}`, () => this.draw());
		DISPATCH.on(`onFilterReset.${this.name}`, () => this.draw());

		// set main drawing function
		this.setDrawFunction(this.drawTimeline);
		// set settings function
		this.setSettingsFunction(this.settingsFunction);
	}

	/**
	 * Initializes view and adds buttons.
	 */
	initializeTimeline() {
		this.activate();

		// config dependent attributes can only be set here
		this.setStyleSelectors(lib.getSelectorsForColumnType(CONFIG.UI.viewColumns), false);
		this.setHeight(Math.floor(VIEW_CONTAINER_HEIGHT / CONFIG.UI.viewRows), false);
		this.width = this.viewDiv.node().getBoundingClientRect().width;

		// add buttons for player
		this.playButton = this.addButton({
			title: "Play",
			icon: "<i class=\"fa fa-play fa-fw\"></i>",
			clickFunction: () => {
				// params speed, steps, backward
				this.togglePlayer(CONFIG.timeline.playerSpeed, CONNECTOR.timelinePlayerSteps, false);
			}
		});
		this.addButton({
			title: "Forward",
			icon: "<i class=\"fa fa-forward fa-fw\"></i>",
			clickFunction: () => {
				this.pausePlayer();
				this.proceed(CONNECTOR.timelinePlayerSteps, false);
			}
		});
		this.addButton({
			title: "Backward",
			icon: "<i class=\"fa fa-backward fa-fw\"></i>",
			clickFunction: () => {
				this.pausePlayer();
				this.proceed(CONNECTOR.timelinePlayerSteps, true);
			}
		});
		this.draw();
	}

	/**
	 * Draws the timeline.
	 */
	drawTimeline() {
		this.clear();
		
		const data = CRXFILTER.currentData;
		this.colors = CONNECTOR.mapTimelineColors ? CONNECTOR.mapTimelineColors : ["#37a4c8"];
		const colorGradientSteps = CONFIG.timeline.colorGradientSteps;
		const transitions = data.aggregatedTransitions;
		let states = data.timeStates;
		const showStates = states
			&& states.length > 0
			&& CONNECTOR.name !== "mobility_data"
			&& CONNECTOR.name !== "author_network";

		// show message if no data to display
		if (
			(
				!data.model.properties.dynamicTransitions
				|| !transitions
				|| transitions.length === 0
			)
			&& !showStates
		) {
			this.showNoItemsMessage();
			return;
		}

		// bin size is set to 1 day if states are used
		this.binSize = data.states ? lib.toMillis.day : data.timeBinSize;
		// get min and max date of the data
		this.minDate = data.timeRange[0] || lib.baseTimestamp;
		this.maxDate = data.timeRange[1] || lib.addDays(this.minDate, data.states.length);
		// initialize the time interval used by the timeline player feature
		this.currentPlayerInterval = [this.minDate, this.minDate + this.binSize];
		// get number of lines to display (number of values in state.amount)
		this.numberOfLines = showStates ? states[0].amount.length : 1;
		// use gradient only for a single line
		this.useColorGradient = this.numberOfLines > 1 ? false : CONFIG.timeline.useColorGradient;
		if (CONNECTOR.remapStatesForTimeline) {
			// re-order states for better displaying
			states = CONNECTOR.remapStatesForTimeline(states);
		}
		if (CONNECTOR.forceTimelineGradient) {
			// some connectors have multiple lines but only show one,
			// which messes with the useColorGradient variable
			this.useColorGradient = true;
		}
		// when using multiple stacked lines, values have to be added (-> lines get stacked)
		if (showStates) {
			states = this.stackStates(states, this.numberOfLines);
		}
		// select data type to use
		this.datum = showStates ? states : transitions;
		// get data domains
		const xDomain = d3.extent(this.datum.map(d => d.date));
		// when showing multiple lines next to each other, the max. value of them is needed
		const yLineFunc = showStates ? d => Math.max(...d.amount) : d => +d.amount;
		const yDomain = [0, Math.max(...this.datum.map(yLineFunc))];
		// get sizes and set margins according to domain extents
		const currentWidth = Math.floor(this.width);
		const currentHeight = Math.floor(this.height - 5);
		const contextHeight = currentHeight * this.contextHeightRatio;
		// with depends on number of digits for y axis labels
		const yAxisLabelWidth = yDomain[1] <= 0 ? 0 : 20 + 10 * Math.log10(yDomain[1]);
		this.margin = {
			top: 10,
			right: 5,
			bottom: contextHeight + 30,
			left: yAxisLabelWidth
		};
		this.margin2 = {
			top: currentHeight - contextHeight,
			right: 5,
			bottom: 20,
			left: yAxisLabelWidth
		};
		this.svgWidth = currentWidth - this.margin.left - this.margin.right - 12;
		this.focusHeight = currentHeight - this.margin.top - this.margin.bottom - 3;
		this.contextHeight = currentHeight - this.margin2.top - this.margin2.bottom;

		// set scales
		this.x = d3.time.scale().range([0, this.svgWidth]);
		this.x2 = d3.time.scale().range([0, this.svgWidth]);
		this.y = d3.scale.linear().range([this.focusHeight, 0]);
		this.y2 = d3.scale.linear().range([this.contextHeight, 0]);

		// set domain extents
		this.x.domain(xDomain);
		this.y.domain(yDomain);
		this.x2.domain(xDomain);
		this.y2.domain(yDomain);

		// set tick format
		let tickFormat = this.getTickFormat(showStates, data);

		// set axes
		const xTicks = 0.0075 * this.svgWidth;
		const yTicks = 0.04 * this.focusHeight;
		this.xAxis = d3.svg.axis()
			.scale(this.x)
			.orient("bottom")
			.ticks(xTicks)
			.tickFormat(d3.time.format(tickFormat));
		const xAxis2 = d3.svg.axis()
			.scale(this.x2)
			.orient("bottom")
			.ticks(xTicks)
			.tickFormat(d3.time.format(tickFormat));
		const yAxis = d3.svg.axis()
			.scale(this.y)
			.orient("left")
			.ticks(yTicks);

		// set brush
		this.brush = d3.svg.brush()
			.x(this.x2)
			.on("brush", () => this.brushed(!clicked));

		// create lines
		this.area = [];
		this.area2 = [];
		for (let line = this.numberOfLines - 1; line >= 0; line--) {
			this.area[line] = d3.svg.area()
				.interpolate(CONFIG.timeline.interpolation)
				.x(d => this.x(d.date))
				.y0(this.focusHeight)
				.y1(d => showStates ? this.y(+d.amount[line]) : this.y(+d.amount));
			this.area2[line] = d3.svg.area()
				.interpolate(CONFIG.timeline.interpolation)
				.x(d => this.x2(d.date))
				.y0(this.contextHeight)
				.y1(d => showStates ? this.y2(+d.amount[line]) : this.y2(+d.amount));
		}

		// set up SVG with focus and context
		let clicked = 0;
		const timelineSVG = this.viewDiv
			.append("svg")
			.attr("id", `${this.name}Svg`)
			.attr("width", this.svgWidth + this.margin.left + this.margin.right)
			.attr("height", this.focusHeight + this.margin.top + this.margin.bottom)
			.on("mousedown", () => clicked++)
			.on("mouseup", () => {
				clicked = clicked ? clicked-- : clicked;
				// when brushing is finished, throw an event
				// => update some views only when user finished brushing
				this.brushed(true);
			});

		// react to clicks
		document.getElementById(`${this.name}Svg`)
			.addEventListener("click", e => this.brushClicked(e, this), false);

		// add clipping for focus area
		timelineSVG
			.append("defs")
			.append("clipPath")
			.attr("id", "clip")
			.append("rect")
			.attr("x", 1)
			.attr("y", 0)
			.attr("width", this.svgWidth)
			.attr("height", this.focusHeight - 1);

		// set color gradients
		this.setColorGradients(colorGradientSteps, timelineSVG);

		// add focus and context of the timeline
		this.focus = timelineSVG
			.append("g")
			.attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);
		this.context = timelineSVG
			.append("g")
			.attr("transform", `translate(${this.margin2.left}, ${this.margin2.top})`);

		// add lines (focus)
		// draw higher stacked lines first (lower will overdraw)
		for (let line = this.numberOfLines - 1; line >= 0; line--) {
			this.focus.append("path")
				.datum(this.datum)
				.attr("class", `area`)
				.attr("fill", this.useColorGradient ? `url(#${this.name}-color-gradient)` : this.colors[line])
				.attr("d", this.area[line])
				.append("title")
				.html(CONNECTOR.tooltipDataAttributes[line] ? CONNECTOR.tooltipDataAttributes[line] : "");
		}

		// add axes (focus)
		this.focus.append("g")
			.attr("class", "x axis")
			.attr("transform", `translate(0, ${this.focusHeight})`)
			.call(this.xAxis);
		this.focus.append("g")
			.attr("class", "y axis")
			.call(yAxis);

		// add lines (context)
		for (let line = this.numberOfLines - 1; line >= 0; line--) {
			this.context.append("path")
				.datum(this.datum)
				.attr("class", `area`)
				.attr("fill", this.useColorGradient ? `url(#${this.name}-color-gradient2)` : this.colors[line])
				.attr("d", this.area2[line]);
		}

		// add axis (context)
		this.context.append("g")
			.attr("class", "x axis")
			.attr("transform", `translate(0, ${this.contextHeight})`)
			.call(xAxis2);

		// add brush
		this.brushIndicator = this.context.append("g")
			.attr("class", "x brush")
			.call(this.brush)
			.selectAll("rect")
			.attr("y", -6)
			.attr("height", this.contextHeight + 7);

		// add custom brush indicator for clicks and player
		this.brushIndicatorSmall = this.context.append("rect")
			.attr("class", "brushExtent")
			.attr("y", -6)
			.attr("width", 0)
			.attr("height", this.contextHeight + 7);

		// add tooltip
		timelineSVG.selectAll(".background").append("svg:title").text("Brush to select a time interval");

		// draw currently selected time as brush indicator if time is filtered already
		if (CRXFILTER.isTimeFiltered()) {
			// TODO: tell setBrush to not trigger events
			this.setBrush(CRXFILTER.currentData.timeRange);
		}
	}

	/**
	 * Computes color gradients for the timeline area.
	 */
	setColorGradients(colorGradientSteps, timelineSVG) {
		const gradientColors = [];
		const gradientStops = [];
		if (this.useColorGradient) {
			for (let i = 0, n = colorGradientSteps - 1; i <= n; i++) {
				const stop = Math.floor(i * (100 / n));
				gradientStops.push(stop);
				if (MAPPING && MAPPING.timelineGradient) {
					gradientColors.push(MAPPING.timelineGradient(stop));
				} else {
					// fallback
					gradientColors.push(this.colors[0]);
				}
			}
		}
		// add color gradients
		const gradient = timelineSVG.append("linearGradient")
			.attr("id", `${this.name}-color-gradient`)
			.attr("x1", 0)
			.attr("y1", 1)
			.attr("x2", 0)
			.attr("y2", 0);
		const gradient2 = timelineSVG.append("linearGradient")
			.attr("id", `${this.name}-color-gradient2`)
			.attr("x1", 0)
			.attr("y1", 1)
			.attr("x2", 0)
			.attr("y2", 0);
		for (let j = 0; j < gradientColors.length; j++) {
			gradient.append("stop")
				.attr("offset", `${gradientStops[j]}%`)
				.attr("stop-color", gradientColors[j]);
			gradient2.append("stop")
				.attr("offset", `${gradientStops[j]}%`)
				.attr("stop-color", gradientColors[j]);
		}
	}

	/**
	 * Chooses the best time line tick (label) format
	 * depending on states and data ranges.
	 */
	getTickFormat(showStates, data) {
		if (showStates) {
			return "%Y-%m-%d";
		} else {
			const timespan = data.timeRange[1] - data.timeRange[0];
			if (timespan / lib.toMillis.year > 2) {
				return "%Y-%m";
			} else if (timespan / lib.toMillis.month > 2) {
				return "%Y-%m-%d";
			} else if (timespan / lib.toMillis.day > 2) {
				return "%m-%d %H:%M";
			} else {
				return "%H:%M:%S";
			}
		}
	}

	/**
	 * Helper function for stacked timeline areas
	 */
	stackStates(states, numberOfLines) {
		return states.map(d => {
			const copy = Object.assign({}, d);
			for (let j = 1; j < numberOfLines; j++) {
				copy.amount[j] = d.amount[j - 1] + d.amount[j];
			};
			return copy;
		});
	};

	/**
	 * react to clicks
	 */
	brushClicked(e, timeline) {
		// hide older brush indicator
		timeline.hideCustomBrush();
		// stop player
		timeline.pausePlayer();

		if (!timeline.brush.empty()) {
			return;
		}

		const x = e.layerX - timeline.margin2.left - 6;
		const maxX = timeline.svgWidth;

		// check if click happened inside timeline context
		if (e.layerY < timeline.focusHeight + timeline.margin.top + 20) {
			return;
		}
		if (x < 0 || x > maxX) {
			return;
		}
		// round down to get start of clicked time bin
		const clickedDate = Math.floor(timeline.minDate + (x / maxX) * (timeline.maxDate - timeline.minDate));
		const start = Math.floor(clickedDate / timeline.binSize) * timeline.binSize;
		const end = start + timeline.binSize;
		// save position
		timeline.currentPlayerInterval = [start, end];
		// display brushed area
		timeline.setBrush(timeline.currentPlayerInterval);
	}

	/**
	 * Toggle player state between play and pause
	 * Player automatically moves brushed selection either forward or backward
	 * by <steps> with <speed>
	 *
	 * @param speed
	 *    number of milliseconds between two steps
	 *
	 * @param steps
	 *    this number times the bin size will be played forward in each iteration
	 *
	 * @param [backward]
	 *    if set to true, the player goes backward in time
	 */
	togglePlayer(speed, steps, backward) {
		// set or remove timeout
		if (this.playerActive) {
			this.pausePlayer();
		} else {
			this.playerActive = true;
			this.playButton.html("<i class=\"fa fa-pause fa-fw\"></i>");
			this.proceed();
			this.playerInterval = setInterval(
				() => this.proceed(steps, backward),
				speed
			);
		}
	}

	/**
	 * pause player
	 */
	pausePlayer() {
		clearInterval(this.playerInterval);
		this.playerActive = false;
		this.playButton.html("<i class=\"fa fa-play fa-fw\"></i>");
	}

	/**
	 * pause and reset player
	 */
	resetPlayer() {
		this.pausePlayer();
		this.currentPlayerInterval = [this.minDate, this.minDate + this.binSize];
	}

	/**
	 * move the brushed selection forward by one bin size
	 *
	 * @param steps
	 *    this number times the bin size will be played forward
	 */
	proceed(steps, backward) {
		steps = steps || 1;
		const direction = backward ? -1 : 1;
		const offset = steps * direction * this.binSize;
		const start = this.currentPlayerInterval[0] + offset;
		const end = this.currentPlayerInterval[1] + offset;
		// do not go too far
		if (start < this.minDate || end > this.maxDate) {
			this.pausePlayer();
			return;
		}
		// hide d3 brush
		this.viewDiv.select(".brush").select(".extent").style("display", "none");
		// round interval to match bins
		const interval = lib.roundTimeInterval([start, end], this.binSize);
		// save position
		this.currentPlayerInterval = [start, end];
		// display brushed area (triggers filter)
		this.setBrush(interval);
	}

	/**
	 * react to brushing (or player changes)
	 */
	brushed(finished) {
		if (this.brush.empty()) {
			return;
		}
		let interval = this.brush.extent();

		// round to match bins
		interval = lib.roundTimeInterval(interval, this.binSize);
		this.x.domain(interval);

		// move and scale focus area
		if (this.numberOfLines > 1) {
			const area = [];
			this.focus.selectAll(".area").remove();
			for (let line = this.numberOfLines - 1; line >= 0; line--) {
				area[line] = d3.svg.area()
					.interpolate(CONFIG.timeline.interpolation)
					.x(d => this.x(d.date))
					.y0(this.focusHeight)
					.y1(d => this.y(+d.amount[line]));
				this.focus.append("path")
					.datum(this.datum)
					.attr("class", `area area${line}`)
					.attr("fill", this.useColorGradient ? `url(#${this.name}-color-gradient)` : this.colors[line])
					.attr("d", area[line])
					.append("title")
					.html(CONNECTOR.tooltipDataAttributes[line] ? CONNECTOR.tooltipDataAttributes[line] : "");
			}
		} else {
			this.focus.select(".area0").attr("d", this.area[0]);
		}

		this.focus.select(".x.axis").call(this.xAxis);
		// save position
		this.currentPlayerInterval = [interval[0], interval[1]];
		// call filter filter
		DISPATCH.onTimelineBrushed(this.currentPlayerInterval, finished);
	}

	/**
	 * Sets the brush. This affects the focus to show details of the
	 * currently selected time span and triggers filter events.
	 */
	setBrush(interval) {
		// set extent
		this.brush.extent(interval);
		// draw indicator
		const ratio = this.svgWidth / (this.maxDate - this.minDate);
		const start = (interval[0] - this.minDate) * ratio;
		const width = (interval[1] - interval[0]) * ratio;

		this.brushIndicatorSmall
			.style("display", "block")
			.attr("width", width)
			.attr("transform", `translate(${start}, 0)`);
		// now fire the brushstart, brushmove, and brushend events
		this.brush.event(this.brushIndicator);
	}

	/**
	 * hide custom brush indicator
	 */
	hideCustomBrush() {
		this.brushIndicatorSmall.style("display", "none");
		// show d3 brush
		this.viewDiv.select(".brush").select(".extent").style("display", "block");
	}

	/**
	 * add options to the view settings panel
	 */
	settingsFunction() {
		const _this = this;
		const box = _this.settingsPanel;

		// aggregation options
		box.append("label")
			.text("Start dates instead of timespans ")
			.append("input")
			.attr("type", "checkbox")
			.property("checked", !CONFIG.timeline.aggregateOverTime)
			.on("click", function () {
				CONFIG.timeline.aggregateOverTime = !CONFIG.timeline.aggregateOverTime;
				// triggers filter and aggregator
				DISPATCH.onRegionSelection(CRXFILTER.currentData.regions);
				// forces redraw of timeline
				_this.resized();
			});

		// player speed
		box.append("label")
			.text("Player speed (ms) ")
			.append("input")
			.attr("type", "number")
			.attr("min", "100")
			.attr("max", "30000")
			.attr("step", "10")
			.attr("value", CONFIG.timeline.playerSpeed)
			.on("change", function () {
				const valueInt = parseInt(this.value);
				if (isNaN(valueInt)) {
					alert(`no valid integer: ${this.value}`);
				} else {
					CONFIG.timeline.playerSpeed = valueInt;
				}
			});
	}
}


const timelineView = new Timeline({
	name: "timeline",
	title: "Timeline",
	icon: "<i class=\"fa fa-area-chart fa-fw\"></i>",
	infoText: `<p>This view shows the distribution of values over time.</p>
			       <p>The lower part can be used to select a time span for temporal filtering.</p>
			       <p>You can also use the player buttons <i class=\"fa fa-backward"></i>, <i class=\"fa fa-play"></i> and <i class=\"fa fa-forward"></i> to navigate through time.</p>`
});
