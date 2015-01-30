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
			logStart('volumioGetState')
				.then(commandRouter.volumioGetState.bind(commandRouter))
				.then(_this.volumioPushState.bind(_this))
				.catch(console.log)
				.done(logDone);

		});

		connWebSocket.on('volumioGetQueue', function() {
			logStart('volumioGetQueue')
				.then(commandRouter.volumioGetQueue.bind(commandRouter))
				.then(_this.volumioPushQueue.bind(_this))
				.catch(console.log)
				.done(logDone);

		});

		connWebSocket.on('volumioPlay', function() {
			logStart('volumioPlay')
				.then(commandRouter.volumioPlay.bind(commandRouter))
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
InterfaceWebUI.prototype.volumioPushQueue = function (queue) {

	console.log('InterfaceWebUI::volumioPushQueue');
	var _this = this;

	// Push the updated queue to all clients
	return libQ.invoke(_this.libSocketIO, 'emit', 'volumioPushQueue', queue);

}

// Receive player state updates from commandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.volumioPushState = function (state) {

	console.log('InterfaceWebUI::volumioPushState');
	var _this = this;

	// Push the updated state to all clients
	return libQ.invoke(_this.libSocketIO, 'emit', 'volumioPushState', state);

}

function logDone () {

	console.log('------------------------------ End Chain');
	return libQ();

}

function logStart (sCommand) {

	console.log('\n---------------------------- Start Chain');
	console.log(sCommand);
	return libQ();

}
