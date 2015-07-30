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
			var selfConnWebSocket = this;
			var timeStart = Date.now();
			var promisedActions = libQ.resolve();
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
				promisedActions = promisedActions
					.then(libFast.bind(commandRouter.volumioGetState, commandRouter))
					.then(function (state) {
						return self.volumioPushState.call(self, state, selfConnWebSocket);
					});
			} else if (param1 === 'getQueue') {
				sStartMessage = 'Client requests queue listing';
				promisedActions = promisedActions
					.then(libFast.bind(commandRouter.volumioGetQueue, commandRouter))
					.then(function (queue) {
						return self.volumioPushQueue.call(self, queue, selfConnWebSocket);
					});
			} else if (param1 === 'removeQueueItem') {
				sStartMessage = 'Client requests remove queue item';
				promisedActions = promisedActions
					.then(function () {
						return commandRouter.volumioRemoveQueueItem.call(commandRouter, param2);
					});
			} else if (param1 === 'addQueueUids') {
				sStartMessage = 'Client requests add queue items';
				promisedActions = promisedActions
					.then(function () {
						return commandRouter.volumioAddQueueUids.call(commandRouter, param2);
					});
			} else if (param1 === 'play') {
				sStartMessage = 'Client requests play';
				promisedActions = promisedActions
					.then(libFast.bind(commandRouter.volumioPlay, commandRouter));
			} else if (param1 === 'pause') {
				sStartMessage = 'Client requests pause';
				promisedActions = promisedActions
					.then(libFast.bind(commandRouter.volumioPause, commandRouter));
			} else if (param1 === 'stop') {
				sStartMessage = 'Client requests stop';
				promisedActions = promisedActions
					.then(libFast.bind(commandRouter.volumioStop, commandRouter));
			} else if (param1 === 'previous') {
				sStartMessage = 'Client requests previous';
				promisedActions = promisedActions
					.then(libFast.bind(commandRouter.volumioPrevious, commandRouter));
			} else if (param1 === 'next') {
				sStartMessage = 'Client requests next';
				promisedActions = promisedActions
					.then(libFast.bind(commandRouter.volumioNext, commandRouter));
			} else if (param1 === 'rebuildLibrary') {
				sStartMessage = 'Client requests rebuild library';
				promisedActions = promisedActions
					.then(libFast.bind(commandRouter.volumioRebuildLibrary, commandRouter));
			} else if (param1 === 'setVolume') {
				sStartMessage = 'Client requests set volume';
				promisedActions = promisedActions
					.then(function () {
						return commandRouter.volumiosetvolume.call(commandRouter, param2);
					});
			} else {
				sStartMessage = 'Client requests unrecognized command: ' + param1;
				promisedActions = promisedActions
					.then(function() {
						return libQ.reject('Unrecognized command: ' + param1);
					});
			}

			return self.runActions(promisedActions, sStartMessage);
		});

		connWebSocket.on('libraryCommand', function (param1, param2) {
			var selfConnWebSocket = this;
			var timeStart = Date.now();
			var promisedActions = libQ.resolve();
			var sStartMessage = '';

			if (param1 === 'getLibraryListing') {
				sStartMessage = 'Client requests library listing';
				promisedActions = promisedActions
					.then(function () {
						return commandRouter.volumioBrowseLibrary.call(commandRouter, param2);
					})
					.then(function (objBrowseData) {
						if (objBrowseData) {
							return self.volumioPushBrowseData.call(self, objBrowseData, selfConnWebSocket);
						}
					});
			} else {
				sStartMessage = 'Client requests unrecognized command: ' + param1;
				promisedActions = promisedActions
					.then(function() {
						return libQ.reject('Unrecognized command: ' + param1);
					});
			}

			return self.runActions(promisedActions, sStartMessage);
		});

		connWebSocket.on('serviceCommand', function (param1, param2) {
			var selfConnWebSocket = this;
			var timeStart = Date.now();
			var promisedActions = libQ.resolve();
			var sStartMessage = '';

			if (param1 === 'updateTracklist') {
				sStartMessage = 'Client requests service update tracklist';
				promisedActions = promisedActions
					.then(function() {
						return commandRouter.serviceUpdateTracklist.call(commandRouter, param2);
					});
			} else {
				sStartMessage = 'Client requests unrecognized command: ' + param1;
				promisedActions = promisedActions
					.then(function() {
						return libQ.reject('Unrecognized command: ' + param1);
					});
			}

			return self.runActions(promisedActions, sStartMessage);
		});

		connWebSocket.on('playlistCommand', function (param1, param2) {
			var selfConnWebSocket = this;
			var timeStart = Date.now();
			var promisedActions = libQ.resolve();
			var sStartMessage = '';

			if (param1 === 'importServicePlaylists') {
				sStartMessage = 'Client requests import service playlists';
				promisedActions = promisedActions
					.then(libFast.bind(commandRouter.volumioImportServicePlaylists, commandRouter));
			} else {
				sStartMessage = 'Client requests unrecognized command: ' + param1;
				promisedActions = promisedActions
					.then(function() {
						return libQ.reject('Unrecognized command: ' + param1);
					});
			}

			return self.runActions(promisedActions, sStartMessage);
		});

		connWebSocket.on('interfaceCommand', function (param1, param2) {
			var selfConnWebSocket = this;
			var timeStart = Date.now();
			var promisedActions = libQ.resolve();
			var sStartMessage = '';

			if (param1 === 'getMenuItems') {
				sStartMessage = 'Client requests UI menu items';
				promisedActions = promisedActions
					.then(function () {
						var menuitems = [{"id":"home","name":"Home","type":"static","state":"volumio.playback"},{"id":"components","name":"Components","type":"static","state":"volumio.components"},{"id":"network","name":"Network","type":"dynamic"},{"id":"settings","name":"Settings","type":"dynamic"}]
						self.libSocketIO.emit('printConsoleMessage', menuitems);
						return self.libSocketIO.emit('pushMenuItems', menuitems);
					});
			} else {
				sStartMessage = 'Client requests unrecognized command: ' + param1;
				promisedActions = promisedActions
					.then(function() {
						return libQ.reject('Unrecognized command: ' + param1);
					});
			}

			return self.runActions(promisedActions, sStartMessage);
		});

		connWebSocket.on('systemCommand', function (param1, param2) {
			var selfConnWebSocket = this;
			var timeStart = Date.now();
			var promisedActions = libQ.resolve();
			var sStartMessage = '';

			if (param1 === 'scanWirelessNetworks') {
				sStartMessage = 'Client requests wireless network scan';
				promisedActions = promisedActions
					.then(function () {
						return commandRouter.volumiowirelessscan.call(commandRouter);
					});
			} else {
				sStartMessage = 'Client requests unrecognized command: ' + param1;
				promisedActions = promisedActions
					.then(function() {
						return libQ.reject('Unrecognized command: ' + param1);
					});
			}

			return self.runActions(promisedActions, sStartMessage);
		});

	});
}

InterfaceWebUI.prototype.runActions = function(promisedActions, sStartMessage) {
	var self = this;

	return self.logStart(sStartMessage)
		.then(function() {
			return promisedActions;
		}
		.fail(function (error) {
			self.commandRouter.pushConsoleMessage.call(self.commandRouter, error.stack);
		})
		.done(function () {
			return self.logDone(timeStart);
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
InterfaceWebUI.prototype.volumioPushQueue = function(queue, connWebSocket) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'InterfaceWebUI::volumioPushQueue');

	// If a specific client is given, push to just that client
	if (connWebSocket) {
		return libQ.fcall(libFast.bind(connWebSocket.emit, connWebSocket), 'volumioPushQueue', queue);
	// Else push to all connected clients
	} else {
		return libQ.fcall(libFast.bind(self.libSocketIO.emit, self.libSocketIO), 'volumioPushQueue', queue);
	}
}

// Receive music library data from commandRouter and send to requester
InterfaceWebUI.prototype.volumioPushBrowseData = function(browsedata, connWebSocket) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'InterfaceWebUI::volumioPushBrowseData');

	// If a specific client is given, push to just that client
	if (connWebSocket) {
		return libQ.fcall(libFast.bind(connWebSocket.emit, connWebSocket), 'volumioPushBrowseData', browsedata);
	}
}

// Receive player state updates from commandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.volumioPushState = function(state, connWebSocket) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'InterfaceWebUI::volumioPushState');

	if (connWebSocket) {
		return libQ.fcall(libFast.bind(connWebSocket.emit, connWebSocket), 'volumioPushState', state);
	} else {
		// Push the updated state to all clients
		return libQ.fcall(libFast.bind(self.libSocketIO.emit, self.libSocketIO), 'volumioPushState', state);
	}
}

InterfaceWebUI.prototype.logDone = function(timeStart) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + '------------------------------ ' + (Date.now() - timeStart) + 'ms');
	return libQ.resolve();
}

InterfaceWebUI.prototype.logStart = function(sCommand) {
	var self = this;
	self.commandRouter.pushConsoleMessage('\n' + '[' + Date.now() + '] ' + '---------------------------- ' + sCommand);
	return libQ.resolve();
}
