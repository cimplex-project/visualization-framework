/**
 * This file contains code for a view super class
 * from which all views are derived.
 */

/**
 * Constructor:
 *
 * parameters are given as object with the following attributes.
 * [param] indicates optional params that will be set to default values if undefined.
 *
 * @param name
 *    the name will be used in DOM IDs and has to follow JS variable naming conventions
 *
 * @param title
 *    the title can contain any characters and HTML code
 *
 * @param icon
 *    an icon to represent the view, fixed width icons are preferable
 *
 * @param [infoText]
 *    text that is displayed when the user hovers the view"s title
 *    it may contain instructions on how to use the view
 *
 * @param [styleSelectors]
 *    the bootstrap class that this view is assigned on initialization
 *    (default: "col-xs-12 col-sm-6 col-md-6 col-lg-4")
 *
 * @param [height]
 *    the number of pixels to use for this attribute of the view"s container div
 *    (default: 400)
 *
 * @param [active]
 *    specifies if the view is activated on initialization
 *    (default: false)
 *
 * @param [canMaximize, canChangeWidth, canChangeHeight, hasSettings]
 *    specifies if the view should have maximize, height change or settings buttons
 *    (default: true)
 */
class View {
	constructor(params) {
		this.name = params.name;
		this.title = params.title;
		this.icon = params.icon;
		this.infoText = params.infoText || "";

		// view registers itself in a global list
		registerView(this);

		// set CSS class and layout options
		this.styleSelectors = params.styleSelectors || "col-xs-12 col-sm-6 col-md-6 col-lg-4";

		this.height = params.height ? Math.floor(params.height) : 400;
		this.width;

		// states
		this.active = false;
		this.maximized = false;
		this.widthDoubled = false;
		this.heightDoubled = false;
		this.settingsShown = false;

		// UI params
		this.canMaximize = params.canMaximize === undefined ? true : params.canMaximize;
		this.canChangeWidth = params.canChangeWidth === undefined ? true : params.canChangeWidth;
		this.canChangeHeight = params.canChangeHeight === undefined ? true : params.canChangeHeight;
		this.hasSettings = params.hasSettings === undefined ? true : params.hasSettings;
		this.cannotOpenInNewWindow = params.cannotOpenInNewWindow === undefined ? false : params.cannotOpenInNewWindow;

		// DOM elements
		this.viewContainer;
		this.viewDiv;
		this.maximizeButton;
		this.widthButton;
		this.heightButton;
		this.settingsButton;
		this.settingsPanel;

		// events
		DISPATCH.on(`deactivateView.${this.name}`, (params) => {
			if (params.includes(this.name)) {
				this.deactivate();
			}
		});
		DISPATCH.on(`reactivateView.${this.name}`, (params) => {
			if (params.includes(this.name)) {
				this.reactivate();
			}
		});
		DISPATCH.on(`onWindowSizeChanged.${this.name}`, () => {
			// set new height
			if (this.heightDoubled) {
				this.setHeight(VIEW_CONTAINER_HEIGHT + 36, false);
			} else {
				this.setHeight(VIEW_CONTAINER_HEIGHT / CONFIG.UI.viewRows, false);
			}

			// set new width
			this.width = this.viewDiv.node().getBoundingClientRect().width;

			this.resized();
		});
		DISPATCH.on(`onSimulationCompleted.${this.name}`, () => {
			if (this.settingsPanel) {
				this.settingsPanel.style("display", "none");
			}
		});

		// internal variables
		// right margin for most right button
		this.buttonOffset = 10;
		// x-distance between button centers
		this.buttonDeltaOffset = 26;

	}

	// custom functions
	drawFunction() {
		console.warn(`${this.name}: draw function not yet implemented!`);
	}

	settingsFunction() {
		console.warn(`${this.name}: setting function not yet implemented!`);
	}

	/**
	 * Show view at double width (max. at full with)
	 */
	increaseWidth() {
		if (this.widthDoubled) {
			console.warn(`${this.name} is already double or full width`);
			return;
		}
		this.widthDoubled = true;

		const selectors = lib.replaceAll(this.styleSelectors, "-", "").split(/[a-z ]+/);
		const sel = [];
		for (let i = 1; i <= 4; i++) {
			const s = parseInt(selectors[i]);
			sel.push((s * 2 <= 12) ? s * 2 : 12);
		}
		this.setStyleSelectors(`col-xs-${sel[0]} col-sm-${sel[1]} col-md-${sel[2]} col-lg-${sel[3]}`, true, false);
		this.width = this.viewDiv.node().getBoundingClientRect().width;
	}

	/**
	 * Show view at full width
	 */
	increaseWidthFull() {
		this.widthDoubled = true;
		this.setStyleSelectors("col-xs-12 col-sm-12 col-md-12 col-lg-12", true, false);
		this.width = this.viewDiv.node().getBoundingClientRect().width;
	}

	/**
	 * Show view at original width
	 *
	 * @param redraw
	 *    specifies if the view should be redrawn (default: see this.setStyleSelectors())
	 */
	restoreWidth(redraw) {
		if (!this.widthDoubled) {
			console.warn(`${this.name} is not double width`);
			return;
		}
		this.widthDoubled = false;
		this.setStyleSelectors(this.styleSelectors, redraw, false);
		// view no longer maximized!
		this.maximized = false;
		this.width = this.viewDiv.node().getBoundingClientRect().width;
	}

	/**
	 * Show view at double height
	 */
	increaseHeight(redraw) {
		if (this.heightDoubled) {
			console.warn(`${this.name} is already double height`);
			return;
		}
		this.heightDoubled = true;
		this.setHeight(this.height * 2 + 34, redraw);
	}

	/**
	 * Show view at original height
	 */
	restoreHeight(redraw) {
		if (!this.heightDoubled) {
			console.warn(`${this.name} is not double height`);
			return;
		}
		this.heightDoubled = false;
		this.setHeight((this.height - 34) / 2, redraw);
		// view no longer maximized!
		this.maximized = false;
	}

	/**
	 * Show view at full width and double height
	 */
	maximize() {
		if (this.maximized) {
			console.warn(`${this.name} already maximized`);
			return;
		}
		// maximize
		this.maximized = true;
		if (!this.heightDoubled) {
			this.increaseHeight(false);
		}
		this.increaseWidthFull();
	}

	/**
	 * Show view at original width height
	 */
	deMaximize() {
		if (!this.maximized) {
			console.warn(`${this.name} is not maximized`);
			return;
		}
		this.maximized = false;
		this.restoreWidth(false);
		this.restoreHeight(true);
	}

	/**
	 * Change boostrap class of the container of this view
	 *
	 * @param [redraw]
	 *    if true, calls this.resized (default: true)
	 *
	 * example:
	 *    "col-xs-12 col-sm-6 col-lg-4"
	 *    views per row: 1, 2, 3 on small, medium and large devices
	 */
	setStyleSelectors(selector, redraw, save) {
		this.viewContainer.attr("class", `viewCont ${selector}`);
		// get current width
		this.width = this.viewDiv.node().getBoundingClientRect().width;
		if (save === undefined || save) {
			this.styleSelectors = selector;
			this.maximized = false;
			this.widthDoubled = false;
		}
		if (redraw === undefined || redraw) {
			this.resized();
		}
	}

	/**
	 * Change height and minHeight of the container of this view
	 *
	 * @param height
	 *    the new height
	 *
	 * @param [redraw]
	 *    if true, calls this.resized (default: true)
	 */
	setHeight(height, redraw) {
		if (!this.viewContainer) {
			return;
		}
		height = Math.floor(height);
		this.height = height;
		this.viewContainer.style("height", `${height + 36}px`);
		this.viewDiv.style("height", `${height}px`);
		// update to match new size
		if (redraw === undefined || redraw) { this.resized(); }
	}

	/**
	 * Deactivate view: Hide the view, but keep all elements
	 */
	deactivate() {
		if (!this.active) { return; }
		this.active = false;
		// console.info("deactivating view " + this.name);
		this.viewContainer.style("display", "none");
	}

	/**
	 * Reactivate view: Show the view, and call this.reactivated()
	 */
	reactivate() {
		if (this.active) { return; }
		this.active = true;
		this.viewContainer.style("display", "block");
		this.width = this.viewDiv.node().getBoundingClientRect().width;
		this.reactivated();
	}

	/**
	 * Add a new button to the view"s title bar
	 *
	 * @param attributes
	 *    contains the necessary attributes for the new button:
	 *    title, icon, optional className and clickFunction
	 *    (the function to execute on click)
	 */
	addButton(attributes) {
		const newButton = this.header.append("button")
			.attr("class", "windowButton")
			.attr("title", attributes.title)
			.style("right", `${this.buttonOffset}px`)
			.html(attributes.icon)
			.on("click", attributes.clickFunction);
		this.buttonOffset += this.buttonDeltaOffset;
		return newButton;
	}

	/**
	 * Show a spinner icon to indicate that the view is loading
	 * (in place of the view icon)
	 */
	showLoadingIndicator() {
		this.titleContainer.html(`<i class="fa fa-spinner fa-pulse fa-fw"></i> ${this.title} `);
	}

	/**
	 * Hide the loading indicator
	 */
	hideLoadingIndicator() {
		this.titleContainer.html(`${this.icon} ${this.title} `);
	}

	/**
	 * Create DOM objects for the view
	 */
	activate(draw) {
		if (this.active) {
			console.warn(`view ${this.name} already active!`);
			return;
		}
		this.active = true;

		// create container div
		this.viewContainer = d3.select("#viewContainer")
			.append("div")
			.attr("id", `${this.name}Container`)
			.attr("class", `viewCont ${this.styleSelectors}`);

		// add header with icon and title, header will be used to drag and drop views
		this.header = this.viewContainer.append("div")
			.attr("class", "viewHeader draghandle drag-handle");
		this.titleContainer = this.header.append("span");
		this.titleContainer.html(`${this.icon} ${this.title} `);

		// add info panel
		if (this.infoText) {
			this.infoPanel = this.viewContainer.append("div")
				.attr("id", `${this.name}InfoPanel`)
				.attr("class", "viewInfo")
				.style("display", "none")
				.html(`<h3>${this.title}</h3 >\n${this.infoText}`);
			this.titleContainer.on("mouseover", () => {
				clearInterval(this.infoTextTimer);
				this.infoTextTimer = setInterval(() => {
					clearInterval(this.infoTextTimer);
					this.infoPanel.style("display", "block");
				}, 500);
			});
			this.titleContainer.on("mouseout", () => {
				clearInterval(this.infoTextTimer);
				this.infoPanel.style("display", "none");
			});
		}

		// add settings panel
		this.settingsPanel = this.viewContainer.append("div")
			.attr("id", `${this.name}SettingsPanel`)
			.attr("class", "viewSettings")
			.style("display", "none");

		// add content div
		this.viewDiv = this.viewContainer.append("div").attr("class", `view ${this.name}`);
		this.width = this.viewDiv.node().getBoundingClientRect().width;

		// add settings pop over button
		if (this.hasSettings) {
			this.settingsButton = this.addButton({
				title: "Settings",
				icon: "<i class=\"fa fa-cog fa-fw\"></i>",
				clickFunction: () => {
					// toggles display of settings panel
					if (this.settingsShown) {
						this.settingsPanel.style("display", "none");
					} else {
						this.settingsPanel.selectAll("*").remove();
						// content is re- evaluated each time to allow for context dependent settings
						this.getSettings();
						this.settingsPanel.style("display", "block");
					}
					this.settingsShown = !this.settingsShown;
				}
			});
		}

		// add button for opening the view in an extra window
		if (!this.cannotOpenInNewWindow && !isChildWindow()) {
			this.extractButton = this.addButton({
				title: "Open in a new window",
				icon: "<i class=\"fa fa-window-restore fa-fw\"></i>",
				clickFunction: () => {
					// open view in new window
					const separator = (window.location.href.indexOf("?")===-1)?"?":"&";
					const newHref = window.location.href + separator + `broadcastChannelId=${broadcaster.getBroadcastChannelId()}`;
					const addHash = newHref[newHref - 1] !== "#";
					window.open(newHref + (addHash ? "#" : "") + this.name, this.name, `height=${window.screen.availHeight},width=${window.screen.availWidth}`);
					// remove view from main window
					DISPATCH.deactivateView([this.name]);
				}
			});
		}

		// add button that changes width and height together
		if (this.canMaximize && !isChildWindow()) {
			this.maximizeButton = this.addButton({
				title: "Maximize/Restore",
				icon: "<i class=\"fa fa-window-maximize fa-fw\"></i>",
				clickFunction: () => {
					if (this.minimized) {
						return;
					}
					if (this.maximized) {
						this.deMaximize();
					} else {
						this.maximize();
					}
				}
			});
		}

		// add button which doubles the width
		if (this.canChangeWidth && !isChildWindow()) {
			this.widthButton = this.addButton({
				title: "Change width",
				icon: "<i class=\"fa fa-arrows-h fa-fw\"></i>",
				clickFunction: () => {
					if (this.minimized) {
						return;
					}
					if (this.widthDoubled) {
						this.restoreWidth();
					} else {
						this.increaseWidth();
					}
				}
			});
		}

		// add a button which doubles the height
		if (this.canChangeHeight && !isChildWindow()) {
			this.heightButton = this.addButton({
				title: "Change height",
				icon: "<i class=\"fa fa-arrows-v fa-fw\"></i>",
				clickFunction: () => {
					if (this.minimized) {
						return;
					}
					if (this.heightDoubled) {
						this.restoreHeight();
					} else {
						this.increaseHeight();
					}
				}
			});
		}

		// draw if wanted
		if (draw) {
			this.draw();
		}
	}

	/**
	 * Hides the view"s resize (incl. maximize) buttons, e.g. when shown in an
	 * extra window.
	 */
	hideResizeButtons() {
		this.header.selectAll(".resizeButton").style("visibility", "hidden");
	}

	/**
	 * Shows the view"s resize (incl. maximize) buttons.
	 */
	showResizeButtons() {
		this.header.selectAll(".resizeButton").style("visibility", "visible");
	}

	/**
	 * Remove the content of the view
	 */
	clear() {
		// this is the fastest way
		this.viewDiv.remove();
		this.viewDiv = this.viewContainer.append("div").attr("class", `view ${this.name}`);
	}

	/**
	 * Draw the content of the view
	 *
	 * the function called inside this one
	 * will be overwritten by derived classes / objects
	 */
	draw() {
		if (!this.active || this.minimized) {
			return;
		}

		this.setHeight(this.height, false);

		// call custom draw function with reference to the object
		return this.drawFunction();
	}

	/**
	 * Allows for overwriting the draw function
	 */
	setDrawFunction(df) {
		this.drawFunction = df;
	}

	/**
	 * This function is called when a view is shown after being minimized
	 * or de-maximized
	 */
	resized() {
		if (this.active) {
			this.width = this.viewDiv.node().getBoundingClientRect().width;
			this.draw();
		}
	}

	/**
	 * This function is called when a view is reactivated
	 */
	reactivated() {
		// width may have changed meanwhile
		this.width = this.viewDiv.node().getBoundingClientRect().width;
		this.draw();
	}

	/**
	 * Returns a DOM reference containing settings for this view to be displayed
	 * in a settings panel
	 *
	 * will be overwritten by derived classes
	 */
	getSettings() {
		return this.settingsFunction(this);
	}

	/**
	 * Allows for overwriting the settings function
	 */
	setSettingsFunction(sf) {
		this.settingsFunction = sf;
	}

	/**
	 * Displays an error message if there are no items.
	 */
	showNoItemsMessage() {
		this.viewDiv.append("p")
			.attr("class", "noItemsInfo")
			.html("<br><br>There are no items to display.<br>Try other filter bounds instead.");
	}

	/**
	 * Displays an error message if there are too many items.
	 */
	showTooManyItemsMessage() {
		this.viewDiv.append("p")
			.attr("class", "noItemsInfo")
			.html("<br><br>There are too many items to display.<br>Try other filter bounds instead.");
	}

	/**
	 * Completely remove a view and all of its DOM elements
	 */
	deallocate() {
		this.viewContainer.remove();
	}
}
