var libNet = require('net');
var server = libNet.createServer(onConnect);

// When a core connects to this interface
function onConnect (connCore) {
	// Each core gets its own set of Spop sockets connected
	var connSpopCommand = libNet.createConnection(6602, 'localhost'); // Socket to send commands and receive track listings
	var connSpopStatus = libNet.createConnection(6602, 'localhost'); // Socket to listen for status changes

	// When Core sends a command
	connCore.on('data', function (command) {
		// Translate command to Spop convention
		if (command == 'pause') {
			command = 'toggle';
		} else if (command == 'previous') {
			command = 'prev';
		}

		// Pass the command to Spop
		connSpopCommand.write(command.toString() + '\n');

	});

	// When Spop status gives a message
	connSpopStatus.on('data', function (response) {
		// Put socket back into monitoring mode
		connSpopStatus.write('idle\n');

		// Pass the message to Core
		connCore.write(response.toString());

	});

	// Close Spop connections if core disconnects
	connCore.on('close', function () {
		connSpopCommand.destroy();
		connSpopStatus.destroy();

	});

}

// Set the tcp server to listen for connections
server.listen(6502, function () {
	console.log('Spop interface listening on localhost:6502...');
});
