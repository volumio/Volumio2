'use strict';

var libMpd = require('mpd');
var libQ = require('kew');
var libFast = require('fast.js');
var libFsExtra = require('fs-extra');
var exec = require('child_process').exec;
var nodetools = require('nodetools');
var convert = require('convert-seconds');
var pidof = require('pidof');
var parser = require('cue-parser');
var mm = require('musicmetadata');
var os = require('os');
var execSync = require('child_process').execSync;

// Define the ControllerMpd class
module.exports = ControllerMpd;
function ControllerMpd(context) {
	// This fixed variable will let us refer to 'this' object at deeper scopes
	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;
	this.config = new (require('v-conf'))();
}

// Public Methods ---------------------------------------------------------------------------------------
// These are 'this' aware, and return a promise

// Define a method to clear, add, and play an array of tracks

//MPD Play
ControllerMpd.prototype.play = function (N) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::play ' + N);
	return this.sendMpdCommand('play', [N]);
};

//MPD Add
ControllerMpd.prototype.add = function (data) {
	this.commandRouter.pushToastMessage('success', data + self.commandRouter.getI18nString('COMMON.ADD_QUEUE_TEXT_1'));
	return this.sendMpdCommand('add', [data]);
};
//MPD Remove
ControllerMpd.prototype.remove = function (position) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::remove ' + position);
	return this.sendMpdCommand('delete', [position]);
};





//MPD Next
ControllerMpd.prototype.next = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::next');
	return this.sendMpdCommand('next', []);
};

//MPD Previous
ControllerMpd.prototype.previous = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::previous');
	return this.sendMpdCommand('previous', []);
};

//MPD Seek
ControllerMpd.prototype.seek = function (timepos) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::seek to ' + timepos);
	return this.sendMpdCommand('seekcur', [timepos]);
};

//MPD Random
ControllerMpd.prototype.random = function (randomcmd) {
	var string = randomcmd ? 1 : 0;
	this.commandRouter.pushToastMessage('success', "Random", string === 1 ? self.commandRouter.getI18nString('COMMON.ON') : self.commandRouter.getI18nString('COMMON.OFF'));
	return this.sendMpdCommand('random', [string])
};

//MPD Repeat
ControllerMpd.prototype.repeat = function (repeatcmd) {
	var string = repeatcmd ? 1 : 0;
	this.commandRouter.pushToastMessage('success', "Repeat", string === 1 ? self.commandRouter.getI18nString('COMMON.ON') : self.commandRouter.getI18nString('COMMON.ON'));
	return this.sendMpdCommand('repeat', [string]);
};




// MPD clear
ControllerMpd.prototype.clear = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::clear');
	return this.sendMpdCommand('clear', []);
};

// MPD enable output
ControllerMpd.prototype.enableOutput = function (output) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Enable Output ' + output);
	return this.sendMpdCommand('enableoutput', [output]);
};

// MPD disable output
ControllerMpd.prototype.disableOutput = function (output) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Disable Output ' + output);
	return this.sendMpdCommand('disableoutput', [output]);
};

//UpdateDB
ControllerMpd.prototype.updateMpdDB = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Update mpd DB');
	return this.sendMpdCommand('update', []);
};


ControllerMpd.prototype.addPlay = function (fileName) {
    var self=this;

    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::addPlay');
	this.commandRouter.pushToastMessage('Success', '', fileName + self.commandRouter.getI18nString('COMMON.ADD_QUEUE_TEXT_1'));


	//Add playlists and cue with load command
	if (fileName.endsWith('.cue') || fileName.endsWith('.pls') || fileName.endsWith('.m3u')) {
		this.logger.info('Adding Playlist: ' + fileName);
		return this.sendMpdCommandArray([
			{command: 'clear', parameters: []},
			{command: 'load', parameters: [fileName]},
			{command: 'play', parameters: []}
		])
    } else if (fileName.startsWith('albums')) {
        self.logger.info("PLAYYYYYYYY");
        return self.playAlbum(fileName);
    } else {
        return this.sendMpdCommandArray([
			{command: 'clear', parameters: []},
			{command: 'add', parameters: [fileName]},
			{command: 'play', parameters: []}
		])
	}
	/*.then(function() {
	 self.commandRouter.volumioPlay();

	 });*/
};

ControllerMpd.prototype.addPlayCue = function (data) {
	//this.commandRouter.pushToastMessage('Success', '', data.uri + self.commandRouter.getI18nString('COMMON.ADD_QUEUE_TEXT_1'));

	//Add playlists and cue with load command

    console.log(data);
    if(data.number!==undefined)
    {
        this.logger.info('Adding CUE individual entry: ' + data.number + ' ' + data.uri);

        this.commandRouter.addQueueItems([{
            uri:'cue://'+data.uri+'@'+data.number,
            service:'mpd'
        }]);

        var index=this.commandRouter.stateMachine.playQueue.arrayQueue.length;
        this.commandRouter.volumioPlay(index);
    }



    var items=[];

    /*
     var cuesheet = parser.parse('/mnt/' + path);

     list.push({
     service: 'mpd',
     type: 'song',
     title: name,
     icon: 'fa fa-list-ol',
     uri: s0 + path
     });
     var tracks = cuesheet.files[0].tracks;
     for (var j in tracks) {

     list.push({
     service: 'mpd',
     type: 'cuesong',
     title: tracks[j].title,
     artist: tracks[j].performer,
     album: path.substring(path.lastIndexOf("/") + 1),
     number: tracks[j].number - 1,
     icon: 'fa fa-music',
     uri: s0 + path
     });
     }*/


    /*this.commandRouter.addQueueItems();

	return this.sendMpdCommandArray([
		{command: 'clear', parameters: []},
		{command: 'load', parameters: [data.uri]},
		{command: 'play', parameters: [data.number]}
	])*/
};


// MPD music library
ControllerMpd.prototype.getTracklist = function () {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::getTracklist');

	return self.mpdReady
		.then(function () {
			return libQ.nfcall(self.clientMpd.sendCommand.bind(self.clientMpd), libMpd.cmd('listallinfo', []));
		})
		.then(function (objResult) {
			var listInfo = self.parseListAllInfoResult(objResult);
			return listInfo.tracks;
		});
};

// Internal methods ---------------------------------------------------------------------------
// These are 'this' aware, and may or may not return a promise

// Parses the info out of the 'listallinfo' MPD command
// Metadata fields to roughly conform to Ogg Vorbis standards (http://xiph.org/vorbis/doc/v-comment.html)
ControllerMpd.prototype.parseListAllInfoResult = function (sInput) {

	var arrayLines = sInput.split('\n');
	var objReturn = {};
	var curEntry = {};

	objReturn.tracks = [];
	objReturn.playlists = [];
	var nLines = arrayLines.length;

	for (var i = 0; i < nLines; i++) {
		var arrayLineParts = libFast.map(arrayLines[i].split(':'), function (sPart) {
			return sPart.trim();
		});

		if (arrayLineParts[0] === 'file') {
			curEntry = {
				'name': '',
				'service': this.servicename,
				'uri': arrayLineParts[1],
				'browsepath': [this.displayname].concat(arrayLineParts[1].split('/').slice(0, -1)),
				'artists': [],
				'album': '',
				'genres': [],
				'performers': [],
				'tracknumber': 0,
				'date': '',
				'duration': 0
			};
			objReturn.tracks.push(curEntry);
		} else if (arrayLineParts[0] === 'playlist') {
			// Do we even need to parse MPD playlists?
		} else if (arrayLineParts[0] === 'Time') {
			curEntry.duration = arrayLineParts[1];
		} else if (arrayLineParts[0] === 'Title') {
			curEntry.name = arrayLineParts[1];
		} else if (arrayLineParts[0] === 'Artist') {
			curEntry.artists = libFast.map(arrayLineParts[1].split(','), function (sArtist) {
				// TODO - parse other options in artist string, such as "feat."
				return sArtist.trim();
			});
		} else if (arrayLineParts[0] === 'AlbumArtist') {
			curEntry.performers = libFast.map(arrayLineParts[1].split(','), function (sPerformer) {
				return sPerformer.trim();
			});
		} else if (arrayLineParts[0] === 'Album') {
			curEntry.album = arrayLineParts[1];
		} else if (arrayLineParts[0] === 'Track') {
			curEntry.tracknumber = Number(arrayLineParts[1]);
		} else if (arrayLineParts[0] === 'Date') {
			// TODO - parse into a date object
			curEntry.date = arrayLineParts[1];
		}
	}

	return objReturn;
};

// Define a method to get the MPD state
ControllerMpd.prototype.getState = function () {

	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::getState');
	var timeCurrentUpdate = Date.now();
	this.timeLatestUpdate = timeCurrentUpdate;

	var self = this;
	return self.sendMpdCommand('status', [])
		/*.then(function(data) {
		 return self.haltIfNewerUpdateRunning(data, timeCurrentUpdate);
		 })*/
		.then(function (objState) {
			var collectedState = self.parseState(objState);

			// If there is a track listed as currently playing, get the track info
			if (collectedState.position !== null) {
				return self.sendMpdCommand('playlistinfo', [collectedState.position])
					/*.then(function(data) {
					 return self.haltIfNewerUpdateRunning(data, timeCurrentUpdate);
					 })*/
					.then(function (objTrackInfo) {
						var trackinfo = self.parseTrackInfo(objTrackInfo);
						collectedState.isStreaming = trackinfo.isStreaming != undefined ? trackinfo.isStreaming : false;
						collectedState.title = trackinfo.title;
						collectedState.artist = trackinfo.artist;
						collectedState.album = trackinfo.album;
						//collectedState.albumart = trackinfo.albumart;
						collectedState.uri = trackinfo.uri;
						collectedState.trackType = trackinfo.trackType;
						return collectedState;
					});
				// Else return null track info
			} else {
				collectedState.isStreaming = false;
				collectedState.title = null;
				collectedState.artist = null;
				collectedState.album = null;
				//collectedState.albumart = null;
				collectedState.uri = null;
				return collectedState;
			}
		});
};

// Stop the current status update thread if a newer one exists
ControllerMpd.prototype.haltIfNewerUpdateRunning = function (data, timeCurrentThread) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::haltIfNewerUpdateRunning');

	if (self.timeLatestUpdate > timeCurrentThread) {
		return libQ.reject('Alert: Aborting status update - newer one detected');
	} else {
		return libQ.resolve(data);
	}
};

// Announce updated MPD state
ControllerMpd.prototype.pushState = function (state) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::pushState');

	return self.commandRouter.servicePushState(state, self.servicename);
};

// Pass the error if we don't want to handle it
ControllerMpd.prototype.pushError = function (sReason) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::pushError');
	self.commandRouter.pushConsoleMessage(sReason);

	// Return a resolved empty promise to represent completion
	return libQ.resolve();
};

// Define a general method for sending an MPD command, and return a promise for its execution
ControllerMpd.prototype.sendMpdCommand = function (sCommand, arrayParameters) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::sendMpdCommand '+sCommand);

	return self.mpdReady
		.then(function () {
			self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'sending command...');
			return libQ.nfcall(self.clientMpd.sendCommand.bind(self.clientMpd), libMpd.cmd(sCommand, arrayParameters));
		})
		.then(function (response) {
			self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'parsing response...');
			var respobject = libMpd.parseKeyValueMessage.call(libMpd, response);
			// If there's an error show an alert on UI
			if ('error' in respobject) {
				self.commandRouter.broadcastToastMessage('error', 'Error', respobject.error)
				//console.log(respobject.error);
			}
			return libQ.resolve(respobject);
		});
};

// Define a general method for sending an array of MPD commands, and return a promise for its execution
// Command array takes the form [{command: sCommand, parameters: arrayParameters}, ...]
ControllerMpd.prototype.sendMpdCommandArray = function (arrayCommands) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::sendMpdCommandArray');

	return self.mpdReady
		.then(function () {
			return libQ.nfcall(self.clientMpd.sendCommands.bind(self.clientMpd),
				libFast.map(arrayCommands, function (currentCommand) {
                    self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'COMMAND '+currentCommand);
					return libMpd.cmd(currentCommand.command, currentCommand.parameters);
				})
			);
		})
		.then(libMpd.parseKeyValueMessage.bind(libMpd));
};

// Parse MPD's track info text into Volumio recognizable object
ControllerMpd.prototype.parseTrackInfo = function (objTrackInfo) {

	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::parseTrackInfo');

	//self.commandRouter.logger.info(JSON.stringify("OBJTRACKINFO "+JSON.stringify(objTrackInfo)));
	var resp = {};


	if (objTrackInfo.Time === 0){
		resp.isStreaming = true;
	}

	if (objTrackInfo.file != undefined) {
		resp.uri = objTrackInfo.file;
		resp.trackType = objTrackInfo.file.split('.').pop();
		if (resp.uri.indexOf('cdda:///') >= 0) {
			resp.trackType = 'CD Audio';
			resp.title = resp.uri.replace('cdda:///', 'Track ');
		}
        else if (resp.uri.indexOf('http://') >= 0) {
            resp.service='dirble';
        }
	} else {
		resp.uri = null;
	}

	if (objTrackInfo.Title != undefined) {
		resp.title = objTrackInfo.Title;
	} else {
        var file = objTrackInfo.file;
        if(file!== undefined)
        {
            var filetitle = file.replace(/^.*\/(?=[^\/]*$)/, '');

            resp.title = filetitle;
        }

	}

	if (objTrackInfo.Artist != undefined) {
		resp.artist = objTrackInfo.Artist;
	} else {
		resp.artist = null;
	}

	if (objTrackInfo.Album != undefined) {
		resp.album = objTrackInfo.Album;
	} else {
		resp.album = null;
	}

	var web;

	if (objTrackInfo.Artist != undefined) {
		if (objTrackInfo.Album != undefined) {
			web = {artist: objTrackInfo.Artist, album: objTrackInfo.Album};
		} else {
			web = {artist: objTrackInfo.Artist};
		}
	}

	var artUrl;

	if (resp.isStreaming) {
		artUrl = this.getAlbumArt(web);
	} else {
		artUrl = this.getAlbumArt(web, file);
	}

	resp.albumart = artUrl;

	return resp;
};

// Parse MPD's text playlist into a Volumio recognizable playlist object
ControllerMpd.prototype.parsePlaylist = function (objQueue) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::parsePlaylist');

	// objQueue is in form {'0': 'file: http://uk4.internet-radio.com:15938/', '1': 'file: http://2363.live.streamtheworld.com:80/KUSCMP128_SC'}
	// We want to convert to a straight array of trackIds
	return libQ.fcall(libFast.map, Object.keys(objQueue), function (currentKey) {
		return convertUriToTrackId(objQueue[currentKey]);
	});
};

// Parse MPD's text status into a Volumio recognizable status object
ControllerMpd.prototype.parseState = function (objState) {
	var self = this;
	//console.log(objState);

	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::parseState');

	// Pull track duration out of status message
	var nDuration = null;
	if ('time' in objState) {
		var arrayTimeData = objState.time.split(':');
		nDuration = Math.round(Number(arrayTimeData[1]));
	}

	// Pull the elapsed time
	var nSeek = null;
	if ('elapsed' in objState) {
		nSeek = Math.round(Number(objState.elapsed) * 1000);
	}

	// Pull the queue position of the current track
	var nPosition = null;
	if ('song' in objState) {
		nPosition = Number(objState.song);
	}

	// Pull audio metrics
	var nBitDepth = null;
	var nSampleRate = null;
	var nChannels = null;
	if ('audio' in objState) {
		var objMetrics = objState.audio.split(':');
		var nSampleRateRaw = Number(objMetrics[0]) / 1000;


			if (nSampleRateRaw === 352.8){
				var nSampleRateRaw = 2.82+' MHz';
				nBitDepth = '1 bit'
			} else if (nSampleRateRaw === 705.6) {
				var nSampleRateRaw = 5.64+' MHz';
				nBitDepth = '1 bit'
			} else if (nSampleRateRaw === 1411.2) {
				var nSampleRateRaw = 11.2+' MHz';
				nBitDepth = '1 bit'
			}else {
				var nSampleRateRaw = nSampleRateRaw+' KHz';
				nBitDepth = Number(objMetrics[1])+' bit';
			}
		nSampleRate = nSampleRateRaw;

		nChannels = Number(objMetrics[2]);
	}

	var random = null;
	if ('random' in objState) {
		random = objState.random == 1;
	}

	var repeat = null;
	if ('repeat' in objState) {
		repeat = objState.repeat == 1;
	}

	var sStatus = null;
	if ('state' in objState) {
		sStatus = objState.state;
	}

	var updatedb = false;
	if ('updating_db' in objState) {
		updatedb = true;
	}

	return {
		status: sStatus,
		position: nPosition,
		seek: nSeek,
		duration: nDuration,
		samplerate: nSampleRate,
		bitdepth: nBitDepth,
		channels: nChannels,
		random: random,
		updatedb: updatedb,
		repeat: repeat
	};
};

ControllerMpd.prototype.logDone = function (timeStart) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + '------------------------------ ' + (Date.now() - timeStart) + 'ms');
	return libQ.resolve();
};

ControllerMpd.prototype.logStart = function (sCommand) {
	var self = this;
	self.commandRouter.pushConsoleMessage('\n' + '[' + Date.now() + '] ' + '---------------------------- ' + sCommand);
	return libQ.resolve();
};

/*
 * This method can be defined by every plugin which needs to be informed of the startup of Volumio.
 * The Core controller checks if the method is defined and executes it on startup if it exists.
 */
ControllerMpd.prototype.onVolumioStart = function () {
	var self = this;

	this.commandRouter.sharedVars.registerCallback('alsa.outputdevice', this.outputDeviceCallback.bind(this));
	// Connect to MPD only if process MPD is running

	var configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');


	self.config.loadFile(configFile);
	pidof('mpd', function (err, pid) {
		if (err) {
			self.logger.info('Cannot initialize  MPD Connection: MPD is not running');
		} else {
			if (pid) {
				self.logger.info('MPD running with PID' + pid + ' ,establishing connection');
				self.mpdEstablish();

			} else {
				self.logger.info('Cannot initialize  MPD Connection: MPD is not running');
			}
		}
	});

    return libQ.resolve();
};

ControllerMpd.prototype.mpdEstablish = function () {
	var self = this;


	// TODO use names from the package.json instead
	self.servicename = 'mpd';
	self.displayname = 'MPD';

	//getting configuration


	// Save a reference to the parent commandRouter
	self.commandRouter = self.context.coreCommand;
	// Connect to MPD
	self.mpdConnect();

	// Make a promise for when the MPD connection is ready to receive events
	self.mpdReady = libQ.nfcall(self.clientMpd.on.bind(self.clientMpd), 'ready');
	// Catch and log errors
	self.clientMpd.on('error', function (err) {
		console.log('MPD error: ' + err);
		if (err = "{ [Error: This socket has been ended by the other party] code: 'EPIPE' }") {
			// Wait 5 seconds before trying to reconnect
			setTimeout(function () {
				self.mpdEstablish();
			}, 5000);
		} else {
			console.log(err);
		}
	});

	// This tracks the the timestamp of the newest detected status change
	self.timeLatestUpdate = 0;
	self.updateQueue();
	// TODO remove pertaining function when properly found out we don't need em
	//self.fswatch();
	// When playback status changes
	self.clientMpd.on('system', function (status) {
		var timeStart = Date.now();

        self.logger.info('Mpd Status Update: '+status);
		self.logStart('MPD announces state update')
			.then(self.getState.bind(self))
			.then(self.pushState.bind(self))
			.fail(self.pushError.bind(self))
			.done(function () {
				return self.logDone(timeStart);
			});
	});


	self.clientMpd.on('system-playlist', function () {
		var timeStart = Date.now();

		self.logStart('MPD announces system state update')
			.then(self.updateQueue.bind(self))
			.fail(self.pushError.bind(self))
			.done(function () {
				return self.logDone(timeStart);
			});
	});

	//Notify that The mpd DB has changed
	self.clientMpd.on('system-database', function () {
		//return self.commandRouter.fileUpdate();
		//return self.reportUpdatedLibrary();
	});


	self.clientMpd.on('system-update', function () {

		 self.sendMpdCommand('status', [])
			.then(function (objState) {
				var state = self.parseState(objState);
				execSync("/bin/sync", { uid: 1000, gid: 1000});
				return self.commandRouter.fileUpdate(state.updatedb);
			});
	});
};

ControllerMpd.prototype.mpdConnect = function () {

	var self = this;

	var configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');

	self.config = new (require('v-conf'))();
	self.config.loadFile(configFile);

	var nHost = self.config.get('nHost');
	var nPort = self.config.get('nPort');
	self.clientMpd = libMpd.connect({port: nPort, host: nHost});
};

ControllerMpd.prototype.outputDeviceCallback = function () {
	var self = this;

	var defer = libQ.defer();
	self.context.coreCommand.pushConsoleMessage('Output device has changed, restarting MPD');
	self.createMPDFile(function (error) {
		if (error !== undefined && error !== null) {
			self.commandRouter.pushToastMessage('error', self.commandRouter.getI18nString('COMMON.CONFIGURATION_UPDATE'), self.commandRouter.getI18nString('COMMON.CONFIGURATION_UPDATE_ERROR'));
			defer.resolve({});
		}
		else {
			//self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('mpd_configuration_update'), self.commandRouter.getI18nString('mpd_playback_configuration_error'));

			self.restartMpd(function (error) {
				if (error !== null && error != undefined) {
					self.logger.info('Cannot restart MPD: ' + error);
					//self.commandRouter.pushToastMessage('error', self.commandRouter.getI18nString('mpd_player_restart'), self.commandRouter.getI18nString('mpd_player_restart_error'));
				}
				else {
					self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('COMMON.CONFIGURATION_UPDATE'), self.commandRouter.getI18nString('COMMON.PLAYER_RESTARTED'));
					setTimeout(function(){self.mpdEstablish()}, 3000)
				}
				defer.resolve({});
			});
		}
	});
}


ControllerMpd.prototype.savePlaybackOptions = function (data) {
	var self = this;

	var defer = libQ.defer();

	self.config.set('volume_normalization', data['volume_normalization']);
	self.config.set('audio_buffer_size', data['audio_buffer_size'].value);
	self.config.set('buffer_before_play', data['buffer_before_play'].value);

	//fixing dop
	if (self.config.get('dop') == null) {
		self.config.addConfigValue('dop', 'boolean', true);
	} else {
		self.config.set('dop', data['dop']);
	}


	self.createMPDFile(function (error) {
		if (error !== undefined && error !== null) {
			//self.commandRouter.pushToastMessage('error', self.commandRouter.getI18nString('mpd_configuration_update'), self.commandRouter.getI18nString('mpd_configuration_update_error'));
			defer.resolve({});
		}
		else {
			//self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('mpd_configuration_update'), self.commandRouter.getI18nString('mpd_playback_configuration_error'));

			self.restartMpd(function (error) {
				if (error !== null && error != undefined) {
					self.logger.error('Cannot restart MPD: ' + error);
					//self.commandRouter.pushToastMessage('error', self.commandRouter.getI18nString('mpd_player_restart'), self.commandRouter.getI18nString('mpd_player_restart_error'));
				}
				else
					//self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('mpd_player_restart'), self.commandRouter.getI18nString('mpd_player_restart_success'));

				defer.resolve({});
			});
		}
	});

	return defer.promise;

};


ControllerMpd.prototype.restartMpd = function (callback) {
	var self = this;

	if (callback) {
		exec('/usr/bin/sudo /bin/systemctl restart mpd.service ', {uid:1000, gid:1000},
			function (error, stdout, stderr) {
				callback(error);
			});
	} else {
		exec('/usr/bin/sudo /bin/systemctl restart mpd.service ', {uid:1000, gid:1000},
			function (error, stdout, stderr) {
				if (error){
					self.logger.error('Cannot restart MPD: ' + error);
				}
			});
	}


};

ControllerMpd.prototype.createMPDFile = function (callback) {
	var self = this;

	exec('/usr/bin/sudo /bin/chmod 777 /etc/mpd.conf', {uid:1000,gid:1000},
		function (error, stdout, stderr) {
			if(error != null) {
			self.logger.info('Error setting mpd conf file perms: '+error);
			} else {
				self.logger.info('MPD Permissions set');
			}
		});

	try {

		fs.readFile(__dirname + "/mpd.conf.tmpl", 'utf8', function (err, data) {
			if (err) {
				return console.log(err);
			}
			var outdev = self.getAdditionalConf('audio_interface', 'alsa_controller', 'outputdevice');
			var mixer = self.getAdditionalConf('audio_interface', 'alsa_controller', 'mixer');
			var mixerdev = '';
			var mixerstrings = '';
			if (outdev != 'softvolume' ) {
				mixerdev = 'hw:'+outdev;
				outdev = 'hw:'+outdev+',0';
			} else {
				mixerdev = 'SoftMaster';
			}

			var conf1 = data.replace("${gapless_mp3_playback}", self.checkTrue('gapless_mp3_playback'));
			var conf2 = conf1.replace("${device}", outdev);
			var conf3 = conf2.replace("${volume_normalization}", self.checkTrue('volume_normalization'));
			var conf4 = conf3.replace("${audio_buffer_size}", self.config.get('audio_buffer_size'));
			var conf5 = conf4.replace("${buffer_before_play}", self.config.get('buffer_before_play'));
			if (self.config.get('dop')){
				var dop = 'yes';
			} else {
				var dop = 'no';
			}
			var conf6 = conf5.replace("${dop}", dop);


			if (mixer) {
				if (mixer.length > 0) {
					mixerstrings = 'mixer_device    "'+ mixerdev + '"' + os.EOL + '                mixer_control   "'+ mixer +'"'+ os.EOL + '                mixer_type      "hardware"'+ os.EOL;
				}
			}


			var conf7 = conf6.replace("${mixer}", mixerstrings);

			fs.writeFile("/etc/mpd.conf", conf7, 'utf8', function (err) {
				if (err) return console.log(err);
			});
		});

		callback();
	}
	catch (err) {

		callback(err);
	}

};

ControllerMpd.prototype.checkTrue = function (config) {
	var self = this;
	var out = "no";
	var value = self.config.get(config);

	if(value){
		out = "yes";
		return out
	} else {
		return out
	}
};



/*
 * This method shall be defined by every plugin which needs to be configured.
 */
ControllerMpd.prototype.setConfiguration = function (configuration) {
	//DO something intelligent
};

ControllerMpd.prototype.getConfigParam = function (key) {
	var self = this;

	return self.config.get(key);
};
ControllerMpd.prototype.setConfigParam = function (data) {
	var self = this;

	self.config.set(data.key, data.value);
};

ControllerMpd.prototype.listPlaylists = function (uri) {
	var self = this;


	var defer = libQ.defer();

	var response={
        "navigation": {
            "lists": [
                {
                    "availableListViews": [
                        "list"
                    ],
                    "items": [

                    ]
                }
            ]
        }
    };
	var promise = self.commandRouter.playListManager.listPlaylist();
	promise.then(function (data) {
		for (var i in data) {
			var ithdata = data[i];
			var playlist = {
                "service": "mpd",
                "type": 'playlist',
                "title": ithdata,
                "icon": 'fa fa-list-ol',
                "uri": 'playlists/' + ithdata
            };
            response.navigation.lists[0].items.push(playlist);


            }


		defer.resolve(response);
	});


	return defer.promise;
};

ControllerMpd.prototype.browsePlaylist = function (uri) {
	var self = this;

	var defer = libQ.defer();

    var response={
        "navigation": {
            "lists": [
                {
                    "availableListViews": [
                        "list"
                    ],
                    "items": [

                    ]
                }
            ],
            "prev": {
                "uri": "playlists"
            }
        }
    };

	var name = uri.split('/')[1];

	var promise = self.commandRouter.playListManager.getPlaylistContent(name);
	promise.then(function (data) {

		var n = data.length;
		for (var i = 0; i < n; i++) {
			var ithdata = data[i];
			var song = {
                service: ithdata.service,
                type: 'song',
                title: ithdata.title,
                artist: ithdata.artist,
                album: ithdata.album,
                albumart: ithdata.albumart,
                uri: ithdata.uri
            };
            response.navigation.lists[0].items.push(song);
		}

		defer.resolve(response);
	});

	return defer.promise;
};

ControllerMpd.prototype.lsInfo = function (uri) {
	var self = this;

	var defer = libQ.defer();

	var sections = uri.split('/');
	var prev = '';
	var folderToList = '';
	var command = 'lsinfo';

	if (sections.length > 1) {

		prev = sections.slice(0, sections.length - 1).join('/');

		folderToList = sections.slice(1).join('/');

		command += ' "' + folderToList + '"';

	}

	var cmd = libMpd.cmd;

	self.mpdReady.then(function () {
		self.clientMpd.sendCommand(cmd(command, []), function (err, msg) {
			var list = [];
			if (msg) {
				var s0 = sections[0] + '/';
				var path;
				var name;
				var lines = msg.split('\n');
				for (var i = 0; i < lines.length; i++) {
					var line = lines[i];

                    //self.logger.info("LINE "+line);
					if (line.indexOf('directory:') === 0) {
						path = line.slice(11);
						name = path.split('/').pop();
						list.push({
							type: 'folder',
							title: name,
                                                        service:'mpd',
							icon: 'fa fa-folder-open-o',
							uri: s0 + path
						});
					}
					else if (line.indexOf('playlist:') === 0) {
						path = line.slice(10);
						name = path.split('/').pop();
						if (path.endsWith('.cue')) {
							try {
								var cuesheet = parser.parse('/mnt/' + path);

								list.push({
									service: 'mpd',
									type: 'song',
									title: name,
									icon: 'fa fa-list-ol',
									uri: s0 + path
								});
								var tracks = cuesheet.files[0].tracks;
								for (var j in tracks) {

									list.push({
										service: 'mpd',
										type: 'cuesong',
										title: tracks[j].title,
										artist: tracks[j].performer,
										album: path.substring(path.lastIndexOf("/") + 1),
										number: tracks[j].number - 1,
										icon: 'fa fa-music',
										uri: s0 + path
									});
								}
							} catch (err) {
								self.logger.info('Cue Parser - Cannot parse ' + path);
							}
						} else {
							list.push({
								service: 'mpd',
								type: 'song',
								title: name,
								icon: 'fa fa-list-ol',
								uri: s0 + path
							});
						}
					}
					else if (line.indexOf('file:') === 0) {
						var path = line.slice(6);
						var name = path.split('/').pop();

						var artist = self.searchFor(lines, i + 1, 'Artist:');
						var album = self.searchFor(lines, i + 1, 'Album:');
						var title = self.searchFor(lines, i + 1, 'Title:');

						if (title) {
							title = title;
						} else {
							title = name;
						}
						list.push({
							service: 'mpd',
							type: 'song',
							title: title,
							artist: artist,
							album: album,
							icon: 'fa fa-music',
							uri: s0 + path
						});
					}

				}
			}
			else self.logger.info(err);

			defer.resolve({
				navigation: {
					prev: {
						uri: prev
					},
					lists: [{availableListViews:['list'],items:list}]
				}
			});
		});
	});
	return defer.promise;
};

ControllerMpd.prototype.search = function (query) {
	var self = this;

	var defer = libQ.defer();
	var commandArtist = 'search artist '+' "' + query.value + '"';
    var commandAlbum = 'search album '+' "' + query.value + '"';
    var commandSong = 'search title '+' "' + query.value + '"';
    var deferArray=[];
    deferArray.push(libQ.defer());
    deferArray.push(libQ.defer());
    deferArray.push(libQ.defer());

    var cmd = libMpd.cmd;

    self.mpdReady.then(function () {
		self.clientMpd.sendCommand(cmd(commandArtist, []), function (err, msg) {
            var subList=[];

            if (msg) {

				var lines = msg.split('\n');
                for (var i = 0; i < lines.length; i++) {
					var line = lines[i];

					if (line.startsWith('file:')) {
                        var path = line.slice(5).trimLeft();
                        var name = path.split('/');
                        var count = name.length;

                        var artist = self.searchFor(lines, i + 1, 'Artist:');

                        deferArray[0].resolve([{
                            service: 'mpd',
                            type: 'folder',
                            title: artist,
                            uri: 'artists://' + nodetools.urlEncode(artist),
                            albumart: self.getAlbumArt({artist: artist},
                                self.getParentFolder('/mnt/' + path),
                                'fa-tags')

                    }]);

                        return;
					}

				}


			}
			else if(err)  deferArray[0].reject(new Error('Artist:' +err));
            else deferArray[0].resolve();
		});
	});

    self.mpdReady.then(function () {
        self.clientMpd.sendCommand(cmd(commandAlbum, []), function (err, msg) {
            var subList=[];

            if (msg) {

                var lines = msg.split('\n');
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];

                    if (line.startsWith('file:')) {
                        var path = line.slice(5).trimLeft();
                        var name = path.split('/');
                        var count = name.length;

                        var album = self.searchFor(lines, i + 1, 'Album:');
                        var artist = self.searchFor(lines, i + 1, 'Artist:');

                        deferArray[1].resolve([{
                            service: 'mpd',
                            type: 'folder',
                            title: album,
                            artist: artist,
                            album:'',
                            uri: 'albums://' + nodetools.urlEncode(album),
                            albumart: self.getAlbumArt({artist: artist, album: album},
                                self.getParentFolder('/mnt/' + path),'fa-tags')

                    }]);

                        return;
                    }

                }
            }
            else if(err)  deferArray[1].reject(new Error('Album:' +err));
            else deferArray[1].resolve();
        });
    });

    self.mpdReady.then(function () {
        self.clientMpd.sendCommand(cmd(commandSong, []), function (err, msg) {
            var subList=[];

            if (msg) {

                var lines = msg.split('\n');
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];

                    if (line.startsWith('file:')) {
                        var path = line.slice(5).trimLeft();
                        var name = path.split('/');
                        var count = name.length;

                        var artist = self.searchFor(lines, i + 1, 'Artist:');
                        var album = self.searchFor(lines, i + 1, 'Album:');
                        var title = self.searchFor(lines, i + 1, 'Title:');

                        if (title == undefined) {
                            title = name[count - 1];
                        }
                        subList.push({
                            service: 'mpd',
                            type: 'song',
                            title: title,
                            artist: artist,
                            album: album,
                            uri: 'music-library/' + path,
                            albumart : self.getAlbumArt({artist: artist, album: album},
                                self.getParentFolder('/mnt/' + path),'fa-tags')

                    });
                    }

                }

                deferArray[2].resolve(subList);
            }
            else if(err)  deferArray[2].reject(new Error('Song:' +err));
            else deferArray[2].resolve();
        });
    });

    libQ.all(deferArray).then(function(values){
        var list = [];

		if(values[0])
		{
		    list=[
                {
                    "title": self.commandRouter.getI18nString('COMMON.SEARCH_ARTIST_SECTION'),
                    "availableListViews": [
                        "list",
                        "grid"
                    ],
                    "items": []
                }];

		        list[0].items=list[0].items.concat(values[0]);
		}

		if(values[1])
		{
		    var albList=
                {
                    "title": self.commandRouter.getI18nString('COMMON.SEARCH_ALBUM_SECTION'),
                    "availableListViews": [
                        "list",
                        "grid"
                    ],
                    "items": []
                };
            albList.items=values[1];


			list.push(albList);
		}

		if(values[2])
		{
			var songList=
                {
                    "title": self.commandRouter.getI18nString('COMMON.SEARCH_SONG_SECTION'),
                    "availableListViews": [
                        "list"
                    ],
                    "items": []
                };
            songList.items=values[2];


            list.push(songList);
        }

		list=list.filter(function(v){return !!(v)==true;})

        defer.resolve(list);
    }).fail(function(err){
        self.commandRouter.logger.info("PARSING RESPONSE ERROR "+err);

        defer.resolve();
    })
	return defer.promise;
};

ControllerMpd.prototype.searchFor = function (lines, startFrom, beginning) {

	var count = lines.length;
	var i = startFrom;

	while (i < count) {
		var line = lines[i];

        if(line!==undefined)
        {
            if (line.indexOf(beginning) === 0)
                return line.slice(beginning.length).trimLeft();
            else if (line.indexOf('file:') === 0)
                return '';
            else if (line.indexOf('directory:') === 0)
                return '';
        }

		i++;
	}
};

ControllerMpd.prototype.updateQueue = function () {
	var self = this;

	var defer = libQ.defer();

	var prev = '';
	var folderToList = '';
	var command = 'playlistinfo';
	var list = [];

	var cmd = libMpd.cmd;
	self.mpdReady.then(function () {
		self.clientMpd.sendCommand(cmd(command, []), function (err, msg) {
			if (msg) {
				var lines = msg.split('\n');

				//self.commandRouter.volumioClearQueue();

				var queue = [];
				for (var i = 0; i < lines.length; i++) {
					var line = lines[i];
					if (line.indexOf('file:') === 0) {
						var artist = self.searchFor(lines, i + 1, 'Artist:');
						var album = self.searchFor(lines, i + 1, 'Album:');
						var rawtitle = self.searchFor(lines, i + 1, 'Title:');
						var tracknumber = self.searchFor(lines, i + 1, 'Pos:');
						var path = line.slice(5).trimLeft();

						if (rawtitle) {
							var title = rawtitle;
						} else {
							var path = line.slice(5).trimLeft();
							var name = path.split('/');
							var title = name.slice(-1)[0];
						}

						var queueItem = {
							uri: path,
							service: 'mpd',
							name: title,
							artist: artist,
							album: album,
							type: 'track',
							tracknumber: tracknumber,
							albumart: self.getAlbumArt({artist: artist, album: album}, path)
						};
						queue.push(queueItem);
					}

				}
				//self.commandRouter.addQueueItems(queue);
			}
			else self.logger.info(err);

			defer.resolve({
				navigation: {
					prev: {
						uri: prev
					},
					list: list
				}
			});
		});
	});


	return defer.promise;
};


ControllerMpd.prototype.getAlbumArt = function (data, path,icon) {

	var artist, album;

	if (data != undefined && data.path != undefined) {
		path = this.sanitizeUri(data.path);
	}

	var web;

	if (data != undefined && data.artist != undefined) {
		artist = data.artist;
		if (data.album != undefined)
			album = data.album;
		else album = data.artist;

		web = '?web=' + nodetools.urlEncode(artist) + '/' + nodetools.urlEncode(album) + '/large'
	}

	var url = '/albumart';

	if (web != undefined)
		url = url + web;

	if (web != undefined && path != undefined)
		url = url + '&';
	else if (path != undefined)
		url = url + '?';

	if (path != undefined)
		url = url + 'path=' + nodetools.urlEncode(path);

    if(icon!==undefined)
    {
        if(url==='/albumart')
            url=url+'?icon='+icon;
        else url=url+'&icon='+icon;
    }



    return url;
};


ControllerMpd.prototype.reportUpdatedLibrary = function () {
	var self = this;
	// TODO PUSH THIS MESSAGE TO ALL CONNECTED CLIENTS
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::DB Update Finished');
	//return self.commandRouter.pushToastMessage('Success', 'ASF', ' Added');
};

ControllerMpd.prototype.getConfigurationFiles = function () {
	var self = this;

	return ['config.json'];
};

ControllerMpd.prototype.getAdditionalConf = function (type, controller, data) {
	var self = this;
	return self.commandRouter.executeOnPlugin(type, controller, 'getConfigParam', data);
};

ControllerMpd.prototype.setAdditionalConf = function (type, controller, data) {
	var self = this;
	return self.commandRouter.executeOnPlugin(type, controller, 'setConfigParam', data);
};

ControllerMpd.prototype.getMyCollectionStats = function () {
	var self = this;

	var defer = libQ.defer();

	var cmd = libMpd.cmd;
	self.clientMpd.sendCommand(cmd("count", ["group", "artist"]), function (err, msg) {
		if (err) defer.resolve({
			artists: 0,
			albums: 0,
			songs: 0,
			playtime: '00:00:00'
		});
		else {
			var artistsCount = 0;
			var songsCount = 0;
			var playtimesCount = 0;

			var splitted = msg.split('\n');
			for (var i = 0; i < splitted.length - 1; i = i + 3) {
				artistsCount++;
				songsCount = songsCount + parseInt(splitted[i + 1].substring(7));
				playtimesCount = playtimesCount + parseInt(splitted[i + 2].substring(10));
			}

			var convertedSecs = convert(playtimesCount);


			self.clientMpd.sendCommand(cmd("count", ["group", "album"]), function (err, msg) {
				if (!err) {
					var splittedAlbum = msg.split('\n').length;
					var response = {
						artists: artistsCount,
						albums: (splittedAlbum - 1) / 3,
						songs: songsCount,
						playtime: convertedSecs.hours + ':' + ('0' + convertedSecs.minutes).slice(-2) + ':' + ('0' + convertedSecs.seconds).slice(-2)
					};
				}

				defer.resolve(response);

			});

		}


	});
	return defer.promise;

};


ControllerMpd.prototype.rescanDb = function () {
	var self = this;

	return self.sendMpdCommand('rescan', []);
};

ControllerMpd.prototype.updateDb = function () {
	var self = this;

	return self.sendMpdCommand('update', []);
};


ControllerMpd.prototype.getGroupVolume = function () {
	var self = this;
	return self.sendMpdCommand('status', [])
		.then(function (objState) {
			var state = self.parseState(objState);
			if (state.volume != undefined) {
				state.volume = groupvolume;
				return libQ.resolve(groupvolume);
			}
		});
};

ControllerMpd.prototype.setGroupVolume = function (data) {
	var self = this;
	return self.sendMpdCommand('setvol', [data]);
};

ControllerMpd.prototype.syncGroupVolume = function (data) {
	var self = this;

};


// --------------------------------- music services interface ---------------------------------------

ControllerMpd.prototype.explodeUri = function(uri) {
    var self = this;

    var defer=libQ.defer();

    var items = [];
    var cmd = libMpd.cmd;

    if(uri.startsWith('cue://'))
    {
        var splitted=uri.split('@');
        var index=splitted[1];
        var path='/mnt/' + splitted[0].substring(6);

            var cuesheet = parser.parse(path);

            var tracks = cuesheet.files[0].tracks;

            defer.resolve({uri:uri,service:'mpd',name: tracks[index].title,
                artist: tracks[index].performer,
                album: path.substring(path.lastIndexOf("/") + 1),
                number: tracks[index].number - 1,
                albumart:'/albumart'
            });
    }
    else if(uri.startsWith('search://'))
    {
        //exploding search
        var splitted=uri.split('/');

        var argument=splitted[2];
        var value=splitted[3];

        if(argument==='artist')
        {
            var commandArtist = 'search artist '+' "' + value + '"';

            self.mpdReady.then(function () {
                self.clientMpd.sendCommand(cmd(commandArtist, []), function (err, msg) {
                    var subList=[];

                    if (msg) {
                        var lines = msg.split('\n');
                        for (var i = 0; i < lines.length; i++) {
                            var line = lines[i];

                            if (line.startsWith('file:')) {
                                var path = line.slice(5).trimLeft();
                                var name = path.split('/');
                                var count = name.length;

                                var artist = self.searchFor(lines, i + 1, 'Artist:');
                                var album = self.searchFor(lines, i + 1, 'Album:');
                                var title = self.searchFor(lines, i + 1, 'Title:');
                                var time = parseInt(self.searchFor(lines, i + 1, 'Time:'));

                                if (title) {
                                    title = title;
                                } else {
                                    title = name;
                                }

                                items.push({
                                    uri: 'music-library/'+path,
                                    service: 'mpd',
                                    name: title,
                                    artist: artist,
                                    album: album,
                                    type: 'track',
                                    tracknumber: 0,
                                    albumart: self.getAlbumArt({artist:artist,album: album},uri),
                                    duration: time,
                                    trackType: 'mp3'
                                });
                            }

                        }

                        defer.resolve(items);
                    }
                    else if(err)  defer.reject(new Error('Artist:' +err));
                    else defer.resolve(items);
                });
            });
        }
        else if(argument==='album')
        {
            var commandAlbum = 'search album '+' "' + value + '"';

            self.mpdReady.then(function () {
                self.clientMpd.sendCommand(cmd(commandAlbum, []), function (err, msg) {
                    var subList=[];

                    if (msg) {

                        var lines = msg.split('\n');
                        for (var i = 0; i < lines.length; i++) {
							var line = lines[i];

                            if (line.startsWith('file:')) {
                                var path = line.slice(5).trimLeft();
                                var name = path.split('/');
                                var count = name.length;

                                var artist = self.searchFor(lines, i + 1, 'Artist:');
                                var album = self.searchFor(lines, i + 1, 'Album:');
                                var title = self.searchFor(lines, i + 1, 'Title:');
                                var time = parseInt(self.searchFor(lines, i + 1, 'Time:'));

                                if (title) {
                                    title = title;
                                } else {
                                    title = name;
                                }

                                items.push({
                                    uri: 'music-library/' + path,
                                    service: 'mpd',
                                    name: title,
                                    artist: artist,
                                    album: album,
                                    type: 'track',
                                    tracknumber: 0,
                                    albumart: self.getAlbumArt({artist: artist, album: album}, uri),
                                    duration: time,
                                    trackType: 'mp3'
                                });
                            }
                        }
                        defer.resolve(items);
                    }
                    else if(err)  defer.reject(new Error('Artist:' +err));
                    else defer.resolve(items);
                });
            });
        }
        else defer.reject(new Error());
    }
    else if(uri.startsWith('albums://')) {
        //exploding search
        var splitted = uri.split('/');

        var albumName = nodetools.urlDecode(splitted[2]);

        var cmd = libMpd.cmd;
        self.clientMpd.sendCommand(cmd("find album \""+albumName+"\"", []), function (err, msg) {

            var list = [];
            if (msg) {
                var path;
                var name;
                var lines = msg.split('\n');
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (line.indexOf('file:') === 0) {
                        var path = line.slice(6);
                        var name = path.split('/').pop();

                        var artist = self.searchFor(lines, i + 1, 'Artist:');
                        var album = self.searchFor(lines, i + 1, 'Album:');
                        var title = self.searchFor(lines, i + 1, 'Title:');
                        var albumart=self.getAlbumArt({artist: artist, album: album,icon:'fa-dot-circle'}, self.getParentFolder('/mnt/'+path));
                        var time = parseInt(self.searchFor(lines, i + 1, 'Time:'));

                        if (title) {
                            title = title;
                        } else {
                            title = name;
                        }
                        list.push({
                            uri: 'music-library/'+path,
                            service: 'mpd',
                            name: title,
                            artist: artist,
                            album: album,
                            type: 'track',
                            tracknumber: 0,
                            albumart: albumart,
                            duration: time,
                            trackType: path.split('.').pop()
                        });


                    }

                }
            }
            else self.logger.info(err);

            defer.resolve(list);
        });
    }
    else if(uri.startsWith('artists://')) {
        /*
         artists://AC%2FDC/Rock%20or%20Bust in service mpd
         */
        var splitted = uri.split('/');

        if(splitted.length===4)
            return this.explodeUri('albums://'+splitted[3]);

        var artist = nodetools.urlDecode(splitted[2]);

        var cmd = libMpd.cmd;

        self.clientMpd.sendCommand(cmd("find artist \""+artist+"\"", []), function (err, msg) {
            var list = [];
            var albums=[],albumarts=[];
            if (msg) {
                var path;
                var name;
                var lines = msg.split('\n');
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (line.indexOf('file:') === 0) {
                        var path = line.slice(6);
                        var name = path.split('/').pop();

                        var artist = self.searchFor(lines, i + 1, 'Artist:');
                        var album = self.searchFor(lines, i + 1, 'Album:');
                        var title = self.searchFor(lines, i + 1, 'Title:');
                        var albumart=self.getAlbumArt({artist: artist, album: album}, self.getParentFolder('/mnt/'+path));
                        var time = parseInt(self.searchFor(lines, i + 1, 'Time:'));

                        if (title) {
                            title = title;
                        } else {
                            title = name;
                        }
                        list.push({
                            uri: 'music-library/'+path,
                            service: 'mpd',
                            name: title,
                            artist: artist,
                            album: album,
                            type: 'track',
                            tracknumber: 0,
                            albumart: albumart,
                            duration: time,
                            trackType: path.split('.').pop()
                        });
                    }

                }


                defer.resolve(list);


            }
            else
            {
                self.logger.info(err);
                defer.reject(new Error());
            }
        });

    }
    else if(uri.startsWith('genres://')) {
        //exploding search
        var splitted = uri.split('/');

        if(splitted.length==4)
        {
            return self.explodeUri('artists://'+splitted[3]);
        }
        else if(splitted.length==5)
        {
            return self.explodeUri('albums://'+splitted[4])
        }
        else {
            var genreName = nodetools.urlDecode(splitted[2]);

            var cmd = libMpd.cmd;

            self.clientMpd.sendCommand(cmd("find genre \"" + genreName + "\"", []), function (err, msg) {
                var list = [];
                var albums=[],albumarts=[];
                if (msg) {
                    var path;
                    var name;
                    var lines = msg.split('\n');
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        if (line.indexOf('file:') === 0) {
                            var path = line.slice(6);
                            var name = path.split('/').pop();

                            var artist = self.searchFor(lines, i + 1, 'Artist:');
                            var album = self.searchFor(lines, i + 1, 'Album:');
                            var title = self.searchFor(lines, i + 1, 'Title:');
                            var albumart=self.getAlbumArt({artist: artist, album: album}, self.getParentFolder('/mnt/'+path));
                            var time = parseInt(self.searchFor(lines, i + 1, 'Time:'));

                            if (title) {
                                title = title;
                            } else {
                                title = name;
                            }

                            if(title!=='')
                            {
                                list.push({
                                    uri: 'music-library/'+path,
                                    service: 'mpd',
                                    name: title,
                                    artist: artist,
                                    album: album,
                                    type: 'track',
                                    tracknumber: 0,
                                    albumart: albumart,
                                    duration: time,
                                    trackType: path.split('.').pop()
                                });
                            }

                        }

                    }


                    defer.resolve(list);


                }
                else
                {
                    self.logger.info(err);
                    defer.reject(new Error());
                }
            });
        }



    }
    else {
        if(uri.endsWith('.cue'))
        {
            try {
                var uriPath='/mnt/'+self.sanitizeUri(uri);


                var cuesheet = parser.parse(uriPath);

                var tracks = cuesheet.files[0].tracks;
                var list=[];
                for (var j in tracks) {

                    list.push({
                        service: 'mpd',
                        name: tracks[j].title,
                        artist: tracks[j].performer,
                        album: uriPath.substring(uriPath.lastIndexOf("/") + 1),
                        number: tracks[j].number - 1,
                        uri: 'cue://'+uri+'@'+j,
                        albumart:'/albumart'
                    });
                }

                defer.resolve(list);
            } catch (err) {
                self.logger.info(err);
                self.logger.info('Cue Parser - Cannot parse ' + uriPath);
            }


        }
        else
        {
            var uriPath='/mnt/'+self.sanitizeUri(uri);
            self.commandRouter.logger.info('----------------------------'+uriPath);
            var uris=self.scanFolder(uriPath);
            var response=[];

            libQ.all(uris)
                .then(function(result)
                {
                    for(var j in result)
                    {

                        self.commandRouter.logger.info("----->>>>> "+JSON.stringify(result[j]));

                        if(result!==undefined && result[j].uri!==undefined)
                        {
                            response.push({
                                uri: self.fromPathToUri(result[j].uri),
                                service: 'mpd',
                                name: result[j].name,
                                artist: result[j].artist,
                                album: result[j].album,
                                type: 'track',
                                tracknumber: result[j].tracknumber,
                                albumart: result[j].albumart,
                                duration: result[j].duration,
                                samplerate: result[j].samplerate,
                                bitdepth: result[j].bitdepth,
                                trackType: result[j].trackType
                            });
                        }

                    }

                    defer.resolve(response);
                }).fail(function(err)
            {
                self.commandRouter.logger.info("explodeURI: ERROR "+err);
                defer.resolve([]);
            });
        }

    }

    return defer.promise;
};

ControllerMpd.prototype.fromUriToPath = function (uri) {
    var sections = uri.split('/');
    var prev = '';

    if (sections.length > 1) {

        prev = sections.slice(1, sections.length).join('/');
    }
    return prev;

};

ControllerMpd.prototype.fromPathToUri = function (uri) {
    var sections = uri.split('/');
    var prev = '';

    if (sections.length > 1) {

        prev = sections.slice(1, sections.length).join('/');
    }
    return prev;

};


ControllerMpd.prototype.scanFolder=function(uri)
{
    var self=this;
    var uris=[];

    var stat=libFsExtra.statSync(uri);

    if(stat.isDirectory())
    {
        var files=libFsExtra.readdirSync(uri);

        for(var i in files)
            uris=uris.concat(self.scanFolder(uri+'/'+files[i]));
    }
    else {
            var defer=libQ.defer();
/*
            var parser = mm(libFsExtra.createReadStream(uri), function (err, metadata) {
                if (err) defer.resolve({});
                else {
                    defer.resolve({
                        uri: 'music-library/'+self.fromPathToUri(uri),
                        service: 'mpd',
                        name: metadata.title,
                        artist: metadata.artist[0],
                        album: metadata.album,
                        type: 'track',
                        tracknumber: metadata.track.no,
                        albumart: self.getAlbumArt(
                            {artist:metadata.artist,
                             album: metadata.album},uri),
                        duration: metadata.duration
                    });
                }

            });*/

            var sections = uri.split('/');
            var folderToList = '';
            var command = 'lsinfo';

            if (sections.length > 1) {
                folderToList = sections.slice(2).join('/');

                command += ' "' + folderToList + '"';

            }

            var cmd = libMpd.cmd;

            self.mpdReady.then(function () {
                self.clientMpd.sendCommand(cmd(command, []), function (err, msg) {
                    var list = [];
                    if (msg) {


                        var s0 = sections[0] + '/';
                        var path;
                        var name;
                        var lines = msg.split('\n');
                        var isSolved=false;

                        for (var i = 0; i < lines.length; i++) {
                            var line = lines[i];

                            if (line.indexOf('file:') === 0) {
                                var path = line.slice(6);
                                var name = path.split('/').pop();

                                var artist = self.searchFor(lines, i + 1, 'Artist:');
                                var album = self.searchFor(lines, i + 1, 'Album:');
                                var title = self.searchFor(lines, i + 1, 'Title:');
                                var time = parseInt(self.searchFor(lines, i + 1, 'Time:'));

                                if (title) {
                                    title = title;
                                } else {
                                    title = name;
                                }
								self.commandRouter.logger.info("ALBUMART "+self.getAlbumArt({artist:artist,album: album},uri));
								self.commandRouter.logger.info("URI "+uri);

                                defer.resolve({
                                    uri: 'music-library/'+self.fromPathToUri(uri),
                                    service: 'mpd',
                                    name: title,
                                    artist: artist,
                                    album: album,
                                    type: 'track',
                                    tracknumber: 0,
									albumart: self.getAlbumArt({artist:artist,album: album},self.getAlbumArtPathFromUri(uri)),
                                    duration: time,
                                    trackType: uri.split('.').pop()
                            });

                                isSolved=true;
                            }

                        }

                        if(isSolved===false)
                            defer.resolve({});

                    }
                    else defer.resolve({});
                    });
                });

            return defer.promise;

    }

    return uris;
}




//----------------------- new play system ----------------------------
ControllerMpd.prototype.clearAddPlayTrack = function (track) {
    var self = this;

    var sections = track.uri.split('/');
    var prev = '';

    if(track.uri.startsWith('cue://'))
    {
        var uri1=track.uri.substring(6);
        var splitted=uri1.split('@');

        var index=splitted[1];
        var uri=self.sanitizeUri(splitted[0]);

        self.logger.info(uri);
        self.logger.info(index);

        return self.sendMpdCommand('stop',[])
            .then(function()
            {
                return self.sendMpdCommand('clear',[]);
            })
            .then(function()
            {
                return self.sendMpdCommand('load "'+uri+'"',[]);
            })
            .then(function()
            {
                return self.sendMpdCommand('play',[index]);
            });
    }
    else{
        var uri=self.sanitizeUri(track.uri);

        self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::clearAddPlayTracks '+uri);

        // Clear the queue, add the first track, and start playback
        var defer = libQ.defer();
        var cmd = libMpd.cmd;


        return self.sendMpdCommand('stop',[])
            .then(function()
            {
                return self.sendMpdCommand('clear',[]);
            })
            .then(function()
            {
                return self.sendMpdCommand('add "'+uri+'"',[]);
            })
            .then(function()
            {
                return self.sendMpdCommand('play',[]);
            });
    }

};


ControllerMpd.prototype.seek = function(position) {
    var self=this;
    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::seek');

    var defer = libQ.defer();
    var command = 'seek ';
    var cmd = libMpd.cmd;


        self.clientMpd.sendCommand(cmd(command, ['0',position/1000]), function (err, msg) {
            if (msg) {
                self.logger.info(msg);
            }
            else self.logger.info(err);

            defer.resolve();
        });

    return defer.promise;
};


// MPD pause
ControllerMpd.prototype.pause = function () {
    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::pause');
    return this.sendMpdCommand('pause', []);
};

// MPD resume
ControllerMpd.prototype.resume = function () {
    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::resume');
    return this.sendMpdCommand('play', []);
};


// MPD stop
ControllerMpd.prototype.stop = function () {
    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::stop');
    return this.sendMpdCommand('stop', []);
};


ControllerMpd.prototype.sanitizeUri = function (uri) {
    return uri.replace('music-library/', '').replace('mnt/', '');
}

ControllerMpd.prototype.reportUpdatedLibrary = function () {
    var self = this;
    // TODO PUSH THIS MESSAGE TO ALL CONNECTED CLIENTS
    self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::DB Update Finished');
    return self.commandRouter.pushToastMessage('Success', 'ASF', ' Added');
};

ControllerMpd.prototype.getConfigurationFiles = function () {
    var self = this;

    return ['config.json'];
};

ControllerMpd.prototype.getAdditionalConf = function (type, controller, data) {
    var self = this;
    return self.commandRouter.executeOnPlugin(type, controller, 'getConfigParam', data);
};

ControllerMpd.prototype.setAdditionalConf = function (type, controller, data) {
    var self = this;
    return self.commandRouter.executeOnPlugin(type, controller, 'setConfigParam', data);
};

ControllerMpd.prototype.getMyCollectionStats = function () {
    var self = this;

    var defer = libQ.defer();

    var cmd = libMpd.cmd;
    self.clientMpd.sendCommand(cmd("count", ["group", "artist"]), function (err, msg) {
        if (err) defer.resolve({
            artists: 0,
            albums: 0,
            songs: 0,
            playtime: '00:00:00'
        });
        else {
            var artistsCount = 0;
            var songsCount = 0;
            var playtimesCount = 0;

            var splitted = msg.split('\n');
            for (var i = 0; i < splitted.length - 1; i = i + 3) {
                artistsCount++;
                songsCount = songsCount + parseInt(splitted[i + 1].substring(7));
                playtimesCount = playtimesCount + parseInt(splitted[i + 2].substring(10));
            }

            var convertedSecs = convert(playtimesCount);


            self.clientMpd.sendCommand(cmd("count", ["group", "album"]), function (err, msg) {
                if (!err) {
                    var splittedAlbum = msg.split('\n').length;
                    var response = {
                        artists: artistsCount,
                        albums: (splittedAlbum - 1) / 3,
                        songs: songsCount,
                        playtime: convertedSecs.hours + ':' + ('0' + convertedSecs.minutes).slice(-2) + ':' + ('0' + convertedSecs.seconds).slice(-2)
                    };
                }

                defer.resolve(response);

            });

        }


    });
    return defer.promise;

};


ControllerMpd.prototype.rescanDb = function () {
    var self = this;

    return self.sendMpdCommand('rescan', []);
};



ControllerMpd.prototype.getGroupVolume = function () {
    var self = this;
    var defer = libQ.defer();

    return self.sendMpdCommand('status', [])
        .then(function (objState) {

            if (objState.volume) {
                console.log(objState.volume);
                defer.resolve(objState.volume);
            }



        });
    return defer.promise;
};

ControllerMpd.prototype.setGroupVolume = function (data) {
    var self = this;
    return self.sendMpdCommand('setvol', [data]);
};

ControllerMpd.prototype.syncGroupVolume = function (data) {
    var self = this;

};


ControllerMpd.prototype.handleBrowseUri = function (curUri) {
    var self = this;

    var response;

    self.logger.info("CURURI: "+curUri);
    if (curUri.startsWith('music-library')) {
        response = self.lsInfo(curUri);
    }else if (curUri.startsWith('playlists')) {
        if (curUri == 'playlists')
            response = self.listPlaylists(curUri);
        else response = self.browsePlaylist(curUri);
    }else if (curUri.startsWith('albums://')) {
        if (curUri == 'albums://')
            response = self.listAlbums(curUri);
        else
        {
            var splitted=curUri.split('/');
            if(splitted.length==3)
                response = self.listAlbumSongs(curUri,2,'albums://');
            else response = self.listAlbumSongs(curUri,3,'albums://'+splitted[2]);
        }
    }else if (curUri.startsWith('artists://')) {
        if (curUri == 'artists://')
            response = self.listArtists(curUri);
        else
        {
            var splitted=curUri.split('/');
            if(splitted.length==3)
                response = self.listArtist(curUri,2,'artists://');
            else response = self.listAlbumSongs(curUri,3,'artists://'+splitted[2]);
        }
    }else if (curUri.startsWith('genres://')) {
        if (curUri == 'genres://')
            response = self.listGenres(curUri);
        else
        {
            var splitted=curUri.split('/');

            if(splitted.length==3)
                response = self.listGenre(curUri);
            else if(splitted.length==4)
                response= self.listArtist(curUri,3,'genres://'+splitted[2],'genres://'+splitted[2]+'/'+splitted[3]);
            else
            {
                if(splitted[3]=='')
                    response = self.listAlbumSongs(curUri,4,'genres://'+splitted[2]);
                else response = self.listAlbumSongs(curUri,4,'genres://'+splitted[2]+"/"+splitted[3]);
            }

        }


    }


    return response;
};


/**
 *
 * list album
 */
ControllerMpd.prototype.listAlbums = function () {
    var self = this;


    var defer = libQ.defer();

    var response = {
        "navigation": {
            "lists": [
                {
                    "availableListViews": [
                        "list",
                        "grid"
                    ],
                    "items": [

                    ]
                }
            ]
        }
    };

    var cmd = libMpd.cmd;
    self.clientMpd.sendCommand(cmd("list", ["album","group","artist"]), function (err, msg) {
        if(err)
            defer.reject(new Error('Cannot list albums'));
        else
        {
            var lines=msg.split('\n');

            for (var i = 0; i < lines.length; i++)
            {
                var line=lines[i];
                if (line.indexOf('Album:') === 0) {
                    var albumName = line.slice(6).trim();

                    if(albumName!==undefined && albumName!=='')
                    {
                        var artistName=lines[i+1].slice(7).trim();

                        var codedAlbumName = nodetools.urlEncode(albumName);
                        var album = {service:'mpd',type: 'folder', title: albumName,  artist:artistName,albumart: self.getAlbumArt({artist:artistName,album:albumName},undefined,'fa-dot-circle-o'), uri: 'albums://' + codedAlbumName};

                        response.navigation.lists[0].items.push(album);
                    }
                }
            }
            defer.resolve(response);
        }
    });
    return defer.promise;

};

/**
 *
 * list album
 */
ControllerMpd.prototype.listAlbumSongs = function (uri,index,previous) {
    var self = this;

    var defer = libQ.defer();

    var splitted = uri.split('/');

    var albumName = nodetools.urlDecode(splitted[index]);

    var response={
        "navigation": {
            "lists": [
                {
                    "availableListViews": [
                        "list"
                    ],
                    "items": [

                    ]
                }
            ],
            "prev": {
                "uri": previous
            }
        }
    };

    var cmd = libMpd.cmd;
    self.clientMpd.sendCommand(cmd("find album \""+albumName+"\"", []), function (err, msg) {
        if (msg) {
            var path;
            var name;
            var lines = msg.split('\n');
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (line.indexOf('file:') === 0) {
                    var path = line.slice(6);
                    var name = path.split('/').pop();

                    var artist = self.searchFor(lines, i + 1, 'Artist:');
                    var album = self.searchFor(lines, i + 1, 'Album:');
                    var title = self.searchFor(lines, i + 1, 'Title:');
                    var albumart=self.getAlbumArt({artist: artist, album: album}, self.getParentFolder(path),'fa-dot-circle');
                    var time = parseInt(self.searchFor(lines, i + 1, 'Time:'));

                    if (title) {
                        title = title;
                    } else {
                        title = name;
                    }
                    response.navigation.lists[0].items.push({
                        uri: 'music-library/'+path,
                        service: 'mpd',
                        title: title,
                        artist: artist,
                        album: album,
                        type: 'song',
                        tracknumber: 0,
                        albumart: albumart,
                        duration: time,
                        trackType: path.split('.').pop()
                    });


                }

            }
        }
        else self.logger.info(err);

        defer.resolve(response);
    });

    return defer.promise;

};

/**
 *
 * list album
 */
ControllerMpd.prototype.listArtists = function () {
    var self = this;

    var defer = libQ.defer();

    var response = {
        "navigation": {
        "lists": [{
            "availableListViews": [
                "list",
                "grid"
            ],
            "items": [

            ]
        }]
        }
    };

    var cmd = libMpd.cmd;
    self.clientMpd.sendCommand(cmd("list", ["artist"]), function (err, msg) {
        if(err)
            defer.reject(new Error('Cannot list artist'));
        else
        {
            var splitted=msg.split('\n');

            for(var i in splitted)
            {
                if(splitted[i].startsWith('Artist:'))
                {
                    var artist=splitted[i].substring(8);

                    if(artist!=='')
                    {
                        var codedArtists=nodetools.urlEncode(artist);

                        var albumart=self.getAlbumArt({artist:codedArtists},undefined,'fa-users');
                        var item={
                            service: "mpd",
                            type: 'folder',
                            title: artist,
                            albumart: albumart,
                            uri: 'artists://' + codedArtists
                        }

                        response.navigation.lists[0].items.push(item);
                    }
                }
            }
            defer.resolve(response);
        }
    });
    return defer.promise;

};

/**
 *
 * list album
 */
ControllerMpd.prototype.listArtist = function (curUri,index,previous,uriBegin) {
    var self = this;

    var defer = libQ.defer();

    var splitted=curUri.split('/');

    var response = {
        "navigation": {
            "lists": [{
                "title": self.commandRouter.getI18nString('COMMON.ALBUMS'),
                "icon": "fa icon",
                "availableListViews": [
                    "list",
                    "grid"
                ],
                "items": [

                ]
            },
                {
                    "title": self.commandRouter.getI18nString('COMMON.TRACKS'),
                    "icon": "fa icon",
                    "availableListViews": [
                        "list"
                    ],
                    "items": [

                    ]
                }],
            "prev": {
                "uri": previous
            }
        }
    };

    self.mpdReady
        .then(function()
        {
            var artist=nodetools.urlDecode(splitted[index]);


            var cmd = libMpd.cmd;

            self.clientMpd.sendCommand(cmd("find artist \""+artist+"\"", []), function (err, msg) {
                var list = [];
                var albums=[],albumarts=[];
                if (msg) {
                    var path;
                    var name;
                    var lines = msg.split('\n');
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        if (line.indexOf('file:') === 0) {
                            var path = line.slice(6);
                            var name = path.split('/').pop();

                            var artist = self.searchFor(lines, i + 1, 'Artist:');
                            var album = self.searchFor(lines, i + 1, 'Album:');
                            var title = self.searchFor(lines, i + 1, 'Title:');
                            var albumart=self.getAlbumArt({artist: artist, album: album}, self.getParentFolder(path),'fa-dot-circle-o');

                            if (title) {
                                title = title;
                            } else {
                                title = name;
                            }
                            response.navigation.lists[1].items.push({
                                service: 'mpd',
                                type: 'song',
                                title: title,
                                artist: artist,
                                album: album,
                                albumart: albumart,
                                uri: path
                            });

                            if(albums.indexOf(album)===-1)
                            {
                                albums.push(album);
                                albumarts.push();

                                var uri;

                                if(uriBegin===undefined)
                                    uri='artists://' + nodetools.urlEncode(artist) +'/'+nodetools.urlEncode(album);
                                else uri=uriBegin+'/'+nodetools.urlEncode(album);

                                response.navigation.lists[0].items.push(
                                    {
                                        service:'mpd',
                                        type: 'folder',
                                        title: album,
                                        albumart: self.getAlbumArt({artist: artist, album: album}, self.getParentFolder(path),'fa-dot-circle-o'),
                                        uri: uri
                                    });
                            }
                        }

                    }

                    defer.resolve(response);


                }
                else
                {
                    self.logger.info(err);
                    defer.reject(new Error());
                }
            });
        });

    return defer.promise;

};


/**
 *
 * list album
 */
ControllerMpd.prototype.listGenres = function () {
    var self = this;

    var defer = libQ.defer();

    var response = {
        "navigation": {
            "lists": [
                {
                    "availableListViews": [
                        "list"
                    ],
                    "items": [

                    ]
                }
            ]
        }
    };


    var cmd = libMpd.cmd;
    self.clientMpd.sendCommand(cmd("list", ["genre"]), function (err, msg) {
        if(err)
            defer.reject(new Error('Cannot list genres'));
        else
        {
            var splitted=msg.split('\n');

            for(var i in splitted)
            {
                if(splitted[i].startsWith('Genre:'))
                {
                    var genreName=splitted[i].substring(7);

                    if(genreName!=='')
                    {
                        var albumart=self.getAlbumArt({},undefined,'fa-tags');
                        var album = {service:'mpd',type: 'folder', title: genreName, albumart:albumart, uri: 'genres://' + nodetools.urlEncode(genreName)};

                        response.navigation.lists[0].items.push(album);
                    }

                }
            }
            defer.resolve(response);
        }
    });
    return defer.promise;

};

/**
 *
 * list album
 */
ControllerMpd.prototype.listGenre = function (curUri) {
    var self = this;

    var defer = libQ.defer();

    var splitted=curUri.split('/');
    var genreName=nodetools.urlDecode(splitted[2]);

    var response={
        "navigation": {
            "lists": [
                {
                    "title": self.commandRouter.getI18nString('COMMON.ARTISTS'),
                    "icon": "fa icon",
                    "availableListViews": [
                        "list",
                        "grid"
                    ],
                    "items": []
                },
                {
                    "title": self.commandRouter.getI18nString('COMMON.ALBUMS'),
                    "icon": "fa icon",
                    "availableListViews": [
                        "list",
                        "grid"
                    ],
                    "items": []
                }
                ,{
                    "title": self.commandRouter.getI18nString('COMMON.TRACKS'),
                    "icon": "fa icon",
                    "availableListViews": [
                        "list"
                    ],
                    "items": []
                }
            ],
            "prev": {
                "uri": "genres://"
            }
        }
    };

    self.mpdReady
        .then(function() {
            var cmd = libMpd.cmd;
            self.clientMpd.sendCommand(cmd("find genre \"" + genreName + "\"", []), function (err, msg) {
                var albums=[];
                var albumsArt=[];
                var artists=[];
                var artistArt=[];

                var list = [];
                if (msg) {
                    var path;
                    var name;
                    var lines = msg.split('\n');
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        if (line.indexOf('file:') === 0) {
                            var path = line.slice(6);
                            var name = path.split('/').pop();

                            var artist = self.searchFor(lines, i + 1, 'Artist:');
                            var album = self.searchFor(lines, i + 1, 'Album:');
                            var title = self.searchFor(lines, i + 1, 'Title:');
                            var albumart = self.getAlbumArt({artist: artist, album: album}, self.getParentFolder(path),'fa-tags');

                            if (title) {
                                title = title;
                            } else {
                                title = name;
                            }

                            if(title!=='')
                            {
                                response.navigation.lists[2].items.push({
                                    service: 'mpd',
                                    type: 'song',
                                    title: title,
                                    artist: artist,
                                    album: album,
                                    albumart: albumart,
                                    uri: 'music-library/' + path
                                });
                            }

                            if(albums.indexOf(album)===-1)
                            {
                                albums.push(album);
                                albumsArt.push(albumart);

                                if(album!=='')
                                    response.navigation.lists[1].items.push({service:'mpd',type: 'folder', title: album, albumart: albumart,
                                        uri: 'genres://' + nodetools.urlEncode(genreName)+'//'+nodetools.urlEncode(album)});
                            }

                            if(artists.indexOf(artist)===-1)
                            {
                                artists.push(artist);
                                artistArt.push()

                                if(artist!=='')
                                    response.navigation.lists[0].items.push({service:'mpd',type: 'folder', title: artist, albumart: self.getAlbumArt({artist: artist}, self.getParentFolder('/mnt/' + path),'fa-users'),
                                        uri: 'genres://' + nodetools.urlEncode(genreName)+'/'+nodetools.urlEncode(artist)});
                            }

                        }

                    }


                    defer.resolve(response);

                }
                else
                {
                    self.logger.info(err);
                    defer.reject(new Error());
                }


            });
        });
    return defer.promise;

};


ControllerMpd.prototype.getMixerControls = function () {
    var self = this;

    var cards = self.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getMixerControls', '1');

    cards.then(function (data) {
        console.log(data);
    })
        .fail(function () {
            console.log(data);
        });

    //console.log(cards)

};

ControllerMpd.prototype.getParentFolder = function (file) {
    var index=file.lastIndexOf('/');

    if(index>-1)
    {
        return file.substring(0,index);
    }
    else return '';
};

ControllerMpd.prototype.getAlbumArtPathFromUri = function (uri) {
    var self = this;
    var startIndex = 0;

    var splitted = uri.split('/');

    while (splitted[startIndex] === '') {
        startIndex = startIndex + 1;
    }


    if (splitted[startIndex] === 'mnt') {
        startIndex = startIndex + 1;
    }

    var result = '';

    for (var i = startIndex; i < splitted.length - 1; i++) {

        result = result + '/' + splitted[i];
    }

    return result;

}

ControllerMpd.prototype.prefetch = function (trackBlock) {
    var self=this;
    this.logger.info("DOING PREFETCH IN MPD");
    var uri=this.sanitizeUri(trackBlock.uri);
    this.logger.info(uri);

    return this.sendMpdCommand('add "'+uri+'"',[])
        .then(function(){
            return self.sendMpdCommand('consume 1',[]);
        });
}

ControllerMpd.prototype.goto=function(data){
    if(data.type=='artist')
        return this.listArtist('artists://'+nodetools.urlEncode(data.value),2,'')
    else
        return this.listAlbumSongs("albums://"+nodetools.urlEncode(data.value),2);

}

