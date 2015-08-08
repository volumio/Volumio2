var libQ = require('kew');
var libFast = require('fast.js');
/** Define the InterfaceWebUI class (Used by DEV UI)
 *
 * @type {InterfaceWebUI}
 */
module.exports = InterfaceWebUI;
function InterfaceWebUI (server, commandRouter) {
	var self = this;
	self.commandRouter = commandRouter;

	/** Init SocketIO listener */
	self.libSocketIO = require('socket.io')(server);

	/** On Client Connection, listen for various types of clients requests
	 *
	 */
	self.libSocketIO.on('connection', function (connWebSocket) {

		connWebSocket.on('playerCommand', function (param1, param2) {
			var thisWebsocketConnection = this;
			var timeStart = Date.now();
			var promisedActions = null;
			var sStartMessage = '';

			if (param1 === 'getState') {
				/** Request Volumio State
				 * It returns an array definining the Playback state, Volume and other amenities
				 * @example {"status":"stop","position":0,"dynamictitle":null,"seek":0,"duration":0,"samplerate":null,"bitdepth":null,"channels":null,"volume":82,"mute":false,"service":null}
				 *
				 * where
				 * @status is the status of the player
				 * @position is the position in the play queue of current playing track (if any)
				 * @dynamictitle is the title
				 * @seek is track's current elapsed play time
				 * @duration track's duration
				 * @samplerate current samplerate
				 * @bitdepth bitdepth
				 * @channels mono or stereo
				 * @volume current Volume
				 * @mute if true, Volumio is muted
				 * @service current playback service (mpd, spop...)
				 */
				sStartMessage = 'Client requests player state';
				promisedActions = libQ.fcall(function() {
					return commandRouter.volumioGetState.call(commandRouter);
				})
				.then(function (state) {
					return self.pushState.call(self, state, thisWebsocketConnection);
				});
			} else if (param1 === 'getQueue') {
				sStartMessage = 'Client requests queue listing';
				promisedActions = libQ.fcall(function() {
					return commandRouter.volumioGetQueue.call(commandRouter);
				})
				.then(function (queue) {
					return self.pushQueue.call(self, queue, thisWebsocketConnection);
				});
			} else if (param1 === 'removeQueueItem') {
				sStartMessage = 'Client requests remove queue item';
				promisedActions = libQ.fcall(function() {
					return commandRouter.volumioRemoveQueueItem.call(commandRouter, param2);
				});
			} else if (param1 === 'addQueueUids') {
				sStartMessage = 'Client requests add queue items';
				promisedActions = libQ.fcall(function() {
					return commandRouter.volumioAddQueueUids.call(commandRouter, param2);
				});
			} else if (param1 === 'play') {
				sStartMessage = 'Client requests play';
				promisedActions = libQ.fcall(function() {
					return commandRouter.volumioPlay.call(commandRouter);
				});
			} else if (param1 === 'pause') {
				sStartMessage = 'Client requests pause';
				promisedActions = libQ.fcall(function() {
					return commandRouter.volumioPause.call(commandRouter);
				});
			} else if (param1 === 'stop') {
				sStartMessage = 'Client requests stop';
				promisedActions = libQ.fcall(function() {
					return commandRouter.volumioStop.call(commandRouter);
				});
			} else if (param1 === 'previous') {
				sStartMessage = 'Client requests previous';
				promisedActions = libQ.fcall(function() {
					return commandRouter.volumioPrevious.call(commandRouter);
				});
			} else if (param1 === 'next') {
				sStartMessage = 'Client requests next';
				promisedActions = libQ.fcall(function() {
					return commandRouter.volumioNext.call(commandRouter);
				});
			} else if (param1 === 'rebuildLibrary') {
				sStartMessage = 'Client requests rebuild library';
				promisedActions = libQ.fcall(function() {
					return commandRouter.volumioRebuildLibrary.call(commandRouter);
				});
			} else if (param1 === 'setVolume') {
				sStartMessage = 'Client requests set volume';
				promisedActions = libQ.fcall(function() {
					return commandRouter.volumiosetvolume.call(commandRouter, param2);
				});
			} else if (param1 === 'getLibraryListing') {
				sStartMessage = 'Client requests library listing';
				promisedActions = libQ.resolve()
				.then(function() {
					return commandRouter.volumioBrowseLibrary.call(commandRouter, param2.uid, param2.options)
				})
				.then(function (objBrowseData) {
					if (objBrowseData) {
						return self.pushLibraryListing.call(self, objBrowseData, thisWebsocketConnection);
					}
				});
			} else if (param1 === 'getPlaylistRoot') {
				sStartMessage = 'Client requests playlist root';
				promisedActions = libQ.fcall(function() {
					return commandRouter.volumioGetPlaylistRoot.call(commandRouter)
				})
				.then(function (objBrowseData) {
					if (objBrowseData) {
						return self.pushPlaylistRoot.call(self, objBrowseData, thisWebsocketConnection);
					}
				});
			} else if (param1 === 'getPlaylistListing') {
				sStartMessage = 'Client requests playlist listing';
				promisedActions = libQ.fcall(function() {
					return commandRouter.volumioGetPlaylistListing.call(commandRouter, param2)
				})
				.then(function (objBrowseData) {
					if (objBrowseData) {
console.log(objBrowseData);
						return self.pushPlaylistListing.call(self, objBrowseData, thisWebsocketConnection);
					}
				});
			} else if (param1 === 'importServicePlaylists') {
				sStartMessage = 'Client requests import service playlists';
				promisedActions = libQ.fcall(function() {
					return commandRouter.volumioImportServicePlaylists.call(commandRouter);
				});
			} else if (param1 === 'getMenuItems') {
				sStartMessage = 'Client requests UI menu items';
				promisedActions = libQ.fcall(function() {
					return libQ.fcall(function () {
						var menuitems = [{"id":"home","name":"Home","type":"static","state":"volumio.playback"},{"id":"components","name":"Components","type":"static","state":"volumio.components"},{"id":"network","name":"Network","type":"dynamic"},{"id":"settings","name":"Settings","type":"dynamic"}]
						self.libSocketIO.emit('printConsoleMessage', menuitems);
						return self.libSocketIO.emit('pushMenuItems', menuitems);
					});
				});
			}

			return self.runActions(promisedActions, sStartMessage, timeStart);
		});

		connWebSocket.on('serviceCommand', function (param1, param2) {
			var thisWebsocketConnection = this;
			var timeStart = Date.now();
			var promisedActions = libQ.reject('Command not recognized: ' + param1);
			var sStartMessage = '';

			if (param1 === 'updateTracklist') {
				sStartMessage = 'Client requests service update tracklist';
				promisedActions = commandRouter.serviceUpdateTracklist.call(commandRouter, param2);
			}

			return self.runActions(promisedActions, sStartMessage, timeStart);
		});

		connWebSocket.on('pluginCommand', function (param1, param2) {
			var thisWebsocketConnection = this;
			var timeStart = Date.now();
			var promisedActions = libQ.reject('Command not recognized: ' + param1);
			var sStartMessage = '';

			if (param1 === 'scanWirelessNetworks') {
				sStartMessage = 'Client requests wireless network scan';
				promisedActions = commandRouter.volumiowirelessscan.call(commandRouter);
			}

			return self.runActions(promisedActions, sStartMessage, timeStart);
		});

	});
}

InterfaceWebUI.prototype.runActions = function(promisedActions, sStartMessage, timeStart) {
	var self = this;

	return libQ.resolve()
		.then(function() {
			return self.commandRouter.pushConsoleMessage('\n' + '[' + Date.now() + '] ' + '---------------------------- ' + sStartMessage);
		})
		.then(function() {
			return promisedActions;
		})
		.fail(function (error) {
			return self.commandRouter.pushConsoleMessage.call(self.commandRouter, error.stack);
		})
		.done(function () {
			return self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + '------------------------------ ' + (Date.now() - timeStart) + 'ms');
		});

}

// Receive console messages from commandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.printConsoleMessage = function(message) {
	var self = this;

	// Push the message all clients
	self.libSocketIO.emit('printConsoleMessage', message);

	// Return a resolved empty promise to represent completion
	return libQ.resolve();
}

// Receive player queue updates from commandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.pushQueue = function(queue, connWebSocket) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'InterfaceWebUI::pushQueue');

	// If a specific client is given, push to just that client
	if (connWebSocket) {
		return libQ.fcall(libFast.bind(connWebSocket.emit, connWebSocket), 'pushQueue', queue);
	// Else push to all connected clients
	} else {
		return libQ.fcall(libFast.bind(self.libSocketIO.emit, self.libSocketIO), 'pushQueue', queue);
	}
}

// Receive music library data from commandRouter and send to requester
InterfaceWebUI.prototype.pushLibraryListing = function(browsedata, connWebSocket) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'InterfaceWebUI::pushLibraryListing');

	// If a specific client is given, push to just that client
	if (connWebSocket) {
		return libQ.fcall(libFast.bind(connWebSocket.emit, connWebSocket), 'pushLibraryListing', browsedata);
	}
}

// Push the playlist root
InterfaceWebUI.prototype.pushPlaylistRoot = function(browsedata, connWebSocket) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'InterfaceWebUI::pushPlaylistRoot');

	// If a specific client is given, push to just that client
	if (connWebSocket) {
		return libQ.fcall(libFast.bind(connWebSocket.emit, connWebSocket), 'pushPlaylistRoot', browsedata);
	}
}

// Push the playlist vies
InterfaceWebUI.prototype.pushPlaylistListing = function(browsedata, connWebSocket) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'InterfaceWebUI::pushPlaylistListing');

	// If a specific client is given, push to just that client
	if (connWebSocket) {
		return libQ.fcall(libFast.bind(connWebSocket.emit, connWebSocket), 'pushPlaylistListing', browsedata);
	}
}

// Receive player state updates from commandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.pushState = function(state, connWebSocket) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'InterfaceWebUI::pushState');

	if (connWebSocket) {
		return libQ.fcall(libFast.bind(connWebSocket.emit, connWebSocket), 'pushState', state);
	} else {
		// Push the updated state to all clients
		return libQ.fcall(libFast.bind(self.libSocketIO.emit, self.libSocketIO), 'pushState', state);
	}
}
