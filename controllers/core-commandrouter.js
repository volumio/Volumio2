var libQ = require('kew');
var libFast = require('fast.js');

// Define the CoreCommandRouter class
module.exports = CoreCommandRouter;
function CoreCommandRouter (server) {
	// This fixed variable will let us refer to 'this' object at deeper scopes
	var self = this;

	// Start the state machine
	self.stateMachine = new (require('../controllers/core-statemachine'))(this);

	// Start the client interfaces
	self.arrayInterfaces = [];
	self.arrayInterfaces.push(new (require('../controllers/interface-webui.js'))(server, this));
	self.arrayInterfaces.push(new (require('../controllers/interface-mpd.js'))(server, this));

	// Start the MPD controller
	// Move these variables out at some point
	var nMpdPort = 6600;
	var nMpdHost = 'localhost';
	self.controllerMpd = new (require('../controllers/controller-mpd'))(nMpdHost, nMpdPort, this);

	// Start the Spop controller
	// Move these variables out at some point
	var nSpopPort = 6602;
	var nSpopHost = 'localhost';
	self.controllerSpop = new (require('../controllers/controller-spop'))(nSpopHost, nSpopPort, this);

	// Start the music library
	self.musicLibrary = new (require('../controllers/core-musiclibrary'))(this);
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

// Volumio Get Queue
CoreCommandRouter.prototype.volumioRemoveQueueItem = function(nIndex) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioRemoveQueueItem');

	return self.stateMachine.removeQueueItem(nIndex);
}

// Volumio Rebuild Library
CoreCommandRouter.prototype.volumioRebuildLibrary = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioRebuildLibrary');

	return self.musicLibrary.rebuildLibrary();
}

// Volumio Browse Library
CoreCommandRouter.prototype.volumioBrowseLibrary = function(sUid, sSortBy, nEntries, nOffset) {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioBrowseLibrary(' + sUid + ', ' + sSortBy + ', ' + nEntries + ', ' + nOffset + ')');

	return self.musicLibrary.browseLibrary(sUid, sSortBy, nEntries, nOffset);
}

// Spop Update Tracklist
CoreCommandRouter.prototype.spopUpdateTracklist = function() {
	var self = this;
	self.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreCommandRouter::spopUpdateTracklist');

	return self.controllerSpop.rebuildTracklist();
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

// Utility functions ---------------------------------------------------------------------------------------------

CoreCommandRouter.prototype.pushConsoleMessage = function(sMessage) {
	var self = this;
	console.log(sMessage);

	libFast.map(self.arrayInterfaces, function(curInterface) {
		libFast.bind(curInterface.printConsoleMessage, curInterface)(sMessage);
	})
}
