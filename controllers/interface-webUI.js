var libEvents = require('events');
var libUtil = require('util');
var libQ = require('q');

// Define the InterfaceWebUI class
module.exports = InterfaceWebUI;
function InterfaceWebUI (server) {

	// Init SocketIO listener, unique to each instance of InterfaceWebUI
	this.libSocketIO = require('socket.io')(server);

	// Establish a static variable for 'this', so can still refer to it at deeper scopes (any better way to do this?)
	var thisInterfaceWebUI = this;

	// Inherit some default objects from the EventEmitter class
	libEvents.EventEmitter.call(this);

	// When a websocket connection is made
	this.libSocketIO.on('connection', function(connWebSocket) {

		// When a client event is received over websocket
		connWebSocket.on('clientEvent', function(clientEvent) {

			// Construct a promise for response to be fulfilled by the event handler (this can potentially be done by the client itself)
			var promisedResponse = libQ.defer();

			// Emit the event for the coreCommandRouter to hear
			thisInterfaceWebUI.emit('interfaceEvent', {type: clientEvent.type, data: clientEvent.data}, promisedResponse);

			// Listen for and handle the event response (this can also potentially be done on the client side)
			promisedResponse.promise
			.then (function (response) {

				// If the response contains any data
				if ('type' in response) {

					// Push the response to the client
					connWebSocket.emit('interfaceEvent', {type: response.type, data: response.data});

				}

			});

		});

	});

}

// Let this class inherit the methods of the EventEmitter class, such as 'emit'
libUtil.inherits(InterfaceWebUI, libEvents.EventEmitter);

// Receive console messages from CoreCommandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.printConsoleMessage = function (message) {

	// Push the message all clients
	this.libSocketIO.emit('interfaceEvent', {type: 'consoleMessage', data: message});

}

// Receive player queue updates from CoreCommandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.volumioQueueUpdate = function (queue) {

	// Push the updated queue to all clients
	this.libSocketIO.emit('interfaceEvent', {type: 'volumioQueueUpdate', data: queue});

}

// Receive player state updates from CoreCommandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.volumioStateUpdate = function (state) {

	// Push the updated queue to all clients
	this.libSocketIO.emit('interfaceEvent', {type: 'volumioStateUpdate', data: state});

}
