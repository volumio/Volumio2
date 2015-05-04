var libMpd = require('mpd');
var libQ = require('kew');
var libFast = require('fast.js');
var libRandomString = require('random-string'); // for testing purposes

// Define the ControllerMpd class
module.exports = ControllerMpd;
function ControllerMpd (nHost, nPort, commandRouter) {

	// This fixed variable will let us refer to 'this' object at deeper scopes
	var self = this;

	// Save a reference to the parent commandRouter
	this.commandRouter = commandRouter;

	// Connect to MPD
	this.clientMpd = libMpd.connect({port: nPort, host: nHost});

	// Make a promise for when the MPD connection is ready to receive events
	this.mpdReady = libQ.nfcall(libFast.bind(self.clientMpd.on, self.clientMpd), 'ready');

	// This tracks the the timestamp of the newest detected status change
	this.timeLatestStatus = 0;

	// When playback status changes
	this.clientMpd.on('system-player', function () {

		var timeStart = Date.now(); 

		logStart('MPD announces state update')
			.then(libFast.bind(self.getState, self))
			.then(libFast.bind(self.pushState, self))
			.fail(libFast.bind(self.pushError, self))
			.done(function () {
				return logDone(timeStart);

			});

	});

	this.tracklist = []
	this.tracklistReady = libQ.resolve();

}

// Public Methods ---------------------------------------------------------------------------------------
// These are 'this' aware, and return a promise

// Define a method to clear, add, and play an array of tracks
ControllerMpd.prototype.clearAddPlayTracks = function (arrayTrackIds) {

	console.log('[' + Date.now() + '] ' + 'ControllerMpd::clearAddPlayTracks');
	var self = this;

	// From the array of track IDs, get array of track URIs to play
	var arrayTrackUris = libFast.map(arrayTrackIds, convertTrackIdToUri);

	// Clear the queue, add the first track, and start playback
	return this.sendMpdCommandArray([
		{command: 'clear', parameters: []},
		{command: 'add',   parameters: [arrayTrackUris.shift()]},
		{command: 'play',  parameters: []}

	])
	.then(function () {

		// If there are more tracks in the array, add those also
		if (arrayTrackUris.length > 0) {
			return self.sendMpdCommandArray(
				libFast.map(arrayTrackUris, function (currentTrack) {
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

	console.log('[' + Date.now() + '] ' + 'ControllerMpd::stop');

	return this.sendMpdCommand('stop', []);

}

// MPD pause
ControllerMpd.prototype.pause = function () {

	console.log('[' + Date.now() + '] ' + 'ControllerMpd::pause');

	return this.sendMpdCommand('pause', []);

}

// MPD resume
ControllerMpd.prototype.resume = function () {

	console.log('[' + Date.now() + '] ' + 'ControllerMpd::resume');

	return this.sendMpdCommand('play', []);

}

// MPD music library
ControllerMpd.prototype.getTracklist = function () {

	console.log('[' + Date.now() + '] ' + 'ControllerMpd::getTracklist');
	var self = this;

	return this.tracklistReady
		.then(function () {
			return self.tracklist;

		});

}

// Internal methods ---------------------------------------------------------------------------
// These are 'this' aware, and may or may not return a promise

// Define a method to get the MPD state
ControllerMpd.prototype.getState = function () {

	console.log('[' + Date.now() + '] ' + 'ControllerMpd::getState');
	var self = this;
	var collectedState = {};
	var timeCurrentUpdate = Date.now();
	this.timeLatestUpdate = timeCurrentUpdate;

	return this.sendMpdCommand('status', [])
		.then(function (data) {
			return self.haltIfNewerUpdateRunning(data, timeCurrentUpdate);

		})
		.then(self.parseState)
		.then(function (state) {
			collectedState = state;

			// If there is a track listed as currently playing, get the track info
			if (collectedState.position !== null) {
				return self.sendMpdCommand('playlistinfo', [collectedState.position])
					.then(function (data) {
						return self.haltIfNewerUpdateRunning(data, timeCurrentUpdate);

					})
					.then(self.parseTrackInfo)
					.then(function (trackinfo) {
						collectedState.dynamictitle = trackinfo.dynamictitle;
						return libQ.resolve(collectedState);

					});

			// Else return null track info
			} else {
				collectedState.dynamictitle = null;
				return libQ.resolve(collectedState);

			}

		});

}

// Stop the current status update thread if a newer one exists
ControllerMpd.prototype.haltIfNewerUpdateRunning = function (data, timeCurrentThread) {

	console.log('[' + Date.now() + '] ' + 'ControllerMpd::haltIfNewerUpdateRunning');

	if (this.timeLatestUpdate > timeCurrentThread) {
		return libQ.reject('Alert: Aborting status update - newer one detected');

	} else {
		return libQ.resolve(data);

	}

}

// Announce updated MPD state
ControllerMpd.prototype.pushState = function (state) {

	console.log('[' + Date.now() + '] ' + 'ControllerMpd::pushState');

	return this.commandRouter.mpdPushState(state);

}

// Pass the error if we don't want to handle it
ControllerMpd.prototype.pushError = function (sReason) {

	console.log('[' + Date.now() + '] ' + 'ControllerMpd::pushError');
	console.log(sReason);

	// Return a resolved empty promise to represent completion
	return libQ.resolve();

}

// Define a general method for sending an MPD command, and return a promise for its execution
ControllerMpd.prototype.sendMpdCommand = function (sCommand, arrayParameters) {

	console.log('[' + Date.now() + '] ' + 'ControllerMpd::sendMpdCommand');
	var self = this;

	return this.mpdReady
		.then(function () {
			console.log('[' + Date.now() + '] ' + 'sending command...');
			return libQ.nfcall(libFast.bind(self.clientMpd.sendCommand, self.clientMpd), libMpd.cmd(sCommand, arrayParameters));

		})
		.then(function (response) {
			console.log('[' + Date.now() + '] ' + 'parsing response...');
			return libQ.resolve(libMpd.parseKeyValueMessage.call(libMpd, response));

		});

}

// Define a general method for sending an array of MPD commands, and return a promise for its execution
// Command array takes the form [{command: sCommand, parameters: arrayParameters}, ...]
ControllerMpd.prototype.sendMpdCommandArray = function (arrayCommands) {

	console.log('[' + Date.now() + '] ' + 'ControllerMpd::sendMpdCommandArray');
	var self = this;

	return this.mpdReady
		.then(function () {
			return libQ.nfcall(libFast.bind(self.clientMpd.sendCommands, self.clientMpd),
				libFast.map(arrayCommands, function (currentCommand) {
					return libMpd.cmd(currentCommand.command, currentCommand.parameters);

				})

			);

		})
		.then(libFast.bind(libMpd.parseKeyValueMessage, libMpd));

}

// Parse MPD's track info text into Volumio recognizable object
ControllerMpd.prototype.parseTrackInfo = function (objTrackInfo) {

	console.log('[' + Date.now() + '] ' + 'ControllerMpd::parseTrackInfo');

	if ('Title' in objTrackInfo) {
		return libQ.resolve({dynamictitle: objTrackInfo.Title});

	} else {
		return libQ.resolve({dynamictitle: null});

	}

}

// Parse MPD's text playlist into a Volumio recognizable playlist object
ControllerMpd.prototype.parsePlaylist = function (objQueue) {

	console.log('[' + Date.now() + '] ' + 'ControllerMpd::parsePlaylist');

	// objQueue is in form {'0': 'file: http://uk4.internet-radio.com:15938/', '1': 'file: http://2363.live.streamtheworld.com:80/KUSCMP128_SC'}
	// We want to convert to a straight array of trackIds
	return libQ.fcall(libFast.map, Object.keys(objQueue), function (currentKey) {
		return convertUriToTrackId(objQueue[currentKey]);

	});

}

// Parse MPD's text status into a Volumio recognizable status object
ControllerMpd.prototype.parseState = function (objState) {

	console.log('[' + Date.now() + '] ' + 'ControllerMpd::parseState');

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

	console.log('[' + Date.now() + '] ' + '------------------------------ ' + (Date.now() - timeStart) + 'ms');
	return libQ.resolve();

}

function logStart (sCommand) {

	console.log('\n' + '[' + Date.now() + '] ' + '---------------------------- ' + sCommand);
	return libQ.resolve();

}
