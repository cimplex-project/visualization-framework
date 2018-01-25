
/**
 * This file contains helper functions that handle user interactions in
 * the form of mouse and touch events
 */

/**
 * Control button for the rectangle selection
 *
 * based on:
 *
 * L.Control.BoxZoom A visible, clickable control for doing a box zoom.
 * https://github.com/gregallensworth/L.Control.BoxZoom
 *
 * Rectangle Selection
 *
 * based on: Leaflet BoxZoom (for original see leaflet-src.js)
 */
L.Control.RectangleSelect = L.Control.extend({
	options: {
		position: "topleft"
	},

	initialize() {
		this._startLayerPoint = null;
		this._box = null;
		this.map = null;
		this.active = false;
	},

	onAdd(map) {
		this.map = map;
		this.active = false;
		this._pane = this.map.getPanes().overlayPane;
		// create our button
		this.controlDiv = L.DomUtil.create("div", "leaflet-control-boxzoom");
		this.controlDiv.control = this;
		this.controlDiv.title = "Click here to select regions";
		this.controlDiv.innerHTML = "<i class=\"fa fa-instagram\"></i>";
		L.DomEvent
			.addListener(this.controlDiv, "mousedown", L.DomEvent.stopPropagation)
			.addListener(this.controlDiv, "click", L.DomEvent.stopPropagation)
			.addListener(this.controlDiv, "click", L.DomEvent.preventDefault)
			.addListener(this.controlDiv, "click", function () {
				this.control.toggleState();
			});

		// start by toggling our state to off; this disables the boxZoom hooks
		// on the map, in favor of this one
		this.setStateOff();
		return this.controlDiv;
	},

	// toggle between active and inactive
	toggleState() {
		this.active ? this.setStateOff() : this.setStateOn();
	},

	setStateOn() {
		// reset community picker
		mapView.communityPicker = false;

		L.DomUtil.addClass(this.controlDiv, "leaflet-control-boxzoom-active");
		this.active = true;
		this.map.dragging.disable();
		this.map.boxZoom.addHooks();
		this.map.on("mousedown", this.handleMouseDown, this);
		this.map.on("boxzoomend", this.setStateOff, this);
		this.map.on("rectangleselected", this.setStateOff, this);
		d3.select("#map").style("cursor", "crosshair");
		mapView.selectionActive = true;
	},

	setStateOff() {
		// reset community picker
		mapView.communityPicker = false;

		L.DomUtil.removeClass(this.controlDiv, "leaflet-control-boxzoom-active");
		this.active = false;
		this.map.off("mousedown", this.handleMouseDown, this);
		this.map.dragging.enable();
		this.map.boxZoom.removeHooks();
		if (this._box && this._box.hasChildNodes()) {
			this._pane.removeChild(this._box);
		}
		d3.select("#map").style("cursor", "default");
		mapView.selectionActive = false;
	},
	// call Leaflets BoxZoom
	handleMouseDown(event) {
		this._onMouseDown({ clientX: event.originalEvent.clientX, clientY: event.originalEvent.clientY, which: 1, shiftKey: true });
	},

	_onMouseDown(e) {
		this._moved = false;
		if (
			!e.shiftKey
			|| ((e.which !== 1) && (e.button !== 1))
		) {
			return false;
		}
		L.DomUtil.disableTextSelection();
		L.DomUtil.disableImageDrag();
		this._startLayerPoint = this._map.mouseEventToLayerPoint(e);
		L.DomEvent
			.on(document, "mousemove", this._onMouseMove, this)
			.on(document, "mouseup", this._onMouseUp, this)
			.on(document, "keydown", this._onKeyDown, this);
	},

	_onMouseMove(e) {
		if (!this._moved) {
			this._box = L.DomUtil.create("div", "leaflet-zoom-box", this._pane);
			L.DomUtil.setPosition(this._box, this._startLayerPoint);
			this._container.style.cursor = "crosshair";
			this._map.fire("boxzoomstart");
		}

		const startPoint = this._startLayerPoint,
			box = this._box,
			layerPoint = this._map.mouseEventToLayerPoint(e),
			offset = layerPoint.subtract(startPoint),
			newPos = new L.Point(
				Math.min(layerPoint.x, startPoint.x),
				Math.min(layerPoint.y, startPoint.y));

		L.DomUtil.setPosition(box, newPos);
		this._moved = true;
		box.style.width = `${Math.max(0, Math.abs(offset.x) - 4)}px`;
		box.style.height = `${Math.max(0, Math.abs(offset.y) - 4)}px`;
	},

	_finish() {
		if (this._moved) {
			this._pane.removeChild(this._box);
			this._map._container.style.cursor = "";
		}

		L.DomUtil.enableTextSelection();
		L.DomUtil.enableImageDrag();
		L.DomEvent
			.off(document, "mousemove", this._onMouseMove)
			.off(document, "mouseup", this._onMouseUp)
			.off(document, "keydown", this._onKeyDown);

		this.setStateOff();
	},

	// this function is called when the user has finished the selection
	_onMouseUp(e) {
		this._finish();
		const map = this._map,
			layerPoint = map.mouseEventToLayerPoint(e);

		if (this._startLayerPoint.equals(layerPoint)) {
			return;
		}

		const bounds = new L.LatLngBounds(
			map.layerPointToLatLng(this._startLayerPoint),
			map.layerPointToLatLng(layerPoint));

		// fire event with bounds of the rectangle
		map.fire("rectangleselected", {
			bounds: bounds
		});
	},

	_onKeyDown(e) {
		if (e.keyCode === 27) {
			this._finish();
		}
	}
});

// needed in order to add the rectangle select to the map
L.Control.rectangleSelect = function () {
	return new L.Control.RectangleSelect();
};
