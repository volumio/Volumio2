var libQ = require('kew');
var libFast = require('fast.js');

// Define the CoreStateMachine class
module.exports = CoreStateMachine;
function CoreStateMachine (commandRouter) {

	var self = this;
	self.commandRouter = commandRouter;

	self.playQueue = new (require('./core-playqueue.js'))(commandRouter);
	self.resetVolumioState();

}

// Public Methods ---------------------------------------------------------------------------------------
// These are 'this' aware, and return a promise

// Get the current state of the player
CoreStateMachine.prototype.getState = function () {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::getState');

	var sService = null;
	if ('service' in self.currentTrackBlock) {
		sService = self.currentTrackBlock.service;

	}

	return libQ.resolve({
		status: self.currentStatus,
		position: self.currentPosition,
		dynamictitle: self.currentDynamicTitle,
		seek: self.currentSeek,
		duration: self.currentDuration,
		samplerate: self.currentSampleRate,
		bitdepth: self.currentBitDepth,
		channels: self.currentChannels,
		service: sService

	});

}

// Get the current contents of the play queue
CoreStateMachine.prototype.getQueue = function () {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::getQueue');

	return self.playQueue.getQueue();

}

// Volumio Play Command
CoreStateMachine.prototype.play = function (promisedResponse) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::play');

	// Stop -> Play transition
	if (self.currentStatus === 'stop') {
		self.currentStatus = 'play';

		return self.updateTrackBlock()
			.then(libFast.bind(self.serviceClearAddPlay, self));

	// Pause -> Play transition
	} else if (self.currentStatus === 'pause') {
		self.currentStatus = 'play';

		return self.serviceResume();

	}

}

// Volumio Next Command
CoreStateMachine.prototype.next = function (promisedResponse) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::next');

	// Stop -> Next transition
	if (self.currentStatus === 'stop') {
		if (self.currentPosition < self.playQueue.arrayQueue.length - 1) {
			self.currentPosition++;

			return self.updateTrackBlock()
				.then(libFast.bind(self.getState, self))
				.then(libFast.bind(self.pushState, self));

		}

	// Play -> Next transition
	} else if (self.currentStatus === 'play') {
		if (self.currentPosition < self.playQueue.arrayQueue.length - 1) {
			self.currentPosition++;
			self.currentSeek = 0;

			return self.updateTrackBlock()
				.then(libFast.bind(self.serviceClearAddPlay, self));

		}

	// Pause -> Next transitiom
	} else if (self.currentStatus === 'pause') {
		if (self.currentPosition < self.playQueue.arrayQueue.length - 1) {
			self.currentPosition++;

		}

		self.currentStatus = 'play';
		self.currentSeek = 0;

		return self.updateTrackBlock()
			.then(libFast.bind(self.serviceClearAddPlay, self));

	}

}

// Volumio Previous Command
CoreStateMachine.prototype.previous = function (promisedResponse) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::previous');

	// Stop -> Previous transition
	if (self.currentStatus === 'stop') {
		if (self.currentPosition > 0) {
			self.currentPosition--;

			return self.updateTrackBlock()
				.then(libFast.bind(self.getState, self))
				.then(libFast.bind(self.pushState, self));

		}

	// Play -> Previous transition
	} else if (self.currentStatus === 'play') {
		if (self.currentPosition > 0) {
			self.currentPosition--;
			self.currentSeek = 0;

			return self.updateTrackBlock()
				.then(libFast.bind(self.serviceClearAddPlay, self));


		}

	// Pause -> Previous transition
	} else if (self.currentStatus === 'pause') {
		if (self.currentPosition > 0) {
			self.currentPosition--;

		}

		self.currentStatus = 'play';
		self.currentSeek = 0;

		return self.updateTrackBlock()
			.then(libFast.bind(self.serviceClearAddPlay, self));


	}

}

// Volumio Stop Command
CoreStateMachine.prototype.stop = function (promisedResponse) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::stop');

	// Play -> Stop transition
	if (self.currentStatus === 'play') {
		self.currentStatus = 'stop';
		self.currentSeek = 0;

		return self.updateTrackBlock()
			.then(libFast.bind(self.serviceStop, self));

	// Pause -> Stop transition
	} else if (self.currentStatus === 'pause') {
		self.currentStatus = 'stop';
		self.currentSeek = 0;

		return self.updateTrackBlock()
			.then(libFast.bind(self.serviceStop, self));

	}

}

// Volumio Pause Command
CoreStateMachine.prototype.pause = function (promisedResponse) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::pause');

	// Play -> Pause transition
	if (self.currentStatus === 'play') {
		self.currentStatus = 'pause';

		return self.servicePause();

	}

}

// Sync state from MPD
CoreStateMachine.prototype.syncStateFromMpd = function (stateMpd) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::syncStateFromMpd');

	if (self.currentTrackBlock.service !== 'mpd') {
		return libQ.reject('Error: MPD announced a state update when it is not the currently active service');

	} else {
		return self.syncState(stateMpd, 'mpd');

	}


}

// Sync state from Spop
CoreStateMachine.prototype.syncStateFromSpop = function (stateSpop) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::syncStateFromSpop');

	if (self.currentTrackBlock.service !== 'spop') {
		return libQ.reject('Error: Spop announced a state update when it is not the currently active service');

	} else {
		return self.syncState(stateSpop, 'spop');

	}


}

// Internal methods ---------------------------------------------------------------------------
// These are 'this' aware, and may or may not return a promise

// Update the currently active track block
CoreStateMachine.prototype.updateTrackBlock = function () {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::updateTrackBlock');

	return self.playQueue.getTrackBlock(self.currentPosition)
		.then(function (trackBlock) {
			self.currentTrackBlock = trackBlock;

		});

}

// Perform a clear-add-play action on the current track block
CoreStateMachine.prototype.serviceClearAddPlay = function () {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::serviceClearAddPlay');

	var trackBlock = self.currentTrackBlock;

	if (trackBlock.service === 'mpd') {

		return self.commandRouter.spopStop()
			//.delay(5000) // Spop does not release ALSA immediately - adjust this delay as needed
			.then(function () {
				return self.commandRouter.mpdClearAddPlayTracks(trackBlock.trackids);

			});

	} else if (trackBlock.service === 'spop') {

		return self.commandRouter.mpdStop()
			.then(function () {
				return self.commandRouter.spopClearAddPlayTracks(trackBlock.trackids);

			});

	} else {

		return libQ.reject('Error: Service ' + trackBlock.service + ' is not recognized for \"clear-add-play\" action');

	}

}

// Stop the current track block playback
CoreStateMachine.prototype.serviceStop = function () {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::serviceStop');
	var trackBlock = self.currentTrackBlock;

	if (trackBlock.service === 'mpd') {

		return self.commandRouter.mpdStop();

	} else if (trackBlock.service === 'spop') {

		return self.commandRouter.spopStop();

	} else {

		return libQ.reject('Error: Service ' + trackBlock.service + ' is not recognized for \"stop\" action');

	}

}

// Pause the current track block playback
CoreStateMachine.prototype.servicePause = function () {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::servicePause');
	var trackBlock = self.currentTrackBlock;

	if (trackBlock.service === 'mpd') {

		return self.commandRouter.mpdPause();

	} else if (trackBlock.service === 'spop') {

		return self.commandRouter.spopPause();

	} else {

		return libQ.reject('Error: Service ' + trackBlock.service + ' is not recognized for \"pause\" action');

	}

}

// Resume the current track block playback
CoreStateMachine.prototype.serviceResume = function () {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::serviceResume');
	var trackBlock = self.currentTrackBlock;

	if (trackBlock.service === 'mpd') {

		return self.commandRouter.mpdResume();

	} else if (trackBlock.service === 'spop') {

		return self.commandRouter.spopResume();

	} else {

		return libQ.reject('Error: Service ' + trackBlock.service + ' is not recognized for \"resume\" action');

	}

}

// Reset the properties of the state machine
CoreStateMachine.prototype.resetVolumioState = function () {

	var self = this;

	return libQ.resolve()
		.then(function () {
			self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::resetVolumioState');
			self.currentStatus = 'stop';
			self.currentPosition = 0;
			self.currentSeek = 0;
			self.currentDuration = 0;
			self.currentTrackBlock = [];
			self.timeLastServiceStateUpdate = 0;
			self.timerPlayback = null;
			self.currentDynamicTitle = null;
			self.currentSampleRate = null;
			self.currentBitDepth = null;
			self.currentChannels = null;

			return self.updateTrackBlock();

		});

}

// Start the timer to track playback time (counts in ms)
CoreStateMachine.prototype.startPlaybackTimer = function (nStartTime) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::startPlaybackTimer');

	clearInterval(self.timerPlayback);
	self.timerPlayback = setInterval(function () {
		self.currentSeek = nStartTime + Date.now() - self.timeLastServiceStateUpdate;

	}, 500);

	return libQ.resolve();

}

// Stop playback timer
CoreStateMachine.prototype.stopPlaybackTimer = function () {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::stopPlaybackTimer');

	clearInterval(self.timerPlayback);

	return libQ.resolve();

}

// Announce updated Volumio state
CoreStateMachine.prototype.pushState = function (state) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::pushState');

	return self.commandRouter.volumioPushState(state);

}

// Pass the error if we don't want to handle it
CoreStateMachine.prototype.pushError = function (sReason) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::pushError');
	self.commandRouter.pushConsoleMessage(sReason);

}

// Sync state from service status announcement
// Input state object has the form {status: sStatus, position: nPosition, seek: nSeek, duration: nDuration, samplerate: nSampleRate, bitdepth: nBitDepth, channels: nChannels, dynamictitle: sTitle}
CoreStateMachine.prototype.syncState = function (stateService, sService) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::syncState');

	self.timeLastServiceStateUpdate = Date.now();

	if (stateService.status === 'play') {

		// We are waiting for playback to begin, and service has just begun playing
		// Or we are currently playing, and the playback service has announced an updated play state (next track, etc)
		if (self.currentStatus === 'play') {
			self.currentPosition = stateService.position + self.currentTrackBlock.startindex;
			self.currentSeek = stateService.seek;
			self.currentDuration = stateService.duration;
			self.currentDynamicTitle = stateService.dynamictitle;
			self.currentSampleRate = stateService.samplerate;
			self.currentBitDepth = stateService.bitdepth;
			self.currentChannels = stateService.channels;

			self.getState()
				.then(libFast.bind(self.pushState, self))
				.fail(libFast.bind(self.pushError, self));

			return self.startPlaybackTimer(self.currentSeek);

		}

	} else if (stateService.status === 'stop') {

		// Service has stopped without client request, meaning it is finished playing its track block. Move on to next track block.
		if (self.currentStatus === 'play') {
			self.currentSeek = 0;
			self.currentDuration = 0;
			self.currentDynamicTitle = null;
			self.currentSampleRate = null;
			self.currentBitDepth = null;
			self.currentChannels = null;

			// If we have reached the end of the queue
			if (self.currentPosition >= self.playQueue.arrayQueue.length - 1) {
				self.currentStatus = 'stop';

				self.getState()
					.then(libFast.bind(self.pushState, self))
					.fail(libFast.bind(self.pushError, self));

				return self.stopPlaybackTimer();

			// Else move to next track
			} else {

				// Don't need to pushState here, since it will be called later during the next operation
				return self.stopPlaybackTimer()
					.then(libFast.bind(self.next, self));

			}

		// Client has requested stop, so stop the timer
		} else if (self.currentStatus === 'stop') {
			self.currentSeek = 0;
			self.currentDuration = 0;
			self.currentDynamicTitle = null;
			self.currentSampleRate = null;
			self.currentBitDepth = null;
			self.currentChannels = null;

			self.getState()
				.then(libFast.bind(self.pushState, self))
				.fail(libFast.bind(self.pushError, self));

			return self.stopPlaybackTimer();

		}

	} else if (stateService.status === 'pause') {

		// Client has requested pause, and service has just paused
		if (self.currentStatus === 'pause') {
			self.getState()
				.then(libFast.bind(self.pushState, self))
				.fail(libFast.bind(self.pushError, self));

			return self.stopPlaybackTimer();

		}

	}

	return libQ.reject('Error: \"' + sService + '\" state \"' + stateService.status + '\" not recognized when Volumio state is \"' + self.currentStatus + '\"');

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
