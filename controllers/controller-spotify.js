// Note: You need to make your own ./spotify/credentials.txt file to log in to Spotify. Follow the provided template.

var libQ = require('q');
var libFs = require('fs');

// Define the ControllerSpotify class
module.exports = ControllerSpotify;
function ControllerSpotify (commandRouter) {

	// This fixed variable will let us refer to 'this' object at deeper scopes
	var _this = this;

	// Save a reference to the parent commandRouter
	this.commandRouter = commandRouter;

	// Configure options and initialize a Spotify object
	// Need permanent values later
	var options = {
		appkeyFile: './controllers/spotify/spotify.key',
		cacheFolder: './controllers/spotify/cache',
		settingsFolder: './controllers/spotify/settings'
	};

	this.clientSpotify = require('node-spotify')(options);

	// Read Spotify credentials then log in
	libQ.nfcall(libFs.readFile, './controllers/spotify/credentials.txt')
		.then(function (buffer) {
			var objCredentials = JSON.parse(buffer.toString());
			_this.clientSpotify.login(objCredentials.username, objCredentials.password, false, false);

		})
		.catch(console.log);

	// Make a promise for when the Spotify client is ready to receive events
	var spotifyReadyDeferred = libQ.defer();
	this.spotifyReady = spotifyReadyDeferred.promise;

	this.clientSpotify.on({
		ready: spotifyReadyDeferred.resolve

	});

	// Play a track to test connection
/*
	this.spotifyReady
		.then(function () {
			var track = _this.clientSpotify.createFromLink('spotify:track:2fnmXjugEkCtQ6xA8zjUJg');
			_this.clientSpotify.player.play(track);

		})
		.catch(console.log);
*/

	// Make a temporary track library for testing purposes
	this.library = new Object();
	this.library['c3BvdGlmeTp0cmFjazoyZm5tWGp1Z0VrQ3RRNnhBOHpqVUpn'] = {service: 'spotify', trackid: 'c3BvdGlmeTp0cmFjazoyZm5tWGp1Z0VrQ3RRNnhBOHpqVUpn', metadata: {title: 'Gates of Gold 3)Call of the Mountain'}};
	this.library['c3BvdGlmeTp0cmFjazozNmM0Sm9oYXlCOXFkNjRlaWRRTUJp'] = {service: 'spotify', trackid: 'c3BvdGlmeTp0cmFjazozNmM0Sm9oYXlCOXFkNjRlaWRRTUJp', metadata: {title: 'Doin\' it Right'}};
	this.library['c3BvdGlmeTp0cmFjazo0ZnhwcEhwalRYdnhVQkFxNHQ5QlpJ'] = {service: 'spotify', trackid: 'c3BvdGlmeTp0cmFjazo0ZnhwcEhwalRYdnhVQkFxNHQ5QlpJ', metadata: {title: 'Radio Song'}};

}

// Public Methods ---------------------------------------------------------------------------------------
// These are 'this' aware, and return a promise

// Define a method to get the Spotify state
ControllerSpotify.prototype.getState = function () {

	console.log('ControllerSpotify::getState');

}

// Spotify get queue, returns array of strings, each representing the URI of a track
ControllerSpotify.prototype.getQueue = function () {

	console.log('ControllerSpotify::getQueue');

}

// Define a method to clear, add, and play an array of tracks
ControllerSpotify.prototype.clearAddPlayTracks = function (arrayTrackIds) {

	console.log('ControllerSpotify::clearAddPlayTracks');

}

// Spotify stop
ControllerSpotify.prototype.stop = function () {

	console.log('ControllerSpotify::stop');

}

// Spotify pause
ControllerSpotify.prototype.pause = function () {

	console.log('ControllerSpotify::pause');

}

// Spotify resume
ControllerSpotify.prototype.resume = function () {

	console.log('ControllerSpotify::resume');

}

// Internal methods ---------------------------------------------------------------------------
// These are 'this' aware, and may or may not return a promise

// Announce updated Spotify state
ControllerSpotify.prototype.pushState = function (state) {

	console.log('ControllerSpotify::pushState');

}

// Pass the error if we don't want to handle it
ControllerSpotify.prototype.pushError = function (sReason) {

	console.log('ControllerSpotify::pushError');
	console.log(sReason);

	// Return a resolved empty promise to represent completion
	return libQ();

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
