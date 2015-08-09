var libQ = require('kew');
var libFast = require('fast.js');
var fs=require('fs-extra');

// Define the CoreCommandRouter class
module.exports = CoreCommandRouter;
function CoreCommandRouter (server) {
	// This fixed variable will let us refer to 'this' object at deeper scopes
	var self = this;

	// Start the client interfaces
	self.arrayInterfaces = [];
	self.arrayInterfaces.push(new (require('./interfaces/websocket/index.js'))(server, self));
	self.arrayInterfaces.push(new (require('./interfaces/mpdemulation/index.js'))(server, self));

	self.pushConsoleMessage('[' + Date.now() + '] ' +'Loading controllers...');
	self.loadControllers();

	self.pushConsoleMessage('[' + Date.now() + '] ' +'Loading plugins...');
	self.pluginManager=new (require(__dirname+'/pluginsManager.js'))(self);
	self.pluginManager.loadPlugins();
	self.pluginManager.onVolumioStart();
	self.pluginManager.startPlugins();

	// Start the state machine
	self.stateMachine = new (require('./statemachine.js'))(self);

	// Start the music library
	self.musicLibrary = new (require('./musiclibrary.js'))(self);

	// Start the volume controller
	self.VolumeController = new (require('./volumecontrol.js'))(self);

	// Start the playlist manager
	self.playlistManager = new (require('./playlistmanager.js'))(self);
}

CoreCommandRouter.prototype.loadControllers=function()
{
	var self = this;

	self['controllers']={};

	var controllerFolders=fs.readdirSync(__dirname+'/controllers');
	for(var i in controllerFolders)
	{
		var controllerName=controllerFolders[i];
		console.log("Initializing controller "+controllerName);

		var controllerInstance=new (require(__dirname+'/controllers/'+controllerName+'/index.js'))(self);
		self['controllers'][controllerName]=controllerInstance;

		//Calling Methods needed on Volumio Start for controllers
		if(controllerInstance.onVolumioStart !=undefined)
			libFast.bind(controllerInstance.onVolumioStart, controllerInstance)();

		setTimeout(function () {
		//Calling Methods needed to initiate Controllers
			if(controllerInstance.onStart !=undefined)
				return libFast.bind(controllerInstance.onStart, controllerInstance)();
		}, 1500)


	}
}

CoreCommandRouter.prototype.getPlugin=function(category, name) {
	var self = this;

	if(self['plugins']!=undefined && self['plugins'][category]!=undefined && self['plugins'][category][name]!=undefined)
	return self['plugins'][category][name];
}

CoreCommandRouter.prototype.getController=function( name) {
	var self = this;

	if(self['controllers']!=undefined && self['controllers'][name]!=undefined)
		return self['controllers'][name];
}

CoreCommandRouter.prototype.capitalizeFirstLetter=function(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}



// Methods usually called by the Client Interfaces ----------------------------------------------------------------------------

// Volumio Play
CoreCommandRouter.prototype.volumioPlay = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioPlay');

	return self.stateMachine.play();
}

// Volumio Pause
CoreCommandRouter.prototype.volumioPause = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioPause');

	return self.stateMachine.pause();
}

// Volumio Stop
CoreCommandRouter.prototype.volumioStop = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioStop');

	return self.stateMachine.stop();
}

// Volumio Previous
CoreCommandRouter.prototype.volumioPrevious = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioPrevious');

	return self.stateMachine.previous();
}

// Volumio Next
CoreCommandRouter.prototype.volumioNext = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioNext');

	return self.stateMachine.next();
}

// Volumio Get State
CoreCommandRouter.prototype.volumioGetState = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioGetState');

	return self.stateMachine.getState();
}

// Volumio Get Queue
CoreCommandRouter.prototype.volumioGetQueue = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioGetQueue');

	return self.stateMachine.getQueue();
}

// Volumio Remove Queue Item
CoreCommandRouter.prototype.volumioRemoveQueueItem = function(nIndex) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioRemoveQueueItem');

	return self.stateMachine.removeQueueItem(nIndex);
}

// Volumio Set Volume
CoreCommandRouter.prototype.volumiosetvolume = function(VolumeInteger) {
	var self = this;
	return self.VolumeController.alsavolume(VolumeInteger);
}

// Volumio Update Volume
CoreCommandRouter.prototype.volumioupdatevolume = function(vol) {
	var self = this;
	return self.stateMachine.updateVolume(vol);
}

// Volumio Retrieve Volume
CoreCommandRouter.prototype.volumioretrievevolume = function(vol) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioRetrievevolume');

	return self.VolumeController.retrievevolume();
}

// Volumio Add Queue Uids
CoreCommandRouter.prototype.volumioAddQueueUids = function(arrayUids) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioAddQueueUids');

	return self.musicLibrary.addQueueUids(arrayUids);
}

// Volumio Rebuild Library
CoreCommandRouter.prototype.volumioRebuildLibrary = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioRebuildLibrary');

	return self.musicLibrary.buildLibrary();
}

// Volumio Browse Library
CoreCommandRouter.prototype.volumioBrowseLibrary = function(objBrowseParameters) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioBrowseLibrary(' + JSON.stringify(objBrowseParameters) + ')');

	return self.musicLibrary.browseLibrary(objBrowseParameters);
}

// Spop Update Tracklist
CoreCommandRouter.prototype.spopUpdateTracklist = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::spopUpdateTracklist');

	return self.pluginManager.getPlugin('music_services','spop').rebuildTracklist();
}

// Start WirelessScan
CoreCommandRouter.prototype.volumiowirelessscan = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::StartWirelessScan');

	return self.getController('network').scanWirelessNetworks();
}

// Push WirelessScan Results (TODO SEND VIA WS)
CoreCommandRouter.prototype.volumiopushwirelessnetworks = function(results) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + results);
}
// Volumio Import Playlists
CoreCommandRouter.prototype.volumioImportServicePlaylists = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioImportServicePlaylists');

	return self.playlistManager.importServicePlaylists();
}

// Methods usually called by the State Machine --------------------------------------------------------------------

CoreCommandRouter.prototype.volumioPushState = function(state) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioPushState');

	// Announce new player state to each client interface
	return libQ.all(
		libFast.map(self.arrayInterfaces, function(thisInterface) {
			return thisInterface.volumioPushState(state);
		})
	);
}

CoreCommandRouter.prototype.volumioPushQueue = function(queue) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioPushQueue');

	// Announce new player queue to each client interface
	return libQ.all(
		libFast.map(self.arrayInterfaces, function(thisInterface) {
			return thisInterface.volumioPushQueue(queue);
		})
	);
}

// MPD Clear-Add-Play
CoreCommandRouter.prototype.mpdClearAddPlayTracks = function(arrayTrackIds) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdClearAddPlayTracks');

	return self.getController('mpd').clearAddPlayTracks(arrayTrackIds)
}

// MPD Stop
CoreCommandRouter.prototype.mpdStop = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdStop');

	return self.getController('mpd').stop();
}

// MPD Pause
CoreCommandRouter.prototype.mpdPause = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdPause');

	return self.getController('mpd').pause();
}

// MPD Resume
CoreCommandRouter.prototype.mpdResume = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdResume');

	return self.getController('mpd').resume();
}

// Spop Clear-Add-Play
CoreCommandRouter.prototype.spopClearAddPlayTracks = function(arrayTrackIds) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::spopClearAddPlayTracks');

	return self.pluginManager.getPlugin('music_services','spop').clearAddPlayTracks(arrayTrackIds)
}

// Spop Stop
CoreCommandRouter.prototype.spopStop = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::spopStop');

	return self.pluginManager.getPlugin('music_services','spop').stop();
}

// Spop Pause
CoreCommandRouter.prototype.spopPause = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::spopPause');

	return self.pluginManager.getPlugin('music_services','spop').pause();
}

// Spop Resume
CoreCommandRouter.prototype.spopResume = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::spopResume');

	return self.pluginManager.getPlugin('music_services','spop').resume();
}

// Methods usually called by the service controllers --------------------------------------------------------------

CoreCommandRouter.prototype.mpdPushState = function(state) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdPushState');

	return self.stateMachine.syncStateFromMpd(state);
}

CoreCommandRouter.prototype.spopPushState = function(state) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::spopPushState');

	return self.stateMachine.syncStateFromSpop(state);
}

// Methods usually called by the music library ---------------------------------------------------------------------

// Get tracklists from all services and return them as an array
CoreCommandRouter.prototype.getAllTracklists = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::getAllTracklists');

	// This is the synchronous way to get libraries, which waits for each controller to return its library before continuing
	return libQ.all([self.getController('mpd').getTracklist(), self.pluginManager.getPlugin('music_services','spop').getTracklist()]);
}

// Volumio Add Queue Items
CoreCommandRouter.prototype.addQueueItems = function(arrayItems) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioAddQueueItems');

	return self.stateMachine.addQueueItems(arrayItems);
}

CoreCommandRouter.prototype.executeOnController = function(name,method,data) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::executeOnController');

	var obj=self['controllers'][name];
	return libFast.bind(obj[method],obj)(data);
}

CoreCommandRouter.prototype.executeOnPlugin = function(name,method,data) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::executeOnPlugin');

	var obj=self.getController(name);

	return libFast.bind(obj[method],obj)(data);
}


CoreCommandRouter.prototype.getUIConfigOnController = function(name,data) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::executeOnController');

	var obj=self['controllers'][name];
	return libFast.bind(obj['getUIConfig'],obj)(data);
}

CoreCommandRouter.prototype.getUIConfigOnPlugin = function(name,data) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::executeOnPlugin');

	var obj=self.getController(name);

	return libFast.bind(obj['getUIConfig'],obj)(data);
}

CoreCommandRouter.prototype.getConfiguration=function(componentCode)
{
	console.log("_________ "+componentCode);
}

// Utility functions ---------------------------------------------------------------------------------------------

CoreCommandRouter.prototype.pushConsoleMessage = function(sMessage) {
	var self = this;
	console.log(sMessage);

	libFast.map(self.arrayInterfaces, function(curInterface) {
		if(curInterface.notifyUser!=undefined)
			libFast.bind(curInterface.printConsoleMessage, curInterface)(sMessage);
	})
}

CoreCommandRouter.prototype.pushInfoToastMessage = function(title,message) {
	var self = this;

	libFast.map(self.arrayInterfaces, function(curInterface) {
		if(curInterface.notifyUser!=undefined)
			libFast.bind(curInterface.notifyUser, curInterface)('info',title,message);
	});
}

CoreCommandRouter.prototype.pushSuccessToastMessage = function(title,message) {
	var self = this;

	libFast.map(self.arrayInterfaces, function(curInterface) {
		if(curInterface.notifyUser!=undefined)
			libFast.bind(curInterface.notifyUser, curInterface)('success',title,message);
	});
}

CoreCommandRouter.prototype.pushErrorToastMessage = function(title,message) {
	var self = this;

	libFast.map(self.arrayInterfaces, function(curInterface) {
		if(curInterface.notifyUser!=undefined)
			libFast.bind(curInterface.notifyUser, curInterface)('error',title,message);
	});
}

CoreCommandRouter.prototype.pushWarningToastMessage = function(title,message) {
	var self = this;

	libFast.map(self.arrayInterfaces, function(curInterface) {
		if(curInterface.notifyUser!=undefined)
			libFast.bind(curInterface.notifyUser, curInterface)('warning',title,message);
	});
}