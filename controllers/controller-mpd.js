// author: HoochDeveloper
// MPD daemon controller sketch
// this accepts the socket connection to the mpd daemon to be initialized
var libMpd = require('mpd');
var libEvents = require('events');
var libUtil = require('util');
var libQ = require('q');

// Define the ControllerMpd class
module.exports = ControllerMpd;
function ControllerMpd (nPort, nHost) {
	this.client = libMpd.connect({port: nPort,	host: nHost});
	this.cmd = libMpd.cmd;

	var this_ = this;

	// Inherit some default objects from the EventEmitter class
	libEvents.EventEmitter.call(this);

	// Create a listener for playback status updates
	this.client.on('system-player', function () {

		// Get the updated state
		this.sendCommand(libMpd.cmd("status", []), function (err, msg) {
			if (err) throw err;

			// Emit the updated state for the command router to hear
			this_.emit('daemonEvent',
				{type: 'mpdState', data: libMpd.parseKeyValueMessage(msg), promise: null}

			);

		});

	});

}

// Let this class inherit the methods of the EventEmitter class, such as 'emit'
libUtil.inherits(ControllerMpd, libEvents.EventEmitter);

// function for send command to MPD daemon
ControllerMpd.prototype.sendSingleCommand2Mpd = function (command, commandCallback) {
	// now the npm mpd module is used. the command callBack is passed from the caller, so it can handle the response in a proper way
	// TODO evaluate of this approach is needed
	this.client.sendCommand(this.cmd(command, []), commandCallback);

}

ControllerMpd.prototype.play = function (promise) {
	this.client.sendCommand(this.cmd('play', []), promise.resolve({type: null, data: null}));

}

ControllerMpd.prototype.stop = function (promise) {
	this.client.sendCommand(this.cmd('stop', []), promise.resolve({type: null, data: null}));

}

ControllerMpd.prototype.clearAddPlay = function (tracks, promise) {
	this.client.sendCommands([
		this.cmd('clear', []),
		this.cmd('add', tracks),
		this.cmd('play', []),
	], promise.resolve({type: null, data: null}));

}
