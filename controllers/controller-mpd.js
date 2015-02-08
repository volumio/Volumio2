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

		_this.pushState()
			.catch(_this.pushError.bind(_this))

	})

	// Make a temporary track library for testing purposes
	this.library = new Object();
	this.library['aHR0cDovLzIzNjMubGl2ZS5zdHJlYW10aGV3b3JsZC5jb206ODAvS1VTQ01QMTI4X1ND'] = {service: 'mpd', trackid: 'aHR0cDovLzIzNjMubGl2ZS5zdHJlYW10aGV3b3JsZC5jb206ODAvS1VTQ01QMTI4X1ND', metadata: {title: 'KUSC Radio'}};
	this.library['aHR0cDovL3VrNC5pbnRlcm5ldC1yYWRpby5jb206MTU5Mzgv'] = {service: 'mpd', trackid: 'aHR0cDovL3VrNC5pbnRlcm5ldC1yYWRpby5jb206MTU5Mzgv', metadata: {title: 'Go Ham Radio'}};

}

// Public Methods ---------------------------------------------------------------------------------------
// These are 'this' aware, and return a promise

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
		.then(_this.sendMpdCommand('add', [arrayTrackUris.shift()]))
		.then(_this.sendMpdCommand('play', []));

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

// MPD pause
ControllerMpd.prototype.pause = function () {

	console.log('ControllerMpd::pause');

	return this.sendMpdCommand('pause', []);

}

// MPD resume
ControllerMpd.prototype.resume = function () {

	console.log('ControllerMpd::resume');

	return this.sendMpdCommand('play', []);

}

// Internal methods ---------------------------------------------------------------------------
// These are 'this' aware, and may or may not return a promise

// Define a method to get the MPD state
ControllerMpd.prototype.getState = function () {

	console.log('ControllerMpd::getState');
	var _this = this;
	var collectedState = {};

	return this.sendMpdCommand('status', [])
		.then(_this.parseState.bind(_this))
		.then(function (state) {
			collectedState = state;
			return _this.sendMpdCommand('playlistinfo', [state.position]);

		})
		.then(_this.parseTrackInfo.bind(_this))
		.then(function (trackinfo) {
			collectedState.dynamictitle = trackinfo.dynamictitle;
			return libQ(collectedState);

		});

}

// Announce updated MPD state
ControllerMpd.prototype.pushState = function () {

	console.log('ControllerMpd::pushState');
	var _this = this;

	return logStart('MPD announces state update')
		.then(_this.getState.bind(_this))
		.then(_this.commandRouter.mpdPushState.bind(_this.commandRouter))
		.then(logDone);

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

		})
		.then(libMpd.parseKeyValueMessage.bind(libMpd));

}

// Parse MPD's track info text into Volumio recognizable object
ControllerMpd.prototype.parseTrackInfo = function (objTrackInfo) {

	console.log('ControllerMpd::parseTrackInfo');

	if ('Title' in objTrackInfo) {
		return libQ({dynamictitle: objTrackInfo.Title});

	} else {
		return libQ({dynamictitle: null});

	}

}

// Parse MPD's text playlist into a Volumio recognizable playlist object
ControllerMpd.prototype.parsePlaylist = function (objQueue) {

	console.log('ControllerMpd::parsePlaylist');

	// objQueue is in form {'0': 'file: http://uk4.internet-radio.com:15938/', '1': 'file: http://2363.live.streamtheworld.com:80/KUSCMP128_SC'}
	// We want to convert to a straight array of trackIds
	return libQ(Object.keys(objQueue)
		.map(function (currentKey) {
			return convertUriToTrackId(objQueue[currentKey]);

		}));

}

// Parse MPD's text status into a Volumio recognizable status object
ControllerMpd.prototype.parseState = function (objState) {

	console.log('ControllerMpd::parseState');

	// Pull track duration out of status message
	var nDuration = null;
	if ('time' in objState) {
		var arrayTimeData = objState.time.split(':');
		nDuration = Math.round(Number(arrayTimeData[1]));

	}

	// Pull the elapsed time
	var nSeek = null;
	if ('elapsed' in objState) {
		nSeek = Math.round(Number(objState.elapsed) * 1000);

	}

	// Pull the queue position of the current track
	var nPosition = null;
	if ('song' in objState) {
		nPosition = Number(objState.song);

	}

	// Pull audio metrics
	var nBitDepth = null;
	var nSampleRate = null;
	var nChannels = null;
	if ('audio' in objState) {
		var objMetrics = objState.audio.split(':');
		nSampleRate = Number(objMetrics[0]);
		nBitDepth = Number(objMetrics[1]);
		nChannels = Number(objMetrics[2]);

	}

	return libQ({
		status: objState.state,
		position: nPosition,
		seek: nSeek,
		duration: nDuration,
		samplerate: nSampleRate,
		bitdepth: nBitDepth,
		channels: nChannels

	});

}

// Internal helper functions --------------------------------------------------------------------------
// These are static, and not 'this' aware

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
