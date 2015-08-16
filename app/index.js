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

	self.pushConsoleMessage('Loading controllers...');
	self.loadControllers();

	self.pushConsoleMessage('Loading plugins...');
	self.loadPlugins();

	// Start the state machine
	self.stateMachine = new (require('./statemachine.js'))(self);

	// Start the music library
	self.musicLibrary = new (require('./musiclibrary.js'))(self);

	// Start the volume controller
	self.VolumeController = new (require('./volumecontrol.js'))(self);

	// Start the playlist FS
	self.playlistFS = new (require('./playlistfs.js'))(self);
}

CoreCommandRouter.prototype.loadControllers = function() {
	var self = this;

	self.controllers={};
	var controllerFolders=fs.readdirSync(__dirname+'/controllers');
	for(var i in controllerFolders) {
		var controllerInstance = new (require(__dirname+'/controllers/'+controllerName+'/index.js'))(self);

		var controllerName = controllerInstance.servicename;
		console.log("Initializing controller " + controllerName);

		self.controllers[controllerName] = controllerInstance;

		//Calling Methods needed on Volumio Start for controllers
		if(controllerInstance.onVolumioStart !=undefined)
			libFast.bind(controllerInstance.onVolumioStart, controllerInstance)();

	}
}

CoreCommandRouter.prototype.loadPlugins=function()
{
	var self = this;

	self.plugins={};

	var pluginsFolder=fs.readdirSync(__dirname+'/plugins');
	for(var i in pluginsFolder)
	{
		var category=pluginsFolder[i];
		self.pushConsoleMessage('Processing plugin category '+category);

		var categoryArray=[];
		self.plugins[category]={};

		var categoryFolder=fs.readdirSync(__dirname+'/plugins/'+category);
		for(var j in categoryFolder)
		{
			var pluginName=categoryFolder[j];

			self.pushConsoleMessage('Initializing plugin '+pluginName);

			var pluginInstance=new (require(__dirname+'/plugins/'+category+'/'+pluginName+'/index.js'))(self);
			self.plugins[category][pluginName]=pluginInstance;


			//Calling Methods needed on Volumio Start for plugins
			if(pluginInstance.onVolumioStart !=undefined)
				pluginInstance.onVolumioStart();

			//Calling Methods needed to initiate Plugins
			setTimeout(function () {
				if(pluginInstance.onStart !=undefined)
					pluginInstance.onStart();
			}, 1500)

		}
	}

	console.log(self.plugins);
}

CoreCommandRouter.prototype.getPlugin=function(category, name) {
	var self = this;

	if(self.plugins!=undefined && self.plugins[category]!=undefined && self.plugins[category][name]!=undefined)
	return self.plugins[category][name];
}

CoreCommandRouter.prototype.getController=function( name) {
	var self = this;

	if(self.controllers!=undefined && self.controllers[name]!=undefined)
		return self.controllers[name];
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

// Volumio Get Library Index
CoreCommandRouter.prototype.volumioGetLibraryIndex = function(sUid) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioGetLibraryIndex');

	return self.musicLibrary.getIndex(sUid);
}

// Volumio Browse Library
CoreCommandRouter.prototype.volumioGetLibraryListing = function(sUid, objOptions) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioGetLibraryListing');

	return self.musicLibrary.getListing(sUid, objOptions);
}

// Volumio Get Playlist Index
CoreCommandRouter.prototype.volumioGetPlaylistIndex = function(sUid) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioGetPlaylistIndex');

	return self.playlistFS.getIndex(sUid);
}

// Service Update Tracklist
CoreCommandRouter.prototype.serviceUpdateTracklist = function(sService) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::serviceUpdateTracklist');

	return self.getController(sService).rebuildTracklist();
}

// Start WirelessScan
CoreCommandRouter.prototype.volumiowirelessscan = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::StartWirelessScan');

	return self.getController('network').scanWirelessNetworks();
}

// Volumio Import Playlists
CoreCommandRouter.prototype.volumioImportServicePlaylists = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioImportServicePlaylists');

	return self.playlistFS.importServicePlaylists();
}

// Methods usually called by the State Machine --------------------------------------------------------------------

CoreCommandRouter.prototype.volumioPushState = function(state) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioPushState');

	// Announce new player state to each client interface
	return libQ.all(
		libFast.map(self.arrayInterfaces, function(thisInterface) {
			return thisInterface.pushState(state);
		})
	);
}

CoreCommandRouter.prototype.volumioPushQueue = function(queue) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioPushQueue');

	// Announce new player queue to each client interface
	return libQ.all(
		libFast.map(self.arrayInterfaces, function(thisInterface) {
			return thisInterface.pushQueue(queue);
		})
	);
}

// MPD Clear-Add-Play
CoreCommandRouter.prototype.serviceClearAddPlayTracks = function(arrayTrackIds, sService) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::serviceClearAddPlayTracks');

	return self.getController(sService).clearAddPlayTracks(arrayTrackIds)
}

// MPD Stop
CoreCommandRouter.prototype.serviceStop = function(sService) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::serviceStop');

	return self.getController(sService).stop();
}

// MPD Pause
CoreCommandRouter.prototype.servicePause = function(sService) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::servicePause');

	return self.getController(sService).pause();
}

// MPD Resume
CoreCommandRouter.prototype.serviceResume = function(sService) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::serviceResume');

	return self.getController(sService).resume();
}

// Methods usually called by the service controllers --------------------------------------------------------------

CoreCommandRouter.prototype.servicePushState = function(state, sService) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::servicePushState');

	return self.stateMachine.syncState(state, sService);
}

// Methods usually called by the music library ---------------------------------------------------------------------

// Get tracklists from all services and return them as an array
CoreCommandRouter.prototype.getAllTracklists = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::getAllTracklists');

	// This is the synchronous way to get libraries, which waits for each controller to return its library before continuing
	return libQ.all([self.getController('mpd').getTracklist(), self.getController('spop').getTracklist()]);
}

// Volumio Add Queue Items
CoreCommandRouter.prototype.addQueueItems = function(arrayItems) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioAddQueueItems');

	return self.stateMachine.addQueueItems(arrayItems);
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
		libFast.bind(curInterface.printConsoleMessage, curInterface)(sMessage);
	});
}
