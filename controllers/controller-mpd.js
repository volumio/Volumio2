// author: HoochDeveloper
// MPD daemon controller sketch
// this accepts the socket connection to the mpd daemon to be initialized
var libMpd = require('mpd');
var libEvents = require('events');
var libUtil = require('util');

// Define the ControllerMpd class
module.exports = ControllerMpd;
function ControllerMpd (nPort, nHost) {
	this.client = libMpd.connect({port: nPort,	host: nHost});
	this.cmd = libMpd.cmd;

	var thisControllerMpd = this;

	// Make a temporary track library for testing purposes
	this.library = new Object();
	this.library['aHR0cDovLzIzNjMubGl2ZS5zdHJlYW10aGV3b3JsZC5jb206ODAvS1VTQ01QMTI4X1ND'] = {service: 'mpd', trackid: 'aHR0cDovLzIzNjMubGl2ZS5zdHJlYW10aGV3b3JsZC5jb206ODAvS1VTQ01QMTI4X1ND', metadata: {title: 'KUSC Radio'}};
	this.library['aHR0cDovL3VrNC5pbnRlcm5ldC1yYWRpby5jb206MTU5Mzgv'] = {service: 'mpd', trackid: 'aHR0cDovL3VrNC5pbnRlcm5ldC1yYWRpby5jb206MTU5Mzgv', metadata: {title: 'Go Ham Radio'}};

	// Inherit some default objects from the EventEmitter class
	libEvents.EventEmitter.call(this);

	// Create a listener for playback status updates from the MPD daemon
	this.client.on('system-player', function () {

		// Get the updated state
		this.sendCommand(libMpd.cmd("status", []), function (err, msg) {
			if (err) throw err;

			// Emit the updated state for the command router to hear
			// TODO - standardize the format of the emitted state
			thisControllerMpd.emit('controllerEvent', {type: 'mpdStateUpdate', data: libMpd.parseKeyValueMessage(msg)});

		});

	});

}

// Let this class inherit the methods of the EventEmitter class, such as 'emit'
libUtil.inherits(ControllerMpd, libEvents.EventEmitter);

// MPD play command
ControllerMpd.prototype.play = function (promisedResponse) {
	this.client.sendCommand(this.cmd('play', []), promisedResponse.resolve());

}

// MPD stop command
ControllerMpd.prototype.stop = function (promisedResponse) {
	this.client.sendCommand(this.cmd('stop', []), promisedResponse.resolve());

}

// MPD clear queue, add array of tracks, and play
ControllerMpd.prototype.clearAddPlay = function (arrayTrackIds, promisedResponse) {
	var thisControllerMpd = this;

	// From the array of track IDs, get array of track URIs to play
	var arrayTrackUris = arrayTrackIds.map(function (curTrackId) {
		return convertTrackIdToUri(curTrackId);

	});

console.log(JSON.stringify(arrayTrackUris));
	// Clear the queue, add the first track, and start playback
	this.client.sendCommand(thisControllerMpd.cmd('clear', []));
	this.client.sendCommand(thisControllerMpd.cmd('add', [arrayTrackUris.shift()]));
	this.client.sendCommand(thisControllerMpd.cmd('play', []));

	// If there are more tracks in the array, add those also
	if (arrayTrackUris.length > 0) {
		arrayTrackUris.map(function (curTrackUri) {
			thisControllerMpd.client.sendCommand(thisControllerMpd.cmd('add', [curTrackUri]));

		});

	}

}

// MPD get state
ControllerMpd.prototype.getState = function (promisedResponse) {
	var thisControllerMpd = this;

	// Get the updated state
	thisControllerMpd.client.sendCommand(libMpd.cmd("status", []), function (err, msg) {
		if (err) throw err;

		// Resolve the promise with the updated state
		// TODO - standardize the format of the returned state
		promisedResponse.resolve({type: 'mpdStateUpdate', data: libMpd.parseKeyValueMessage(msg)});

	});

}

// MPD get queue, returns array of strings, each representing the URI of a track
ControllerMpd.prototype.getQueue = function (promisedResponse) {
	var thisControllerMpd = this;

	// Get the updated queue
	thisControllerMpd.client.sendCommand(libMpd.cmd("playlist", []), function (err, msg) {
		if (err) throw err;

		// Resolve the promise with the updated queue
		var objMpdQueue = libMpd.parseKeyValueMessage(msg);
		var arrayMpdQueue = Object.keys(objMpdQueue).map(function (currentKey) {
			return objMpdQueue[currentKey];

		});

		promisedResponse.resolve({type: 'mpdQueueUpdate', data: arrayMpdQueue});

	});

}

function convertTrackIdToUri (input) {
	// Convert base64->utf8
	return (new Buffer(input, 'base64')).toString('utf8');

}

function convertUriToTrackId (input) {
	// Convert utf8->base64
	return (new Buffer(input, 'utf8')).toString('base64');

}
