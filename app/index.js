var libQ = require('kew');
var libFast = require('fast.js');

// Define the CoreCommandRouter class
module.exports = CoreCommandRouter;
function CoreCommandRouter (server) {
	// This fixed variable will let us refer to 'this' object at deeper scopes
	var self = this;

	// Start the state machine
	self.stateMachine = new (require('./statemachine.js'))(self);

	// Start the client interfaces
	self.arrayInterfaces = [];
	self.arrayInterfaces.push(new (require('./interfaces/websocket/index.js'))(server, self));
	self.arrayInterfaces.push(new (require('./interfaces/mpdemulation/index.js'))(server, self));

	// Start the MPD controller
	// Move these variables out at some point
	var nMpdPort = 6600;
	var nMpdHost = 'localhost';
	self.controllerMpd = new (require('./controllers/mpd/index.js'))(nMpdHost, nMpdPort, self);

	// Start the Spop controller
	// Move these variables out at some point
	var nSpopPort = 6602;
	var nSpopHost = 'localhost';
	self.controllerSpop = new (require('./controllers/spop/index.js'))(nSpopHost, nSpopPort, self);

	// Start the music library
	self.musicLibrary = new (require('./musiclibrary.js'))(self);

	// Start the volume controller
	self.VolumeController = new (require('./volumecontrol.js'))(self);

	// Start the playlist manager
	self.playlistManager = new (require('./playlistmanager.js'))(self);
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
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumiosetvolume' + VolumeInteger);

	return self.VolumeController.alsavolume(VolumeInteger);
}

// Volumio Update Volume
CoreCommandRouter.prototype.volumioupdatevolume = function(vol) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioupdatevolume' + vol);

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

	return self.controllerSpop.rebuildTracklist();
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

	return self.controllerMpd.clearAddPlayTracks(arrayTrackIds)
}

// MPD Stop
CoreCommandRouter.prototype.mpdStop = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdStop');

	return self.controllerMpd.stop();
}

// MPD Pause
CoreCommandRouter.prototype.mpdPause = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdPause');

	return self.controllerMpd.pause();
}

// MPD Resume
CoreCommandRouter.prototype.mpdResume = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdResume');

	return self.controllerMpd.resume();
}

// Spop Clear-Add-Play
CoreCommandRouter.prototype.spopClearAddPlayTracks = function(arrayTrackIds) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::spopClearAddPlayTracks');

	return self.controllerSpop.clearAddPlayTracks(arrayTrackIds)
}

// Spop Stop
CoreCommandRouter.prototype.spopStop = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::spopStop');

	return self.controllerSpop.stop();
}

// Spop Pause
CoreCommandRouter.prototype.spopPause = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::spopPause');

	return self.controllerSpop.pause();
}

// Spop Resume
CoreCommandRouter.prototype.spopResume = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::spopResume');

	return self.controllerSpop.resume();
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
	return libQ.all([self.controllerMpd.getTracklist(), self.controllerSpop.getTracklist()]);
}

// Volumio Add Queue Items
CoreCommandRouter.prototype.addQueueItems = function(arrayItems) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioAddQueueItems');

	return self.stateMachine.addQueueItems(arrayItems);
}

// Utility functions ---------------------------------------------------------------------------------------------

CoreCommandRouter.prototype.pushConsoleMessage = function(sMessage) {
	var self = this;
	console.log(sMessage);

	libFast.map(self.arrayInterfaces, function(curInterface) {
		libFast.bind(curInterface.printConsoleMessage, curInterface)(sMessage);
	})
}
