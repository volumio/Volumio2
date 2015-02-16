// This controller connects to Spop to interface with libspotify
var libQ = require('kew');
var libNet = require('net');
var libFast = require('fast.js');

// Define the ControllerSpotify class
module.exports = ControllerSpotify;
function ControllerSpotify (nHost, nPort, commandRouter) {

	// This fixed variable will let us refer to 'this' object at deeper scopes
	var _this = this;

	// Save a reference to the parent commandRouter
	this.commandRouter = commandRouter;

	// Each core gets its own set of Spop sockets connected
	this.connSpopCommand = libNet.createConnection(nPort, nHost); // Socket to send commands and receive track listings
	this.connSpopStatus = libNet.createConnection(nPort, nHost); // Socket to listen for status changes

	// Init some command socket variables
	this.bSpopCommandGotFirstMessage = false;

	this.spopCommandReadyDeferred = libQ.defer(); // Make a promise for when the Spop connection is ready to receive events (basically when it emits 'spop 0.0.1').
	this.spopCommandReady = this.spopCommandReadyDeferred.promise;

	this.spopResponseDeferred = libQ.defer();
	this.spopResponse = this.spopResponseDeferred.promise;

	// Start a listener for command socket messages (command responses)
	this.connSpopCommand.on('data', function (data) {

		// If this is the first message, then the connection is open
		if (!_this.bSpopCommandGotFirstMessage) {
			_this.bSpopCommandGotFirstMessage = true;

			try {
				_this.spopCommandReadyDeferred.resolve();

			} catch (error) {
				_this.pushError(error);

			}

		// Else this is a command response
		} else {
			try {
				_this.spopResponseDeferred.resolve(data.toString());

			} catch (error) {
				_this.pushError(error);

			}

		}

	});

	// Init some status socket variables
	this.bSpopStatusGotFirstMessage = false;

	// Start a listener for status socket messages
	this.connSpopStatus.on('data', function (data) {

		// Put socket back into monitoring mode
		_this.connSpopStatus.write('idle\n');

		// If this is the first message, then the connection is open
		if (!_this.bSpopStatusGotFirstMessage) {
			_this.bSpopStatusGotFirstMessage = true;

		// Else this is a state update announcement
		} else {
			var timeStart = Date.now(); 
			logStart('Spop announces state update')
				.then(function () {
					return _this.parseState.call(_this, data.toString());

				})
				.then(libFast.bind(_this.pushState, _this))
				.fail(libFast.bind(_this.pushError, _this))
				.done(function () {
					return logDone(timeStart);

				});

		}

	});

	// Make a temporary track library for testing purposes
	this.library = new Object();
	this.library['c3BvdGlmeTp0cmFjazoyZm5tWGp1Z0VrQ3RRNnhBOHpqVUpn'] = {service: 'spotify', trackid: 'c3BvdGlmeTp0cmFjazoyZm5tWGp1Z0VrQ3RRNnhBOHpqVUpn', metadata: {title: 'Gates of Gold 3)Call of the Mountain'}};
	this.library['c3BvdGlmeTp0cmFjazozNmM0Sm9oYXlCOXFkNjRlaWRRTUJp'] = {service: 'spotify', trackid: 'c3BvdGlmeTp0cmFjazozNmM0Sm9oYXlCOXFkNjRlaWRRTUJp', metadata: {title: 'Doin\' it Right'}};
	this.library['c3BvdGlmeTp0cmFjazo0ZnhwcEhwalRYdnhVQkFxNHQ5QlpJ'] = {service: 'spotify', trackid: 'c3BvdGlmeTp0cmFjazo0ZnhwcEhwalRYdnhVQkFxNHQ5QlpJ', metadata: {title: 'Radio Song'}};

}

// Public Methods ---------------------------------------------------------------------------------------
// These are 'this' aware, and return a promise

// Define a method to clear, add, and play an array of tracks
ControllerSpotify.prototype.clearAddPlayTracks = function (arrayTrackIds) {

	console.log('[' + Date.now() + '] ' + 'ControllerSpotify::clearAddPlayTracks');
	var _this = this;

	// From the array of track IDs, get array of track URIs to play
	var arrayTrackUris = libFast.map(arrayTrackIds, convertTrackIdToUri);

	// Clear the queue, add the first track, and start playback
	var firstTrack = arrayTrackUris.shift();
	var promisedActions = this.sendSpopCommand('uplay', [firstTrack]);

	// If there are more tracks in the array, add those also
	if (arrayTrackUris.length > 0) {
		promisedActions = libFast.reduce(arrayTrackUris, function (previousPromise, curTrackUri) {
			return previousPromise
				.then(function () {
					return _this.sendSpopCommand('uadd', [curTrackUri]);

				});

		}, promisedActions);

	}

	return promisedActions;

}

// Spotify stop
ControllerSpotify.prototype.stop = function () {

	console.log('[' + Date.now() + '] ' + 'ControllerSpotify::stop');

	return this.sendSpopCommand('stop', []);

}

// Spotify pause
ControllerSpotify.prototype.pause = function () {

	console.log('[' + Date.now() + '] ' + 'ControllerSpotify::pause');

	// TODO don't send 'toggle' if already paused
	return this.sendSpopCommand('toggle', []);

}

// Spotify resume
ControllerSpotify.prototype.resume = function () {

	console.log('[' + Date.now() + '] ' + 'ControllerSpotify::resume');

	// TODO don't send 'toggle' if already playing
	return this.sendSpopCommand('toggle', []);

}

// Internal methods ---------------------------------------------------------------------------
// These are 'this' aware, and may or may not return a promise

// Send command to Spop
ControllerSpotify.prototype.sendSpopCommand = function (sCommand, arrayParameters) {

	console.log('[' + Date.now() + '] ' + 'ControllerSpotify::sendSpopCommand');
	var _this = this;

	// Convert the array of parameters to a string
	var sParameters = libFast.reduce(arrayParameters, function (sCollected, sCurrent) {
		return sCollected + ' ' + sCurrent;

	},'');

	// Pass the command to Spop when the command socket is ready
	this.spopCommandReady
		.then(function () {
			return libQ.nfcall(libFast.bind(_this.connSpopCommand.write, _this.connSpopCommand), sCommand + sParameters + '\n', "utf-8");

		});

	// Return the command response
	return this.spopResponse
		.then(function (sResponse) {

			// Reset the response promise so it can be reused for future commands
			_this.spopResponseDeferred = libQ.defer();

			return sResponse;

		})
		.fail(libFast.bind(_this.pushError, _this));

}

// Spotify get state
ControllerSpotify.prototype.getState = function () {

	console.log('[' + Date.now() + '] ' + 'ControllerSpotify::getState');

	return this.sendSpopCommand('status', []);

}

// Spotify parse state
ControllerSpotify.prototype.parseState = function (sState) {

	console.log('[' + Date.now() + '] ' + 'ControllerSpotify::parseState');
	var objState = JSON.parse(sState);

	var nSeek = null;
	if ('position' in objState) {
		nSeek = objState.position * 1000;

	}

	var nDuration = null;
	if ('duration' in objState) {
		nDuration = objState.duration;

	}

	var sStatus = null;
	if ('status' in objState) {
		if (objState.status === 'playing') {
			sStatus = 'play';

		} else if (objState.status === 'paused') {
			sStatus = 'pause';

		} else if (objState.status === 'stopped') {
			sStatus = 'stop';

		}

	}

	var nPosition = null;
	if ('current_track' in objState) {
		nPosition = objState.current_track - 1;

	}

	return libQ.resolve({
		status: sStatus,
		position: nPosition,
		seek: nSeek,
		duration: nDuration,
		samplerate: null, // Pull these values from somwhere else since they are not provided in the Spop state
		bitdepth: null,
		channels: null

	});

}

// Announce updated Spotify state
ControllerSpotify.prototype.pushState = function (state) {

	console.log('[' + Date.now() + '] ' + 'ControllerSpotify::pushState');

	return this.commandRouter.spotifyPushState(state);

}

// Pass the error if we don't want to handle it
ControllerSpotify.prototype.pushError = function (sReason) {

	console.log('[' + Date.now() + '] ' + 'ControllerSpotify::pushError');
	console.log(sReason);

	// Return a resolved empty promise to represent completion
	return libQ.resolve();

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
