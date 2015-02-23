var libQ = require('kew');
var libFast = require('fast.js');

// Define the CoreStateMachine class
module.exports = CoreStateMachine;
function CoreStateMachine (commandRouter) {

	this.commandRouter = commandRouter;
	this.playQueue = new (require('./core-playqueue.js'));
	this.resetVolumioState();

}

// Public Methods ---------------------------------------------------------------------------------------
// These are 'this' aware, and return a promise

// Get the current state of the player
CoreStateMachine.prototype.getState = function () {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::getState');

	var sService = null;
	if ('service' in this.currentTrackBlock) {
		sService = this.currentTrackBlock.service;

	}

	return libQ.resolve({
		status: this.currentStatus,
		position: this.currentPosition,
		dynamictitle: this.currentDynamicTitle,
		seek: this.currentSeek,
		duration: this.currentDuration,
		samplerate: this.currentSampleRate,
		bitdepth: this.currentBitDepth,
		channels: this.currentChannels,
		service: sService

	});

}

// Get the current contents of the play queue
CoreStateMachine.prototype.getQueue = function () {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::getQueue');
	return this.playQueue.getQueue();

}

// Volumio Play Command
CoreStateMachine.prototype.play = function (promisedResponse) {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::play');
	var _this = this;

	// Stop -> Play transition
	if (this.currentStatus === 'stop') {
		this.currentStatus = 'play';

		return this.updateTrackBlock()
			.then(libFast.bind(_this.serviceClearAddPlay, _this));

	// Pause -> Play transition
	} else if (this.currentStatus === 'pause') {
		this.currentStatus = 'play';

		return this.serviceResume();

	}

}

// Volumio Next Command
CoreStateMachine.prototype.next = function (promisedResponse) {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::next');
	var _this = this;

	// Stop -> Next transition
	if (this.currentStatus === 'stop') {
		if (this.currentPosition < this.playQueue.arrayQueue.length - 1) {
			this.currentPosition++;

			return this.updateTrackBlock()
				.then(libFast.bind(_this.getState, _this))
				.then(libFast.bind(_this.pushState, _this));

		}

	// Play -> Next transition
	} else if (this.currentStatus === 'play') {
		if (this.currentPosition < this.playQueue.arrayQueue.length - 1) {
			this.currentPosition++;
			this.currentSeek = 0;

			return this.updateTrackBlock()
				.then(libFast.bind(_this.serviceClearAddPlay, _this));

		}

	// Pause -> Next transitiom
	} else if (this.currentStatus === 'pause') {
		if (this.currentPosition < this.playQueue.arrayQueue.length - 1) {
			this.currentPosition++;

		}

		this.currentStatus = 'play';
		this.currentSeek = 0;

		return this.updateTrackBlock()
			.then(libFast.bind(_this.serviceClearAddPlay, _this));

	}

}

// Volumio Previous Command
CoreStateMachine.prototype.previous = function (promisedResponse) {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::previous');
	var _this = this;

	// Stop -> Previous transition
	if (this.currentStatus === 'stop') {
		if (this.currentPosition > 0) {
			this.currentPosition--;

			return this.updateTrackBlock()
				.then(libFast.bind(_this.getState, _this))
				.then(libFast.bind(_this.pushState, _this));

		}

	// Play -> Previous transition
	} else if (this.currentStatus === 'play') {
		if (this.currentPosition > 0) {
			this.currentPosition--;
			this.currentSeek = 0;

			return this.updateTrackBlock()
				.then(libFast.bind(_this.serviceClearAddPlay, _this));


		}

	// Pause -> Previous transition
	} else if (this.currentStatus === 'pause') {
		if (this.currentPosition > 0) {
			this.currentPosition--;

		}

		this.currentStatus = 'play';
		this.currentSeek = 0;

		return this.updateTrackBlock()
			.then(libFast.bind(_this.serviceClearAddPlay, _this));


	}

}

// Volumio Stop Command
CoreStateMachine.prototype.stop = function (promisedResponse) {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::stop');
	var _this = this;

	// Play -> Stop transition
	if (this.currentStatus === 'play') {
		this.currentStatus = 'stop';
		this.currentSeek = 0;

		return this.updateTrackBlock()
			.then(libFast.bind(_this.serviceStop, _this));

	// Pause -> Stop transition
	} else if (this.currentStatus === 'pause') {
		this.currentStatus = 'stop';
		this.currentSeek = 0;

		return this.updateTrackBlock()
			.then(libFast.bind(_this.serviceStop, _this));

	}

}

// Volumio Pause Command
CoreStateMachine.prototype.pause = function (promisedResponse) {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::pause');
	var _this = this;

	// Play -> Pause transition
	if (this.currentStatus === 'play') {
		this.currentStatus = 'pause';

		return this.servicePause();

	}

}

// Sync state from MPD
CoreStateMachine.prototype.syncStateFromMpd = function (stateMpd) {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::syncStateFromMpd');

	if (this.currentTrackBlock.service !== 'mpd') {
		return libQ.reject('Error: MPD announced a state update when it is not the currently active service');

	} else {
		return this.syncState(stateMpd, 'mpd');

	}


}

// Sync state from Spop
CoreStateMachine.prototype.syncStateFromSpop = function (stateSpop) {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::syncStateFromSpop');

	if (this.currentTrackBlock.service !== 'spop') {
		return libQ.reject('Error: Spop announced a state update when it is not the currently active service');

	} else {
		return this.syncState(stateSpop, 'spop');

	}


}

// Internal methods ---------------------------------------------------------------------------
// These are 'this' aware, and may or may not return a promise

// Update the currently active track block
CoreStateMachine.prototype.updateTrackBlock = function () {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::updateTrackBlock');
	var _this = this;

	return this.playQueue.getTrackBlock(this.currentPosition)
		.then(function (trackBlock) {
			_this.currentTrackBlock = trackBlock;

		});

}

// Perform a clear-add-play action on the current track block
CoreStateMachine.prototype.serviceClearAddPlay = function () {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::serviceClearAddPlay');
	var _this = this;

	var trackBlock = this.currentTrackBlock;

	if (trackBlock.service === 'mpd') {

		return this.commandRouter.spopStop()
			//.delay(5000) // Spop does not release ALSA immediately - adjust this delay as needed
			.then(function () {
				return _this.commandRouter.mpdClearAddPlayTracks(trackBlock.trackids);

			});

	} else if (trackBlock.service === 'spop') {

		return this.commandRouter.mpdStop()
			.then(function () {
				return _this.commandRouter.spopClearAddPlayTracks(trackBlock.trackids);

			});

	} else {

		return libQ.reject('Error: Service ' + trackBlock.service + ' is not recognized for \"clear-add-play\" action');

	}

}

// Stop the current track block playback
CoreStateMachine.prototype.serviceStop = function () {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::serviceStop');
	var trackBlock = this.currentTrackBlock;

	if (trackBlock.service === 'mpd') {

		return this.commandRouter.mpdStop();

	} else if (trackBlock.service === 'spop') {

		return this.commandRouter.spopStop();

	} else {

		return libQ.reject('Error: Service ' + trackBlock.service + ' is not recognized for \"stop\" action');

	}

}

// Pause the current track block playback
CoreStateMachine.prototype.servicePause = function () {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::servicePause');
	var trackBlock = this.currentTrackBlock;

	if (trackBlock.service === 'mpd') {

		return this.commandRouter.mpdPause();

	} else if (trackBlock.service === 'spop') {

		return this.commandRouter.spopPause();

	} else {

		return libQ.reject('Error: Service ' + trackBlock.service + ' is not recognized for \"pause\" action');

	}

}

// Resume the current track block playback
CoreStateMachine.prototype.serviceResume = function () {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::serviceResume');
	var trackBlock = this.currentTrackBlock;

	if (trackBlock.service === 'mpd') {

		return this.commandRouter.mpdResume();

	} else if (trackBlock.service === 'spop') {

		return this.commandRouter.spopResume();

	} else {

		return libQ.reject('Error: Service ' + trackBlock.service + ' is not recognized for \"resume\" action');

	}

}

// Reset the properties of the state machine
CoreStateMachine.prototype.resetVolumioState = function () {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::resetVolumioState');
	this.currentStatus = 'stop';
	this.currentPosition = 0;
	this.currentSeek = 0;
	this.currentDuration = 0;
	this.currentTrackBlock = [];
	this.timeLastServiceStateUpdate = 0;
	this.timerPlayback = null;
	this.currentDynamicTitle = null;
	this.currentSampleRate = null;
	this.currentBitDepth = null;
	this.currentChannels = null;

	return this.updateTrackBlock();

}

// Start the timer to track playback time (counts in ms)
CoreStateMachine.prototype.startPlaybackTimer = function (nStartTime) {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::startPlaybackTimer');
	var _this = this;

	clearInterval(this.timerPlayback);
	this.timerPlayback = setInterval(function () {
		_this.currentSeek = nStartTime + Date.now() - _this.timeLastServiceStateUpdate;

	}, 500);

	return libQ.resolve();

}

// Stop playback timer
CoreStateMachine.prototype.stopPlaybackTimer = function () {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::stopPlaybackTimer');

	clearInterval(this.timerPlayback);

	return libQ.resolve();

}

// Announce updated Volumio state
CoreStateMachine.prototype.pushState = function (state) {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::pushState');

	return this.commandRouter.volumioPushState(state);

}

// Pass the error if we don't want to handle it
CoreStateMachine.prototype.pushError = function (sReason) {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::pushError');
	console.log(sReason);

}

// Sync state from service status announcement
// Input state object has the form {status: sStatus, position: nPosition, seek: nSeek, duration: nDuration, samplerate: nSampleRate, bitdepth: nBitDepth, channels: nChannels, dynamictitle: sTitle}
CoreStateMachine.prototype.syncState = function (stateService, sService) {

	console.log('[' + Date.now() + '] ' + 'CoreStateMachine::syncState');
	var _this = this;

	this.timeLastServiceStateUpdate = Date.now();

	if (stateService.status === 'play') {

		// We are waiting for playback to begin, and service has just begun playing
		// Or we are currently playing, and the playback service has announced an updated play state (next track, etc)
		if (this.currentStatus === 'play') {
			this.currentPosition = stateService.position + this.currentTrackBlock.startindex;
			this.currentSeek = stateService.seek;
			this.currentDuration = stateService.duration;
			this.currentDynamicTitle = stateService.dynamictitle;
			this.currentSampleRate = stateService.samplerate;
			this.currentBitDepth = stateService.bitdepth;
			this.currentChannels = stateService.channels;

			this.getState()
				.then(libFast.bind(_this.pushState, _this))
				.fail(libFast.bind(_this.pushError, _this));

			return this.startPlaybackTimer(this.currentSeek);

		}

	} else if (stateService.status === 'stop') {

		// Service has stopped without client request, meaning it is finished playing its track block. Move on to next track block.
		if (this.currentStatus === 'play') {
			this.currentSeek = 0;
			this.currentDuration = 0;
			this.currentDynamicTitle = null;
			this.currentSampleRate = null;
			this.currentBitDepth = null;
			this.currentChannels = null;

			// If we have reached the end of the queue
			if (this.currentPosition >= this.playQueue.arrayQueue.length - 1) {
				this.currentStatus = 'stop';

				this.getState()
					.then(libFast.bind(_this.pushState, _this))
					.fail(libFast.bind(_this.pushError, _this));

				return this.stopPlaybackTimer();

			// Else move to next track
			} else {

				// Don't need to pushState here, since it will be called later during the next operation
				return this.stopPlaybackTimer()
					.then(libFast.bind(_this.next, _this));

			}

		// Client has requested stop, so stop the timer
		} else if (this.currentStatus === 'stop') {
			this.currentSeek = 0;
			this.currentDuration = 0;
			this.currentDynamicTitle = null;
			this.currentSampleRate = null;
			this.currentBitDepth = null;
			this.currentChannels = null;

			this.getState()
				.then(libFast.bind(_this.pushState, _this))
				.fail(libFast.bind(_this.pushError, _this));

			return this.stopPlaybackTimer();

		}

	} else if (stateService.status === 'pause') {

		// Client has requested pause, and service has just paused
		if (this.currentStatus === 'pause') {
			this.getState()
				.then(libFast.bind(_this.pushState, _this))
				.fail(libFast.bind(_this.pushError, _this));

			return this.stopPlaybackTimer();

		}

	}

	return libQ.reject('Error: \"' + sService + '\" state \"' + stateService.status + '\" not recognized when Volumio state is \"' + this.currentStatus + '\"');

}

// Internal helper functions --------------------------------------------------------------------------
// These are static, and not 'this' aware

function convertTrackIdToUri (input) {
	// Convert base64->utf8
	return (new Buffer(input, 'base64')).toString('utf8');

}

function convertUriToTrackId (input) {
	// Convert utf8->base64
	return (new Buffer(input, 'utf8')).toString('base64');

}
