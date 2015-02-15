var libQ = require('kew');

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

	// Start the Spotify controller
	// Move these variables out at some point
	var nSpotifyPort = 6602;
	var nSpotifyHost = 'localhost';
	this.controllerSpotify = new (require('../controllers/controller-spotify'))(nSpotifyHost, nSpotifyPort, this);

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

// Methods usually called by the State Machine --------------------------------------------------------------------

CoreCommandRouter.prototype.volumioPushState = function (state) {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::volumioPushState');
	var _this = this;

	// Announce new player state to each client interface
	return libQ.all(
		_this.arrayInterfaces.map(function (thisInterface) {
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

// Spotify Clear-Add-Play
CoreCommandRouter.prototype.spotifyClearAddPlayTracks = function (arrayTrackIds) {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::spotifyClearAddPlayTracks');
	return this.controllerSpotify.clearAddPlayTracks(arrayTrackIds)

}

// Spotify Stop
CoreCommandRouter.prototype.spotifyStop = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::spotifyStop');
	return this.controllerSpotify.stop();

}

// Spotify Pause
CoreCommandRouter.prototype.spotifyPause = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::spotifyPause');
	return this.controllerSpotify.pause();

}

// Spotify Resume
CoreCommandRouter.prototype.spotifyResume = function () {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::spotifyResume');
	return this.controllerSpotify.resume();

}

// Methods usually called by the service controllers --------------------------------------------------------------

CoreCommandRouter.prototype.mpdPushState = function (state) {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::mpdPushState');
	return this.stateMachine.syncStateFromMpd(state);

}

CoreCommandRouter.prototype.spotifyPushState = function (state) {

	console.log('[' + Date.now() + '] ' + 'CoreCommandRouter::spotifyPushState');
	return this.stateMachine.syncStateFromSpotify(state);

}

