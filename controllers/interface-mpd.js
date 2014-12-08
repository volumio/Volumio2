var net = require('net');
var sys = require('sys');
// server settings
var mpdPort = null;
var mpdHost = null;
// keep track of connected clients (for broadcasts)
var clients = [];
// MPD connection
var volumioCore = null;

// create server
var protocolServer = net.createServer(function(socket) {
	socket.setEncoding('utf8');
	// add client to list
	socket.on('connection', function(socket) {
		sys.puts("New client connected: " + socket.remoteAddress +':'+ socket.remotePort);
		clients.push(socket);
	});
	// MPD welcome command
	socket.write("OK MPD 0.19.0\n"); // TODO not hardcoded?
	// handle errors in handleError function
	socket.on('error', handleError);
	// on incoming message
	socket.on('data', function(data) {
	// log data (only for debugging)
		sys.puts("received: " + data);
		// cast message to string
		var message = data.toString();
		// read command
		if(message.startsWith('next')) {
		// next command
			sys.puts("next command received");
			sendSingleCommandToCore("next");
			socket.write("OK\n");
		} else if(message.startsWith('pause')) {
		// pause command
			sys.puts("pause command received");
			sendSingleCommandToCore("pause");
			socket.write("OK\n");
		} else if(message.startsWith('play')) {
		// play command
			sys.puts("play command received");
			sendSingleCommandToCore("play");
			socket.write("OK\n");
		} else if(message.startsWith("previous")) {
		// previous command
			sys.puts("previous command received");
			sendSingleCommandToCore("previous");
			socket.write("OK\n");
		} else if(message.startsWith("stop")) {
		// stop command
			sys.puts("stop command received");
			sendSingleCommandToCore("stop");
			socket.write("OK\n");
		} else {
		// no known command
			sys.puts("command not recognized: " + message);
			socket.write("ACK\n");
		}
	});
	function handleError(err) {
		sys.puts("socket error:", err.stack);
		socket.destroy();
	}
});
// on error
protocolServer.on('error', function(err) {
	if (err.code === 'EADDRINUSE') {
		// address is in use
		sys.puts("Failed to bind MPD protocol to port " + mpdPort +
		": Address in use.");
	} else {
		throw err;
	}
});
// start the server

// method to forward commands that dont need a response
function sendSingleCommandToCore(command) {
	// Foward the command to the Core (no editing needed)
	// Right now forwards it to MPD (localhost:6600)
//	connMpdCommand.write(command + '\n');
	volumioCore.executeCmd('mpd',command,'');//.sendCommand(command + '\n');
}

String.prototype.startsWith = function (str){
	return this.slice(0, str.length) == str;
};

// method to initialize the mpd interface to listen on setMpdIntercaePort, setMpdInterfaceHost and the connection to the "real" MPD setConnMpdCommand
function initProtocolServer(setMpdIntercaePort, setMpdInterfaceHost, setVolumioCore){
	volumioCore = setVolumioCore;
	mpdPort = setMpdIntercaePort;
	mpdHost = setMpdInterfaceHost;
	protocolServer.listen(mpdPort, mpdHost, function() {
		sys.puts("Abstract MPD layer listening at: " +
		mpdHost + ":" + mpdPort);
	});
}

module.exports = initProtocolServer;