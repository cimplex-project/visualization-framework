/**
 * This file contains global variables for service parameters,
 * data model, filter, views, events and more.
 */

// config instance
let CONFIG = {};

// theme variable
const DARK_THEME = lib.parseGET("theme") === "dark";

// model number to detect changes
let MODEL_COUNT = 0;

// visual mapping manager
let MAPPING = {};

// Global Thread Pool to coordinate threading
let THREAD_POOL = new WebWorkerPool(4);

// currently active connector
let CONNECTOR = {};

// cross filter instance
let CRXFILTER = {};

// window width height minus header and scrollbar
let VIEW_CONTAINER_WIDTH;
let VIEW_CONTAINER_HEIGHT;

// every view registers itself here
const REGISTERED_VIEWS = [];
function getRegisteredViews() {
	return REGISTERED_VIEWS;
}
function registerView(reference) {
	REGISTERED_VIEWS.push(reference);
}

// every connector registers itself here
const REGISTERED_CONNECTORS = [];
function getRegisteredConnectors() {
	return REGISTERED_CONNECTORS;
}
// get a specific connector by its name
function getConnector(name) {
	for (let i = 0; i < REGISTERED_CONNECTORS.length; i++) {
		if (REGISTERED_CONNECTORS[i].name === name) {
			return REGISTERED_CONNECTORS[i];
		}
	}
}
// get all registered connectors
function registerConnector(reference) {
	REGISTERED_CONNECTORS.push(reference);
}
// get registered connectors of type "data"
function getRegisteredDataSources() {
	return REGISTERED_CONNECTORS.filter((connector) => {
		return connector.type === "data";
	});
}
// get registered connectors of type "simulation"
function getRegisteredSimulationServices() {
	return REGISTERED_CONNECTORS.filter((connector) => {
		return connector.type === "simulation";
	});
}

/**
 * Returns true, iff the current window is a child window of the application.
 * Child windows are used to display views in their own extra windows.
 */
function isChildWindow() {
	return window.location.href.indexOf("#") !== -1;
}

/**
 * Dispatch events, used for inter-module communication.
 */
const DISPATCH = d3.dispatch(
	// window events
	"onWindowSizeChanged",
	// view events
	"initializeView",
	"deactivateView",
	"reactivateView",
	// filter events
	"onFilterReset",
	// time filter
	"onTimelineBrushed",
	"onTimeFiltered",
	// regions filter
	"onMapRectangleSelection",
	"onRegionSelection",
	"onRegionFiltered",
	// transitions filter
	"onTransitionLimitChanged",
	// highlight events (views)
	"onRegionHighlight",
	"onTransitionHighlight",
	"onHighlightEnd",
	// highlight events (filter)
	"startRegionHighlight",
	"startTransitionHighlight",
	"startTransitionHighlightMulti",
	"endHighlight",
	// community events
	"onCommunityUpdate",
	// data events
	"onSimulationCompleted",
	// websocket events
	"onNewChannel",
	"onRemoveChannel",
	"onStartHosting",
	"onStopHosting",
	"onChannelJoined",
	"onChannelLeft"
);

/**
 * DISPATCH events
 *
 * adds an event logger: writes event name to console
 * each time this event occurs
 *
 * example:
 *    LOG_EVENT("onTimeFiltered");
 */
function LOG_EVENT(event) {
	DISPATCH.on(`${event}.eventInfo`, params => {
		console.log(`\tevent: "${event}", params:`);
		console.log(params);
	});
}
