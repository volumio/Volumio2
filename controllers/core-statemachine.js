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

	// <- TODO - update seek pos here

	return libQ({status: this.currentStatus, position: this.currentPosition, seek: this.currentSeek, duration: this.currentDuration});

}

// Get the current contents of the play queue
CoreStateMachine.prototype.getQueue = function () {

	console.log('CoreStateMachine::getQueue');
	return this.playQueue.getQueue();

}

// Volumio Play Command
CoreStateMachine.prototype.play = function (promisedResponse) {

	console.log('CoreStateMachine::play');

	if (this.currentStatus === 'stop') {
		this.currentStatus = 'playPending';

		this.pushState()
			.catch(console.log);

		return this.serviceClearAddPlay();

	} else if (this.currentStatus === 'pause') {
		this.currentStatus = 'play';
		// TODO action here

	}

}

// Volumio Next Command
CoreStateMachine.prototype.next = function (promisedResponse) {

	console.log('CoreStateMachine::next');
	if (this.currentStatus === 'stop') {
		if (this.currentPosition < this.playQueue.arrayQueue.length - 1) {
			this.currentPosition++;
			// TODO action here

		}

	} else if (this.currentStatus === 'play') {
		if (this.currentPosition < this.playQueue.arrayQueue.length - 1) {
			this.currentPosition++;
			this.currentSeek = 0;
			// TODO action here

		}

	} else if (this.currentStatus === 'pause') {
		if (this.currentPosition < this.playQueue.arrayQueue.length - 1) {
			this.currentPosition++;

		}

		this.currentStatus = 'play';
		this.currentSeek = 0;
		// TODO action here

	}

}

// Volumio Previous Command
CoreStateMachine.prototype.previous = function (promisedResponse) {

	console.log('CoreStateMachine::previous');
	if (this.currentStatus === 'stop') {
		if (this.currentPosition > 0) {
			this.currentPosition--;
			// TODO action here

		}

	} else if (this.currentStatus === 'play') {
		if (this.currentPosition > 0) {
			this.currentPosition--;
			this.currentSeek = 0;
			// TODO action here

		}

	} else if (this.currentStatus === 'pause') {
		if (this.currentPosition > 0) {
			this.currentPosition--;

		}

		this.currentStatus = 'play';
		this.currentSeek = 0;
		// TODO action here

	}

}

// Volumio Stop Command
CoreStateMachine.prototype.stop = function (promisedResponse) {

	console.log('CoreStateMachine::stop');
	if (this.currentStatus === 'play') {
		this.currentStatus = 'stop';
		this.currentSeek = 0;
		// TODO action here

	} else if (this.currentStatus === 'pause') {
		this.currentStatus = 'stop';
		this.currentSeek = 0;
		// TODO action here

	}

}

// Volumio Pause Command
CoreStateMachine.prototype.pause = function (promisedResponse) {

	console.log('CoreStateMachine::pause');
	if (this.currentStatus === 'play') {
		this.currentStatus = 'pause';
		// <- TODO - update seek pos here
		// TODO action here

	}

}

// Volumio sync state from MPD
// Input state object has the form {status: 'play', repeat: 0, random: 0, single: 0, position: 0, seek: 0, duration: 0}
CoreStateMachine.prototype.syncStateFromMpd = function (stateMpd) {

	console.log('CoreStateMachine::syncStateFromMpd');
	var _this = this;

	this.timeLastServiceStateUpdate = Date.now();

	if (stateMpd.status === 'play') {

		// We are waiting for playback to begin, and it has just begun
		// Or we are playing, and the playback service has announced an updated play state (next track, etc)
		if (this.currentStatus === 'playPending' || this.currentStatus === 'play') {
			this.currentStatus = 'play';
			this.currentPosition = stateMpd.position + this.currentTrackBlock.startindex;
			this.currentSeek = stateMpd.seek;
			this.currentDuration = stateMpd.duration;

			this.startPlaybackTimer(this.currentSeek)
				.catch(_this.pushError.bind(_this))

			return this.pushState();

		}

	}

	return libQ.reject('Error: MPD state \"' + stateMpd.status + '\" not recognized when Volumio state is \"' + this.currentStatus + '\"');

}

// Internal methods ---------------------------------------------------------------------------
// These are 'this' aware, and may or may not return a promise

// Perform a clear-add-play action on the current track block
CoreStateMachine.prototype.serviceClearAddPlay = function () {

	console.log('CoreStateMachine::serviceClearAddPlay');
	var _this = this;

	return this.playQueue.getTrackBlock(this.currentPosition)
		.then(function (trackBlock) {
			_this.currentTrackBlock = trackBlock;

			if (trackBlock.service === 'mpd') {
				return _this.commandRouter.mpdClearAddPlayTracks(trackBlock.trackids);

			} else {
				return libQ.reject('Service ' + trackBlock.service + ' is not recognized for clear-add-play action');

			}

		});

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

	// Return a resolved empty promise to represent completion
	return libQ();

}

// Start the timer to track playback time (counts in ms)
CoreStateMachine.prototype.startPlaybackTimer = function (nStartTime) {

	console.log('CoreStateMachine::startPlaybackTimer');
	var _this = this;

	return this.stopPlaybackTimer()
		.then(function () {
			_this.timerPlayback = setInterval(function () {
				_this.currentSeek = nStartTime + Date.now() - _this.timeLastServiceStateUpdate;

			}, 500);

		});

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
