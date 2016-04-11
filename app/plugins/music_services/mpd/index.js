'use strict';

var libMpd = require('mpd');
var libQ = require('kew');
var libFast = require('fast.js');
var libFsExtra = require('fs-extra');
var libChokidar = require('chokidar');
var exec = require('child_process').exec;
var nodetools = require('nodetools');
var convert = require('convert-seconds');
var pidof = require('pidof');
var parser = require('cue-parser');
var config = new (require('v-conf'))();

// Define the ControllerMpd class
module.exports = ControllerMpd;
function ControllerMpd(context) {
	// This fixed variable will let us refer to 'this' object at deeper scopes
	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;
}

// Public Methods ---------------------------------------------------------------------------------------
// These are 'this' aware, and return a promise

// Define a method to clear, add, and play an array of tracks
ControllerMpd.prototype.clearAddPlayTracks = function (arrayTrackUris) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::clearAddPlayTracks');

	// Clear the queue, add the first track, and start playback
	return self.sendMpdCommandArray([
			{command: 'clear', parameters: []},
			{command: 'add', parameters: [arrayTrackUris.shift()]},
			{command: 'play', parameters: []}
		])
		.then(function () {
			// If there are more tracks in the array, add those also
			if (arrayTrackUris.length > 0) {
				return self.sendMpdCommandArray(
					libFast.map(arrayTrackUris, function (currentTrack) {
						return {command: 'add', parameters: [currentTrack]};
					})
				);
			} else {
				return libQ.resolve();
			}
		});
};
//MPD Play
ControllerMpd.prototype.play = function (N) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::play ' + N);
	return this.sendMpdCommand('play', [N]);
};

//MPD Add
ControllerMpd.prototype.add = function (data) {
	this.commandRouter.pushToastMessage('Success', '', data + ' Added');
	return this.sendMpdCommand('add', [data]);
};
//MPD Remove
ControllerMpd.prototype.remove = function (position) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::remove ' + position);
	return this.sendMpdCommand('delete', [position]);
};

// MPD stop
ControllerMpd.prototype.stop = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::stop');
	return this.sendMpdCommand('stop', []);
};

// MPD pause
ControllerMpd.prototype.pause = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::pause');
	return this.sendMpdCommand('pause', []);
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
	this.commandRouter.pushToastMessage('success', "Random", string === 1 ? 'ON' : 'OFF');
	return this.sendMpdCommand('random', [string])
};

//MPD Repeat
ControllerMpd.prototype.repeat = function (repeatcmd) {
	var string = repeatcmd ? 1 : 0;
	this.commandRouter.pushToastMessage('success', "Repeat", string === 1 ? 'ON' : 'OFF');
	return this.sendMpdCommand('repeat', [string]);
};


// MPD resume
ControllerMpd.prototype.resume = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::resume');
	return this.sendMpdCommand('play', []);
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

	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::addPlay');
	this.commandRouter.pushToastMessage('Success', '', fileName + ' Added');


	//Add playlists and cue with load command
	if (fileName.endsWith('.cue') || fileName.endsWith('.pls') || fileName.endsWith('.m3u')) {
		this.logger.info('Adding Playlist: ' + fileName);
		return this.sendMpdCommandArray([
			{command: 'clear', parameters: []},
			{command: 'load', parameters: [fileName]},
			{command: 'play', parameters: []}
		])
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
	this.commandRouter.pushToastMessage('Success', '', data.uri + ' Added');

	//Add playlists and cue with load command
	this.logger.info('Adding CUE individual entry: ' + data.number + ' ' + data.uri)
	return this.sendMpdCommandArray([
		{command: 'clear', parameters: []},
		{command: 'load', parameters: [data.uri]},
		{command: 'play', parameters: [data.number]}
	])
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
						collectedState.albumart = trackinfo.albumart;
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
				collectedState.albumart = null;
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
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::sendMpdCommand');

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

	var file = objTrackInfo.file;
	var filetitle = file.replace(/^.*\/(?=[^\/]*$)/, '');
	
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
	} else {
		resp.uri = null;
	}

	if (objTrackInfo.Title != undefined) {
		resp.title = objTrackInfo.Title;
	} else {
		resp.title = filetitle;
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
			} else if (nSampleRateRaw === 705.6) {
				var nSampleRateRaw = 5.64+' MHz';
			} else if (nSampleRateRaw === 1411.2) {
				var nSampleRateRaw = 11.2+' MHz';
			}else {
				var nSampleRateRaw = nSampleRateRaw+' KHz';
			}
		nSampleRate = nSampleRateRaw;
		nBitDepth = Number(objMetrics[1]);
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


	return {
		status: sStatus,
		position: nPosition,
		seek: nSeek,
		duration: nDuration,
		samplerate: nSampleRate,
		bitdepth: nBitDepth,
		channels: nChannels,
		random: random,
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

	var configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');
	config.loadFile(configFile)

	this.commandRouter.sharedVars.registerCallback('alsa.outputdevice', this.outputDeviceCallback.bind(this));
	// Connect to MPD only if process MPD is running
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
	self.clientMpd.on('system', function () {
		var timeStart = Date.now();

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
		self.commandRouter.fileUpdate();
		return self.reportUpdatedLibrary();
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



ControllerMpd.prototype.savePlaybackOptions = function (data) {
	var self = this;

	var defer = libQ.defer();

	self.config.set('gapless_mp3_playback', data['gapless_mp3_playback']);
	self.config.set('volume_normalization', data['volume_normalization']);
	self.config.set('audio_buffer_size', data['audio_buffer_size'].value);
	self.config.set('buffer_before_play', data['buffer_before_play'].value);
	self.config.set('auto_update', data['auto_update']);

	self.createMPDFile(function (error) {
		if (error !== undefined && error !== null) {
			self.commandRouter.pushToastMessage('error', "Configuration update", 'Error while Applying new configuration');
			defer.resolve({});
		}
		else {
			self.commandRouter.pushToastMessage('success', "Configuration update", 'The playback configuration has been successfully updated');

			self.restartMpd(function (error) {
				if (error !== null && error != undefined) {
					self.logger.info('Cannot restart MPD: ' + error);
					self.commandRouter.pushToastMessage('error', "Player restart", 'Error while restarting player');
				}
				else self.commandRouter.pushToastMessage('success', "Player restart", 'Player successfully restarted');

				defer.resolve({});
			});
		}
	});

	return defer.promise;

};


ControllerMpd.prototype.restartMpd = function (callback) {
	var self = this;

	exec('sudo /bin/systemctl restart mpd.service ',
		function (error, stdout, stderr) {
			callback(error);
		});

};

ControllerMpd.prototype.outputDeviceCallback = function () {
	var self = this;

	var defer = libQ.defer();


	self.createMPDFile(function (error) {
		if (error !== undefined && error !== null) {
			self.commandRouter.pushToastMessage('error', "Configuration update", 'Error while Applying new configuration');
			defer.resolve({});
		}
		else {
			self.commandRouter.pushToastMessage('success', "Configuration update", 'The playback configuration has been successfully updated');

			self.restartMpd(function (error) {
				if (error !== null && error != undefined) {
					self.logger.info('Cannot restart MPD: ' + error);
					self.commandRouter.pushToastMessage('error', "Player restart", 'Error while restarting player');
				}
				else self.commandRouter.pushToastMessage('success', "Player restart", 'Player successfully restarted');

				defer.resolve({});
			});
		}
	});
};

ControllerMpd.prototype.createMPDFile = function (callback) {
	var self = this;

	try {

	fs.readFile(__dirname + "/mpd.conf.tmpl", 'utf8', function (err, data) {
		if (err) {
			return console.log(err);
		}


		var conf1 = data.replace("${gapless_mp3_playback}", self.checkTrue('gapless_mp3_playback'));
		var conf2 = conf1.replace("${device}", self.getAdditionalConf('audio_interface', 'alsa_controller', 'outputdevice'));
		var conf3 = conf2.replace("${volume_normalization}", self.checkTrue('volume_normalization'));
		var conf4 = conf3.replace("${audio_buffer_size}", self.config.get('audio_buffer_size'));
		var conf5 = conf4.replace("${buffer_before_play}", self.config.get('buffer_before_play'));

		fs.writeFile("/etc/mpd.conf", conf5, 'utf8', function (err) {
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
	return this.config.get(key);
};

ControllerMpd.prototype.setConfigParam = function (data) {
	this.config.set(data.key, data.value);
};

ControllerMpd.prototype.fswatch = function () {
	var self = this;
	var watcher = libChokidar.watch('/mnt/', {ignored: /^\./, persistent: true, interval: 100, ignoreInitial: true});
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::StartedWatchService');
	watcher
		.on('add', function (path) {
			self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::UpdateMusicDatabase');

			watcher.close();
			return self.waitupdate();
		})
		.on('addDir', function (path) {
			self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::UpdateMusicDatabase');
			self.sendMpdCommand('update', []);
			watcher.close();
			return self.waitupdate();
		})
		.on('unlink', function (path) {
			self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::UpdateMusicDatabase');
			self.sendMpdCommand('update', []);
			watcher.close();
			return self.waitupdate();
		})
		.on('error', function (error) {
			self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::UpdateMusicDatabase ERROR');
		})
};

ControllerMpd.prototype.waitupdate = function () {
	var self = this;

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::WaitUpdatetoFinish');
	//Delay to ensure any media is properly mounted and accessible
	setTimeout(function () {
		return self.sendMpdCommand('update', []);
	}, 500);

	setTimeout(function () {
		return self.fswatch()
	}, 5000);
};


ControllerMpd.prototype.listPlaylists = function (uri) {
	var self = this;


	var defer = libQ.defer();

	var response = {
		navigation: {
			prev: {
				uri: ''
			},
			list: []
		}
	};
	var promise = self.commandRouter.playListManager.listPlaylist();
	promise.then(function (data) {
		for (var i in data) {
			var ithdata = data[i];
			var song = {type: 'playlist', title: ithdata, icon: 'fa fa-list-ol', uri: 'playlists/' + ithdata};

			response.navigation.list.push(song);
		}

		defer.resolve(response);
	});


	return defer.promise;
};

ControllerMpd.prototype.browsePlaylist = function (uri) {
	var self = this;

	var defer = libQ.defer();

	var response = {
		navigation: {
			prev: {
				uri: 'playlists'
			},
			list: []
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

			response.navigation.list.push(song);
		}

		//console.log(JSON.stringify(response));
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
	console.log(uri);

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
					if (line.indexOf('directory:') === 0) {
						path = line.slice(11);
						name = path.split('/').pop();
						list.push({
							type: 'folder',
							title: name,
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
					list: list
				}
			});
		});
	});
	return defer.promise;
};

ControllerMpd.prototype.search = function (query) {
	var self = this;

	var defer = libQ.defer();
	var command = 'search any';
	command += ' "' + query + '"';
	var cmd = libMpd.cmd;
	var list = [];

	self.mpdReady.then(function () {
		self.clientMpd.sendCommand(cmd(command, []), function (err, msg) {
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
						list.push({
							service: 'mpd',
							type: 'song',
							title: title,
							artist: artist,
							album: album,
							icon: 'fa fa-music',
							uri: 'music-library/' + path
						});
					}

				}
			}
			else self.logger.info(err);

			defer.resolve({
				navigation: {
					prev: {
						uri: '/'
					},
					list: list
				}
			});
		});
	});
	return defer.promise;
};

ControllerMpd.prototype.searchFor = function (lines, startFrom, beginning) {

	var count = lines.length;
	var i = startFrom;

	while (i < count) {
		var line = lines[i];

		if (line.indexOf(beginning) === 0)
			return line.slice(beginning.length).trimLeft();
		else if (line.indexOf('file:') === 0)
			return '';
		else if (line.indexOf('directory:') === 0)
			return '';

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

				self.commandRouter.volumioClearQueue();

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
				self.commandRouter.addQueueItems(queue);
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


ControllerMpd.prototype.getAlbumArt = function (data, path) {

	var artist, album;

	if (data != undefined && data.path != undefined) {
		path = data.path;
	}

	var web;

	if (data != undefined && data.artist != undefined) {
		artist = data.artist;
		if (data.album != undefined)
			album = data.album;
		else album = data.artist;

		web = '?web=' + nodetools.urlEncode(artist) + '/' + nodetools.urlEncode(album) + '/extralarge'
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

	return url;
};


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
	return self.sendMpdCommand('status', [])
		.then(function (objState) {
			var state = self.parseState(objState);
			if (state.volume != undefined) {
				state.volume = groupvolume;
				console.log(groupvolume);
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


ControllerMpd.prototype.handleBrowseUri = function (curUri) {
    var self = this;

    var response;

    if (curUri.startsWith('music-library')) {
        response = self.lsInfo(curUri);
    }else if (curUri.startsWith('playlists')) {
        if (curUri == 'playlists')
            response = self.listPlaylists(curUri);
        else response = self.browsePlaylist(curUri);
    }

    return response;
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
