var libMpd = require('mpd');
var libQ = require('kew');

// Define the ControllerMpd class
module.exports = ControllerMpd;
function ControllerMpd (nHost, nPort, commandRouter) {

	// This fixed variable will let us refer to 'this' object at deeper scopes
	var _this = this;

	// Save a reference to the parent commandRouter
	this.commandRouter = commandRouter;

	// Connect to MPD
	this.clientMpd = libMpd.connect({port: nPort, host: nHost});

	// Make a promise for when the MPD connection is ready to receive events
	//this.mpdReady = libQ.ninvoke(_this.clientMpd, 'on', 'ready');
	this.mpdReady = libQ.nfcall(_this.clientMpd.on.bind(_this.clientMpd), 'ready');

	// When playback status changes
	this.clientMpd.on('system-player', function () {

		var timeStart = Date.now(); 
		logStart('MPD announces state update')
			.then(_this.getState.bind(_this))
			.then(_this.pushState.bind(_this))
			.fail(_this.pushError.bind(_this))
			.done(function () {
				return logDone(timeStart);

			});

	});

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
	console.log(Date.now());
	var _this = this;

	// From the array of track IDs, get array of track URIs to play
	var arrayTrackUris = arrayTrackIds.map(convertTrackIdToUri);

	// Clear the queue, add the first track, and start playback
	return this.sendMpdCommandArray([
		{command: 'clear', parameters: []},
		{command: 'add',   parameters: [arrayTrackUris.shift()]},
		{command: 'play',  parameters: []}

	])
	.then(function () {

		// If there are more tracks in the array, add those also
		if (arrayTrackUris.length > 0) {
			return _this.sendMpdCommandArray(
				arrayTrackUris.map(function (currentTrack) {
					return {command: 'add',   parameters: [currentTrack]};

				})

			);

		} else {
			return libQ.resolve();

		}

	});

}

// MPD stop
ControllerMpd.prototype.stop = function () {

	console.log('ControllerMpd::stop');
	console.log(Date.now());

	return this.sendMpdCommand('stop', []);

}

// MPD pause
ControllerMpd.prototype.pause = function () {

	console.log('ControllerMpd::pause');
	console.log(Date.now());

	return this.sendMpdCommand('pause', []);

}

// MPD resume
ControllerMpd.prototype.resume = function () {

	console.log('ControllerMpd::resume');
	console.log(Date.now());

	return this.sendMpdCommand('play', []);

}

// Internal methods ---------------------------------------------------------------------------
// These are 'this' aware, and may or may not return a promise

// Define a method to get the MPD state
ControllerMpd.prototype.getState = function () {

	console.log('ControllerMpd::getState');
	console.log(Date.now());
	var _this = this;
	var collectedState = {};

	return this.sendMpdCommand('status', [])
		.then(this.parseState)
		.then(function (state) {
			collectedState = state;
			return _this.sendMpdCommand('playlistinfo', [state.position]);

		})
		.then(this.parseTrackInfo)
		.then(function (trackinfo) {
			collectedState.dynamictitle = trackinfo.dynamictitle;
			return libQ.resolve(collectedState);

		});

}

// Announce updated MPD state
ControllerMpd.prototype.pushState = function (state) {

	console.log('ControllerMpd::pushState');
	console.log(Date.now());

	return this.commandRouter.mpdPushState(state);

}

// Pass the error if we don't want to handle it
ControllerMpd.prototype.pushError = function (sReason) {

	console.log('ControllerMpd::pushError');
	console.log(Date.now());
	console.log(sReason);

	// Return a resolved empty promise to represent completion
	return libQ.resolve();

}

// Define a general method for sending an MPD command, and return a promise for its execution
ControllerMpd.prototype.sendMpdCommand = function (sCommand, arrayParameters) {

	console.log('ControllerMpd::sendMpdCommand');
	console.log(Date.now());
	var _this = this;

	return this.mpdReady
		.then(function () {
			console.log(Date.now());
			//return libQ.ninvoke(_this.clientMpd, 'sendCommand', libMpd.cmd(sCommand, arrayParameters));
			return libQ.nfcall(_this.clientMpd.sendCommand.bind(_this.clientMpd), libMpd.cmd(sCommand, arrayParameters));

		})
		.then(function (response) {
			console.log(Date.now());
			return libMpd.parseKeyValueMessage.bind(libMpd)(response);

		});

}

// Define a general method for sending an array of MPD commands, and return a promise for its execution
// Command array takes the form [{command: sCommand, parameters: arrayParameters}, ...]
ControllerMpd.prototype.sendMpdCommandArray = function (arrayCommands) {

	console.log('ControllerMpd::sendMpdCommandArray');
	console.log(Date.now());
	var _this = this;

	return this.mpdReady
		.then(function () {
			//return libQ.ninvoke(_this.clientMpd, 'sendCommands',
			return libQ.nfcall(_this.clientMpd.sendCommands.bind(_this.clientMpd),
				arrayCommands.map(function (currentCommand) {
					return libMpd.cmd(currentCommand.command, currentCommand.parameters);

				})

			);

		})
		.then(libMpd.parseKeyValueMessage.bind(libMpd));

}

// Parse MPD's track info text into Volumio recognizable object
ControllerMpd.prototype.parseTrackInfo = function (objTrackInfo) {

	console.log('ControllerMpd::parseTrackInfo');
	console.log(Date.now());

	if ('Title' in objTrackInfo) {
		return libQ.resolve({dynamictitle: objTrackInfo.Title});

	} else {
		return libQ.resolve({dynamictitle: null});

	}

}

// Parse MPD's text playlist into a Volumio recognizable playlist object
ControllerMpd.prototype.parsePlaylist = function (objQueue) {

	console.log('ControllerMpd::parsePlaylist');
	console.log(Date.now());

	// objQueue is in form {'0': 'file: http://uk4.internet-radio.com:15938/', '1': 'file: http://2363.live.streamtheworld.com:80/KUSCMP128_SC'}
	// We want to convert to a straight array of trackIds
	return libQ.resolve(Object.keys(objQueue)
		.map(function (currentKey) {
			return convertUriToTrackId(objQueue[currentKey]);

		}));

}

// Parse MPD's text status into a Volumio recognizable status object
ControllerMpd.prototype.parseState = function (objState) {

	console.log('ControllerMpd::parseState');
	console.log(Date.now());

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

	var sStatus = null;
	if ('state' in objState) {
		sStatus = objState.state;

	}

	return libQ.resolve({
		status: sStatus,
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

function logDone (timeStart) {

	console.log('------------------------------ ' + (Date.now() - timeStart));
	return libQ.resolve();

}

function logStart (sCommand) {

	console.log('\n---------------------------- ' + sCommand);
	return libQ.resolve();

}
