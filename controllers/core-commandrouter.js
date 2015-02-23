var libQ = require('kew');
var libFast = require('fast.js');

// Define the CoreCommandRouter class
module.exports = CoreCommandRouter;
function CoreCommandRouter (server) {

	// Start the state machine
	this.stateMachine = new (require('../controllers/core-statemachine'))(this);

	// Start the client interfaces
	this.arrayInterfaces = [];
	this.arrayInterfaces.push(new (require('../controllers/interface-webui.js'))(server, this));
	this.arrayInterfaces.push(new (require('../controllers/interface-mpd.js'))(server, this));

	// Start the MPD controller
	// Move these variables out at some point
	var nMpdPort = 6600;
	var nMpdHost = 'localhost';
	this.controllerMpd = new (require('../controllers/controller-mpd'))(nMpdHost, nMpdPort, this);

	// Start the Spop controller
	// Move these variables out at some point
	var nSpopPort = 6602;
	var nSpopHost = 'localhost';
	this.controllerSpop = new (require('../controllers/controller-spop'))(nSpopHost, nSpopPort, this);

	// Start the music library
	this.musicLibrary = new (require('../controllers/core-musiclibrary'))(this);

}

// Methods usually called by the Client Interfaces ----------------------------------------------------------------------------

// Volumio Play
CoreCommandRouter.prototype.volumioPlay = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioPlay');
	return this.stateMachine.play();

}

// Volumio Pause
CoreCommandRouter.prototype.volumioPause = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioPause');
	return this.stateMachine.pause();

}

// Volumio Stop
CoreCommandRouter.prototype.volumioStop = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioStop');
	return this.stateMachine.stop();

}

// Volumio Previous
CoreCommandRouter.prototype.volumioPrevious = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioPrevious');
	return this.stateMachine.previous();

}

// Volumio Next
CoreCommandRouter.prototype.volumioNext = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioNext');
	return this.stateMachine.next();

}

// Volumio Get State
CoreCommandRouter.prototype.volumioGetState = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioGetState');
	return this.stateMachine.getState();

}

// Volumio Get Queue
CoreCommandRouter.prototype.volumioGetQueue = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioGetQueue');
	return this.stateMachine.getQueue();

}

// Volumio Get Library (by title)
CoreCommandRouter.prototype.volumioGetLibraryByTitle = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioGetLibraryByTitle');
	return this.musicLibrary.getLibraryByTitle();

}

// Methods usually called by the State Machine --------------------------------------------------------------------

CoreCommandRouter.prototype.volumioPushState = function (state) {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioPushState');
	var _this = this;

	// Announce new player state to each client interface
	return libQ.all(
		libFast.map(_this.arrayInterfaces, function (thisInterface) {
			return thisInterface.volumioPushState(state);

		})

	);

}

// MPD Clear-Add-Play
CoreCommandRouter.prototype.mpdClearAddPlayTracks = function (arrayTrackIds) {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdClearAddPlayTracks');
	return this.controllerMpd.clearAddPlayTracks(arrayTrackIds)

}

// MPD Stop
CoreCommandRouter.prototype.mpdStop = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdStop');
	return this.controllerMpd.stop();

}

// MPD Pause
CoreCommandRouter.prototype.mpdPause = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdPause');
	return this.controllerMpd.pause();

}

// MPD Resume
CoreCommandRouter.prototype.mpdResume = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdResume');
	return this.controllerMpd.resume();

}

// Spop Clear-Add-Play
CoreCommandRouter.prototype.spopClearAddPlayTracks = function (arrayTrackIds) {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::spopClearAddPlayTracks');
	return this.controllerSpop.clearAddPlayTracks(arrayTrackIds)

}

// Spop Stop
CoreCommandRouter.prototype.spopStop = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::spopStop');
	return this.controllerSpop.stop();

}

// Spop Pause
CoreCommandRouter.prototype.spopPause = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::spopPause');
	return this.controllerSpop.pause();

}

// Spop Resume
CoreCommandRouter.prototype.spopResume = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::spopResume');
	return this.controllerSpop.resume();

}

// Methods usually called by the service controllers --------------------------------------------------------------

CoreCommandRouter.prototype.mpdPushState = function (state) {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdPushState');
	return this.stateMachine.syncStateFromMpd(state);

}

CoreCommandRouter.prototype.spopPushState = function (state) {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::spopPushState');
	return this.stateMachine.syncStateFromSpop(state);

}

// Methods usually called by the music library ---------------------------------------------------------------------

// Get libraries from all services and concatenate them together
CoreCommandRouter.prototype.getCombinedLibrary = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::getCombinedLibrary');

	// This is the synchronous way to get libraries, which waits for each controller to return its library before continuing
	return libQ.all([this.mpdGetLibrary(), this.spopGetLibrary()])
		.then(function (arrayLibraries) {
			return libQ.fcall(libFast.reduce, arrayLibraries, function (collectedLibraries, currentLibrary) {
				return libFast.concat(collectedLibraries, currentLibrary);

			}, []);

		});

}

CoreCommandRouter.prototype.mpdGetLibrary = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdGetLibrary');
	return this.controllerMpd.getLibrary();

}

CoreCommandRouter.prototype.spopGetLibrary = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::spopGetLibrary');
	return this.controllerSpop.getLibrary();

}
