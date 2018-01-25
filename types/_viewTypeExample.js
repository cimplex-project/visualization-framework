/**
 * Example for the implementation of a view based on the _viewType class
 */
class Example extends View {
	constructor(params) {
		super(params);

		//  subscribed events
		DISPATCH.on(`initializeView.${this.name}`, param => {
			if (param.contains("exampleView")) {
				// CONFIG dependent attributes can only be set here
				exampleView.canMaximize = CONFIG.UI.viewColumnsResizeable;
				// activate the view
				exampleView.activate();
				exampleView.setStyleSelectors(lib.getSelectorsForColumnType(CONFIG.UI.viewColumns), false);
				exampleView.setHeight(Math.floor(VIEW_CONTAINER_HEIGHT / 2), false);
			}
		});

		// views should react to changes in the data by updating the display
		DISPATCH.on(`onRegionFiltered.${this.name}`, () => {
			/* do stuff */
		});
		DISPATCH.on(`onTimeFiltered.${this.name}`, () => {
			/* do stuff	*/
		});
		// ...

		// set draw function (must not be named draw() to not override
		// draw() of the View superclass)
		this.setDrawFunction(this.drawExample());

		// add settings for this view here
		this.setSettingsFunction(() => {
			const _this = this;
			const box = this.settingsPanel;
			box.append("label")
				.text("Example setting ")
				.append("input")
				.attr("type", "checkbox")
				.property("checked", CONFIG.exampleView.exampleSetting)
				.on("click", function () {
					CONFIG.exampleView.exampleSetting = this.checked;
					// redraw complete or partial view...
					this.draw();
				});
		});
	}

	// implement the main view drawing code here
	drawExample() {
		// you may want to remove old elements first
		this.clear();

		// code...

		this.helper();

		this.viewDiv.append("div").text("example");
	}

	// helper function should also be part of the view"s object
	helper() {
		// do stuff
	}
}

/**
 * Create new example view.
 */
const exampleView = new Example({
	// the name is needed for internal use (DOM element names etc.)
	// and must therefore be designed like a variable"s name
	name: "exampleView",
	// the title that will be displayed in the title panel of the view
	title: "Example View",
	// HTML code for the view"s icon, fixed width (fa-fw) is preferable
	icon: "<i class=\"fa fa-cog fa-fw\"></i>",
	// parameters for buttons etc. can also be set here
	// (see _viewType.js for parameters and default values)
	canClose: false,
	canChangeHeight: false,
	// the info text is shown when hovering over the view"s title
	infoText: "<p>This is an example text that does not help or convey useful information.</p>"
});
