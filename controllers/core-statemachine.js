var libEvents = require('events');
var libUtil = require('util');

// Define the CoreStateMachine class
module.exports = CoreStateMachine;
function CoreStateMachine () {
	this.CorePlayQueue = new (require('./core-playqueue.js'));

	// Initialize the player state
	this.stateCurrent = {status: "stop", position: 0, seek: 0};

	// Inherit some default objects from the EventEmitter class
	libEvents.EventEmitter.call(this);

}

// Let this class inherit the methods of the EventEmitter class, such as 'emit'
libUtil.inherits(CoreStateMachine, libEvents.EventEmitter);

// Public functions to command the playback state machine
// There are 3x possible playback states and 5x client commands which change that playback state, handle each transition case separately

CoreStateMachine.prototype.play = function (promisedResponse) {
	if (this.stateCurrent.status === 'stop') {
		this.stateCurrent.status = 'play';
		this.stateCurrent.seek = 0;

		var trackBlock = this.CorePlayQueue.getTrackBlock(this.stateCurrent.position);
		if (trackBlock.service = 'mpd') {
			this.emit('coreEvent', {type: 'mpdClearAddPlay', data: trackBlock.trackids}, promisedResponse);

		}

		// TODO - drive a player status change from mpdStateUpdate
		//this.emit('coreEvent', {type: 'playerStateUpdate', data: this.stateCurrent});

	} else if (this.stateCurrent.status === 'pause') {
		this.stateCurrent.status = 'play';
		this.emit('coreEvent', {type: 'playerStateUpdate', data: this.stateCurrent});

		// TODO - Push this promise to the daemon controller to resolve instead
		promisedResponse.resolve();

	}

}

CoreStateMachine.prototype.next = function (promisedResponse) {
	if (this.stateCurrent.status === 'stop') {
		if (this.stateCurrent.position < this.CorePlayQueue.getQueue().length - 1) {
			this.stateCurrent.position++;
			this.emit('coreEvent', {type: 'playerStateUpdate', data: this.stateCurrent});

		}

	} else if (this.stateCurrent.status === 'play') {
		if (this.stateCurrent.position < this.CorePlayQueue.getQueue().length - 1) {
			this.stateCurrent.position++;
			this.stateCurrent.seek = 0;
			this.emit('coreEvent', {type: 'playerStateUpdate', data: this.stateCurrent});

		}

	} else if (this.stateCurrent.status === 'pause') {
		if (this.stateCurrent.position < this.CorePlayQueue.getQueue().length - 1) {
			this.stateCurrent.position++;

		}

		this.stateCurrent.status = 'play';
		this.stateCurrent.seek = 0;
		this.emit('coreEvent', {type: 'playerStateUpdate', data: this.stateCurrent});

	}

	// TODO - Push this promise to the daemon controller to resolve instead
	promisedResponse.resolve();

}

CoreStateMachine.prototype.previous = function (promisedResponse) {
	if (this.stateCurrent.status === 'stop') {
		if (this.stateCurrent.position > 0) {
			this.stateCurrent.position--;
			this.emit('coreEvent', {type: 'playerStateUpdate', data: this.stateCurrent});

		}

	} else if (this.stateCurrent.status === 'play') {
		if (this.stateCurrent.position > 0) {
			this.stateCurrent.position--;
			this.stateCurrent.seek = 0;
			this.emit('coreEvent', {type: 'playerStateUpdate', data: this.stateCurrent});

		}

	} else if (this.stateCurrent.status === 'pause') {
		if (this.stateCurrent.position > 0) {
			this.stateCurrent.position--;

		}

		this.stateCurrent.status = 'play';
		this.stateCurrent.seek = 0;
		this.emit('coreEvent', {type: 'playerStateUpdate', data: this.stateCurrent});

	}

	// TODO - Push this promise to the daemon controller to resolve instead
	promisedResponse.resolve();

}

CoreStateMachine.prototype.stop = function (promisedResponse) {
	if (this.stateCurrent.status === 'play') {
		this.stateCurrent.status = 'stop';
		this.stateCurrent.seek = 0;
		this.emit('coreEvent', {type: 'playerStateUpdate', data: this.stateCurrent});

	} else if (this.stateCurrent.status === 'pause') {
		this.stateCurrent.status = 'stop';
		this.stateCurrent.seek = 0;
		this.emit('coreEvent', {type: 'playerStateUpdate', data: this.stateCurrent});

	}

	// TODO - Push this promise to the daemon controller to resolve instead
	promisedResponse.resolve();

}

CoreStateMachine.prototype.pause = function (promisedResponse) {
	if (this.stateCurrent.status === 'play') {
		this.stateCurrent.status = 'pause';
		// <- TODO - update seek pos here
		this.emit('coreEvent', {type: 'playerStateUpdate', data: this.stateCurrent});

	}

	// TODO - Push this promise to the daemon controller to resolve instead
	promisedResponse.resolve();

}

// Get the current state of the player
CoreStateMachine.prototype.getState = function (promisedResponse) {
	promisedResponse.resolve({type: 'playerStateUpdate', data: this.stateCurrent});

}

// Get the current contents of the play queue
CoreStateMachine.prototype.getQueue = function (promisedResponse) {
	promisedResponse.resolve({type: 'playerQueueUpdate', data: this.CorePlayQueue.getQueue()});

}

// Modify the contents of the queue (ie from client request)
CoreStateMachine.prototype.modQueue = function (sCommand, sParameters, promisedResponse) {

}

// Update the current state of the player (ie from a status update from a music service controller)
CoreStateMachine.prototype.updateStateFromMpd = function (stateMpd) {

}

