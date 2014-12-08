var server = require('../server');
var libSocketIO = require('socket.io')(server.server);
//When MPD interface gives a message
var libNet = require('net');
var connMpdInterface = libNet.createConnection(6500, 'localhost');
var q = require('q');

//Socket IO config

libSocketIO.on('connection', function(websocket) {
	// Broadcast to client console
	libSocketIO.emit('consoleMessage', 'Volumino: A client connected');

	// When a client disconnects via websocket
	websocket.on('disconnect', function() {
		// Broadcast to client console
		libSocketIO.emit('consoleMessage', 'Volumino: A client disconnected');

	});

	var nSlashLocation = 0;
	var sCommand = '';
	var sInterface = '';
	// When a command is sent over websocket
	websocket.on('command', function(sCommandString) {
		// Broadcast to client console
		libSocketIO.emit('consoleMessage', 'Client: ' + sCommandString);

		// Route command to appropriate interface
		nSlashLocation = sCommandString.indexOf('/');
		sInterface = sCommandString.substring(0, nSlashLocation);
		sCommand = sCommandString.substring(nSlashLocation + 1, sCommandString.length);

		if (sInterface == 'mpd') {
			connMpdInterface.write(sCommand);

		} else if (sInterface == 'spop') {
			//connSpopInterface.write(sCommand);

		}

	});

});


connMpdInterface.on('data', function(response) {
	// Broadcast to client console
	libSocketIO.emit('consoleMessage', 'MPD Interface: ' + response.toString());

});