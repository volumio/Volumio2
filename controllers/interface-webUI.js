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
		connWebSocket.on('command', function(sCommand, sParameters) {

			// Print an acknowledgement of the command to client console
			connWebSocket.emit('consoleMessage', 'Command: ' + sCommand + ' ' + sParameters);

			// Construct a promise to be fulfilled by the eventual command handler (this can potentially be done by the client itself)
			var promisedResponse = libQ.defer();

			// Emit the command for the coreCommandRouter to hear
			this_.emit('clientCommand', {command: sCommand, parameters: sParameters, promise: promisedResponse});

			// Listen for and handle the command response (this can also potentially be done on the client side)
			promisedResponse.promise
			.then (function (response) {

				// Print reponse to client console
				connWebSocket.emit('consoleMessage','Response: ' + JSON.stringify(response));

				// If a play queue is provided as a response
				if (response.type === 'playerQueue') {

					// Push the play queue to the requestor
					connWebSocket.emit('updateQueue', response.data);

				// If a player state is provided as a response
				} else if (response.type === 'playerState') {

					// Push the state to the requestor
					connWebSocket.emit('updateState', response.data);

				}

			})
			.catch (function (error) {
				connWebSocket.emit('consoleMessage','Error: ' + error);

			});

		});

	});

}

// Let InterfaceWebUI inherit the methods of the EventEmitter class, such as 'emit'
libUtil.inherits(InterfaceWebUI, libEvents.EventEmitter);

// Receive broadcasted updates from CoreCommandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.broadcastUpdate = function (update) {

	// If an updated play queue has been announced
	if (update.type === 'playerQueue') {

		// Push the updated play queue to all clients
		this.libSocketIO.emit('updateQueue', update.data);

	// If an updated player state has been announced
	} else if (update.type === 'playerState') {

		// Push the updated state to all clients
		this.libSocketIO.emit('updateState', update.data);

	}

}
