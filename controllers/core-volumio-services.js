var mpdDaemonController = null;
var spopDaemonControlle = null;

function exectuteCommand(service,command,parametes){
	if(service == 'mpd'){
		console.log('Volumio Core - Executing MPD command ' + command);
		mpdDaemonController.sendCommand(command);
	}
}

function setMpdDaemonController(setMpdDaemonController){
	mpdDaemonController = setMpdDaemonController;
}

module.exports.setMpdDaemonController = setMpdDaemonController;
module.exports.executeCmd = exectuteCommand;