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
	var _this = this;

	// <- TODO - update seek pos here

	return libQ({status: _this.currentStatus, position: _this.currentPosition, seek: _this.currentSeek});

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

// Internal methods ---------------------------------------------------------------------------
// These are 'this' aware, and may or may not return a promise

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
	this.currentTrackBlock = [];
	this.currentService = '';

	// Return a resolved empty promise to represent completion
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
