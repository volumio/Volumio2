var libExpress = require('express')();
var libHttp = require('http').Server(libExpress);
var libSocketIO = require('socket.io')(libHttp);
var libNet = require('net');
var connCore = libNet.createConnection(3001, 'localhost');

// When a client connects via websocket
libSocketIO.on('connection', function(websocket) {
	// Broadcast to client console
	libSocketIO.emit('consoleMessage', 'Volumino: An MPD client connected');

	// When a client disconnects via websocket
	websocket.on('disconnect', function() {
		// Broadcast to client console
		libSocketIO.emit('consoleMessage', 'Volumino: An MPD client disconnected');
	});

	var nSlashLocation = 0;
	var sCommand = '';
	var sInterface = '';
	
	// When a command is sent over websocket
	websocket.on('command', function(sCommandString) {
		// Broadcast to client console
		libSocketIO.emit('consoleMessage', 'MPD Client: ' + sCommandString);

		// Route command to appropriate interface
		// nSlashLocation = sCommandString.indexOf('/');
		// sInterface = sCommandString.substring(0, nSlashLocation);
		// sCommand = sCommandString.substring(nSlashLocation + 1, sCommandString.length);
	});

});

// Set http server to listen for requests
libHttp.listen(6601, function() {
	console.log('MPD abstraction layer listening on localhost:6601...');

});
