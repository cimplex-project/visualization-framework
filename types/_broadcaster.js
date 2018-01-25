/**
 * This file contains code that uses the Broadcast Channel API:
 * https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
 * to extrude and synchronize multiple browser windows to one model.
 */

// a list of all events to synchronize
const broadcastedEvents = [
	// filter events
	"onFilterReset",
	// time
	"onTimelineBrushed",
	"onTimeFiltered",
	// regions
	"onMapRectangleSelection",
	"onRegionSelection",
	"onRegionFiltered",
	// transitions
	"onTransitionLimitChanged",
	// highlight events
	"startRegionHighlight",
	"startTransitionHighlight",
	"endHighlight",
	"onRegionHighlight",
	"onTransitionHighlight",
	"onHighlightEnd",
	// community events
	"onCommunityUpdate"
];

let broadcastDispatch = false;

// a list of intercepted incoming events that need special handling
const interceptedIncomingEvents = {
	// detect communities again if onCommunityUpdate was received
	onCommunityUpdate() {
		CONFIG.filter.showCommunities = !CONFIG.filter.showCommunities;
		community.detect(CRXFILTER.currentData.model.selectedRegions, CRXFILTER.currentData.model.selectedTransitions);
	},

	// rebuild selected regions
	onRegionSelection(regions) {
		regions.forEach((region, index) => {
			regions[index] = CRXFILTER.currentData.model.regionMap.get(+region.properties.id);
		});
	},

	// rebuild filtered regions
	onRegionFiltered(regions) {
		regions.forEach((region, index) => {
			regions[index] = CRXFILTER.currentData.model.regionMap.get(+region.properties.id);
		});
	},

	// Don't broadcast events while processing the onTimeFiltered event
	onTimeFiltered(data) {
		broadcastDispatch = true;
		if (typeof data[0] !== "undefined" && typeof data[1] !== "undefined") {
			CRXFILTER.applyFilter("time", {
				interval: data[1],
				finished: data[0],
				supressEvent: false
			});
		}
		broadcastDispatch = false;
	},

	// Don't broadcast events while processing the onFilterReset event
	onFilterReset(data) {
		broadcastDispatch = true;
		CRXFILTER.applyFilter("remove", {
			time: true,
			regions: true
		});
		broadcastDispatch = false;
	},

	// Don't broadcast events while processing the onRegionFiltered event
	// and recalculate regions.
	// TODO: duplicate
	onRegionFiltered(data) {
		broadcastDispatch = true;
		if (data && data[0]) {
			const regions = data[0].map((region, index) => {
				return CRXFILTER.currentData.model.regionMap.get(+region.properties.id);
			});
			CRXFILTER.applyFilter("regions", {
				regions
			});
		} else {
			CRXFILTER.applyFilter("remove", {
				regions: true
			});
		}
		broadcastDispatch = false;
	}
};

// a list of intercepted outcoming events that need special handling
const interceptedOutcomingEvents = {
	// this needs special handling (avoid circular regions data)
	onRegionSelection() {
		const args = Array.prototype.slice.call(arguments);
		const regions = args[0].map(region => {
			return {
				properties: {
					id: region.properties.id
				}
			};
		});

		return [regions];
	},

	// this needs special handling (avoid circular regions data)
	onRegionFiltered() {
		const args = Array.prototype.slice.call(arguments);
		const regions = args[0][0].map(region => {
			return {
				properties: {
					id: region.properties.id
				}
			};
		});
		return [
			[regions]
		];
	}
};


/**
 * Global broadcaster
 */
const broadcaster = (function () {
	let wsMessagesQueueTypes = {};
	let wsMessageQueue = [];
	let _isHosting = false;
	let _joinedChannel;
	let _currentSettings;
	let _broadcastChannelId = `Visframework-${+new Date()}`;
	const channels = [];

	if (isChildWindow()) {
		_broadcastChannelId = new URL(window.location.href)
			.searchParams.get("broadcastChannelId");
	}

	// debounce websockets (avoid spamming of messages)
	function onRequestAnimationFrame() {
		wsMessageQueue.forEach(message => {
			onMessage(message);
		});

		wsMessageQueue = [];
		wsMessagesQueueTypes = {};

		requestAnimationFrame(onRequestAnimationFrame);
	}
	requestAnimationFrame(onRequestAnimationFrame);


	let channel;
	if(typeof BroadcastChannel !== "undefined") {
		channel = new BroadcastChannel(_broadcastChannelId);
		channel.onmessage = (message) => {
			onMessage(message.data);
		};
	}

	// onmessage is called when a broadcaster event was received
	function onMessage(message) {
		const type = message.type;

		if (type === "init") {
			broadcastDispatch = true;
			// pick the selected connector
			getRegisteredConnectors().forEach((d) => {
				if (d.name == message.settings.service) {
					CONNECTOR = d;
				}
			});
			// create new model using the data from the socket
			controller.connectorCallback(new Model(message.data));
			broadcastDispatch = false;
		}

		if (type === "getInit" && !isChildWindow()) {
			postModel();
		}

		// dispatch all received events via DISPATCH
		if (broadcastedEvents.indexOf(type) !== -1) {
			broadcastDispatch = true;

			// call interceptedEvents functions if available (to handle exceptions)
			if (interceptedIncomingEvents[type]) {
				interceptedIncomingEvents[type].apply(null, message.data);
			}

			if (type !== "onTimeFiltered" && type !== "onRegionFiltered" && type !== "onFilterReset") {
				DISPATCH[type].apply(DISPATCH, message.data);
			}

			broadcastDispatch = false;
		}
	};

	if (typeof visframework_Connector !== "undefined") {
		var socket = io();
		socket.on("new_channel", (data) => {
			channels.push(data.id);

			DISPATCH.onNewChannel(data);
		});

		socket.on("remove_channel", (data) => {
			const index = channels.indexOf(data.id);
			if (index !== -1) {
				channels.splice(index, 1);
			}

			if(data.id === _joinedChannel) {
				leaveChannel();
			}

			DISPATCH.onRemoveChannel(data);
		});

		// synchronized visualization framework event
		socket.on("vf_event", (message) => {
			if (typeof wsMessagesQueueTypes[message.type] === "undefined") {
				const index = wsMessageQueue.push(message) - 1;
				wsMessagesQueueTypes[message.type] = index;
			} else {
				const index = wsMessagesQueueTypes[message.type];
				wsMessageQueue[message] = data;
			}
		});

		// server (client) requests the current MODEL
		socket.on("getInit", (data, fn) => {
			fn({
				data: CRXFILTER.currentData.model.serialize(),
				settings: settingsPanelView.modelSettings.data === "visframework_data" ?
					_currentSettings : settingsPanelView.modelSettings
			})
		})

		// client receives the current MODEL
		socket.on("init", (message) => {
			// store current settings for shareception
			_currentSettings = message.settings;
			// pick the selected connector
			getRegisteredConnectors().forEach((d) => {
				if (d.name == message.settings.service) {
					CONNECTOR = d;
				}
			});
			// create new model using the data from the socket
			controller.connectorCallback(new Model(message.data));
		})

		// catch error during connect of socket
		socket.on("connect_error", error => {
			if(error.description === 404) {
				// if we cannot connect, remove the vf connector
				visframework_connector = undefined;
				// fake join a channel to remove connect icon & redraw toolbar
				_joinedChannel = "error"; 
				UI.drawToolbar();
				// stop trying to reconnect
				socket.disconnect();
			}
		});
	}

	// forward all registered events in the broadcastedEvents array to the channel
	broadcastedEvents.forEach(function (eventName) {
		DISPATCH.on(`${eventName}.broadcaster`, function () {
			if (!broadcastDispatch) {
				if (interceptedOutcomingEvents[eventName]) {
					postMessage({
						type: eventName,
						data: interceptedOutcomingEvents[eventName].apply(null, arguments)
					});
				} else {
					postMessage({
						type: eventName,
						data: Array.prototype.slice.call(arguments)
					});
				}
			}
		});
	});

	/**
	 * Helper function to post current model to the broadcaster channel
	 */
	function postModel() {
		postMessage({
			type: "init",
			data: CRXFILTER.currentData.model.serialize(),
			settings: settingsPanelView.modelSettings
		});
	}

	/**
	 * Helper function to tell the main window to send the current model
	 */
	function getInit() {
		postMessage({
			type: "getInit"
		});
	}

	/**
	 * Posts a messsage with all channels (broadcaster channel & websockets)
	 */
	function postMessage(message) {
		// sync with socket 
		if ((_joinedChannel || isHosting()) && _joinedChannel !== "error") {
			socket.emit("vf_event", message);
		}

		// sync with broadcastchannel
		if(typeof channel !== "undefined") {
			channel.postMessage(message);
		}
	}

	/**
	 * Create a new channel
	 */
	function createChannel() {
		return new Promise((resolve, reject) => {
			if (socket.connected) {
				socket.emit("create", undefined, (result) => {
					if (result === "createSuccess") {
						_isHosting = true;
						DISPATCH.onStartHosting();
						resolve();
					} else {
						reject();
					}
				});
			} else {
				reject();
			}
		});
	}

	/**
	 * Remove channel (stop sharing)
	 */
	function removeChannel() {
		return new Promise((resolve, reject) => {
			if (socket.connected) {
				socket.emit("remove", undefined, (result) => {
					if (result === "removeSuccess") {
						_isHosting = false;
						resolve();
					} else {
						reject();
					}
					DISPATCH.onStopHosting();
				});
			} else {
				reject();
			}
		});
	}

	/**
	 * Returns if the current client is hosting
	 */
	function isHosting() {
		return _isHosting;
	}

	/*
	 * Joins a remote channel id
	 */
	function joinChannel(id) {
		_joinedChannel = id;
		socket.emit("join", {
			id
		});
		DISPATCH.onChannelJoined();
	}

	/**
	 * Returns the current joined channel (if any)
	 */
	function getChannel() {
		return _joinedChannel;
	}

	/**
	 * Returns the current broadcastchannelid
	 */
	function getBroadcastChannelId() {
		return _broadcastChannelId;
	}

	/**
	 * Leaves a remote channel id
	 */
	function leaveChannel() {
		if(_joinedChannel && _joinedChannel !== "error") {
			socket.emit("leave", {
				_joinedChannel
			});
			_joinedChannel = undefined;
			
			DISPATCH.onChannelLeft();
		}
	}

	return {
		createChannel,
		removeChannel,
		getInit,
		postModel,
		isHosting,
		channels,
		joinChannel,
		leaveChannel,
		getChannel,
		getBroadcastChannelId
	};
})();