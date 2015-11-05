var libMpd = require('mpd');
var libQ = require('kew');
var libFast = require('fast.js');
var libUtil = require('util');
var libFsExtra = require('fs-extra');
var libChokidar = require('chokidar');
var exec = require('child_process').exec;
var s=require('string');
var ifconfig = require('wireless-tools/ifconfig');
var ip = require('ip');
var nodetools=require('nodetools');
var convert = require('convert-seconds');

// Define the ControllerMpd class
module.exports = ControllerMpd;
function ControllerMpd(context) {
	// This fixed variable will let us refer to 'this' object at deeper scopes
	var self = this;
	self.context=context;
	self.commandRouter = self.context.coreCommand;
	self.logger=self.context.logger;
}

// Public Methods ---------------------------------------------------------------------------------------
// These are 'this' aware, and return a promise

// Define a method to clear, add, and play an array of tracks
ControllerMpd.prototype.clearAddPlayTracks = function(arrayTrackUris) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::clearAddPlayTracks');

	// Clear the queue, add the first track, and start playback
	return self.sendMpdCommandArray([
		{command: 'clear', parameters: []},
		{command: 'add', parameters: [arrayTrackUris.shift()]},
		{command: 'play', parameters: []}
	])
	.then(function() {
		// If there are more tracks in the array, add those also
		if (arrayTrackUris.length > 0) {
			return self.sendMpdCommandArray(
				libFast.map(arrayTrackUris, function(currentTrack) {
					return {command: 'add',		parameters: [currentTrack]};
				})
			);
		} else {
			return libQ.resolve();
		}
	});
};
//MPD Play
ControllerMpd.prototype.play = function(N) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::play ' +N);

	return self.sendMpdCommand('play', [N]);
};

//MPD Add
ControllerMpd.prototype.add = function(data) {
	var self = this;
	self.commandRouter.pushToastMessage('Success','',str + ' Added');

	return self.sendMpdCommand('add', [data]);
};
//MPD Remove
ControllerMpd.prototype.remove = function(position) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::remove ' + position);

	return self.sendMpdCommand('delete', [position]);
};

// MPD stop
ControllerMpd.prototype.stop = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::stop');

	return self.sendMpdCommand('stop', []);
};

// MPD pause
ControllerMpd.prototype.pause = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::pause');

	return self.sendMpdCommand('pause', []);
};

//MPD Next
ControllerMpd.prototype.next = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::next');

	return self.sendMpdCommand('next', []);
};

//MPD Previous
ControllerMpd.prototype.previous = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::previous');

	return self.sendMpdCommand('previous', []);
};

//MPD Seek
ControllerMpd.prototype.seek = function(timepos) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::seek to ' +timepos);

	return self.sendMpdCommand('seekcur', [timepos]);
};

//MPD Random
ControllerMpd.prototype.random = function(randomcmd) {
	var self = this;
	var string = randomcmd ? 1 : 0;
	console.log(string);
	if (string === 1) {
		self.commandRouter.pushToastMessage('success',"Random", 'ON');
	} else if (string === 0) {
		self.commandRouter.pushToastMessage('success',"Random", 'OFF');
	}



	return self.sendMpdCommand('random', [string])
};

//MPD Repeat
ControllerMpd.prototype.repeat = function(repeatcmd) {
	var self = this;
	var string = repeatcmd ? 1 : 0;
	if (string === 1) {
		self.commandRouter.pushToastMessage('success',"Repeat", 'ON');
	} else if (string === 0) {
		self.commandRouter.pushToastMessage('success',"Repeat", 'OFF');
	}
	return self.sendMpdCommand('repeat', [string]);
};


// MPD resume
ControllerMpd.prototype.resume = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::resume');

	return self.sendMpdCommand('play', []);
};

// MPD clear
ControllerMpd.prototype.clear = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::clear');

	return self.sendMpdCommand('clear', []);
};

// MPD enable output
ControllerMpd.prototype.enableOutput = function(output) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Enable Output ' +output);

	return self.sendMpdCommand('enableoutput', [output]);
};

// MPD disable output
ControllerMpd.prototype.disableOutput = function(output) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Disable Output ' +output);

	return self.sendMpdCommand('disableoutput', [output]);
};

//UpdateDB
ControllerMpd.prototype.updateMpdDB = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Update mpd DB');

	return self.sendMpdCommand('update', []);
};


ControllerMpd.prototype.addPlay = function(data) {
	var self = this;
	//self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::addPlay');
	self.commandRouter.pushToastMessage('Success','',str + ' Added');

	console.log("PALY DATA "+JSON.stringify(data));
	return self.sendMpdCommandArray([
		{command: 'clear', parameters: []},
		{command: 'add', parameters: [data]},
		{command: 'play', parameters: []}
	])
	/*.then(function() {
		self.commandRouter.volumioPlay();

	});*/
};


// MPD music library
ControllerMpd.prototype.getTracklist = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::getTracklist');

	return self.mpdReady
		.then(function() {
			return libQ.nfcall(libFast.bind(self.clientMpd.sendCommand, self.clientMpd), libMpd.cmd('listallinfo', []));
		})
		.then(libFast.bind(self.parseListAllInfoResult, self))
		.then(function(objResult) {
			return objResult.tracks;
		});
};

// Internal methods ---------------------------------------------------------------------------
// These are 'this' aware, and may or may not return a promise

// Parses the info out of the 'listallinfo' MPD command
// Metadata fields to roughly conform to Ogg Vorbis standards (http://xiph.org/vorbis/doc/v-comment.html)
ControllerMpd.prototype.parseListAllInfoResult = function(sInput) {
	var self = this;

	var arrayLines = sInput.split('\n');
	var objReturn = {};
	var curEntry = {}

	objReturn.tracks = [];
	objReturn.playlists = [];

	for (var i = 0; i < arrayLines.length; i++) {
		var arrayLineParts = libFast.map(arrayLines[i].split(':'), function(sPart) {
			return sPart.trim();
		});

		if (arrayLineParts[0] === 'file') {
			curEntry = {
				'name': '',
				'service': self.servicename,
				'uri': arrayLineParts[1],
				'browsepath': [self.displayname].concat(arrayLineParts[1].split('/').slice(0, -1)),
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
			curEntry.artists = libFast.map(arrayLineParts[1].split(','), function(sArtist) {
				// TODO - parse other options in artist string, such as "feat."
				return sArtist.trim();
			});
		} else if (arrayLineParts[0] === 'AlbumArtist') {
			curEntry.performers = libFast.map(arrayLineParts[1].split(','), function(sPerformer) {
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
}

// Define a method to get the MPD state
ControllerMpd.prototype.getState = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::getState');

	var collectedState = {};
	var timeCurrentUpdate = Date.now();
	self.timeLatestUpdate = timeCurrentUpdate;

	return self.sendMpdCommand('status', [])
	/*.then(function(data) {
		return self.haltIfNewerUpdateRunning(data, timeCurrentUpdate);
	})*/
	.then(libFast.bind(self.parseState, self))
	.then(function(state) {
		collectedState = state;

		// If there is a track listed as currently playing, get the track info
		if (collectedState.position !== null) {
			return self.sendMpdCommand('playlistinfo', [collectedState.position])
			/*.then(function(data) {
				return self.haltIfNewerUpdateRunning(data, timeCurrentUpdate);
			})*/
			.then(libFast.bind(self.parseTrackInfo, self))
			.then(function(trackinfo) {
				collectedState.title = trackinfo.title;
				collectedState.artist = trackinfo.artist;
				collectedState.album = trackinfo.album;
				collectedState.albumart = trackinfo.albumart;
				return libQ.resolve(collectedState);
			});
			// Else return null track info
		} else {
			collectedState.title = null;
			collectedState.artist = null;
			collectedState.album = null;
			collectedState.albumart = null;
			return libQ.resolve(collectedState);
		}
	});
};

// Stop the current status update thread if a newer one exists
ControllerMpd.prototype.haltIfNewerUpdateRunning = function(data, timeCurrentThread) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::haltIfNewerUpdateRunning');

	if (self.timeLatestUpdate > timeCurrentThread) {
		return libQ.reject('Alert: Aborting status update - newer one detected');
	} else {
		return libQ.resolve(data);
	}
};

// Announce updated MPD state
ControllerMpd.prototype.pushState = function(state) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::pushState');

	return self.commandRouter.servicePushState(state, self.servicename);
};

// Pass the error if we don't want to handle it
ControllerMpd.prototype.pushError = function(sReason) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::pushError');
	self.commandRouter.pushConsoleMessage(sReason);

	// Return a resolved empty promise to represent completion
	return libQ.resolve();
};

// Define a general method for sending an MPD command, and return a promise for its execution
ControllerMpd.prototype.sendMpdCommand = function(sCommand, arrayParameters) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::sendMpdCommand');

	return self.mpdReady
	.then(function() {
		self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'sending command...');
		return libQ.nfcall(libFast.bind(self.clientMpd.sendCommand, self.clientMpd), libMpd.cmd(sCommand, arrayParameters));
	})
	.then(function(response) {
		self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'parsing response...');
		return libQ.resolve(libMpd.parseKeyValueMessage.call(libMpd, response));
	});
};

// Define a general method for sending an array of MPD commands, and return a promise for its execution
// Command array takes the form [{command: sCommand, parameters: arrayParameters}, ...]
ControllerMpd.prototype.sendMpdCommandArray = function(arrayCommands) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::sendMpdCommandArray');

	return self.mpdReady
	.then(function() {
		return libQ.nfcall(libFast.bind(self.clientMpd.sendCommands, self.clientMpd),
			libFast.map(arrayCommands, function(currentCommand) {
				return libMpd.cmd(currentCommand.command, currentCommand.parameters);
			})
		);
	})
	.then(libFast.bind(libMpd.parseKeyValueMessage, libMpd));
};

// Parse MPD's track info text into Volumio recognizable object
ControllerMpd.prototype.parseTrackInfo = function(objTrackInfo) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::parseTrackInfo');

	var defer=libQ.defer();

	console.log(JSON.stringify("OBJTRACKINFO "+JSON.stringify(objTrackInfo)));
	var resp={};

	if (objTrackInfo.Title!=undefined) {
		resp.title=objTrackInfo.Title;
	} else {
		resp.title=objTrackInfo.null;
	}

	if (objTrackInfo.Artist!=undefined) {
		resp.artist=objTrackInfo.Artist;
	} else {
		resp.artist=null;
	}

	if (objTrackInfo.Album!=undefined) {
		resp.album=objTrackInfo.Album;
	} else {
		resp.album=null;
	}

	var promise;
	var foundFileCover=false;
	var web;

	var coverFolder='/mnt';

	var splitted=objTrackInfo.file.split('/');

	for(var k=0;k<splitted.length-1;k++)
	{
		coverFolder=coverFolder+'/'+splitted[k];
	}

	if(objTrackInfo.Artist!=undefined)
	{
		if (objTrackInfo.Album!=undefined) {
			web={artist:objTrackInfo.Artist,album:objTrackInfo.Album};
		} else {
			web={artist:objTrackInfo.Artist};
		}
	}

	promise=self.getAlbumArt(web,coverFolder);

	if(promise!=undefined)
	{
		promise.then(function(value){
			console.log("ALBUMART: "+value);
			resp.albumart=value;
			defer.resolve(resp);
		})
			.fail(function(){
				defer.resolve(resp);
			});

	}
	else defer.resolve(resp);

	return defer.promise;
};

// Parse MPD's text playlist into a Volumio recognizable playlist object
ControllerMpd.prototype.parsePlaylist = function(objQueue) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::parsePlaylist');

	// objQueue is in form {'0': 'file: http://uk4.internet-radio.com:15938/', '1': 'file: http://2363.live.streamtheworld.com:80/KUSCMP128_SC'}
	// We want to convert to a straight array of trackIds
	return libQ.fcall(libFast.map, Object.keys(objQueue), function(currentKey) {
		return convertUriToTrackId(objQueue[currentKey]);
	});
};

// Parse MPD's text status into a Volumio recognizable status object
ControllerMpd.prototype.parseState = function(objState) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::parseState');

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
		nSampleRate = Number(objMetrics[0]);
		nBitDepth = Number(objMetrics[1]);
		nChannels = Number(objMetrics[2]);
	}

	var random = null;
	if ('random' in objState) {
		if (objState.random == 1) {
			random = true;
		} else {
			random = false;
		}
	}

	var repeat = null;
	if ('repeat' in objState) {
		if (objState.repeat == 1) {
			repeat = true;
		} else {
			repeat = false;
		}
	}

	var sStatus = null;
	if ('state' in objState) {
		sStatus = objState.state;
	}

	return libQ.resolve({
		status: sStatus,
		position: nPosition,
		seek: nSeek,
		duration: nDuration,
		samplerate: nSampleRate,
		bitdepth: nBitDepth,
		channels: nChannels,
		random: random,
		repeat: repeat
	});
};

ControllerMpd.prototype.logDone = function(timeStart) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + '------------------------------ ' + (Date.now() - timeStart) + 'ms');
	return libQ.resolve();
};

ControllerMpd.prototype.logStart = function(sCommand) {
	var self = this;
	self.commandRouter.pushConsoleMessage('\n' + '[' + Date.now() + '] ' + '---------------------------- ' + sCommand);
	return libQ.resolve();
};

/*
 * This method can be defined by every plugin which needs to be informed of the startup of Volumio.
 * The Core controller checks if the method is defined and executes it on startup if it exists.
 */
ControllerMpd.prototype.onVolumioStart = function() {
	var self=this;


	var configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');

	self.config= new (require('v-conf'))();
	self.config.loadFile(configFile);

	// TODO use names from the package.json instead
	self.servicename = 'mpd';
	self.displayname = 'MPD';

	//getting configuration


	// Save a reference to the parent commandRouter
	self.commandRouter = self.context.coreCommand;

	// Connect to MPD
	self.mpdConnect();

	// Make a promise for when the MPD connection is ready to receive events
	self.mpdReady = libQ.nfcall(libFast.bind(self.clientMpd.on, self.clientMpd), 'ready');
	// Catch and log errors
	self.clientMpd.on('error', function(err) {
		console.error('MPD error: ' + err);
		if (err = "{ [Error: This socket has been ended by the other party] code: 'EPIPE' }") {
			self.mpdConnect();
		}
	});

	// This tracks the the timestamp of the newest detected status change
	self.timeLatestUpdate = 0;
	self.updateQueue();
	// TODO remove pertaining function when properly found out we don't need em
	//self.fswatch();
	// When playback status changes
	self.clientMpd.on('system', function() {
		var timeStart = Date.now();

		self.logStart('MPD announces state update')
			.then(libFast.bind(self.getState, self))
			.then(libFast.bind(self.pushState, self))
			.fail(libFast.bind(self.pushError, self))
			.done(function() {
				return self.logDone(timeStart);
			});
	});



	self.clientMpd.on('system-playlist', function() {
		var timeStart = Date.now();

		self.logStart('MPD announces sysyrm state update')
			.then(libFast.bind(self.updateQueue, self))
			.fail(libFast.bind(self.pushError, self))
			.done(function() {
				return self.logDone(timeStart);
			});
	});

	//Notify that The mpd DB has changed
	self.clientMpd.on('system-database', function() {

		return self.reportUpdatedLibrary();
	});



}

ControllerMpd.prototype.mpdConnect = function() {

	var self = this;

	var configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');

	self.config= new (require('v-conf'))();
	self.config.loadFile(configFile);

	var nHost=self.config.get('nHost');
	var nPort=self.config.get('nPort');
	self.clientMpd = libMpd.connect({port: nPort, host: nHost});
}
/*
 * This method shall be defined by every plugin which needs to be configured.
 */
/*ControllerMpd.prototype.getConfiguration = function(mainConfig) {

	var language=__dirname+"/i18n/"+mainConfig.locale+".json";
	if(!libFsExtra.existsSync(language))
	{
		language=__dirname+"/i18n/EN.json";
	}

	var languageJSON=libFsExtra.readJsonSync(language);

	var config=libFsExtra.readJsonSync(__dirname+'/config.json');
	var uiConfig={};

	for(var key in config)
	{
		if(config[key].modifiable==true)
		{
			uiConfig[key]={
				"value":config[key].value,
				"type":config[key].type,
				"label":languageJSON[config[key].ui_label_key]
			};

			if(config[key].enabled_by!=undefined)
				uiConfig[key].enabled_by=config[key].enabled_by;
		}
	}

	return uiConfig;
}*/

ControllerMpd.prototype.getUIConfig = function()
{
	var self = this;

	var uiconf=libFsExtra.readJsonSync(__dirname+'/UIConfig.json');
	var value;


	value=self.config.get('gapless_mp3_playback');
	uiconf.sections[0].content[0].value.value=value;
	uiconf.sections[0].content[0].value.label=self.getLabelForSelect(uiconf.sections[0].content[0].options,value);

	value=self.config.get('volume_normalization');
	uiconf.sections[0].content[1].value.value=value;
	uiconf.sections[0].content[1].value.label=self.getLabelForSelect(uiconf.sections[0].content[1].options,value);

	value=self.config.get('audio_buffer_size');
	uiconf.sections[0].content[2].value.value=value;
	uiconf.sections[0].content[2].value.label=self.getLabelForSelect(uiconf.sections[0].content[2].options,value);

	value=self.config.get('buffer_before_play');
	uiconf.sections[0].content[3].value.value=value;
	uiconf.sections[0].content[3].value.label=self.getLabelForSelect(uiconf.sections[0].content[3].options,value);

	value=self.config.get('auto_update');
	uiconf.sections[0].content[4].value.value=value;
	uiconf.sections[0].content[4].value.label=self.getLabelForSelect(uiconf.sections[0].content[4].options,value);

	value=self.getAdditionalConf('audio_interface','alsa_controller','volumestart');
	uiconf.sections[1].content[0].value.value=value;
	uiconf.sections[1].content[0].value.label=self.getLabelForSelect(uiconf.sections[1].content[0].options,value);

	value=self.getAdditionalConf('audio_interface','alsa_controller','volumemax');
	uiconf.sections[1].content[1].value.value=value;
	uiconf.sections[1].content[1].value.label=self.getLabelForSelect(uiconf.sections[1].content[1].options,value);

	value=self.getAdditionalConf('audio_interface','alsa_controller','volumecurvemode')
	uiconf.sections[1].content[2].value.value=value;
	uiconf.sections[1].content[2].value.label=self.getLabelForSelect(uiconf.sections[1].content[2].options,value);

	return uiconf;
}

ControllerMpd.prototype.getLabelForSelect = function(options,key)
{
	for(var i in options)
	{
		if(options[i].value==key)
			return options[i].label;
	}

	return 'VALUE NOT FOUND BETWEEN SELECT OPTIONS!';
}


ControllerMpd.prototype.savePlaybackOptions = function(data)
{
	var self = this;

	var defer = libQ.defer();

	self.config.set('gapless_mp3_playback',data['gapless_mp3_playback'].value);
	self.config.set('volume_normalization',data['volume_normalization'].value);
	self.config.set('audio_buffer_size',data['audio_buffer_size'].value);
	self.config.set('buffer_before_play',data['buffer_before_play'].value);
	self.config.set('auto_update',data['auto_update'].value);


	self.createMPDFile(function(error)
	{
		if (error !== undefined && error !== null) {
			self.commandRouter.pushToastMessage('error',"Configuration update",'Error while Applying new configuration');
			defer.resolve({});
		}
		else
		{
			self.commandRouter.pushToastMessage('success',"Configuration update",'The playback configuration has been successfully updated');

			self.restartMpd(function(error)
			{
				if (error !== null && error !=undefined) {
					console.log(error);
					self.commandRouter.pushToastMessage('error',"Player restart",'Error while restarting player');
				}
				else self.commandRouter.pushToastMessage('success',"Player restart",'Player successfully restarted');

				defer.resolve({});
			});
		}
	});

	return defer.promise;

}

ControllerMpd.prototype.saveVolumeOptions = function(data)
{
	var self = this;

	var defer = libQ.defer();

	self.setAdditionalConf('audio_interface','alsa_controller',{key:'volumestart',value:data.volumestart.value});
	self.setAdditionalConf('audio_interface','alsa_controller',{key:'volumemax',value:data.volumemax.value});
	self.setAdditionalConf('audio_interface','alsa_controller',{key:'volumecurvemode',value:data.volumecurvemode.value});

	self.logger.info('Volume configurations have been set');


	self.commandRouter.pushToastMessage('success',"Configuration update",'The volume configuration has been successfully updated');

	defer.resolve({});

	return defer.promise;

}

ControllerMpd.prototype.restartMpd = function(callback)
{
	var self = this;


	exec('/bin/systemctl restart mpd.service ',
		function (error, stdout, stderr) {
			callback(error);
	});

}

ControllerMpd.prototype.createMPDFile = function(callback)
{
	var self = this;

	try
	{
		libFsExtra.copySync('/etc/mpd.conf','/etc/mpd.conf.old');

		var ws = libFsExtra.createOutputStream('/etc/mpd.conf');

		ws.write('# Volumio MPD Configuration File\n');
		ws.write('\n');
		ws.write('# Files and directories #######################################################\n');
		ws.write('music_directory		"/var/lib/mpd/music"\n');
		ws.write('playlist_directory		"/var/lib/mpd/playlists"\n');
		ws.write('db_file			"/var/lib/mpd/tag_cache"\n');
		ws.write('#log_file			"/var/log/mpd/mpd.log"\n');
		ws.write('pid_file			"/var/run/mpd/pid"\n');
		ws.write('#state_file			"/var/lib/mpd/state"\n');
		ws.write('#sticker_file                   "/var/lib/mpd/sticker.sql"\n');
		ws.write('###############################################################################\n');
		ws.write('\n');
		ws.write('# General music daemon options ################################################\n');
		ws.write('user				"mpd"\n');
		ws.write('group                          "audio"\n');
		ws.write('bind_to_address		"any"\n');
		ws.write('#port				"6600"\n');
		ws.write('#log_level			"default"\n');
		ws.write('gapless_mp3_playback			"'+self.config.get('gapless_mp3_playback')+'"\n');
		ws.write('#save_absolute_paths_in_playlists	"no"\n');
		ws.write('#metadata_to_use	"artist,album,title,track,name,genre,date,composer,performer,disc"\n');
		ws.write('auto_update    "'+self.config.get('auto_update')+'"\n');
		ws.write('#auto_update_depth "3"\n');
		ws.write('###############################################################################\n');
		ws.write('# Symbolic link behavior ######################################################\n');
		ws.write('follow_outside_symlinks	"yes"\n');
		ws.write('follow_inside_symlinks		"yes"\n');
		ws.write('###############################################################################\n');
		ws.write('# Input #######################################################################\n');
		ws.write('#\n');
		ws.write('#input {\n');
		ws.write('#        plugin "curl"\n');
		ws.write('#       proxy "proxy.isp.com:8080"\n');
		ws.write('#       proxy_user "user"\n');
		ws.write('#       proxy_password "password"\n');
		ws.write('#}\n');
		ws.write('###############################################################################\n');
		ws.write('\n');
		ws.write('	# Audio Output ################################################################\n');
		ws.write('audio_output {\n');
		ws.write('		type		"alsa"\n');
		ws.write('		name		"alsa"\n');
		ws.write('		device		"hw:0,0"\n');
		ws.write('}\n');
		ws.write('samplerate_converter "soxr very high"\n');
		ws.write('#replaygain			"album"\n');
		ws.write('#replaygain_preamp		"0"\n');
		ws.write('volume_normalization		"'+self.config.get('volume_normalization')+'"\n');
		ws.write('###############################################################################\n');
		ws.write('\n');
		ws.write('# MPD Internal Buffering ######################################################\n');
		ws.write('audio_buffer_size		"'+self.config.get('audio_buffer_size')+'"\n');
		ws.write('buffer_before_play		"'+self.config.get('buffer_before_play')+'"\n');
		ws.write('###############################################################################\n');
		ws.write('\n');
		ws.write('\n');
		ws.write('# Resource Limitations ########################################################\n');
		ws.write('#connection_timeout		"60"\n');
		ws.write('max_connections			"20"\n');
		ws.write('#max_playlist_length		"16384"\n');
		ws.write('#max_command_list_size		"2048"\n');
		ws.write('#max_output_buffer_size		"8192"\n');
		ws.write('###############################################################################\n');
		ws.write('\n');
		ws.write('# Character Encoding ##########################################################\n');
		ws.write('filesystem_charset		"UTF-8"\n');
		ws.write('id3v1_encoding			"UTF-8"\n');
		ws.write('###############################################################################\n');
		ws.end();

		callback();
	}
	catch(err)
	{

		console.log("ERRORE QUAAA");
		if(libFsExtra.existsSync('/etc/mpd.conf.old')) {
			libFsExtra.copySync('/etc/mpd.conf.old', '/etc/mpd.conf');
		}

		callback(err);
	}

}


/*
 * This method shall be defined by every plugin which needs to be configured.
 */
ControllerMpd.prototype.setConfiguration = function(configuration) {
	//DO something intelligent
}

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
		.on('addDir', function(path) {
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
}

ControllerMpd.prototype.waitupdate = function () {
	var self = this;

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::WaitUpdatetoFinish');
	//Delay to ensure any media is properly mounted and accessible
	setTimeout(function() {
		return self.sendMpdCommand('update', []);
	}, 500);

	setTimeout(function() {
		return self.fswatch()
	}, 5000);
}


ControllerMpd.prototype.listFavourites = function (uri) {
	var self = this;


	var defer = libQ.defer();

	var promise=self.commandRouter.playListManager.getFavouritesContent();
	promise.then(function(data)
	{
		var response={
			navigation: {
				prev: {
					uri: '/'
				},
				list:[]
			}
		};

		for(var i in data)
		{
			var ithdata=data[i];
			var song={service: ithdata.service, type: 'song',  title: ithdata.title, artist: ithdata.artist, album: ithdata.album, icon: ithdata.albumart, uri: ithdata.uri};

			response.navigation.list.push(song);
		}

		defer.resolve(response);

	})
	.fail(function()
	{
		defer.reject(new Error("Cannot list Favourites"));
	});

	return defer.promise;
}

ControllerMpd.prototype.listPlaylists = function (uri) {
	var self = this;


	var defer = libQ.defer();

	var response={
		navigation: {
			prev: {
				uri: '/'
			},
			list: [
			]
		}
	};
	var promise=self.commandRouter.playListManager.listPlaylist();
	promise.then(function(data)
	{
		for(var i in data)
		{
			var ithdata=data[i];
			var song={type: 'playlist',  title: ithdata, icon: 'bars', uri: 'playlists/'+ithdata};

			response.navigation.list.push(song);
		}

		defer.resolve(response);
	});


	return defer.promise;
}

ControllerMpd.prototype.browsePlaylist = function (uri) {
	var self = this;


	var defer = libQ.defer();

	var response={
		navigation: {
			prev: {
				uri: 'playlists'
			},
			list: [
			]
		}
	};

	var name=uri.split('/')[1];

	console.log("GETTING CONTENT FOR PLAYLST "+name);
	var promise=self.commandRouter.playListManager.getPlaylistContent(name);
	promise.then(function(data)
	{
		console.log("CONTENT: "+JSON.stringify(data));
		for(var i in data)
		{
			var ithdata=data[i];
			var song={service: ithdata.service, type: 'song',  title: ithdata.title, artist: ithdata.artist, album: ithdata.album, icon: ithdata.albumart, uri: ithdata.uri};

			response.navigation.list.push(song);
		}

		console.log(JSON.stringify(response));
		defer.resolve(response);
	});


	return defer.promise;
}

ControllerMpd.prototype.lsInfo = function (uri) {
	var self = this;

	var defer = libQ.defer();

	var sections=uri.split('/');
	var folder=sections[1];
	var prev='';
	var folderToList='';
	var command='lsinfo';
	var list=[];

	if(sections.length>1)
	{
		for(var i=0;i<sections.length-1;i++)
			prev+=sections[i]+'/';

		prev=s(prev).chompRight('/');

		for(var j=1;j<sections.length;j++)
			folderToList+=sections[j]+'/';

		folderToList=s(folderToList).chompRight('/');

		command+=' "'+folderToList+'"';

	}

	var cmd = libMpd.cmd;

	self.mpdReady.then(function() {
		self.clientMpd.sendCommand(cmd(command, []), function (err, msg) {
			if (msg) {
				var lines = s(msg).lines();
				for (var i = 0; i < lines.length; i++) {
					var line = s(lines[i]);
					if (line.startsWith('directory:')) {
						var path = line.chompLeft('directory:').trimLeft().s;
						var name = path.split('/');
						var count = name.length;

						list.push({
							type: 'folder',
							title: name[count - 1],
							icon: 'fa fa-folder-open-o',
							uri: sections[0]+'/' + path
						});
					}
					else if (line.startsWith('file:')) {
						var path = line.chompLeft('file:').trimLeft().s;
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
							uri:sections[0]+'/' + path
						});
					}

				}
			}
			else console.log(err);

			defer.resolve({
				navigation: {
					prev: {
						uri: prev.s
					},
					list: list
				}
			});
		});
	});
	return defer.promise;
}

ControllerMpd.prototype.search = function (query) {
	var self = this;

	var defer = libQ.defer();
	var command='search any';
	command+=' "'+query+'"';
	var cmd = libMpd.cmd;
	var list=[];

	self.mpdReady.then(function() {
		self.clientMpd.sendCommand(cmd(command, []), function (err, msg) {
			if (msg) {
				var lines = s(msg).lines();
				for (var i = 0; i < lines.length; i++) {
					var line = s(lines[i]);

					if (line.startsWith('file:')) {
						var path = line.chompLeft('file:').trimLeft().s;
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
							uri:'music-library/' + path
						});
					}

				}
			}
			else console.log(err);

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
}

ControllerMpd.prototype.searchFor = function (lines,startFrom,beginning) {
	var self=this;

	var count=lines.length;
	var i=0;

	while(startFrom+i<count)
	{
		var line=s(lines[startFrom+i]);

		if(line.startsWith(beginning))
			return line.chompLeft(beginning).trimLeft().s;
		else if(line.startsWith('file:'))
			return '';
		else if(line.startsWith('directory:'))
			return '';

		i++;
	}
}

ControllerMpd.prototype.updateQueue = function () {
	var self = this;

	var defer = libQ.defer();

	var prev='';
	var folderToList='';
	var command='playlistinfo';
	var list=[];

	var cmd = libMpd.cmd;
	self.mpdReady.then(function(){
		self.clientMpd.sendCommand(cmd(command, []), function(err, msg) {
			if (msg) {
				var lines = s(msg).lines();

				self.commandRouter.volumioClearQueue();

				var promises = [];

				var queue=[];
				for (var i = 0; i < lines.length; i++) {
					var line = s(lines[i]);
					if (line.startsWith('file:')) {
						var path=line.chompLeft('file:').trimLeft().s;
						var name=path.split('/');
						var count=name.length;

						var artist=self.searchFor(lines,i+1,'Artist:');
						var album=self.searchFor(lines,i+1,'Album:');
						var title=self.searchFor(lines,i+1,'Title:');
						var tracknumber=self.searchFor(lines,i+1,'Pos:');
						if( title == undefined)
						{
							title=name[count-1];
						}

						var queueItem={uri: path, service:'mpd', name: title, artist: artist, album: album, type:'track', tracknumber: tracknumber };
						queueItem.promise=self.getAlbumArt({artist:artist,album:album});
						promises.push(queueItem.promise);
						queue.push(queueItem);

					}

				}

				libQ.all(promises)
					.then(function(data){
						for(var i in queue)
						{
							queue[i].albumart=data[i];
							delete queue[i].promise;
						}

						self.commandRouter.addQueueItems(queue);
					})
					.fail(function (e) {
						console.log("Failed retrieving a url", e)
					})


			}
			else console.log(err);

			defer.resolve({
				navigation: {
					prev: {
						uri: prev.s
					},
					list: list
				}
			});
		});
	});



	return defer.promise;
}


ControllerMpd.prototype.getAlbumArt=function(data,path)
{
	var self=this;

	var defer=libQ.defer();

	ifconfig.status('wlan0', function(err, status) {
		var address;

		if (status != undefined) {
			if (status.ipv4_address != undefined) {
				address = status.ipv4_address;
			}
			else address = ip.address();
		}
		else address= ip.address();

		var url;
		var artist,album;



		var web;

		if(data!= undefined && data.artist!=undefined)
		{
			artist=data.artist;
			if(data.album!=undefined)
				album=data.album;
			else album=data.artist;

			web='?web='+nodetools.urlEncode(artist)+'/'+nodetools.urlEncode(album)+'/extralarge'
		}

		var url='/albumart';

		if(web!=undefined)
			url=url+web;

		if(web!=undefined && path != undefined)
			url=url+'&';
		else if(path != undefined)
			url=url+'?';

		if(path!=undefined)
			url=url+'path='+nodetools.urlEncode(path);

		defer.resolve(url);
	});


	return defer.promise;
}












ControllerMpd.prototype.reportUpdatedLibrary = function () {
	var self=this;
	// TODO PUSH THIS MESSAGE TO ALL CONNECTED CLIENTS
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::DB Update Finished');
	return self.commandRouter.pushToastMessage('Success','ASF',' Added');
}

ControllerMpd.prototype.getConfigurationFiles = function()
{
	var self = this;

	return ['config.json'];
}

ControllerMpd.prototype.getAdditionalConf = function(type,controller,data)
{
	var self=this;
	return self.commandRouter.executeOnPlugin(type,controller,'getConfigParam',data);
}

ControllerMpd.prototype.setAdditionalConf = function(type,controller,data)
{
	var self=this;
	return self.commandRouter.executeOnPlugin(type,controller,'setConfigParam',data);
}

ControllerMpd.prototype.getMyCollectionStats=function()
{
	var self=this;

	var defer=libQ.defer();

	var cmd = libMpd.cmd;
	self.clientMpd.sendCommand(cmd("count", ["group","artist"]), function(err, msg) {
		if (err) defer.resolve({
			artists:0,
			albums:0,
			songs:0,
			playtime:'00:00:00'
		});
		else{
			var artistsCount=0;
			var songsCount=0;
			var playtimesCount=0;

			var splitted=msg.split('\n');
			for(var i=0;i< splitted.length-1;i=i+3)
			{
				artistsCount++;
				songsCount=songsCount+parseInt(splitted[i+1].substring(7));
				playtimesCount=playtimesCount+parseInt(splitted[i+2].substring(10));
			}

			var convertedSecs=convert(playtimesCount);



			self.clientMpd.sendCommand(cmd("count", ["group","album"]), function(err, msg) {
				if (!err)
				{
					var splittedAlbum=msg.split('\n').length;
					var response={
						artists:artistsCount,
						albums:(splittedAlbum-1)/3,
						songs:songsCount,
						playtime:convertedSecs.hours+':'+convertedSecs.minutes+':'+convertedSecs.seconds
					};
				}

				defer.resolve(response);

			});

		}


	});
	return defer.promise;

}


ControllerMpd.prototype.rescanDb=function()
{
	var self=this;

	return self.sendMpdCommand('rescan', []);
}
