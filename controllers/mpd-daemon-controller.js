// MPD daemon controller sketch
// this 
// accepts the socket connection to the mpd daemon to be initialized
var connMpdCommand = null;
function initMpdDaemonController(setConnMpdCommand){
	connMpdCommand = setConnMpdCommand;
}
// function for send command to MPD daemon
function sendSingleCommand2MPD(command) {
	// Foward the command to the Core (no editing needed)
	// Right now forwards it to MPD (localhost:6600)
	console.log('MPD Daemon Controller - Executing command ' + command);
	connMpdCommand.write(command + '\n');
}

// all methods must be implemented here

// and exposed here
module.exports.init = initMpdDaemonController;
module.exports.sendCommand = sendSingleCommand2MPD;