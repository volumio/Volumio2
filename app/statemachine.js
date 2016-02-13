'use strict';

var libQ = require('kew');

// Define the CoreStateMachine class
module.exports = CoreStateMachine;
function CoreStateMachine(commandRouter) {
	this.commandRouter = commandRouter;
	this.playQueue = new (require('./playqueue.js'))(commandRouter, this);
	this.VolumeControl = new (require('./volumecontrol.js'))(commandRouter, this);
	this.resetVolumioState();
}

// Public Methods ---------------------------------------------------------------------------------------
// Get the current state of the player
CoreStateMachine.prototype.getState = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::getState');
	var sService = null;
	if ('service' in this.currentTrackBlock) {
		sService = this.currentTrackBlock.service;
	}

	return {
		status: this.currentStatus,
		position: this.currentPosition,
		title: this.currentTitle,
		artist: this.currentArtist,
		album: this.currentAlbum,
		albumart: this.currentAlbumArt,
		uri: this.currentUri,
		seek: this.currentSeek,
		duration: this.currentDuration,
		samplerate: this.currentSampleRate,
		bitdepth: this.currentBitDepth,
		channels: this.currentChannels,
		random: this.currentRandom,
		repeat: this.currentRepeat,
		volume: this.currentVolume,
		mute: this.currentMute,
		stream: this.isStreaming,
		service: sService
	};
};

// Get the current contents of the play queue
CoreStateMachine.prototype.getQueue = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::getQueue');
	return this.playQueue.getQueue();
};

// Remove one item from the queue
CoreStateMachine.prototype.removeQueueItem = function (nIndex) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::removeQueueItem');
	return this.playQueue.removeQueueItem(nIndex);
};

// Add array of items to queue
CoreStateMachine.prototype.addQueueItems = function (arrayItems) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::addQueueItems');
	return this.playQueue.addQueueItems(arrayItems);
};

// Add array of items to queue
CoreStateMachine.prototype.clearQueue = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::ClearQueue');
	return this.playQueue.clearPlayQueue();
};

// Volumio Play Command
CoreStateMachine.prototype.play = function (promisedResponse) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::play');

		this.currentStatus = 'play';
		return this.serviceResume();
};

// Volumio Next Command
// TODO FIX WITH PREVIOUS MECHANISM, NOW THIS IS ONLY FOR MPD
CoreStateMachine.prototype.next = function (promisedResponse) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::next');

	if (this.currentStatus === 'stop') {
		// Stop -> Next transition
		if (this.currentPosition < this.playQueue.arrayQueue.length - 1) {
			this.currentPosition++;
			this.updateTrackBlock();
			return this.pushState();
		}

	} else if (this.currentStatus === 'play') {
		// Play -> Next transition
		/*if (this.currentPosition < this.playQueue.arrayQueue.length - 1) {
		 this.currentPosition++;
		 this.currentSeek = 0;
		 return this.updateTrackBlock().then(this.serviceClearAddPlay.bind(this));
		 }*/
		this.commandRouter.executeOnPlugin('music_service', 'mpd', 'next');

	} else if (this.currentStatus === 'pause') {
		// Pause -> Next transitiom
		if (this.currentPosition < this.playQueue.arrayQueue.length - 1) {
			this.currentPosition++;
		}
		this.currentStatus = 'play';
		this.currentSeek = 0;
		this.updateTrackBlock();
		return this.serviceClearAddPlay();
	}
};

// Volumio Previous Command
CoreStateMachine.prototype.previous = function (promisedResponse) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::previous');

	if (this.currentStatus === 'stop') {
		// Stop -> Previous transition
		if (this.currentPosition > 0) {
			this.currentPosition--;
			this.updateTrackBlock();
			return this.pushState();
		}

	} else if (this.currentStatus === 'play') {
		/*
		 // Play -> Previous transition
		 if (this.currentPosition > 0) {
		 this.currentPosition--;
		 this.currentSeek = 0;
		 this.updateTrackBlock()

		 return this.serviceClearAddPlay());
		 }*/
		this.commandRouter.executeOnPlugin('music_service', 'mpd', 'previous')


	} else if (this.currentStatus === 'pause') {
		// Pause -> Previous transition
		if (this.currentPosition > 0) {
			this.currentPosition--;
		}
		this.currentStatus = 'play';
		this.currentSeek = 0;
		this.updateTrackBlock();
		return this.serviceClearAddPlay();
	}
};

// Volumio Stop Command
CoreStateMachine.prototype.stop = function (promisedResponse) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::stop');

	if (this.currentStatus === 'play') {
		// Play -> Stop transition
		this.currentStatus = 'stop';
		this.currentSeek = 0;
		this.updateTrackBlock();
		return this.serviceStop();

	} else if (this.currentStatus === 'pause') {
		// Pause -> Stop transition
		this.currentStatus = 'stop';
		this.currentSeek = 0;
		this.updateTrackBlock();
		return this.serviceStop();
	}
};

// Volumio Pause Command
CoreStateMachine.prototype.pause = function (promisedResponse) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::pause');

	if (this.currentStatus === 'play') {
		// Play -> Pause transition
		this.currentStatus = 'pause';

		return this.servicePause();
	}
};

// Internal methods ---------------------------------------------------------------------------
// These are 'this' aware, and may or may not return a promise

// Update the currently active track block
CoreStateMachine.prototype.updateTrackBlock = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::updateTrackBlock');
	this.currentTrackBlock = this.playQueue.getTrackBlock(this.currentPosition);
};

// Perform a clear-add-play action on the current track block
CoreStateMachine.prototype.serviceClearAddPlay = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::serviceClearAddPlay');
	var trackBlock = this.currentTrackBlock;
	return this.commandRouter.serviceClearAddPlayTracks(trackBlock.uris, trackBlock.service);
};

// Stop the current track block playback
CoreStateMachine.prototype.serviceStop = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::serviceStop');
	var trackBlock = this.currentTrackBlock;
	return this.commandRouter.serviceStop(trackBlock.service);
};

// Pause the current track block playback
CoreStateMachine.prototype.servicePause = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::servicePause');
	var trackBlock = this.currentTrackBlock;
	return this.commandRouter.servicePause(trackBlock.service);
};

// Resume the current track block playback
CoreStateMachine.prototype.serviceResume = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::serviceResume');
	var trackBlock = this.currentTrackBlock;
	return this.commandRouter.serviceResume(trackBlock.service);
};

// Reset the properties of the state machine
CoreStateMachine.prototype.resetVolumioState = function () {
	var self = this;

	var volumeData =  this.VolumeControl.retrievevolume();
	volumeData.then(function (data) {
		self.currentVolume = volumeData.volume;
		self.currentMute = volumeData.mute;
	});

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
			self.currentTitle = null;
			self.currentArtist = null;
			self.currentAlbum = null;
			self.currentUri = null;
			self.currentAlbumArt = '/albumart';
			self.currentSampleRate = null;
			self.currentBitDepth = null;
			self.currentChannels = null;
			self.currentRandom = null;
			self.currentRepeat = null;
		});
};

// Start the timer to track playback time (counts in ms)
CoreStateMachine.prototype.startPlaybackTimer = function (nStartTime) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::startPlaybackTimer');

	clearInterval(this.timerPlayback);

	var self = this;
	this.timerPlayback = setInterval(function () {
		self.currentSeek = nStartTime + Date.now() - self.timeLastServiceStateUpdate;
	}, 500);

	return libQ.resolve();
};


//Update Volume Value
CoreStateMachine.prototype.updateVolume = function (Volume) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::updateVolume' + Volume.vol);
	this.currentVolume = Volume.vol;
	this.currentMute = Volume.mute;
	this.pushState().fail(this.pushError.bind(this));
};

//Gets current Volume and Mute Status
CoreStateMachine.prototype.getcurrentVolume = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::getcurrentVolume');
	this.commandRouter.volumioretrievevolume();
	this.updateTrackBlock();
	return libQ.resolve();
};

// Stop playback timer
CoreStateMachine.prototype.stopPlaybackTimer = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::stopPlaybackTimer');
	clearInterval(this.timerPlayback);
	return libQ.resolve();
};

// Announce updated Volumio state
CoreStateMachine.prototype.pushState = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::pushState');

	var promise = libQ.defer();

	var state = this.getState();
	var self = this;
	self.commandRouter.volumioPushState(state)
		.then(function (data) {
			self.checkFavourites(state)
				.then(function (a) {
					promise.resolve({});
				})
		});

	return promise.promise;
};

// Pass the error if we don't want to handle it
CoreStateMachine.prototype.pushError = function (sReason) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::pushError');
	this.commandRouter.pushConsoleMessage(sReason);
};

// Sync state from service status announcement
// Input state object has the form {status: sStatus, position: nPosition, seek: nSeek, duration: nDuration, samplerate: nSampleRate, bitdepth: nBitDepth, channels: nChannels, dynamictitle: sTitle}
CoreStateMachine.prototype.syncState = function (stateService, sService) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreStateMachine::syncState');
	this.timeLastServiceStateUpdate = Date.now();
	this.currentTrackBlock.service = sService;
	this.currentStatus = stateService.status;
	this.currentPosition = stateService.position;

	if (stateService.isStreaming != undefined) {
		this.isStreaming = stateService.isStreaming;
	}
	else this.isStreaming = false;

	if (this.isStreaming) {
		this.uri = stateService.uri;
	} else {
		this.uri = '/' + stateService.uri;
	}


	//If play is issued by a different entity than Volumio, the system will accept and handle it
	if (this.currentTrackBlock.service !== sService) {
		console.log(sService);
		this.currentTrackBlock.service = sService;
		this.currentStatus = stateService.status;
		this.currentPosition = stateService.position;
	}

	if (stateService.status === 'play') {
		if (this.currentStatus === 'play') {
			// We are waiting for playback to begin, and service has just begun playing
			// Or we are currently playing, and the playback service has announced an updated play state (next track, etc)
			this.currentPosition = stateService.position;
			this.currentSeek = stateService.seek;
			this.currentDuration = stateService.duration;
			this.currentTitle = stateService.title;
			this.currentArtist = stateService.artist;
			this.currentAlbum = stateService.album;
			this.currentAlbumArt = stateService.albumart;
			this.currentUri = this.uri;
			this.currentSampleRate = stateService.samplerate;
			this.currentBitDepth = stateService.bitdepth;
			this.currentChannels = stateService.channels;
			this.currentRandom = stateService.random;
			this.currentRepeat = stateService.repeat;

			this.pushState().fail(this.pushError.bind(this));

			return this.startPlaybackTimer(this.currentSeek);
		}
		else if (this.currentStatus === 'stop') {
			this.currentPosition = stateService.position;
			this.currentSeek = stateService.seek;
			this.currentDuration = stateService.duration;
			this.currentTitle = null;
			this.currentArtist = null;
			this.currentAlbum = null;
			this.currentAlbumArt = '/albumart';
			this.currentUri = stateService.uri;
			this.currentSampleRate = null;
			this.currentBitDepth = null;
			this.currentChannels = null;
			this.currentRandom = stateService.random;
			this.currentRepeat = stateService.repeat;

			this.pushState().fail(this.pushError.bind(this));

			return this.startPlaybackTimer(this.currentSeek)
		}

	} else if (stateService.status === 'stop') {
		if (this.currentStatus === 'play') {
			// Service has stopped without client request, meaning it is finished playing its track block. Move on to next track block.
			this.currentPosition = stateService.position;
			this.currentSeek = stateService.seek;
			this.currentDuration = stateService.duration;
			this.currentTitle = null;
			this.currentArtist = null;
			this.currentAlbum = null;
			this.currentAlbumArt = '/albumart';
			this.currentUri = stateService.uri;
			this.currentSampleRate = null;
			this.currentBitDepth = null;
			this.currentChannels = null;
			this.currentRandom = stateService.random;
			this.currentRepeat = stateService.repeat;

			if (this.currentPosition >= this.playQueue.arrayQueue.length - 1) {
				// If we have reached the end of the queue
				this.currentStatus = 'stop';

				this.pushState().fail(this.pushError.bind(this));

				return this.stopPlaybackTimer();

			} else {
				// Else move to next track
				// Don't need to pushState here, since it will be called later during the next operation
				return this.stopPlaybackTimer().then(this.next.bind(this));
			}

		} else if (this.currentStatus === 'stop') {
			// Client has requested stop, so stop the timer
			this.currentPosition = stateService.position;
			this.currentSeek = stateService.seek;
			this.currentDuration = stateService.duration;
			this.currentTitle = null;
			this.currentArtist = null;
			this.currentAlbum = null;
			this.currentAlbumArt = '/albumart';
			this.currentUri = stateService.uri;
			this.currentSampleRate = null;
			this.currentBitDepth = null;
			this.currentChannels = null;
			this.currentRandom = stateService.random;
			this.currentRepeat = stateService.repeat;

			this.pushState().fail(this.pushError.bind(this));

			return this.stopPlaybackTimer();
		}
	} else if (stateService.status === 'pause') {
		if (this.currentStatus === 'pause') {
			// Client has requested pause, and service has just paused
			this.pushState().fail(this.pushError.bind(this));

			return this.stopPlaybackTimer();
		}
	}
	/*else if (stateService.status === 'undefined') {
	 stateService.status = 'stop';
	 }

	 return libQ.reject('Error: \"' + sService + '\" state \"' + stateService.status + '\" not recognized when Volumio state is \"' + self.currentStatus + '\"');
	 */
};

CoreStateMachine.prototype.checkFavourites = function (state) {

	var defer = libQ.defer();
	var response = {
		service: state.service,
		uri: state.uri,
		favourite: false
	};

	if (state.uri != undefined && state.uri != null) {
		var promise = this.commandRouter.playListManager.listFavourites();
		var self = this;
		promise.then(function (favList) {
			/**
			 * WARNING: The favourites section uses music-library/ to start each uri
			 * This is not used in mpd uris, so we are adding it at the beginning of each uri
			 */
			var list = favList.navigation.list;
			var nFavs = list.length;
			for (var i = 0; i < nFavs; i++) {
				var match = state.uri;
				if (match == favList.navigation.list[i].uri) {
					response.favourite = true;
				}
			}
			self.emitFavourites(response);
		});
	}
	else {
		this.emitFavourites(response);
		defer.resolve({});
	}
	return defer.promise;
};


CoreStateMachine.prototype.emitFavourites = function (msg) {
	this.commandRouter.emitFavourites(msg);
};
