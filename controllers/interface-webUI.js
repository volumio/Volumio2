var libQ = require('q');

// Define the InterfaceWebUI class
module.exports = InterfaceWebUI;
function InterfaceWebUI (server, commandRouter) {

	_this = this;

	// Init SocketIO listener, unique to each instance of InterfaceWebUI
	this.libSocketIO = require('socket.io')(server);

	// When a websocket connection is made
	this.libSocketIO.on('connection', function(connWebSocket) {

		// Listen for the various types of client events -----------------------------
		connWebSocket.on('volumioGetState', function() {
			_thisConnWebSocket = this;

			logStart('Client requests Volumio state')
				.then(commandRouter.volumioGetState.bind(commandRouter))
				.then(function (state) {
					return _this.volumioPushState.call(_this, state, _thisConnWebSocket);

				})
				.catch(console.log)
				.done(logDone);

		});

		connWebSocket.on('volumioGetQueue', function() {
			_thisConnWebSocket = this;

			logStart('Client requests Volumio queue')
				.then(commandRouter.volumioGetQueue.bind(commandRouter))
				.then(function (queue) {
					return _this.volumioPushQueue.call(_this, queue, _thisConnWebSocket);

				})
				.catch(console.log)
				.done(logDone);

		});

		connWebSocket.on('volumioPlay', function() {

			logStart('Client requests Volumio play')
				.then(commandRouter.volumioPlay.bind(commandRouter))
				.catch(console.log)
				.done(logDone);

		});

		connWebSocket.on('volumioPause', function() {

			logStart('Client requests Volumio pause')
				.then(commandRouter.volumioPause.bind(commandRouter))
				.catch(console.log)
				.done(logDone);

		});

		connWebSocket.on('volumioStop', function() {

			logStart('Client requests Volumio stop')
				.then(commandRouter.volumioStop.bind(commandRouter))
				.catch(console.log)
				.done(logDone);

		});

		connWebSocket.on('volumioPrevious', function() {

			logStart('Client requests Volumio previous')
				.then(commandRouter.volumioPrevious.bind(commandRouter))
				.catch(console.log)
				.done(logDone);

		});

		connWebSocket.on('volumioNext', function() {

			logStart('Client requests Volumio next')
				.then(commandRouter.volumioNext.bind(commandRouter))
				.catch(console.log)
				.done(logDone);

		});

	});

}

// Receive console messages from commandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.printConsoleMessage = function (message) {

	console.log('InterfaceWebUI::printConsoleMessage');
	// Push the message all clients
	this.libSocketIO.emit('printConsoleMessage', message);

	// Return a resolved empty promise to represent completion
	return libQ();

}

// Receive player queue updates from commandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.volumioPushQueue = function (queue, connWebSocket) {

	console.log('InterfaceWebUI::volumioPushQueue');
	var _this = this;

	if (connWebSocket) {
		return libQ.invoke(connWebSocket, 'emit', 'volumioPushQueue', queue);

	} else {
		// Push the updated queue to all clients
		return libQ.invoke(_this.libSocketIO, 'emit', 'volumioPushQueue', queue);

	}

}

// Receive player state updates from commandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.volumioPushState = function (state, connWebSocket) {

	console.log('InterfaceWebUI::volumioPushState');
	var _this = this;

	if (connWebSocket) {
		return libQ.invoke(connWebSocket, 'emit', 'volumioPushState', state);

	} else {
		// Push the updated state to all clients
		return libQ.invoke(_this.libSocketIO, 'emit', 'volumioPushState', state);

	}

}

function logDone () {

	console.log('------------------------------');
	return libQ();

}

function logStart (sCommand) {

	console.log('\n---------------------------- ' + sCommand);
	return libQ();

}
