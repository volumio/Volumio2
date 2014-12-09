// init the controller for the Volumio WebUI
// the module exports the initialization function who takes the socketIo already initialized and the VolumioCore
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
				volumioCore.executeCmd(sCommand,'',function(err, msg) {
				    if (err){ 
				    	console.log(err);
				    	libSocketIO.emit('consoleMessage', 'Volumio WebUI - An error as occurred while exectuing: ' + sCommand);
			    	}else{
					    console.log('Volumio WebUI - MPD Daemon CallBack, printing command output');
					    console.log(msg);
					    libSocketIO.emit('consoleMessage', 'Volumio WebUI - Success exectuing: ' + sCommand);
			    	}
				});
				
				
	
			} else if (sInterface == 'spop') {
				//connSpopInterface.write(sCommand);
	
			}
	
		});
	
	});
	
};