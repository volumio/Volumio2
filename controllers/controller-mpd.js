var libMpd = require('mpd');
var libQ = require('q');

// Define the ControllerMpd class
module.exports = ControllerMpd;
function ControllerMpd (nPort, nHost, commandRouter) {

	// This fixed variable will let us refer to 'this' object at deeper scopes
	var _this = this;

	// Save a reference to the parent commandRouter
	this.commandRouter = commandRouter;

	// Connect to MPD
	this.clientMpd = libMpd.connect({port: nPort, host: nHost});

	// Make a promise for when the MPD connection is ready to receive events
	this.mpdReady = libQ.ninvoke(_this.clientMpd, 'on', 'ready');

	// When playback status changes
	this.clientMpd.on('system-player', function () {

		logStart('MPD announces state update')
			.then(_this.getState.bind(_this)) // Get the updated state
			.then(_this.pushState.bind(_this)) // then handle the updated state
			.catch(_this.pushError.bind(_this)) // ... or pass the error
			.done(logDone);

	})

	// Make a temporary track library for testing purposes
	this.library = new Object();
	this.library['aHR0cDovLzIzNjMubGl2ZS5zdHJlYW10aGV3b3JsZC5jb206ODAvS1VTQ01QMTI4X1ND'] = {service: 'mpd', trackid: 'aHR0cDovLzIzNjMubGl2ZS5zdHJlYW10aGV3b3JsZC5jb206ODAvS1VTQ01QMTI4X1ND', metadata: {title: 'KUSC Radio'}};
	this.library['aHR0cDovL3VrNC5pbnRlcm5ldC1yYWRpby5jb206MTU5Mzgv'] = {service: 'mpd', trackid: 'aHR0cDovL3VrNC5pbnRlcm5ldC1yYWRpby5jb206MTU5Mzgv', metadata: {title: 'Go Ham Radio'}};

}

// Public Methods ---------------------------------------------------------------------------------------
// These are 'this' aware, and return a promise

// Define a method to get the MPD state
ControllerMpd.prototype.getState = function () {

	console.log('ControllerMpd::getState');
	return this.sendMpdCommand('status', [])
		.then(function (sState) {
			return libQ(parseState).fcall(sState);

		});

}

// MPD get queue, returns array of strings, each representing the URI of a track
ControllerMpd.prototype.getQueue = function () {

	console.log('ControllerMpd::getQueue');
	return this.sendCommand('playlist', [])
		.then(function (sPlaylist) {
			return libQ(parsePlaylist).fcall(sPlaylist);

		});

}

// Define a method to clear, add, and play an array of tracks
ControllerMpd.prototype.clearAddPlayTracks = function (arrayTrackIds) {

	console.log('ControllerMpd::clearAddPlayTracks');
	var _this = this;

	// From the array of track IDs, get array of track URIs to play
	var arrayTrackUris = arrayTrackIds.map(function (curTrackId) {

		return convertTrackIdToUri(curTrackId);

	});

	// Clear the queue, add the first track, and start playback
	var promisedActions = this.sendMpdCommand('clear', [])
		.then(this.sendMpdCommand('add', [arrayTrackUris.shift()]))
		.then(this.sendMpdCommand('play', []));

	// If there are more tracks in the array, add those also
	if (arrayTrackUris.length > 0) {
		promisedActions = arrayTrackUris.reduce(function (previousPromise, curTrackUri) {
			return previousPromise
				.then(_this.sendMpdCommand('add', [curTrackUri]));

		}, promisedActions);

	}

	return promisedActions;

}

// MPD stop
ControllerMpd.prototype.stop = function () {

	console.log('ControllerMpd::stop');

	return this.sendMpdCommand('stop', []);

}

// Internal methods ---------------------------------------------------------------------------
// These are 'this' aware, and may or may not return a promise

// Announce updated MPD state
ControllerMpd.prototype.pushState = function (state) {

	console.log('ControllerMpd::pushState');

	return this.commandRouter.mpdPushState(state);

}

// Pass the error if we don't want to handle it
ControllerMpd.prototype.pushError = function (sReason) {

	console.log('ControllerMpd::pushError');
	console.log(sReason);

	// Return a resolved empty promise to represent completion
	return libQ();

}

// Define a general method for sending an MPD command, and return a promise for its execution
ControllerMpd.prototype.sendMpdCommand = function (sCommand, arrayParameters) {

	console.log('ControllerMpd::sendMpdCommand');
	var _this = this;

	return this.mpdReady
		.then(function () {
			return libQ.ninvoke(_this.clientMpd, 'sendCommand', libMpd.cmd(sCommand, arrayParameters));

		});

}

// Internal helper functions --------------------------------------------------------------------------
// These are static, and not 'this' aware

// Parse MPD's text playlist into a Volumio recognizable playlist object
function parsePlaylist (sPlaylist) {

	// Convert text playlist to object
	var objQueue = libMpd.parseKeyValueMessage(sPlaylist);

	// objQueue is in form {'0': 'file: http://uk4.internet-radio.com:15938/', '1': 'file: http://2363.live.streamtheworld.com:80/KUSCMP128_SC'}
	// We want to convert to a straight array of trackIds
	return Object.keys(objQueue)
		.map(function (currentKey) {
			return convertUriToTrackId(objQueue[currentKey]);

		});

}

// Parse MPD's text status into a Volumio recognizable status object
function parseState (sState) {

	var objState = libMpd.parseKeyValueMessage(sState);

	// Pull track duration out of status message
	var nDuration = 0;
	if ('time' in objState) {
		var arrayTimeData = objState.time.split(':');
		nDuration = Number(arrayTimeData[1]);

	}

	// Pull the elapsed time
	var nSeek = 0;
	if ('elapsed' in objState) {
		nSeek = Number(objState.elapsed) * 1000;

	}

	// Pull the queue position
	var nPosition = 0;
	if ('song' in objState) {
		nPosition = Number(objState.song);

	}

	return {
		status: objState.state,
		repeat: Number(objState.repeat),
		random: Number(objState.random),
		single: Number(objState.single),
		position: nPosition,
		seek: nSeek,
		duration: nDuration

	};

}

// Helper function to convert trackId to URI
function convertTrackIdToUri (input) {

	// Convert base64->utf8
	return (new Buffer(input, 'base64')).toString('utf8');

}

// Helper function to convert URI to trackId
function convertUriToTrackId (input) {

	// Convert utf8->base64
	return (new Buffer(input, 'utf8')).toString('base64');

}

function logDone () {

	console.log('------------------------------');
	return libQ();

}

function logStart (sCommand) {

	console.log('\n---------------------------- ' + sCommand);
	return libQ();

}
