// author: HoochDeveloper

// this module will handle all the interfaces request, here will be set all the implementations to talk with the services.

// Daemon Controller Implementation for MPD
var mpdDaemonController = null;
// Daemon Controller Implementation for SPOP
var spopDaemonControlle = null;

// Updated method signature, now this one require the command, some paramaters and the callBack in order to handle the from the caller the asynchronous result
// of the execution
function executeCommand(command,parametes,callBack){ 
	console.log('Volumio Core - Executing MPD command ' + command);
	mpdDaemonController.sendCommand(command,callBack);
}

// setter for the MPD Daemon Controller Implementation
function setMpdDaemonController(setMpdDaemonController){
	mpdDaemonController = setMpdDaemonController;
}

module.exports.setMpdDaemonController = setMpdDaemonController;
module.exports.executeCmd = executeCommand;