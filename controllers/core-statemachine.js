var libQ = require('q');

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

	console.log('CoreStateMachine::getState');

	var sService = null;
	if ('service' in this.currentTrackBlock) {
		sService = this.currentTrackBlock.service;

	}

	return libQ({
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

	console.log('CoreStateMachine::getQueue');
	return this.playQueue.getQueue();

}

// Volumio Play Command
CoreStateMachine.prototype.play = function (promisedResponse) {

	console.log('CoreStateMachine::play');
	var _this = this;

	// Stop -> Play transition
	if (this.currentStatus === 'stop') {
		this.currentStatus = 'play';

		return this.updateTrackBlock()
			.then(_this.serviceClearAddPlay.bind(_this));

	// Pause -> Play transition
	} else if (this.currentStatus === 'pause') {
		this.currentStatus = 'play';

		return this.serviceResume();

	}

}

// Volumio Next Command
CoreStateMachine.prototype.next = function (promisedResponse) {

	console.log('CoreStateMachine::next');
	var _this = this;

	// Stop -> Next transition
	if (this.currentStatus === 'stop') {
		if (this.currentPosition < this.playQueue.arrayQueue.length - 1) {
			this.currentPosition++;

			return this.updateTrackBlock()
				.then(_this.pushState.bind(_this));

		}

	// Play -> Next transition
	} else if (this.currentStatus === 'play') {
		if (this.currentPosition < this.playQueue.arrayQueue.length - 1) {
			this.currentPosition++;
			this.currentSeek = 0;

			return this.updateTrackBlock()
				.then(_this.serviceClearAddPlay.bind(_this));

		}

	// Pause -> Next transitiom
	} else if (this.currentStatus === 'pause') {
		if (this.currentPosition < this.playQueue.arrayQueue.length - 1) {
			this.currentPosition++;

		}

		this.currentStatus = 'play';
		this.currentSeek = 0;

		return this.updateTrackBlock()
			.then(_this.serviceClearAddPlay.bind(_this));

	}

}

// Volumio Previous Command
CoreStateMachine.prototype.previous = function (promisedResponse) {

	console.log('CoreStateMachine::previous');
	var _this = this;

	// Stop -> Previous transition
	if (this.currentStatus === 'stop') {
		if (this.currentPosition > 0) {
			this.currentPosition--;

			return this.updateTrackBlock()
				.then(_this.pushState.bind(_this));

		}

	// Play -> Previous transition
	} else if (this.currentStatus === 'play') {
		if (this.currentPosition > 0) {
			this.currentPosition--;
			this.currentSeek = 0;

			return this.updateTrackBlock()
				.then(_this.serviceClearAddPlay.bind(_this));


		}

	// Pause -> Previous transition
	} else if (this.currentStatus === 'pause') {
		if (this.currentPosition > 0) {
			this.currentPosition--;

		}

		this.currentStatus = 'play';
		this.currentSeek = 0;

		return this.updateTrackBlock()
			.then(_this.serviceClearAddPlay.bind(_this));


	}

}

// Volumio Stop Command
CoreStateMachine.prototype.stop = function (promisedResponse) {

	console.log('CoreStateMachine::stop');
	var _this = this;

	// Play -> Stop transition
	if (this.currentStatus === 'play') {
		this.currentStatus = 'stop';
		this.currentSeek = 0;

		return this.updateTrackBlock()
			.then(_this.serviceStop.bind(_this));

	// Pause -> Stop transition
	} else if (this.currentStatus === 'pause') {
		this.currentStatus = 'stop';
		this.currentSeek = 0;

		return this.updateTrackBlock()
			.then(_this.serviceStop.bind(_this));

	}

}

// Volumio Pause Command
CoreStateMachine.prototype.pause = function (promisedResponse) {

	console.log('CoreStateMachine::pause');
	var _this = this;

	// Play -> Pause transition
	if (this.currentStatus === 'play') {
		this.currentStatus = 'pause';

		return this.servicePause();

	}

}

// Sync state from MPD
CoreStateMachine.prototype.syncStateFromMpd = function (stateMpd) {

	console.log('CoreStateMachine::syncStateFromMpd');

	if (this.currentTrackBlock.service !== 'mpd') {
		return libQ.reject('Error: MPD announced a state update when it is not the currently active service');

	} else {
		return this.syncState(stateMpd, 'mpd');

	}


}

// Sync state from Spotify
CoreStateMachine.prototype.syncStateFromSpotify = function (stateSpotify) {

	console.log('CoreStateMachine::syncStateFromSpotify');

	if (this.currentTrackBlock.service !== 'spotify') {
		return libQ.reject('Error: Spotify announced a state update when it is not the currently active service');

	} else {
		return this.syncState(stateSpotify, 'spotify');

	}


}

// Internal methods ---------------------------------------------------------------------------
// These are 'this' aware, and may or may not return a promise

// Update the currently active track block
CoreStateMachine.prototype.updateTrackBlock = function () {

	console.log('CoreStateMachine::updateTrackBlock');
	var _this = this;

	return this.playQueue.getTrackBlock(this.currentPosition)
		.then(function (trackBlock) {
			_this.currentTrackBlock = trackBlock;

		});

}

// Perform a clear-add-play action on the current track block
CoreStateMachine.prototype.serviceClearAddPlay = function () {

	console.log('CoreStateMachine::serviceClearAddPlay');
	var trackBlock = this.currentTrackBlock;

	if (trackBlock.service === 'mpd') {

		return this.commandRouter.mpdClearAddPlayTracks(trackBlock.trackids);

	} else if (trackBlock.service === 'spotify') {

		return this.commandRouter.spotifyClearAddPlayTracks(trackBlock.trackids);

	} else {

		return libQ.reject('Error: Service ' + trackBlock.service + ' is not recognized for \"clear-add-play\" action');

	}

}

// Stop the current track block playback
CoreStateMachine.prototype.serviceStop = function () {

	console.log('CoreStateMachine::serviceStop');
	var trackBlock = this.currentTrackBlock;

	if (trackBlock.service === 'mpd') {

		return this.commandRouter.mpdStop();

	} else if (trackBlock.service === 'spotify') {

		return this.commandRouter.spotifyStop();

	} else {

		return libQ.reject('Error: Service ' + trackBlock.service + ' is not recognized for \"stop\" action');

	}

}

// Pause the current track block playback
CoreStateMachine.prototype.servicePause = function () {

	console.log('CoreStateMachine::servicePause');
	var trackBlock = this.currentTrackBlock;

	if (trackBlock.service === 'mpd') {

		return this.commandRouter.mpdPause();

	} else if (trackBlock.service === 'spotify') {

		return this.commandRouter.spotifyPause();

	} else {

		return libQ.reject('Error: Service ' + trackBlock.service + ' is not recognized for \"pause\" action');

	}

}

// Resume the current track block playback
CoreStateMachine.prototype.serviceResume = function () {

	console.log('CoreStateMachine::serviceResume');
	var trackBlock = this.currentTrackBlock;

	if (trackBlock.service === 'mpd') {

		return this.commandRouter.mpdResume();

	} else if (trackBlock.service === 'spotify') {

		return this.commandRouter.spotifyResume();

	} else {

		return libQ.reject('Error: Service ' + trackBlock.service + ' is not recognized for \"resume\" action');

	}

}

// Reset the properties of the state machine
CoreStateMachine.prototype.resetVolumioState = function () {

	console.log('CoreStateMachine::resetVolumioState');
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

	console.log('CoreStateMachine::startPlaybackTimer');
	var _this = this;

	clearInterval(this.timerPlayback);
	this.timerPlayback = setInterval(function () {
		_this.currentSeek = nStartTime + Date.now() - _this.timeLastServiceStateUpdate;

	}, 500);

	return libQ();

}

// Stop playback timer
CoreStateMachine.prototype.stopPlaybackTimer = function () {

	console.log('CoreStateMachine::stopPlaybackTimer');

	clearInterval(this.timerPlayback);

	return libQ();

}

// Announce updated Volumio state
CoreStateMachine.prototype.pushState = function () {

	console.log('CoreStateMachine::pushState');
	var _this = this;

	return this.getState()
			.then(_this.commandRouter.volumioPushState.bind(_this.commandRouter));

}

// Pass the error if we don't want to handle it
CoreStateMachine.prototype.pushError = function (sReason) {

	console.log('CoreStateMachine::pushError');
	console.log(sReason);

}

// Sync state from service status announcement
// Input state object has the form {status: sStatus, position: nPosition, seek: nSeek, duration: nDuration, samplerate: nSampleRate, bitdepth: nBitDepth, channels: nChannels, dynamictitle: sTitle}
CoreStateMachine.prototype.syncState = function (stateService, sService) {

	console.log('CoreStateMachine::syncState');
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

			this.pushState();

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

			// Don't need to pushState here, since it will be called later when the next service announces playback

			return this.stopPlaybackTimer()
				.then(_this.next.bind(_this));

		// Client has requested stop, so stop the timer
		} else if (this.currentStatus === 'stop') {
			this.currentSeek = 0;
			this.currentDuration = 0;
			this.currentDynamicTitle = null;
			this.currentSampleRate = null;
			this.currentBitDepth = null;
			this.currentChannels = null;

			this.pushState();

			return this.stopPlaybackTimer();

		}

	} else if (stateService.status === 'pause') {

		// Client has requested pause, and service has just paused
		if (this.currentStatus === 'pause') {
			this.pushState();

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
