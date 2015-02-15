var libQ = require('kew');

// Define the InterfaceWebUI class
module.exports = InterfaceWebUI;
function InterfaceWebUI (server, commandRouter) {

	var _this = this;

	// Init SocketIO listener, unique to each instance of InterfaceWebUI
	this.libSocketIO = require('socket.io')(server);

	// When a websocket connection is made
	this.libSocketIO.on('connection', function(connWebSocket) {

		// Listen for the various types of client events -----------------------------
		connWebSocket.on('volumioGetState', function() {
			_thisConnWebSocket = this;

			var timeStart = Date.now(); 
			logStart('Client requests Volumio state')
				.then(commandRouter.volumioGetState.bind(commandRouter))
				.then(function (state) {
					return _this.volumioPushState.call(_this, state, _thisConnWebSocket);

				})
				.fail(console.log)
				.done(function () {
					return logDone(timeStart);

				});

		});

		connWebSocket.on('volumioGetQueue', function() {
			_thisConnWebSocket = this;

			var timeStart = Date.now(); 
			logStart('Client requests Volumio queue')
				.then(commandRouter.volumioGetQueue.bind(commandRouter))
				.then(function (queue) {
					return _this.volumioPushQueue.call(_this, queue, _thisConnWebSocket);

				})
				.fail(console.log)
				.done(function () {
					return logDone(timeStart);

				});

		});

		connWebSocket.on('volumioPlay', function() {

			var timeStart = Date.now(); 
			logStart('Client requests Volumio play')
				.then(commandRouter.volumioPlay.bind(commandRouter))
				.fail(console.log)
				.done(function () {
					return logDone(timeStart);

				});

		});

		connWebSocket.on('volumioPause', function() {

			var timeStart = Date.now(); 
			logStart('Client requests Volumio pause')
				.then(commandRouter.volumioPause.bind(commandRouter))
				.fail(console.log)
				.done(function () {
					return logDone(timeStart);

				});

		});

		connWebSocket.on('volumioStop', function() {

			var timeStart = Date.now(); 
			logStart('Client requests Volumio stop')
				.then(commandRouter.volumioStop.bind(commandRouter))
				.fail(console.log)
				.done(function () {
					return logDone(timeStart);

				});

		});

		connWebSocket.on('volumioPrevious', function() {

			var timeStart = Date.now(); 
			logStart('Client requests Volumio previous')
				.then(commandRouter.volumioPrevious.bind(commandRouter))
				.fail(console.log)
				.done(function () {
					return logDone(timeStart);

				});

		});

		connWebSocket.on('volumioNext', function() {

			var timeStart = Date.now(); 
			logStart('Client requests Volumio next')
				.then(commandRouter.volumioNext.bind(commandRouter))
				.fail(console.log)
				.done(function () {
					return logDone(timeStart);

				});

		});

	});

}

// Receive console messages from commandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.printConsoleMessage = function (message) {

	console.log('[' + Date.now() + '] ' + 'InterfaceWebUI::printConsoleMessage');
	// Push the message all clients
	this.libSocketIO.emit('printConsoleMessage', message);

	// Return a resolved empty promise to represent completion
	return libQ.resolve();

}

// Receive player queue updates from commandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.volumioPushQueue = function (queue, connWebSocket) {

	console.log('[' + Date.now() + '] ' + 'InterfaceWebUI::volumioPushQueue');
	var _this = this;

	if (connWebSocket) {
		return libQ.fcall(connWebSocket.emit.bind(connWebSocket), 'volumioPushQueue', queue);

	} else {
		// Push the updated queue to all clients
		return libQ.fcall(_this.libSocketIO.emit.bind(_this.libSocketIO), 'volumioPushQueue', queue);

	}

}

// Receive player state updates from commandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.volumioPushState = function (state, connWebSocket) {

	console.log('[' + Date.now() + '] ' + 'InterfaceWebUI::volumioPushState');
	var _this = this;

	if (connWebSocket) {
		return libQ.fcall(connWebSocket.emit.bind(connWebSocket), 'volumioPushState', state);

	} else {
		// Push the updated state to all clients
		return libQ.fcall(_this.libSocketIO.emit.bind(_this.libSocketIO), 'volumioPushState', state);

	}

}

function logDone (timeStart) {

	console.log('[' + Date.now() + '] ' + '------------------------------ ' + (Date.now() - timeStart) + 'ms');
	return libQ.resolve();

}

function logStart (sCommand) {

	console.log('\n' + '[' + Date.now() + '] ' + '---------------------------- ' + sCommand);
	return libQ.resolve();

}
