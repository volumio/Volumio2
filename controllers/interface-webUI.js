// init the controller for the Volumio WebUI
// the module exports the initializaztion function who takes the socketIo already initialized and the mpd command interface
module.exports = function(libSocketIO,volumioCore){
	//Socket IO config
	libSocketIO.on('connection', function(websocket) {
		// Broadcast to client console
		libSocketIO.emit('consoleMessage', 'Volumino: A client connected');
		// When a client disconnects via websocket
		websocket.on('disconnect', function() {
			// Broadcast to client console
			libSocketIO.emit('consoleMessage', 'Volumino: A client disconnected');
	
		});
		//  init parsing command attributes
		var nSlashLocation = 0;
		var sCommand = '';
		var sInterface = '';
		// When a command is sent over websocket
		websocket.on('command', function(sCommandString) {
			// Broadcast to client console
			libSocketIO.emit('consoleMessage', 'Client: ' + sCommandString);
	
			// Route command to appropriate interface, based on the convention <service>/<command>
			nSlashLocation = sCommandString.indexOf('/');
			sInterface = sCommandString.substring(0, nSlashLocation);
			sCommand = sCommandString.substring(nSlashLocation + 1, sCommandString.length);
			if (sInterface == 'mpd') {
//				connMpdInterface.write(sCommand);
				volumioCore.executeCmd('mpd',sCommand,'');;//sendCommand(sCommand);
				libSocketIO.emit('consoleMessage', 'MPD Interface: ' + sCommand);
	
			} else if (sInterface == 'spop') {
				//connSpopInterface.write(sCommand);
	
			}
	
		});
	
	});
	
//	connMpdInterface.on('data', function(response) {
//		// Broadcast to client console
//		libSocketIO.emit('consoleMessage', 'MPD Interface: ' + response.toString());
//	
//	});
};