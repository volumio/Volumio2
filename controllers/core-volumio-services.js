// author: HoochDeveloper

// this module will handle all the interfaces request, here will be set all the implementations to talk with the services.

// Daemon Controller Implementation for MPD
var mpdDaemonController = null;
// Daemon Controller Implementation for SPOP
var spopDaemonControlle = null;

// Dummy generic method for executing commands, need to be extended
function exectuteCommand(service,command,parametes){
	if(service == 'mpd'){
		console.log('Volumio Core - Executing MPD command ' + command);
		mpdDaemonController.sendCommand(command);
	}
}

// setter for the MPD Daemon Controller Implementation
function setMpdDaemonController(setMpdDaemonController){
	mpdDaemonController = setMpdDaemonController;
}

module.exports.setMpdDaemonController = setMpdDaemonController;
module.exports.executeCmd = exectuteCommand;