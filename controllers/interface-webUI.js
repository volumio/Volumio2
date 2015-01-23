// Define the InterfaceWebUI class
module.exports = InterfaceWebUI;
function InterfaceWebUI (server, CoreCommandRouter) {

	// Init SocketIO listener, unique to each instance of InterfaceWebUI
	this.libSocketIO = require('socket.io')(server);

	// When a websocket connection is made
	this.libSocketIO.on('connection', function(connWebSocket) {

		// When a client event is received over websocket
		connWebSocket.on('volumioGetState', function(sParameters) {
			CoreCommandRouter.volumioGetState().then(handleResult, handleError);

		});

		// Listen for and pass the result to the client
		function handleResult(result) {
			connWebSocket.emit(result.type, result.data);

		};

		// Listen for and pass the error to the client (and let them handle it)
		function handleError(error) {
			connWebSocket.emit(error.type, error.data);

		};

	});

}

// Receive console messages from CoreCommandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.printConsoleMessage = function (message) {
	// Push the message all clients
	this.libSocketIO.emit('consoleMessage', message);

}

// Receive player queue updates from CoreCommandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.volumioQueueUpdate = function (queue) {
	// Push the updated queue to all clients
	this.libSocketIO.emit('volumioQueueUpdate', queue);

}

// Receive player state updates from CoreCommandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.volumioStateUpdate = function (state) {
	// Push the updated queue to all clients
	this.libSocketIO.emit('volumioStateUpdate', state);

}

