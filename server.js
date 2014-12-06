var libExpress = require('express')();
var libHttp = require('http').Server(libExpress);
var libSocketIO = require('socket.io')(libHttp);
var libNet = require('net');
var connMpdInterface = libNet.createConnection(6500, 'localhost');
//var connSpopInterface = libNet.createConnection(6502, 'localhost');

// When an http get request occurs
libExpress.get('/', function(req, res) {
	// Send the requestor a copy of 'player.html'
	res.sendFile('player.html', { root: __dirname });

});

// When a client connects via websocket
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

// When Spop interface gives a message
/*
connSpopInterface.on('data', function(response) {
	// Broadcast to client console
	libSocketIO.emit('consoleMessage', 'Spop Interface: ' + response.toString());

});*/

// When MPD interface gives a message
connMpdInterface.on('data', function(response) {
	// Broadcast to client console
	libSocketIO.emit('consoleMessage', 'MPD Interface: ' + response.toString());

});

// Set http server to listen for requests
libHttp.listen(3001, function() {
	console.log('Volumino server listening on localhost:3001...');

});

