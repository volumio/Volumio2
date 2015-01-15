var libEvents = require('events');
var libUtil = require('util');
var libQ = require('q');

// Define the InterfaceWebUI class
module.exports = InterfaceWebUI;
function InterfaceWebUI (server) {

	// Init SocketIO listener, unique to each instance of InterfaceWebUI
	this.libSocketIO = require('socket.io')(server);

	// Establish a static variable for 'this', so can still refer to it at deeper scopes (any better way to do this?)
	var this_ = this;

	// Inherit some default objects from the EventEmitter class
	libEvents.EventEmitter.call(this);

	// When a websocket connection is made
	this.libSocketIO.on('connection', function(connWebSocket) {

		// Print connection message to client console
		connWebSocket.emit('consoleMessage', 'Websocket connected');

		// When a client command is received over websocket
		connWebSocket.on('clientEvent', function(sCommand, sParameters) {

			// Print an acknowledgement of the command to client console for debugging purposes
			connWebSocket.emit('consoleMessage', 'Command: ' + sCommand + ' ' + sParameters);

			// Construct a promise to be fulfilled by the eventual command handler (this can potentially be done by the client itself)
			var promisedResponse = libQ.defer();

			// Emit the command for the coreCommandRouter to hear
			this_.emit('clientEvent', {type: sCommand, data: sParameters, promise: promisedResponse});

			// Listen for and handle the command response (this can also potentially be done on the client side)
			promisedResponse.promise
			.then (function (response) {

				// Print reponse to client console for debugging purposes
				connWebSocket.emit('consoleMessage','Response: ' + JSON.stringify(response));

				// Push the response to the client
				connWebSocket.emit(response.type, response.data);

			})
			.catch (function (error) {
				connWebSocket.emit('consoleMessage','Error: ' + error);

			});

		});

	});

}

// Let this class inherit the methods of the EventEmitter class, such as 'emit'
libUtil.inherits(InterfaceWebUI, libEvents.EventEmitter);

// Receive console messages from CoreCommandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.consoleMessage = function (message) {

	// Push the message all clients
	this.libSocketIO.emit('consoleMessage', message);

}

// Receive player queue updates from CoreCommandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.playerQueue = function (queue) {

	// Push the updated queue to all clients
	this.libSocketIO.emit('playerQueue', queue);

}

// Receive player state updates from CoreCommandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.playerState = function (state) {

	// Push the updated queue to all clients
	this.libSocketIO.emit('playerState', state);

}
