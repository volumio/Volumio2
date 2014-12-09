// author: HoochDeveloper
// MPD daemon controller sketch
// this 
// accepts the socket connection to the mpd daemon to be initialized
var connMpdCommand = null;
var mpd = require('mpd');
var cmd = null;
var client = null;
function initMpdDaemonController(mpdPort,mpdHost){
	client = mpd.connect({
		port: mpdPort,
		host: mpdHost,
	});
	cmd = mpd.cmd;
}
// function for send command to MPD daemon
function sendSingleCommand2MPD(command,commandCallback) {
	// Foward the command to the Core (no editing needed)
	// Right now forwards it to MPD (localhost:6600)
//	console.log('MPD Daemon Controller - Executing command ' + command);
//	connMpdCommand.write(command + '\n');
	var result = 'Empty';
	client.sendCommand(cmd(command, []), commandCallback);
	return result;
}

// all methods must be implemented here

// and exposed here
module.exports.init = initMpdDaemonController;
module.exports.sendCommand = sendSingleCommand2MPD;