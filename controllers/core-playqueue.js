var libEvents = require('events');
var libUtil = require('util');
var libQ = require('q');

// Define the CorePlayQueue class
module.exports = CorePlayQueue;
function CorePlayQueue () {

	// Initialize the player state
	this.stateCurrent = {status: "stop", position: 0, seek: 0, track: {}};

	// Init temporary play queue for testing purposes ---------------
	this.arrayQueue = [
		{service: 'mpd', uri: 'http://2363.live.streamtheworld.com:80/KUSCMP128_SC'},
		{service: 'spop', uri: 'spotify:track:6r509c4WvHaH1OctmcLzNv'}

	];
	// --------------------------------------------------------------

	if (this.arrayQueue.length > 0) {
		this.stateCurrent.track = this.arrayQueue[this.stateCurrent.position];

	}

	// Inherit some default objects from the EventEmitter class
	libEvents.EventEmitter.call(this);

}

// Let this class inherit the methods of the EventEmitter class, such as 'emit'
libUtil.inherits(CorePlayQueue, libEvents.EventEmitter);

// Public function to command the playback state machine
// There are 3x possible playback states and 5x client commands which change that playback state, handle each transition case separately

CorePlayQueue.prototype.play = function (promise) {
	if (this.stateCurrent.status === 'stop') {
		this.stateCurrent.status = 'play';
		this.stateCurrent.track = this.arrayQueue[this.stateCurrent.position];
		this.stateCurrent.seek = 0;
		this.emit('coreEvent', {type: 'playerState', data: this.stateCurrent});

	} else if (this.stateCurrent.status === 'pause') {
		this.stateCurrent.status = 'play';
		this.emit('coreEvent', {type: 'playerState', data: this.stateCurrent});

	}

	// Temporary - Push this promise to the daemon controller to resolve instead
	promise.resolve();

}

CorePlayQueue.prototype.next = function (promise) {
	if (this.stateCurrent.status === 'stop') {
		if (this.stateCurrent.position < this.arrayQueue.length - 1) {
			this.stateCurrent.position++;
			this.stateCurrent.track = this.arrayQueue[this.stateCurrent.position];
			this.emit('coreEvent', {type: 'playerState', data: this.stateCurrent});

		}

	} else if (this.stateCurrent.status === 'play') {
		if (this.stateCurrent.position < this.arrayQueue.length - 1) {
			this.stateCurrent.position++;
			this.stateCurrent.track = this.arrayQueue[this.stateCurrent.position];
			this.stateCurrent.seek = 0;
			this.emit('coreEvent', {type: 'playerState', data: this.stateCurrent});

		}

	} else if (this.stateCurrent.status === 'pause') {
		if (this.stateCurrent.position < this.arrayQueue.length - 1) {
			this.stateCurrent.position++;
			this.stateCurrent.track = this.arrayQueue[this.stateCurrent.position];

		}

		this.stateCurrent.status = 'play';
		this.stateCurrent.seek = 0;
		this.emit('coreEvent', {type: 'playerState', data: this.stateCurrent});

	}

	// Temporary - Push this promise to the daemon controller to resolve instead
	promise.resolve();

}

CorePlayQueue.prototype.previous = function (promise) {
	if (this.stateCurrent.status === 'stop') {
		if (this.stateCurrent.position > 0) {
			this.stateCurrent.position--;
			this.stateCurrent.track = this.arrayQueue[this.stateCurrent.position];
			this.emit('coreEvent', {type: 'playerState', data: this.stateCurrent});

		}

	} else if (this.stateCurrent.status === 'play') {
		if (this.stateCurrent.position > 0) {
			this.stateCurrent.position--;
			this.stateCurrent.track = this.arrayQueue[this.stateCurrent.position];
			this.stateCurrent.seek = 0;
			this.emit('coreEvent', {type: 'playerState', data: this.stateCurrent});

		}

	} else if (this.stateCurrent.status === 'pause') {
		if (this.stateCurrent.position > 0) {
			this.stateCurrent.position--;
			this.stateCurrent.track = this.arrayQueue[this.stateCurrent.position];

		}

		this.stateCurrent.status = 'play';
		this.stateCurrent.seek = 0;
		this.emit('coreEvent', {type: 'playerState', data: this.stateCurrent});

	}

	// Temporary - Push this promise to the daemon controller to resolve instead
	promise.resolve();

}

CorePlayQueue.prototype.stop = function (promise) {
	if (this.stateCurrent.status === 'play') {
		this.stateCurrent.status = 'stop';
		this.stateCurrent.seek = 0;
		this.emit('coreEvent', {type: 'playerState', data: this.stateCurrent});

	} else if (this.stateCurrent.status === 'pause') {
		this.stateCurrent.status = 'stop';
		this.stateCurrent.seek = 0;
		this.emit('coreEvent', {type: 'playerState', data: this.stateCurrent});

	}

	// Temporary - Push this promise to the daemon controller to resolve instead
	promise.resolve();

}

CorePlayQueue.prototype.pause = function (promise) {
	if (this.stateCurrent.status === 'play') {
		this.stateCurrent.status = 'pause';
		// <- update seek pos here
		this.emit('coreEvent', {type: 'playerState', data: this.stateCurrent});

	}

	// Temporary - Push this promise to the daemon controller to resolve instead
	promise.resolve();

}

// Get the current state of the player
CorePlayQueue.prototype.getState = function (promise) {
	promise.resolve({type: 'playerState', data: this.stateCurrent});

}

// Get the current contents of the play queue
CorePlayQueue.prototype.getQueue = function (promise) {
	promise.resolve({type: 'playerQueue', data: this.arrayQueue});

}

// Modify the current state of the player (ie from a status update from a music service controller)
CorePlayQueue.prototype.modState = function (sField, sValue, promise) {

}

// Modify the contents of the queue (ie from client request)
CorePlayQueue.prototype.modQueue = function (sCommand, sParameters, promise) {

}

