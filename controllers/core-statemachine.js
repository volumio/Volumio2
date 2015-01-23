var libEvents = require('events');
var libUtil = require('util');
var libQ = require('q');

// Define the CoreStateMachine class
module.exports = CoreStateMachine;
function CoreStateMachine () {

	// Init player properties
	this.CorePlayQueue = new (require('./core-playqueue.js'));
	this.resetVolumioState();

	// Inherit some default objects from the EventEmitter class
	libEvents.EventEmitter.call(this);

}

// Let this class inherit the methods of the EventEmitter class, such as 'emit'
libUtil.inherits(CoreStateMachine, libEvents.EventEmitter);

// Public functions to command the playback state machine
// There are 3x possible playback states and 5x client commands which change that playback state, handle each transition case separately

CoreStateMachine.prototype.play = function (promisedResponse) {
	if (this.currentStatus === 'stop') {
		var trackBlock = this.CorePlayQueue.getTrackBlock(this.currentPosition);
		this.currentTrackBlock = trackBlock;
		this.currentService = trackBlock.service;
		this.currentTrackBlockIndex = this.currentPosition;

		if (trackBlock.service === 'mpd') {
			this.emit('coreEvent', {type: 'mpdClearAddPlay', data: trackBlock.trackids}, promisedResponse);

		} else {
			promisedResponse.resolve({type: 'responseError', data: 'Track service ' + JSON.stringify(trackBlock.service) + ' does not have a connected controller.'});

			return;

		}

	} else if (this.currentStatus === 'pause') {
		this.currentStatus = 'play';
		this.emit('coreEvent', {type: 'volumioStateUpdate', data: {status: this.currentStatus, position: this.currentPosition, seek: this.currentSeek}});

		// TODO - Push this promise to the daemon controller to resolve instead
		promisedResponse.resolve();

	}

}

CoreStateMachine.prototype.next = function (promisedResponse) {
	if (this.currentStatus === 'stop') {
		if (this.currentPosition < this.CorePlayQueue.getQueue().length - 1) {
			this.currentPosition++;
			this.emit('coreEvent', {type: 'volumioStateUpdate', data: {status: this.currentStatus, position: this.currentPosition, seek: this.currentSeek}});

		}

	} else if (this.currentStatus === 'play') {
		if (this.currentPosition < this.CorePlayQueue.getQueue().length - 1) {
			this.currentPosition++;
			this.currentSeek = 0;
			this.emit('coreEvent', {type: 'volumioStateUpdate', data: {status: this.currentStatus, position: this.currentPosition, seek: this.currentSeek}});

		}

	} else if (this.currentStatus === 'pause') {
		if (this.currentPosition < this.CorePlayQueue.getQueue().length - 1) {
			this.currentPosition++;

		}

		this.currentStatus = 'play';
		this.currentSeek = 0;
		this.emit('coreEvent', {type: 'volumioStateUpdate', data: {status: this.currentStatus, position: this.currentPosition, seek: this.currentSeek}});

	}

	// TODO - Push this promise to the daemon controller to resolve instead
	promisedResponse.resolve();

}

CoreStateMachine.prototype.previous = function (promisedResponse) {
	if (this.currentStatus === 'stop') {
		if (this.currentPosition > 0) {
			this.currentPosition--;
			this.emit('coreEvent', {type: 'volumioStateUpdate', data: {status: this.currentStatus, position: this.currentPosition, seek: this.currentSeek}});

		}

	} else if (this.currentStatus === 'play') {
		if (this.currentPosition > 0) {
			this.currentPosition--;
			this.currentSeek = 0;
			this.emit('coreEvent', {type: 'volumioStateUpdate', data: {status: this.currentStatus, position: this.currentPosition, seek: this.currentSeek}});

		}

	} else if (this.currentStatus === 'pause') {
		if (this.currentPosition > 0) {
			this.currentPosition--;

		}

		this.currentStatus = 'play';
		this.currentSeek = 0;
		this.emit('coreEvent', {type: 'volumioStateUpdate', data: {status: this.currentStatus, position: this.currentPosition, seek: this.currentSeek}});

	}

	// TODO - Push this promise to the daemon controller to resolve instead
	promisedResponse.resolve();

}

CoreStateMachine.prototype.stop = function (promisedResponse) {
	if (this.currentStatus === 'play') {
		this.currentStatus = 'stop';
		this.currentSeek = 0;

		if (this.currentService === 'mpd') {
			this.emit('coreEvent', {type: 'mpdStop', data: null}, promisedResponse);

		} else {
			promisedResponse.resolve({type: 'responseError', data: 'Track service ' + JSON.stringify(trackBlock.service) + ' does not have a connected controller.'});

			return;

		}

	} else if (this.currentStatus === 'pause') {
		this.currentStatus = 'stop';
		this.currentSeek = 0;
		this.emit('coreEvent', {type: 'volumioStateUpdate', data: {status: this.currentStatus, position: this.currentPosition, seek: this.currentSeek}});

	}

	// TODO - Push this promise to the daemon controller to resolve instead
	promisedResponse.resolve();

}

CoreStateMachine.prototype.pause = function (promisedResponse) {
	if (this.currentStatus === 'play') {
		this.currentStatus = 'pause';
		// <- TODO - update seek pos here
		this.emit('coreEvent', {type: 'volumioStateUpdate', data: {status: this.currentStatus, position: this.currentPosition, seek: this.currentSeek}});

	}

	// TODO - Push this promise to the daemon controller to resolve instead
	promisedResponse.resolve();

}

// Get the current state of the player
CoreStateMachine.prototype.getState = function (promisedResponse) {
	// <- TODO - update seek pos here

	promisedResponse.resolve({type: 'volumioStateUpdate', data: {status: this.currentStatus, position: this.currentPosition, seek: this.currentSeek}});

}

// Get the current contents of the play queue
CoreStateMachine.prototype.getQueue = function (promisedResponse) {
	promisedResponse.resolve({type: 'volumioQueueUpdate', data: this.CorePlayQueue.getQueue()});

}

// Modify the contents of the queue (ie from client request)
CoreStateMachine.prototype.modQueue = function (sCommand, sParameters, promisedResponse) {

}

CoreStateMachine.prototype.resetVolumioState = function () {
	this.currentStatus = 'stop';
	this.currentPosition = 0;
	this.currentSeek = 0;
	this.currentTrackBlock = [];
	this.currentTrackBlockIndex = 0;
	this.currentService = '';

}

// Sync the current state of the player from a status update from the MPD service controller
// TODO - rewrite to be cleaner, encapsulate reused code into separate functions
CoreStateMachine.prototype.updateStateFromMpd = function (mpdState) {
	var promisedResponse = libQ.defer();
	var thisCoreStateMachine = this;

	if (this.currentService !== 'mpd') {
		thisCoreStateMachine.emitError('MPD emitted unexpected player status update.');
		// <- TODO - correct desync here
		return;

	}

	// Emit request for MPD queue for the coreCommandRouter to hear
	thisCoreStateMachine.emit('coreEvent', {type: 'mpdGetQueue', data: ''}, promisedResponse);

	// Listen for and handle the response
	promisedResponse.promise
	.then (function (response) {
		if ('type' in response && response.type === 'mpdQueueUpdate') {
			var mpdQueue = response.data;

			// If play queue lengths do not agree
			if (thisCoreStateMachine.currentTrackBlock.trackids.length !== mpdQueue.length) {
				thisCoreStateMachine.emitError('MPD play queue length has desynced from Volumio.');
				// <- TODO - correct desync here
				return;

			}

			// If play queue contents do not agree
			for (i = 0; i < mpdQueue.length; i++ ) {
				if (convertTrackIdToUri(thisCoreStateMachine.currentTrackBlock.trackids[i]) !== mpdQueue[i]) {
					thisCoreStateMachine.emitError('MPD play queue contents have desynced from Volumio.');
					// <- TODO - correct desync here
					return;

				}

			}

			// There are 3x MPD states and 3x Volumio states. Handle all combinations separately.

			// MPD reports play state
			if (mpdState.state === 'play') {

				// Volumio status is 'stop', so we have just started playing a block of tracks
				if (thisCoreStateMachine.currentStatus === 'stop') {
					thisCoreStateMachine.currentStatus = 'play';
					thisCoreStateMachine.currentPosition = thisCoreStateMachine.currentTrackBlockIndex + Number(mpdState.song);
					// <- TODO - update seek pos here

					thisCoreStateMachine.emitVolumioStateUpdate();

				}

			// MPD reports stop state
			} else if (mpdState.state === 'stop') {

				// Volumio status is 'play', so we likely finished a block of tracks
				if (thisCoreStateMachine.currentStatus === 'play') {
					thisCoreStateMachine.currentPosition = thisCoreStateMachine.currentTrackBlockIndex + thisCoreStateMachine.currentTrackBlock.length;

					// If we have reached the end of the play queue
					if (thisCoreStateMachine.currentPosition >= thisCoreStateMachine.CorePlayQueue.getQueue().length) {
						thisCoreStateMachine.resetVolumioState();
						thisCoreStateMachine.emitVolumioStateUpdate();
						return;

					}

					// Advance to the next block of tracks
					var trackBlock = thisCoreStateMachine.CorePlayQueue.getTrackBlock(thisCoreStateMachine.currentPosition);
					thisCoreStateMachine.currentTrackBlock = trackBlock;
					thisCoreStateMachine.currentService = trackBlock.service;
					thisCoreStateMachine.currentTrackBlockIndex = thisCoreStateMachine.currentPosition;

					if (trackBlock.service === 'mpd') {
						promisedResponse.resolve(thisCoreStateMachine.emitMpdClearAddPlay(trackBlock.trackids));

					} else {
						promisedResponse.resolve({type: 'error', data: 'Track service ' + JSON.stringify(trackBlock.service) + ' does not have a connected controller.'});
						thisCoreStateMachine.currentStatus = 'stop';
						thisCoreStateMachine.currentSeek = 0;
						thisCoreStateMachine.emitVolumioStateUpdate();
						return;

					}

				}

			}

		}

	});

}

CoreStateMachine.prototype.emitVolumioStateUpdate = function () {
	var promisedResponse = libQ.defer();
	this.emit('coreEvent', {type: 'volumioStateUpdate', data: {status: this.currentStatus, position: this.currentPosition, seek: this.currentSeek}, promise: promisedResponse});

	return promisedResponse.promise;

}

CoreStateMachine.prototype.emitError = function (sError) {
	var promisedResponse = libQ.defer();
	this.emit('coreEvent', {type: 'error', data: sError, promise: promisedResponse});

	return promisedResponse.promise;

}

CoreStateMachine.prototype.emitMpdClearAddPlay = function (arrayTrackIds) {
	var promisedResponse = libQ.defer();
	this.emit('coreEvent', {type: 'mpdClearAddPlay', data: arrayTrackIds, promise: promisedResponse});

	return promisedResponse.promise;

}

function convertTrackIdToUri (input) {
	// Convert base64->utf8
	return (new Buffer(input, 'base64')).toString('utf8');

}

function convertUriToTrackId (input) {
	// Convert utf8->base64
	return (new Buffer(input, 'utf8')).toString('base64');

}
