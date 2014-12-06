var libNet = require('net');
var server = libNet.createServer(onConnect);

// When a core connects to this interface
function onConnect (connCore) {
	// Each core gets its own set of MPD sockets connected
	var connMpdCommand = libNet.createConnection(6600, 'localhost'); // Socket to send commands and receive track listings
	var connMpdMonitor = libNet.createConnection(6600, 'localhost'); // Socket to listen for status changes
	var connMpdStatus = libNet.createConnection(6600, 'localhost'); // Socket to read status

	// When Core sends a command
	connCore.on('data', function (command) {
		// Pass the command to MPD command socket
		connMpdCommand.write(command.toString() + '\n');

	});

	// When the MPD status socket has data
	connMpdStatus.on('data', function (response) {
		// Pass the data to Core
		connCore.write(response.toString());

	});

	// When MPD monitor socket gives a message (either startup or status change)
	connMpdMonitor.on('data', function (response) {
		// Put socket back into monitoring mode
		connMpdMonitor.write('idle\n');

		// If the playback status changed
		if (response.toString().indexOf('changed: player') > -1) {
			// Send command to get status
			connMpdStatus.write('status\n');

		}

	});

	// Close MPD connections if core disconnects
	connCore.on('close', function () {
		connMpdCommand.destroy();
		connMpdMonitor.destroy();
		connMpdStatus.destroy();

	});

	// Start keep alive timers
	timerKeepAlive(connMpdCommand);
	timerKeepAlive(connMpdStatus);

}

// Keep alive function for MPD sockets which do not use 'idle'
// Sends 'noidle' every 3 seconds
function timerKeepAlive(socket) {
	setTimeout(function () {
		if (socket.writable == 1) {
			socket.write('noidle\n');
			timerKeepAlive(socket);
		}

	}, 3000);

}

// Set the tcp server to listen for connections
server.listen(6500, function () {
	console.log('Mpd interface listening on localhost:6500...');
});
