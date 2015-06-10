var libQ = require('kew');
var libFast = require('fast.js');

// Define the InterfaceWebUI class
module.exports = InterfaceWebUI;
function InterfaceWebUI (server, commandRouter) {
	var self = this;
	self.commandRouter = commandRouter;

	// Init SocketIO listener, unique to each instance of InterfaceWebUI
	self.libSocketIO = require('socket.io')(server);

	// When a websocket connection is made
	self.libSocketIO.on('connection', function(connWebSocket) {
		// Listen for the various types of client events -----------------------------
		connWebSocket.on('volumioGetState', function() {
			selfConnWebSocket = this;

			var timeStart = Date.now(); 
			self.logStart('Client requests Volumio state')
				.then(libFast.bind(commandRouter.volumioGetState, commandRouter))
				.then(function(state) {
					return self.volumioPushState.call(self, state, selfConnWebSocket);
				})
				.fail(function(error) {
					self.commandRouter.pushConsoleMessage.call(self.commandRouter, error.stack);
				})
				.done(function() {
					return self.logDone(timeStart);
				});
		});

		connWebSocket.on('volumioGetQueue', function() {
			selfConnWebSocket = this;

			var timeStart = Date.now(); 
			self.logStart('Client requests Volumio queue')
				.then(libFast.bind(commandRouter.volumioGetQueue, commandRouter))
				.then(function(queue) {
					return self.volumioPushQueue.call(self, queue, selfConnWebSocket);
				})
				.fail(function(error) {
					self.commandRouter.pushConsoleMessage.call(self.commandRouter, error.stack);
				})
				.done(function() {
					return self.logDone(timeStart);
				});
		});

		connWebSocket.on('volumioRemoveQueueItem', function(nIndex) {
			selfConnWebSocket = this;

			var timeStart = Date.now(); 
			self.logStart('Client requests Volumio queue')
				.then(function () {
					return commandRouter.volumioRemoveQueueItem.call(commandRouter, nIndex);
				})
				.fail(function(error) {
					self.commandRouter.pushConsoleMessage.call(self.commandRouter, error.stack);
				})
				.done(function() {
					return self.logDone(timeStart);
				});
		});

		connWebSocket.on('volumioBrowseLibrary', function(objBrowseParameters) {
			selfConnWebSocket = this;

			var timeStart = Date.now();
			self.logStart('Client requests browse')
				.then(function() {
					return commandRouter.volumioBrowseLibrary.call(commandRouter, objBrowseParameters);
				})
				.then(function(objBrowseData) {
					if (objBrowseData) {
						return self.volumioPushBrowseData.call(self, objBrowseData, selfConnWebSocket);
					}
				})
				.fail(function(error) {
					self.commandRouter.pushConsoleMessage.call(self.commandRouter, error.stack);
				})
				.done(function() {
					return self.logDone(timeStart);
				});
		});

		connWebSocket.on('volumioPlay', function() {
			var timeStart = Date.now(); 
			self.logStart('Client requests Volumio play')
				.then(libFast.bind(commandRouter.volumioPlay, commandRouter))
				.fail(function(error) {
					self.commandRouter.pushConsoleMessage.call(self.commandRouter, error.stack);
				})
				.done(function() {
					return self.logDone(timeStart);
				});
		});

		connWebSocket.on('volumioPause', function() {
			var timeStart = Date.now(); 
			self.logStart('Client requests Volumio pause')
				.then(libFast.bind(commandRouter.volumioPause, commandRouter))
				.fail(function(error) {
					self.commandRouter.pushConsoleMessage.call(self.commandRouter, error.stack);
				})
				.done(function() {
					return self.logDone(timeStart);
				});
		});

		connWebSocket.on('volumioStop', function() {
			var timeStart = Date.now(); 
			self.logStart('Client requests Volumio stop')
				.then(libFast.bind(commandRouter.volumioStop, commandRouter))
				.fail(function(error) {
					self.commandRouter.pushConsoleMessage.call(self.commandRouter, error.stack);
				})
				.done(function() {
					return self.logDone(timeStart);
				});
		});

		connWebSocket.on('volumioPrevious', function() {
			var timeStart = Date.now(); 
			self.logStart('Client requests Volumio previous')
				.then(libFast.bind(commandRouter.volumioPrevious, commandRouter))
				.fail(function(error) {
					self.commandRouter.pushConsoleMessage.call(self.commandRouter, error.stack);
				})
				.done(function() {
					return self.logDone(timeStart);
				});
		});

		connWebSocket.on('volumioNext', function() {
			var timeStart = Date.now(); 
			self.logStart('Client requests Volumio next')
				.then(libFast.bind(commandRouter.volumioNext, commandRouter))
				.fail(function(error) {
					self.commandRouter.pushConsoleMessage.call(self.commandRouter, error.stack);
				})
				.done(function() {
					return self.logDone(timeStart);
				});
		});

		connWebSocket.on('spopUpdateTracklist', function() {
			var timeStart = Date.now(); 
			self.logStart('Client requests Spop Update Tracklist')
				.then(libFast.bind(commandRouter.spopUpdateTracklist, commandRouter))
				.fail(function(error) {
					self.commandRouter.pushConsoleMessage.call(self.commandRouter, error.stack);
				})
				.done(function() {
					self.printConsoleMessage('Spop tracklist update completed.');
					return self.logDone(timeStart);
				});
		});

		connWebSocket.on('volumioRebuildLibrary', function() {
			var timeStart = Date.now(); 
			self.logStart('Client requests Volumio Rebuild Library')
				.then(libFast.bind(commandRouter.volumioRebuildLibrary, commandRouter))
				.fail(function(error) {
					self.commandRouter.pushConsoleMessage.call(self.commandRouter, error.stack);
				})
				.done(function() {
					self.printConsoleMessage('Volumio library rebuild completed.');
					return self.logDone(timeStart);
				});
		});
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
