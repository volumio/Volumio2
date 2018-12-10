'use strict';

var libQ = require('kew');
var RandomQueue = require('./randomqueue');

// Define the CoreStateMachine class
module.exports = CoreStateMachine;
function CoreStateMachine(commandRouter) {
	this.unmanagedMode=false;

	this.commandRouter = commandRouter;

	this.currentPosition=0;
	this.currentConsume=false;
    this.currentRepeat=false;
    this.currentRepeatSingleSong=false;
	this.prefetchDone=false;
	this.askedForPrefetch=false;
	this.simulateStopStartDone=false;
    this.volatileService="";
    this.volatileState={};
	this.isVolatile = false;
    this.currentDisableVolumeControl = false;
    this.previousTrackonPrev = false;
    /**
     * This field tells the system if it is currenty running in consume mode
     * @type {boolean} true or false wether the system is in consume mode
     */
	this.isConsume=false;

    /**
     * This variable contains the consume state to return when getState is being invoked
     * @type {{}} JSON containing the state
     */
	this.consumeState={};

    /**
     * This variable contains the service to handle when in consume mode
     */
	this.consumeUpdateService;

	/**
	*This field tells the system if it is currenty running in consume mode, but no metadata should be retrieved
	* @type {boolean} true or false
	*/
	this.consumeIgnoreMetadata = false;

    this.isUpnp = false;

	this.randomQueue = new RandomQueue(this);
	this.playQueue = new (require('./playqueue.js'))(commandRouter, this);
	this.resetVolumioState();
    this.commandRouter.initPlayerControls();
}

// Public Methods ---------------------------------------------------------------------------------------
// Get the current state of the player
CoreStateMachine.prototype.getState = function () {
    this.commandRouter.pushDebugConsoleMessage('CoreStateMachine::getState');

    if(this.isVolatile)
    {
		// Here we are in volatile state mode, so we do not take playback informations from the queue but rather from the volatileState
		if (this.volatileState.stream === undefined) {
			this.volatileState.stream = false;
		}

		if (this.volatileState.trackType === undefined) {
			this.volatileState.trackType = '';
		}

        if (this.volatileState.albumart === undefined) {
            this.volatileState.albumart = '/albumart';
        }

        return {
            status: this.volatileState.status,
            title: this.volatileState.title,
            artist: this.volatileState.artist,
            album: this.volatileState.album,
            albumart: this.volatileState.albumart,
            uri: this.volatileState.uri,
            trackType: this.volatileState.trackType,
            seek: this.volatileState.seek,
            duration: this.volatileState.duration,
            samplerate: this.volatileState.samplerate,
            bitdepth: this.volatileState.bitdepth,
            channels: this.volatileState.channels,
            random: false,
            repeat: false,
            repeatSingle:false,
            consume: false,
            volume: this.currentVolume,
            mute: this.currentMute,
            disableVolumeControl: this.currentDisableVolumeControl,
            stream: this.volatileState.stream,
            updatedb: this.currentUpdate,
			volatile: true,
			trackType: this.volatileState.trackType,
            disableUiControls: this.volatileState.disableUiControls,
            service: this.volatileState.service
        };
    }
    else if(this.isConsume)
    {
        // checking consumeState or the below code will throw an exception
        if(this.consumeState)
        {
        	//we identify a webradio stream from its duration which is zero
        if(this.consumeState.duration == '0') {
            this.consumeState.stream = true;
            this.consumeState.service = 'webradio';
            this.consumeState.trackType = 'webradio';
            this.consumeState.samplerate = '';
            this.consumeState.bitdepth =  '';
        }


            return {
                status: this.consumeState.status,
                position: this.currentPosition,
                title: this.consumeState.title,
                artist: this.consumeState.artist,
                album: this.consumeState.album,
                albumart: this.consumeState.albumart,
                uri: this.consumeState.uri,
                trackType: this.consumeState.trackType,
                seek: this.consumeState.seek,
                duration: this.consumeState.duration,
                samplerate: this.consumeState.samplerate,
                bitdepth: this.consumeState.bitdepth,
                channels: this.consumeState.channels,
                random: this.currentRandom,
                repeat: this.currentRepeat,
                repeatSingle: this.currentRepeatSingleSong,
                consume: true,
                volume: this.currentVolume,
                mute: this.currentMute,
                disableVolumeControl: this.currentDisableVolumeControl,
                stream: this.consumeState.stream,
                updatedb: this.currentUpdate,
                volatile: false,
                trackType: this.consumeState.trackType,
                service: this.consumeState.service
            };
        }
        else
        {
            return this.getEmptyState();
        }
    }
    else
    {
        var trackBlock = this.getTrack(this.currentPosition);
        if(trackBlock===undefined )
        {
            return this.getEmptyState();
        }
        else {
            if (trackBlock.service === 'webradio') {
                trackBlock.trackType = 'webradio';
                trackBlock.bitdepth = '';
                trackBlock.samplerate = '';
            }
            return {
                status: this.currentStatus,
                position: this.currentPosition,
                title: trackBlock.name,
                artist: trackBlock.artist,
                album: trackBlock.album,
                albumart: trackBlock.albumart,
                uri: trackBlock.uri,
                trackType: trackBlock.trackType,
                seek: this.currentSeek,
                duration: trackBlock.duration,
                samplerate: trackBlock.samplerate,
                bitdepth: trackBlock.bitdepth,
                channels: trackBlock.channels,
                random: this.currentRandom,
                repeat: this.currentRepeat,
                repeatSingle: this.currentRepeatSingleSong,
                consume: this.currentConsume,
                volume: this.currentVolume,
                disableVolumeControl: this.currentDisableVolumeControl,
                mute: this.currentMute,
                stream: trackBlock.trackType,
                updatedb: this.currentUpdate,
				volatile: false,
                service: trackBlock.service
            };
        }
    }


};

/**
 * This method returns an empty state. It is used when the state cannot be built from current information
 * @returns the status
 */
CoreStateMachine.prototype.getEmptyState = function () {
    return {
        status: 'stop',
        position: 0,
        title: '',
        artist: '',
        album: '',
        albumart: '/albumart',
        duration:0,
        uri: '',
        seek: 0,
        samplerate: '',
        channels: '',
        bitdepth: '',
        Streaming: false,
        service: 'mpd',
        volume: this.currentVolume,
        mute: this.currentMute,
        disableVolumeControl: this.currentDisableVolumeControl,
        random:this.currentRandom,
        repeat: this.currentRepeat,
        repeatSingle: this.currentRepeatSingleSong,
        updatedb: this.currentUpdate,
        consume: this.currentConsume
    };
}





// Get the current contents of the play queue
CoreStateMachine.prototype.getQueue = function () {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::getQueue');
	return this.playQueue.getQueue();
};

// Remove one item from the queue


// Add array of items to queue
CoreStateMachine.prototype.addQueueItems = function (arrayItems) {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::addQueueItems');

	return this.playQueue.addQueueItems(arrayItems);
};

// Add array of items to queue
CoreStateMachine.prototype.clearQueue = function () {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::ClearQueue');

	this.stop();
	return this.playQueue.clearPlayQueue();

};











// Volumio Stop Command
/*CoreStateMachine.prototype.stop = function (promisedResponse) {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::stop');

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
	else return libQ.resolve();
};*/

// Volumio Pause Command
CoreStateMachine.prototype.pause = function (promisedResponse) {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::pause');

	if (this.currentStatus === 'play') {
		// Play -> Pause transition
		if (this.currentTrackType === 'webradio') {
			this.currentStatus = 'stop';
			return this.serviceStop();

		} else {
			this.currentStatus = 'pause';
			return this.servicePause();
		}
	}
};


// Internal methods ---------------------------------------------------------------------------
// These are 'this' aware, and may or may not return a promise

// Update the currently active track block
CoreStateMachine.prototype.updateTrackBlock = function () {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::updateTrackBlock');
	this.currentTrackBlock = this.playQueue.getTrackBlock(this.currentPosition);

	return libQ.resolve();
};

// Perform a clear-add-play action on the current track block
CoreStateMachine.prototype.serviceClearAddPlay = function () {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::serviceClearAddPlay');
	var trackBlock = this.currentTrackBlock;
	return this.commandRouter.serviceClearAddPlayTracks(trackBlock.uris, trackBlock.service);
};





// Resume the current track block playback
CoreStateMachine.prototype.serviceResume = function (trackBlock) {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::serviceResume');

	return this.commandRouter.serviceResume(trackBlock.service);
};

// Reset the properties of the state machine
CoreStateMachine.prototype.resetVolumioState = function () {
	var self = this;

	return libQ.resolve()
		.then(function () {
			self.commandRouter.pushConsoleMessage('CoreStateMachine::resetVolumioState');
			self.currentStatus = 'stop';
			self.currentPosition = 0;
			self.currentSeek = 0;
			self.currentDuration = 0;
			self.currentTrackBlock = [];
			self.timeLastServiceStateUpdate = 0;
			self.currentTrackType = null;
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
			self.currentVolume = null;
			self.currentMute = null;
			self.currentUpdate = false;
			self.getcurrentVolume();
		});
};

// Start the timer to track playback time (counts in ms)
CoreStateMachine.prototype.startPlaybackTimer = function (nStartTime) {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::startPlaybackTimer');

	this.runPlaybackTimer=true;
	this.playbackStart=Date.now();

	var trackBlock = this.getTrack(this.currentPosition);

	if(trackBlock){
		this.currentSongDuration=trackBlock.duration*1000;


		this.askedForPrefetch=false;
		this.simulateStopStartDone=false;
		this.prefetchDone=false;

		setTimeout(this.increasePlaybackTimer.bind(this),250);
	}
	return libQ.resolve();
};

// Stop playback timer
CoreStateMachine.prototype.stopPlaybackTimer = function () {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::stPlaybackTimer');

	this.runPlaybackTimer=false;
	this.currentSongDuration=0;
	this.askedForPrefetch=false;
	return libQ.resolve();
};



CoreStateMachine.prototype.getNextIndex = function () {
    var nextIndex=this.currentPosition+1;

    var isLastTrack=(this.playQueue.arrayQueue.length-1)==this.currentPosition;

    // Check if Repeat mode is on and last track is played, note that Random and Consume overides Repeat
    if(this.currentRepeat)
    {
        if(this.currentRepeatSingleSong) {
            nextIndex=this.currentPosition;
        } else if (isLastTrack) {
            nextIndex=0;
        }

    }

    if(isLastTrack && this.currentConsume)
    {
        nextIndex=0;
    }

    // Then check if Random mode is on - Random mode overrides Repeat mode by this
    if(this.currentRandom)
    {
		nextIndex = this.randomQueue.next();
        this.nextRandomIndex=nextIndex;
    }

    return nextIndex;
};


// Stop playback timer
CoreStateMachine.prototype.increasePlaybackTimer = function () {
	var self=this;

	var now=Date.now();
	this.currentSeek+=(now-this.playbackStart);

	if(this.runPlaybackTimer==true)
	{
		this.playbackStart=Date.now();


		var remainingTime=this.currentSongDuration-this.currentSeek;
		if(remainingTime>=0 && remainingTime<5000 && this.askedForPrefetch==false)
		{
			this.askedForPrefetch=true;

			var trackBlock = this.getTrack(this.currentPosition);

            var nextIndex=this.getNextIndex();

            var nextTrackBlock = this.getTrack(nextIndex);
			if(nextTrackBlock!==undefined && nextTrackBlock!==null && nextTrackBlock.service==trackBlock.service)
			{
                this.commandRouter.pushConsoleMessage("Prefetching next song");

				var plugin = this.commandRouter.pluginManager.getPlugin('music_service', trackBlock.service);
				if(typeof(plugin.prefetch) === typeof(Function))
				{
					this.prefetchDone=true;
					plugin.prefetch(nextTrackBlock);
				}
			}
		}

		if(remainingTime>=0 && remainingTime<=500 && this.prefetchDone==true && this.simulateStopStartDone==false)
		{

			this.simulateStopStartDone=true;
			this.currentSeek=0;


			if(this.currentRandom)
            {
                this.currentPosition=this.nextRandomIndex;
            }
            else
            {
                this.currentPosition=this.getNextIndex();
            }

			this.nextRandomIndex=undefined;

            this.askedForPrefetch=false;
			this.pushState.bind(this);

			this.startPlaybackTimer();

		} else setTimeout(this.increasePlaybackTimer.bind(this),250);
	}
};




//Update Volume Value
CoreStateMachine.prototype.updateVolume = function (Volume) {

	this.currentVolume = Volume.vol;
	this.currentMute = Volume.mute;
	this.currentDisableVolumeControl = Volume.disableVolumeControl;
	this.pushState().fail(this.pushError.bind(this));
};

//Gets current Volume and Mute Status
CoreStateMachine.prototype.getcurrentVolume = function () {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::getcurrentVolume');
	this.commandRouter.volumioretrievevolume().then((volumeData)=>{
    	self.currentVolume = volumeData.vol;
    	self.currentMute = volumeData.mute;
    	self.currentDisableVolumeControl = volumeData.disableVolumeControl;
	})

	this.updateTrackBlock();
	return libQ.resolve();
};



// Announce updated Volumio state
CoreStateMachine.prototype.pushState = function () {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::pushState');

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

CoreStateMachine.prototype.pushEmptyState = function () {
	this.commandRouter.pushDebugConsoleMessage('CoreStateMachine::pushEmptyState');

	var promise = libQ.defer();

	var state = this.getEmptyState();

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
	this.commandRouter.pushConsoleMessage('CoreStateMachine::pushError');
	this.commandRouter.pushConsoleMessage(sReason);
};

// Sync state from service status announcement
// Input state object has the form {status: sStatus, position: nPosition, seek: nSeek, duration: nDuration, samplerate: nSampleRate, bitdepth: nBitDepth, channels: nChannels, dynamictitle: sTitle}
CoreStateMachine.prototype.syncState = function (stateService, sService) {
	var  self = this;
	this.commandRouter.pushDebugConsoleMessage('CoreStateMachine::syncState');

  //Checking if stateService is defined (REPLACE WITH CONDITIONAL LIBRARY AS SOON AS POSSIBLE)
  if(!stateService)
  {
    this.commandRouter.pushErrorConsoleMessage('variable stateService in CoreStateMachine::syncState is undefined');
  }


  if (this.isVolatile && (stateService.status == 'play' || stateService.status == 'pause')) {
    this.volatileService = sService;
    this.currentStatus=stateService.status;
    this.volatileState=stateService;
    this.pushState().fail(this.pushError.bind(this));
    return;
	} else if (this.volatileState && stateService.status == 'stop'){
    this.volatileService = undefined;
      this.pushState().fail(this.pushError.bind(this));
    //this.currentStatus='stop';
		var trackBlock = this.getTrack(this.currentPosition);
	} else if (this.isUpnp){
		console.log('In UPNP mode')

  } else {
    this.volatileService = undefined;

    var trackBlock = this.getTrack(this.currentPosition);
	}

    /**
     *
     *
     *
     */
	if(this.consumeUpdateService){
		if(this.consumeUpdateService!=sService) {
			this.commandRouter.pushConsoleMessage('CONSUME SERVICE: Received update from a service different from the one supposed to be playing music. Skipping notification. Current '+this.consumeUpdateService+" Received "+sService);
			if (this.consumeUpdateService == 'upnp') {
        		this.consumeUpdateService = 'mpd';
        		sService = 'mpd';
			} else {
        		return;
			}
		}
	} else {
		if((trackBlock!=undefined && trackBlock.service!==sService) && trackBlock.service !== 'upnp_browser') {
			this.commandRouter.pushConsoleMessage('Received update from a service different from the one supposed to be playing music. Skipping notification.Current '+trackBlock.service+" Received "+sService);
			return;
		}
	}
	this.timeLastServiceStateUpdate = Date.now();
  this.commandRouter.pushDebugConsoleMessage("STATE SERVICE "+JSON.stringify(stateService));
  this.commandRouter.pushDebugConsoleMessage("CURRENT POSITION "+this.currentPosition);

	if (stateService.isStreaming != undefined) {
		this.isStreaming = stateService.isStreaming;
	} else {
		this.isStreaming = false;
	}

	if (this.isStreaming) {
		this.uri = stateService.uri;
	} else {
		this.uri = '/' + stateService.uri;
	}
	this.currentUpdate = stateService.updatedb;
	this.commandRouter.pushConsoleMessage('CoreStateMachine::syncState   stateService '+stateService.status);
	this.commandRouter.pushConsoleMessage('CoreStateMachine::syncState   currentStatus '+this.currentStatus);


	if (stateService.status === 'play') {
		if (this.currentStatus === 'play') {
			this.commandRouter.pushConsoleMessage('Received an update from plugin. extracting info from payload');

			// Checking if system is in consume mode. If it is the status shall be stored
			if(this.isConsume && stateService)
      {
        var consumeAlbum=stateService.album;
        var consumeArtist=stateService.artist;
        var consumeAlbumArt='/albumart';
				if(trackBlock != undefined && typeof trackBlock.albumart !== "undefined" && trackBlock.albumart != "" && trackBlock.albumart != "/albumart"){
					consumeAlbumArt = trackBlock.albumart;
				}else if(consumeArtist)
        {
          consumeAlbumArt=this.commandRouter.executeOnPlugin('miscellanea','albumart','getAlbumArt',
	        {
            artist:consumeArtist,
            album:consumeAlbum
	        });
        }
				if (stateService.service == undefined ) {
					stateService.service = 'mpd';
				}

				if (this.consumeIgnoreMetadata != undefined && this.consumeIgnoreMetadata) {
					var sRate;
					var bDepth;

					if(stateService.trackType === 'qobuz' || stateService.trackType === 'tidal')
					{
						sRate= stateService.samplerate;
						bDepth= stateService.bitdepth;
					} else {
						sRate= trackBlock.samplerate;
						bDepth= trackBlock.bitdepth;
					}

					this.consumeState={
						status:stateService.status,
						title:trackBlock.name,
						artist:trackBlock.artist,
						album:trackBlock.album,
						albumart:trackBlock.albumart,
						uri:stateService.uri,
						trackType:stateService.trackType,
						seek:stateService.seek,
						duration:stateService.duration,
						samplerate:sRate,
						bitdepth:bDepth,
						channels:stateService.channels,
						stream:stateService.isStreaming
					};
				} else {

					this.consumeState={
						status:stateService.status,
						title:stateService.title,
						artist:stateService.artist,
						album:stateService.album,
						albumart:consumeAlbumArt,
						uri:stateService.uri,
						trackType:stateService.trackType,
						seek:stateService.seek,
						duration:stateService.duration,
						samplerate:stateService.samplerate,
						bitdepth:stateService.bitdepth,
						channels:stateService.channels,
						stream:stateService.isStreaming,
						service:stateService.service
					};

				}

            }
			else
            {
                //checking if prefetch has been done. In that case the update is sent elsewhere
                if(this.askedForPrefetch==false) {


                    if (stateService.seek !== undefined) {
                        this.currentSeek = stateService.seek;
                    }

                    if(trackBlock!==undefined)
                    {
                        if (stateService.duration !== undefined) {
                            trackBlock.duration = stateService.duration;
                        }

                        if (stateService.samplerate !== undefined && trackBlock.samplerate === undefined) {
                            trackBlock.samplerate = stateService.samplerate;
                        }

                        if (stateService.bitdepth !== undefined && trackBlock.bitdepth === undefined) {
                            trackBlock.bitdepth = stateService.bitdepth;
                        }

                        if (stateService.channels !== undefined && trackBlock.channels === undefined) {
                            trackBlock.channels = stateService.channels;
                        }

                        if (stateService.title !== undefined)
                        {
                            if(trackBlock.service==='webradio'  || trackBlock.name === undefined)
                                trackBlock.name = stateService.title;

                        }

                        if (stateService.artist !== undefined && trackBlock.artist === undefined) {
                            trackBlock.artist = stateService.artist;
                        }

                        if (stateService.album !== undefined && trackBlock.album === undefined) {
                            trackBlock.album = stateService.album;
                        }

                        if (stateService.albumart !== undefined && trackBlock.albumart === undefined) {
                            trackBlock.albumart = stateService.albumart;
                        }
                    }
                }
            }


            this.currentStatus='play';
            this.pushState().fail(this.pushError.bind(this));
		}
		else if (this.currentStatus === 'stop') {

			//this.currentPosition = stateService.position;
			this.currentSeek = stateService.seek;
			this.currentDuration = stateService.duration;
			this.currentTrackType = null;
			this.currentTitle = null;
			this.currentArtist = null;
			this.currentAlbum = null;
			this.currentAlbumArt = '/albumart';
			this.currentUri = stateService.uri;
			this.currentSampleRate = null;
			this.currentBitDepth = null;
			this.currentChannels = null;
			this.currentStatus = 'play';


			/* if (this.currentPosition >= this.playQueue.arrayQueue.length) {
			 this.commandRouter.logger.info("END OF QUEUE ");

			 this.pushState().fail(this.pushError.bind(this));

			 return this.stopPlaybackTimer();

			 } else {
			 this.play();
			 this.pushState().fail(this.pushError.bind(this));
			 }*/
		}
		else if (this.currentStatus === 'pause') {
			this.currentStatus='play';
            if(this.isConsume)
            {
                this.consumeState.status='play';
                this.consumeState.seek=this.currentSeek
            }
			this.pushState().fail(this.pushError.bind(this));
		}

	} else if (stateService.status === 'stop') {
		if (this.currentStatus === 'play') {

			// Service has stopped without client request, meaning it is finished playing its track block. Move on to next track block.
			//this.currentPosition = stateService.position;
			this.currentSeek = stateService.seek;
			this.currentDuration = stateService.duration;
			this.currentTrackType = null;
			this.currentTitle = null;
			this.currentArtist = null;
			this.currentAlbum = null;
			this.currentAlbumArt = '/albumart';
			this.currentUri = stateService.uri;
			this.currentSampleRate = null;
			this.currentBitDepth = null;
			this.currentChannels = null;

            this.commandRouter.pushDebugConsoleMessage("CURRENT POSITION "+this.currentPosition);


           // console.log("RANDOM: "+this.currentRandom+ ' OBJ '+JSON.stringify(trackBlock));

            if(trackBlock!==undefined && trackBlock.service!=='webradio')
			{
				if(this.currentConsume!==undefined && this.currentConsume==true)
				{
					this.playQueue.removeQueueItem(this.currentPosition);
				}
				else
				{
                    if(this.currentRandom!==undefined && this.currentRandom===true)
					{
                        var nextSongIndex=0;


                        /**
                         * Using nextRandomIndex because prefetch may have picked one sone randomly
                         * from another service (thus not prefetched). This way we use the same index
                         */
                        if(this.nextRandomIndex)
                            this.currentPosition=this.nextRandomIndex;
                        else
							this.currentPosition = this.randomQueue.next();
					}
					else {
						if(this.currentPosition ==null || this.currentPosition===undefined)
							this.currentPosition=0;
						else this.currentPosition++;
					}
				}
			}


            this.commandRouter.pushDebugConsoleMessage("CURRENT POSITION "+this.currentPosition);

			this.currentStatus = 'stop';
            if(this.isConsume)
            {
                this.consumeState.status='stop';
                this.consumeState.seek=0
            }

			//Checking repeat status
            if(this.currentRepeat && this.currentRepeatSingleSong)
            {
                if(this.prefetchDone==false)
                {
                    this.play(this.currentPosition)
                        .then(self.pushState.bind(self))
                        .fail(this.pushError.bind(this));

                    this.askedForPrefetch=false;
                    this.simulateStopStartDone=false;
                }
                else
                {
                    this.prefetchDone=false;
                    this.askedForPrefetch=false;
                    this.simulateStopStartDone=false;

                    this.commandRouter.pushDebugConsoleMessage("Prefetch done, skipping queuing");
                }
            }
            else
            {
                if (this.currentPosition >= this.playQueue.arrayQueue.length) {
                    this.commandRouter.pushDebugConsoleMessage("END OF QUEUE ");

                    //Queuing following track;
                    if(this.currentRepeat!==undefined && this.currentRepeat===true)
                    {
                        this.currentPosition=0;

                        if(this.prefetchDone==false)
                        {
                            this.play()
                                .then(self.pushState.bind(self))
                                .fail(this.pushError.bind(this));

                            this.askedForPrefetch=false;
                            this.simulateStopStartDone=false;
                        }
                        else
                        {
                            this.prefetchDone=false;
                            this.askedForPrefetch=false;
                            this.simulateStopStartDone=false;

                            this.commandRouter.pushDebugConsoleMessage("Prefetch done, skipping queuing");
                        }


                        this.commandRouter.pushDebugConsoleMessage("Repeating playlist ");
                    }
                    else
                    {
                        this.currentPosition=0;
                        this.pushEmptyState().fail(this.pushError.bind(this));

                        return this.stopPlaybackTimer();
                    }



                } else {
                    if(this.prefetchDone==false)
                    {
                        this.play()
                            .then(self.pushState.bind(self))
                            .fail(this.pushError.bind(this));

                        this.askedForPrefetch=false;
                        this.simulateStopStartDone=false;
                    }
                    else
                    {
                        this.prefetchDone=false;
                        this.askedForPrefetch=false;
                        this.simulateStopStartDone=false;
                        this.pushState();
                        this.commandRouter.pushDebugConsoleMessage("Prefetch done, skipping queuing");
                    }
                }
            }

		} else if (this.currentStatus === 'stop') {
			this.pushState().fail(this.pushError.bind(this));
			this.commandRouter.pushConsoleMessage('No code');
		}
	} else if (stateService.status === 'pause') {
        /**
         * TODO: check if the section can be collapsed
         */

        if (this.currentStatus === 'play') {
            if(this.isConsume)
            {
                this.consumeState.status='pause';
                this.pushState().fail(this.pushError.bind(this));

                return this.stopPlaybackTimer();
            }
        }
	    else if (this.currentStatus === 'pause') {
            if(this.isConsume)
            {
                this.consumeState.status='pause';
                this.consumeState.seek=this.currentSeek
            }

			this.pushState().fail(this.pushError.bind(this));

			return this.stopPlaybackTimer();
		}
	}

	this.pushState().fail(this.pushError.bind(this));

	/*else if (stateService.status === 'undefined') {
	 stateService.status = 'stop';
	 }

	 return libQ.reject('Error: \"' + sService + '\" state \"' + stateService.status + '\" not recognized when Volumio state is \"' + self.currentStatus + '\"');
	 */
};

CoreStateMachine.prototype.checkFavourites = function (state) {

	var self = this;
	var response = {
		service: state.service,
		uri: state.uri,
		favourite: false
	};

	if (state.uri == undefined || state.uri == null)
		return this.emitFavourites(response);

	return this.commandRouter.playListManager.listFavourites()
			.then(function (favList) {
				/**
				 * WARNING: The favourites section uses music-library/ to start each uri
				 * This is not used in mpd uris, so we are adding it at the beginning of each uri
				 */
				var match = self.sanitizeUri(state.uri);
				if(favList.navigation.lists[0].items.some(fav => self.sanitizeUri(fav.uri) === match)) {
					response.favourite = true;
				}
				return self.emitFavourites(response);
			});
};


CoreStateMachine.prototype.emitFavourites = function (msg) {
	return libQ.resolve(this.commandRouter.emitFavourites(msg));
};


//------------------------- new play mechanism USED METHODS ------------------

CoreStateMachine.prototype.getTrack = function (position) {
	var track=this.playQueue.getTrack(position);

	return track;
};


// Volumio Play Command
CoreStateMachine.prototype.play = function (index) {
	var self=this;

	this.commandRouter.pushConsoleMessage('CoreStateMachine::play index '+index);

	//if (index) {
	//	self.currentPosition=index;
	//}

	return self.setConsumeUpdateService(undefined)
		.then(function()
		{
			if(self.currentPosition ==null || self.currentPosition===undefined)
			{
                self.commandRouter.pushDebugConsoleMessage("CURRENT POSITION NOT SET, RESETTING TO 0");
				self.currentPosition=0;
			}

			if (self.currentRandom!==undefined && self.currentRandom===true) {
				self.randomQueue.modifyQueueLength(index);
			}


			if(index!==undefined)
			{
				return self.stop()
					.then(function(e)
					{
						self.currentPosition=index;
						return self.play();
					});
			}
			else
			{
				var trackBlock = self.getTrack(self.currentPosition);

				if (!trackBlock) {
					// Trying to play a track out of the list. Reset currentPosition to zero, and stop.
					self.currentPosition = 0;
					self.randomQueue.reset();
					return libQ.reject();
				}

				var thisPlugin = self.commandRouter.pluginManager.getPlugin('music_service', trackBlock.service);

				if(self.currentStatus==='stop')
				{
					//queuing
					self.currentSeek=0;
					self.startPlaybackTimer();

					if (typeof thisPlugin.clearAddPlayTrack === "function") {
                        thisPlugin.clearAddPlayTrack(trackBlock);
                    } else {
                        this.commandRouter.pushConsoleMessage('WARNING: No clearAddPlayTrack method for plugin ' + trackBlock.service);
                    }

				}
				else  if(self.currentStatus==='pause')
				{
					self.startPlaybackTimer();

					if (typeof thisPlugin.resume === "function") {
                        thisPlugin.resume();
                    } else {
                        this.commandRouter.pushConsoleMessage('WARNING: No resume method for plugin ' + trackBlock.service);
                    }
				}

				self.commandRouter.pushToastMessage('success',self.commandRouter.getI18nString('COMMON.PLAY_TITLE'),self.commandRouter.getI18nString('COMMON.PLAY_TEXT')+trackBlock.name);

				return libQ.resolve();

			}
		});
};

// Volumio Volatile Play
CoreStateMachine.prototype.volatilePlay = function () {
    var self=this;
    this.commandRouter.pushConsoleMessage('CoreStateMachine::volatilePlay');

    if(this.isVolatile){
        var thisPlugin = this.commandRouter.pluginManager.getPlugin('music_service', this.volatileService);
        if (typeof thisPlugin.play === "function") {
            thisPlugin.play();
        } else {
            this.commandRouter.pushConsoleMessage('WARNING: No play method for volatile plugin ' + this.volatileService);
        }
    } else {
        this.commandRouter.pushConsoleMessage('WARNING: Received volatile play command but volumio is not on volatile state');
	}
}


// Volumio Seek Command
CoreStateMachine.prototype.seek = function (position) {
	var self=this;
	this.commandRouter.pushConsoleMessage('CoreStateMachine::seek');

	//self.setConsumeUpdateService(undefined);
	if(this.isVolatile){
		if(position == '+'){
			var curPos = this.getState().seek;
			var thisPlugin = this.commandRouter.pluginManager.getPlugin('music_service', this.volatileService);
			this.currentSeek = curPos + 10000;
            if (typeof thisPlugin.seek === "function") {
                thisPlugin.seek(curPos + 10000);
            } else {
                this.commandRouter.pushConsoleMessage('WARNING: No seek method for volatile plugin ' + this.volatileService);
            }
			this.startPlaybackTimer(curPos + 10000);
			this.pushState().fail(this.pushError.bind(this));

		}else if(position == '-'){
			var curPos = this.getState().seek;
			var thisPlugin = this.commandRouter.pluginManager.getPlugin('music_service', this.volatileService);
			this.currentSeek = curPos - 10000;
            if (typeof thisPlugin.seek === "function") {
                thisPlugin.seek(curPos - 10000);
            } else {
                this.commandRouter.pushConsoleMessage('WARNING: No seek method for volatile plugin ' + this.volatileService);
            }
			this.startPlaybackTimer(curPos - 10000);
			this.pushState().fail(this.pushError.bind(this));
		}else{
			var thisPlugin = this.commandRouter.pluginManager.getPlugin('music_service', this.volatileService);
            if (typeof thisPlugin.seek === "function") {
                thisPlugin.seek(position * 1000);
            } else {
                this.commandRouter.pushConsoleMessage('WARNING: No seek method for volatile plugin ' + this.volatileService);
            }
			this.currentSeek = position * 1000;
			this.startPlaybackTimer(position * 1000);
			this.pushState().fail(this.pushError.bind(this));
		}
	}else{

		var trackBlock = this.getTrack(this.currentPosition);
		if (trackBlock !== undefined)
		{
			if(position == '+'){
				var curPos = this.getState().seek;
        var thisPlugin = this.commandRouter.pluginManager.getPlugin('music_service', trackBlock.service);

        this.currentSeek = curPos + 10000;
        this.startPlaybackTimer(curPos + 10000);
        if (typeof thisPlugin.seek === "function") {
            thisPlugin.seek(curPos + 10000);
        } else {
        	this.commandRouter.pushConsoleMessage('WARNING: No seek method for plugin ' + trackBlock.service);
		}


        this.pushState().fail(this.pushError.bind(this));
			}
			else if(position == '-'){
  	    var curPos = this.getState().seek;
        var thisPlugin = this.commandRouter.pluginManager.getPlugin('music_service', trackBlock.service);

      	this.currentSeek = curPos - 10000;
  	    this.startPlaybackTimer(curPos - 10000);
  	    if (typeof thisPlugin.seek === "function") {
			thisPlugin.seek(curPos - 10000);
		} else {
			this.commandRouter.pushConsoleMessage('WARNING: No seek method for plugin ' + trackBlock.service);
		}

      	this.pushState().fail(this.pushError.bind(this));
	    	}
			else{
        this.commandRouter.pushConsoleMessage('TRACKBLOCK ' + JSON.stringify(trackBlock));

        var thisPlugin = this.commandRouter.pluginManager.getPlugin('music_service', trackBlock.service);

        this.currentSeek = position*1000;
        this.startPlaybackTimer(position*1000);
        if (typeof thisPlugin.seek === "function") {
			thisPlugin.seek(position*1000);
		} else {
			this.commandRouter.pushConsoleMessage('WARNING: No seek method for plugin ' + trackBlock.service);
		}
        this.pushState().fail(this.pushError.bind(this));
			}
		}
	}
};


CoreStateMachine.prototype.next = function (promisedResponse) {
	var self=this;
	this.commandRouter.pushConsoleMessage('CoreStateMachine::next');

	if(this.isVolatile){
		var volatilePlugin = this.commandRouter.pluginManager.getPlugin('music_service', this.volatileService);
		volatilePlugin.next();
	}else{

		//self.setConsumeUpdateService(undefined);
		if (this.isConsume && this.consumeState.service != undefined) {
			var thisPlugin = this.commandRouter.pluginManager.getPlugin('music_service', this.consumeState.service);
            if (typeof thisPlugin.next === "function") {
                thisPlugin.next();
            } else {
                this.commandRouter.pushConsoleMessage('WARNING: No next method for plugin ' + this.consumeState.service);
            }

		} else if (this.isUpnp){
			console.log('UPNP Next');
		} else {

		this.stop()
			.then(function()
			{
				self.currentPosition = self.getNextIndex();

				return libQ.resolve();
			})
			.then(self.play.bind(self))
			.then(self.updateTrackBlock.bind(self));
		}
	}
};


// Volumio Pause Command
CoreStateMachine.prototype.pause = function (promisedResponse) {

	this.commandRouter.pushConsoleMessage('CoreStateMachine::pause');

	//this.setConsumeUpdateService(undefined);

	if (this.currentStatus === 'play') {
		this.currentStatus = 'pause';
		this.stopPlaybackTimer();
		return this.servicePause();
	}
};

CoreStateMachine.prototype.ffwdRew = function (millisecs) {

    this.commandRouter.pushConsoleMessage('CoreStateMachine::ffwdRew');

    var trackBlock = this.getTrack(this.currentPosition);


    var thisPlugin = this.commandRouter.pluginManager.getPlugin('music_service', trackBlock.service);
    if(thisPlugin && thisPlugin.ffwdRew)
        return thisPlugin.ffwdRew(millisecs);
    else libQ.resolve();
};


// Pause the current track block playback
CoreStateMachine.prototype.servicePause = function () {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::servicePause');
	if(this.isVolatile){
		return this.commandRouter.servicePause(this.volatileService);
	}else{
		var trackBlock = this.getTrack(this.currentPosition);
		if (trackBlock != undefined && trackBlock.service != undefined) {
            return this.commandRouter.servicePause(trackBlock.service);
		} else {
            this.commandRouter.pushConsoleMessage('Error: no service or no trackblock to pause');
		}

	}
};

// Volumio Stop Command
CoreStateMachine.prototype.stop = function (promisedResponse) {
	var self=this;
	this.commandRouter.pushConsoleMessage('CoreStateMachine::stop');

	if(this.isVolatile){
		return this.serviceStop();
	}else{
		self.setConsumeUpdateService(undefined);
		self.unSetVolatile();

		if (this.currentStatus === 'play') {
			// Play -> Stop transition
			this.currentStatus = 'stop';
			this.currentSeek = 0;

			this.stopPlaybackTimer();
			this.updateTrackBlock();
			this.pushState().fail(this.pushError.bind(this));
			return this.serviceStop();

		} else if (this.currentStatus === 'pause') {
			// Pause -> Stop transition
			this.currentStatus = 'stop';
			this.currentSeek = 0;
			this.updateTrackBlock();

			this.stopPlaybackTimer();
			this.pushState().fail(this.pushError.bind(this));
			return this.serviceStop();
		} else {
			return libQ.resolve();
        }
	}
};

// Stop the current track block playback
CoreStateMachine.prototype.serviceStop = function () {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::serviceStop');

	if(this.isVolatile){
		return this.commandRouter.serviceStop(this.volatileService);
	}else{
		var trackBlock = this.getTrack(this.currentPosition);
		if (trackBlock && trackBlock.service){
			return this.commandRouter.serviceStop(trackBlock.service);
		} else if (this.isUpnp) {
			var mpdPlugin = this.commandRouter.pluginManager.getPlugin('music_service', 'mpd');
			return mpdPlugin.stop();
		} else {
            return libQ.resolve();
		}
	}
};


// Volumio Previous Command
CoreStateMachine.prototype.previous = function (promisedResponse) {
	var self=this;

	if(this.isVolatile){
		var volatilePlugin = this.commandRouter.pluginManager.getPlugin('music_service', this.volatileService);
		volatilePlugin.previous();
	}else{
		//self.setConsumeUpdateService(undefined);
		this.commandRouter.pushConsoleMessage('CoreStateMachine::previous');

		if (this.currentStatus === 'stop') {
			// Stop -> Previous transition
			if(this.currentRandom!==undefined && this.currentRandom===true)
			{
				this.currentPosition=self.randomQueue.prev();
				return this.updateTrackBlock().then(this.serviceClearAddPlay.bind(this));
			}
			else if (this.currentPosition > 0) {
				this.currentPosition--;
				this.updateTrackBlock();
				return this.pushState();
			}

		} else if (this.currentStatus === 'play') {
			if (this.isConsume && this.consumeState.service != undefined) {
                var thisPlugin = this.commandRouter.getMusicPlugin(this.consumeState.service);
                if (!this.previousTrackonPrev && typeof thisPlugin.seek === "function") {
                    thisPlugin.seek(0);
                    this.startTimerForPreviousTrack();
                } else {
                    if (typeof thisPlugin.previous === "function") {
                        thisPlugin.previous();
                    } else {
                        this.commandRouter.pushConsoleMessage('WARNING: No previous method for plugin ' + this.consumeState.service);
                    }
				}
			} else {
                var trackBlock = this.getTrack(this.currentPosition);
                var thisPlugin = this.commandRouter.pluginManager.getPlugin('music_service', trackBlock.service);
                if (!this.previousTrackonPrev && typeof thisPlugin.seek === "function") {
                    thisPlugin.seek(0);
                    this.startTimerForPreviousTrack();
                } else {
                    if (this.currentRandom !== undefined && this.currentRandom === true) {
                        this.stop();
                        setTimeout(function () {
                            self.currentPosition = Math.floor(Math.random() * (self.playQueue.arrayQueue.length));
                            self.play();
                        }, 500);
                    }
                    else if (this.currentPosition > 0) {
                        this.stop();
                        setTimeout(function () {
                            self.currentPosition--;
                            self.play();
                        }, 500);

                    }
				}
			}
		} else if (this.currentStatus === 'pause') {
			// Pause -> Previous transition
			if(this.currentRandom!==undefined && this.currentRandom===true)
			{
				this.currentPosition = this.randomQueue.prev();
			}
			else if (this.currentPosition > 0) {
				this.currentPosition--;
			}
			this.currentSeek = 0;
			this.updateTrackBlock();
			return this.serviceClearAddPlay();
		}
	}
};

CoreStateMachine.prototype.removeQueueItem = function (nIndex) {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::removeQueueItem');
    var self=this;

	var index = nIndex.value;

	if(this.currentPosition==index)
	{
		this.stop()
			.then(function () {
		if (this.currentPosition > 0) {
			this.currentPosition--;
		} });
	}
	else
    {
        if (this.currentPosition > index) {
            this.currentPosition--;
        }
    }

	var defer=libQ.defer();
    this.playQueue.removeQueueItem(nIndex)
        .then(function()
        {
            return self.commandRouter.volumioPushState(self.getState());
        })
        .then(function(){
            defer.resolve();
        });

	return defer.promise;
};

CoreStateMachine.prototype.setRandom = function (value) {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::setRandom '+value);

	this.currentRandom=value;

	this.pushState().fail(this.pushError.bind(this));
};

CoreStateMachine.prototype.setRepeat = function (value,repeatSingle) {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::setRepeat '+value+ ' single '+repeatSingle);

	this.currentRepeat=value;

	if(repeatSingle!=undefined)
	    this.currentRepeatSingleSong=repeatSingle;

	this.pushState().fail(this.pushError.bind(this));
};

CoreStateMachine.prototype.setConsume = function (value) {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::setConsume '+value);

	this.currentConsume=value;

	this.pushState().fail(this.pushError.bind(this));
};

CoreStateMachine.prototype.moveQueueItem = function (from,to) {
	var self=this;
    this.commandRouter.pushConsoleMessage('CoreStateMachine::moveQueueItem '+from+' '+to);

    if(from< this.currentPosition && to > this.currentPosition)
    {
        this.currentPosition--;
    }
    else if(from> this.currentPosition && to <= this.currentPosition)
    {
        this.currentPosition++;
    }
    else if(from==this.currentPosition)
        this.currentPosition=to;

    var defer=libQ.defer();
    this.playQueue.moveQueueItem(from,to).then(function(){
        return self.pushState();
    }).then(function(){
        defer.resolve({});
    }).fail(function(err){
       defer.reject(new Error(err));
    });

    return defer.promise;
};

CoreStateMachine.prototype.setConsumeUpdateService = function (value, ignoremeta, upnp) {
	this.commandRouter.pushConsoleMessage('CoreStateMachine::setConsumeUpdateService '+value);

	var defer;

	/*if(value==undefined && this.consumeUpdateService!==undefined)
	 {
	 // shall stop MPD
	 var mpdPlugin = this.commandRouter.pluginManager.getPlugin('music_service', 'mpd');
	 defer= mpdPlugin.stop();
	 }
	 else if(value!==undefined && this.consumeUpdateService==undefined)
	 {
	 defer= this.stopPlaybackTimer()
	 .then(this.updateTrackBlock.bind(this))
	 .then(this.serviceStop.bind(this));
	 }
	 else*/
	{
		defer=libQ.defer();
		defer.resolve({});
	}

	this.consumeUpdateService = value;
	this.isConsume = value!=undefined;
	this.consumeState.service = value;
	if (ignoremeta != undefined) {
		this.consumeIgnoreMetadata = ignoremeta;
	} else {
		this.consumeIgnoreMetadata = false;
	}

    if (upnp != undefined) {
        this.isUpnp = upnp;
    } else {
        this.isUpnp = false;
    }

	return defer.promise;



}

CoreStateMachine.prototype.sanitizeUri = function (uri) {
	return uri.replace('music-library/', '').replace('mnt/', '');
}

CoreStateMachine.prototype.setVolatile = function (data) {


    this.volatileService=data.service;
    this.isVolatile=true;

    /**
     * This function will be called on volatile stop
     */
    this.volatileCallback=data.callback;
};


CoreStateMachine.prototype.unSetVolatile = function () {
    console.log("UNSET VOLATILE");

    /**
     * This function will be called on volatile stop
     */
    if(this.volatileCallback!==undefined)
    {
        this.volatileCallback.call();
        this.volatileCallback=undefined;
    }

    this.volatileService=undefined;
    this.isVolatile=false;
}


CoreStateMachine.prototype.startTimerForPreviousTrack = function () {
    this.previousTrackonPrev = true;

    setTimeout(()=>{
        this.previousTrackonPrev = false;
	}, 3000)
}