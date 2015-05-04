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
CoreCommandRouter.prototype.volumioPlay = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioPlay');
	var self = this;

	return self.stateMachine.play();

}

// Volumio Pause
CoreCommandRouter.prototype.volumioPause = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioPause');
	var self = this;

	return self.stateMachine.pause();

}

// Volumio Stop
CoreCommandRouter.prototype.volumioStop = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioStop');
	var self = this;

	return self.stateMachine.stop();

}

// Volumio Previous
CoreCommandRouter.prototype.volumioPrevious = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioPrevious');
	var self = this;

	return self.stateMachine.previous();

}

// Volumio Next
CoreCommandRouter.prototype.volumioNext = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioNext');
	var self = this;

	return self.stateMachine.next();

}

// Volumio Get State
CoreCommandRouter.prototype.volumioGetState = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioGetState');
	var self = this;

	return self.stateMachine.getState();

}

// Volumio Get Queue
CoreCommandRouter.prototype.volumioGetQueue = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioGetQueue');
	var self = this;

	return self.stateMachine.getQueue();

}

// Volumio Rebuild Library
CoreCommandRouter.prototype.volumioRebuildLibrary = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioRebuildLibrary');
	var self = this;

	return self.musicLibrary.rebuildLibrary();

}

// Volumio Browse Library
CoreCommandRouter.prototype.volumioBrowseLibrary = function (sId) {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioBrowseLibrary(' + sId + ')');
	var self = this;

	return self.musicLibrary.browseLibrary(sId);

}

// Spop Update Tracklist
CoreCommandRouter.prototype.spopUpdateTracklist = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::spopUpdateTracklist');
	var self = this;

	return self.controllerSpop.rebuildTracklist();

}

// Methods usually called by the State Machine --------------------------------------------------------------------

CoreCommandRouter.prototype.volumioPushState = function (state) {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioPushState');
	var self = this;

	// Announce new player state to each client interface
	return libQ.all(
		libFast.map(self.arrayInterfaces, function (thisInterface) {
			return thisInterface.volumioPushState(state);

		})

	);

}

// MPD Clear-Add-Play
CoreCommandRouter.prototype.mpdClearAddPlayTracks = function (arrayTrackIds) {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdClearAddPlayTracks');
	var self = this;

	return self.controllerMpd.clearAddPlayTracks(arrayTrackIds)

}

// MPD Stop
CoreCommandRouter.prototype.mpdStop = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdStop');
	var self = this;

	return self.controllerMpd.stop();

}

// MPD Pause
CoreCommandRouter.prototype.mpdPause = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdPause');
	var self = this;

	return self.controllerMpd.pause();

}

// MPD Resume
CoreCommandRouter.prototype.mpdResume = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdResume');
	var self = this;

	return self.controllerMpd.resume();

}

// Spop Clear-Add-Play
CoreCommandRouter.prototype.spopClearAddPlayTracks = function (arrayTrackIds) {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::spopClearAddPlayTracks');
	var self = this;

	return self.controllerSpop.clearAddPlayTracks(arrayTrackIds)

}

// Spop Stop
CoreCommandRouter.prototype.spopStop = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::spopStop');
	var self = this;

	return self.controllerSpop.stop();

}

// Spop Pause
CoreCommandRouter.prototype.spopPause = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::spopPause');
	var self = this;

	return self.controllerSpop.pause();

}

// Spop Resume
CoreCommandRouter.prototype.spopResume = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::spopResume');
	var self = this;

	return self.controllerSpop.resume();

}

// Methods usually called by the service controllers --------------------------------------------------------------

CoreCommandRouter.prototype.mpdPushState = function (state) {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdPushState');
	var self = this;

	return self.stateMachine.syncStateFromMpd(state);

}

CoreCommandRouter.prototype.spopPushState = function (state) {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::spopPushState');
	var self = this;

	return self.stateMachine.syncStateFromSpop(state);

}

// Methods usually called by the music library ---------------------------------------------------------------------

// Get tracklists from all services and return them as an array
CoreCommandRouter.prototype.getAllTracklists = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::getAllTracklists');
	var self = this;

	// This is the synchronous way to get libraries, which waits for each controller to return its library before continuing
	return libQ.all([self.controllerMpd.getTracklist(), self.controllerSpop.getTracklist()]);

}

