/**
 * This file contains code for page initialization and user interface drawing.
 */


/**
 * When the HTML document has finished loading, start initializing the data
 * structure and user interface.
 */
$(document).ready(() => controller.init());

const controller = {
	/**
	 * Resets global variables and sets configuration depending on device type,
	 * then initialized UI and views.
	 */
	init() {
		// parse GET parameter for application theme
		if (DARK_THEME) {
			$("head").append("<link rel=\"stylesheet\" type=\"text/css\" href=\"style_dark.css\">");
		}

		// parse GET parameter for configuration and
		// detect device type, then choose configuration accordingly
		let device = lib.parseGET("config");
		device = (!device && lib.isMobileDevice()) ? "mobile" : device;
		config.set(device);

		// set page title
		document.title = CONFIG.UI.title;
		$("#pageTitle").html(CONFIG.UI.title);

		// create dummy mapping, model and filter
		MAPPING = new Mapping();
		CRXFILTER = new Filter(new Model({}));

		// react to window size changes via event
		$(window).on("resize", () => UI.pageResized(true));

		// initialize UI variables (but do not resize views)
		UI.pageResized(false);

		// create all registered views (they register on construction)
		const viewNames = getRegisteredViews().map(d => d.name);
		DISPATCH.initializeView(viewNames);

		// hide views but settingsPanel
		const hideViews = viewNames.filter(d => d !== "settingsPanel");
		DISPATCH.deactivateView(hideViews);

		// allow for reordering of views by dragging header
		if (CONFIG.UI.viewDragAndDrop) {
			const container = document.getElementById("viewContainer");
			Sortable.create(container, { handle: ".drag-handle" });
		}

		// shows device, fullscreen and help button
		UI.drawToolbarRight();

		// keep toolbar up to date when views are activated or deactivated
		DISPATCH.on("reactivateView.init", () => UI.drawToolbarLeft());
		DISPATCH.on("deactivateView.init", () => UI.drawToolbarLeft());
	},

	/**
	 * Retrieve data from the specified service and create a data model
	 */
	getModel(settings) {
		// write settings to console
		console.info("\n=== new data ===");
		console.groupCollapsed("data service parameters");
		Object.keys(settings).forEach(key => {
			if (settings[key] !== undefined) {
				console.info(`${key}: ${settings[key]}`);
			}
		});
		console.groupEnd();
		// keep track of model changes
		MODEL_COUNT++;
		// first reset parameters
		localStorage.setItem("networkData", "");
		// get service and connector
		getRegisteredConnectors().forEach(d => {
			if (d.name === settings.service) {
				CONNECTOR = d;
			}
		});
		// retrieve data from server
		CONNECTOR.getDataModel(settings);
	},

	/**
	 * When all data has been retrieved, update filter, model and UI.
	 */
	connectorCallback(model) {
		// initialize visual mappings
		MAPPING = new Mapping();
		// initialize cross filter instance
		CRXFILTER = new Filter(model);
		// set titles
		document.title = `${CONFIG.UI.title} | ${CRXFILTER.currentData.model.properties.serviceName}`;
		// draw toolbar
		UI.drawToolbar();
		// signal that simulation was loaded
		console.info("data ready to display");
		DISPATCH.onSimulationCompleted();
		// post model from main window to children
		if (broadcaster.isHosting()) {
			broadcaster.postModel();
		}
	}
};
