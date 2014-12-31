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
	// now the npm mpd module is used. the command callBack is passed from the caller, so it can handle the response in a proper way
	// TODO evaluate of this approach is needed
	client.sendCommand(cmd(command, []), commandCallback);
}

// all methods must be implemented here

// and exposed here
module.exports.init = initMpdDaemonController;
module.exports.sendCommand = sendSingleCommand2MPD;