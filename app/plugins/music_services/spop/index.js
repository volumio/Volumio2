'use strict';

var libQ = require('kew');
var libNet = require('net');
var libFast = require('fast.js');
var libLevel = require('level');
var fs=require('fs-extra');
var exec = require('child_process').exec;
var SpotifyWebApi = require('spotify-web-api-node');
var nodetools = require('nodetools');

// Define the ControllerSpop class
module.exports = ControllerSpop;
function ControllerSpop(context) {
	// This fixed variable will let us refer to 'this' object at deeper scopes
	var self = this;

	self.context=context;
	self.commandRouter = self.context.coreCommand;
}


ControllerSpop.prototype.addToBrowseSources = function () {
    var self = this;
    var data = {name: 'Spotify', uri: 'spotify',plugin_type:'music_service',plugin_name:'spop'};

    self.commandRouter.volumioAddToBrowseSources(data);
};



ControllerSpop.prototype.getConfigurationFiles = function()
{
	var self = this;

	return ['config.json'];
}

// Plugin methods -----------------------------------------------------------------------------
ControllerSpop.prototype.onVolumioStart = function() {
	var self = this;

    var configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');
    self.config = new (require('v-conf'))();
    self.config.loadFile(configFile);


	// TODO use names from the package.json instead
	self.servicename = 'spop';
	self.displayname = 'Spotify';


	// Each core gets its own set of Spop sockets connected
	var nHost='localhost';
	var nPort=6602;
	self.connSpopCommand = libNet.createConnection(nPort, nHost); // Socket to send commands and receive track listings
	self.connSpopStatus = libNet.createConnection(nPort, nHost); // Socket to listen for status changes

	// Start a listener for receiving errors
	self.connSpopCommand.on('error', function(err) {
		console.error('SPOP command error:');
		console.error(err);
	});
	self.connSpopStatus.on('error', function(err) {
		console.error('SPOP status error:');
		console.error(err);
	});

	// Init some command socket variables
	self.bSpopCommandGotFirstMessage = false;
	self.spopCommandReadyDeferred = libQ.defer(); // Make a promise for when the Spop connection is ready to receive events (basically when it emits 'spop 0.0.1').
	self.spopCommandReady = self.spopCommandReadyDeferred.promise;
	self.arrayResponseStack = [];
	self.sResponseBuffer = '';

	// Start a listener for command socket messages (command responses)
	self.connSpopCommand.on('data', function(data) {
		self.sResponseBuffer = self.sResponseBuffer.concat(data.toString());

		// If the last character in the data chunk is a newline, this is the end of the response
		if (data.slice(data.length - 1).toString() === '\n') {
			// If this is the first message, then the connection is open
			if (!self.bSpopCommandGotFirstMessage) {
				self.bSpopCommandGotFirstMessage = true;
				try {
					self.spopCommandReadyDeferred.resolve();
				} catch (error) {
					self.pushError(error);
				}
				// Else this is a command response
			} else {
				try {
					self.arrayResponseStack.shift().resolve(self.sResponseBuffer);
				} catch (error) {
					self.pushError(error);
				}
			}

			// Reset the response buffer
			self.sResponseBuffer = '';
		}
	});

	// Init some status socket variables
	self.bSpopStatusGotFirstMessage = false;
	self.sStatusBuffer = '';

	// Start a listener for status socket messages
	self.connSpopStatus.on('data', function(data) {
        self.sStatusBuffer = self.sStatusBuffer.concat(data.toString());

		// If the last character in the data chunk is a newline, this is the end of the status update
		if (data.slice(data.length - 1).toString() === '\n') {
			// Put socket back into monitoring mode
			self.connSpopStatus.write('idle\n');

			// If this is the first message, then the connection is open
			if (!self.bSpopStatusGotFirstMessage) {
				self.bSpopStatusGotFirstMessage = true;
				// Else this is a state update announcement
			} else {
				var timeStart = Date.now();
				var sStatus = self.sStatusBuffer;

				self.logStart('Spop announces state update')
					.then(function() {
						return self.parseState.call(self, sStatus);
					})
					.then(libFast.bind(self.pushState, self))
					.fail(libFast.bind(self.pushError, self))
					.done(function() {
						return self.logDone(timeStart);
					});
			}

			// Reset the status buffer
			self.sStatusBuffer = '';
		}
	});

	// Define the tracklist
	self.tracklist = [];

	// Start tracklist promise as rejected, so requestors do not wait for it if not immediately available.
	// This is okay because no part of Volumio requires a populated tracklist to function.
	self.tracklistReadyDeferred = null;
	self.tracklistReady = libQ.reject('Tracklist not yet populated.');

	// Attempt to load tracklist from database on disk
	// TODO make this a relative path
	self.sTracklistPath = __dirname + '/db/tracklist';

	exec("spopd -c /etc/spopd.conf", function (error, stdout, stderr) {
		if (error !== null) {
			self.commandRouter.pushConsoleMessage('The following error occurred while starting SPOPD: ' + error);
		}
		else {
			self.commandRouter.pushConsoleMessage('SpopD Daemon Started');
		}
	});


    self.addToBrowseSources();


    self.spotifyApi= new SpotifyWebApi({
        clientId : self.config.get('spotify_api_client_id'),
        clientSecret : self.config.get('spotify_api_client_secret')
    });
};


ControllerSpop.prototype.handleBrowseUri=function(curUri)
{
    var self=this;

    //self.commandRouter.logger.info(curUri);
    var response;

    if (curUri.startsWith('spotify')) {
        if(curUri=='spotify')
        {
            response=libQ.resolve({
                navigation: {
                    prev: {
                        uri: 'spotify'
                    },
                    list: [{
                        service: 'spop',
                        type: 'folder',
                        title: 'Playlists',
                        artist: '',
                        album: '',
                        icon: 'fa fa-folder-open-o',
                        uri: 'spotify/playlists'
                    }

                    ]
                }
            });
        }
        else if(curUri.startsWith('spotify/playlists'))
        {
            if(curUri=='spotify/playlists')
                response=self.listPlaylists();
            else
            {
                response=self.listPlaylist(curUri);
            }
        }
    }

    return response;
};

ControllerSpop.prototype.listPlaylists=function()
{
    var self=this;

    var defer=libQ.defer();
    var commandDefer=self.sendSpopCommand('ls',[]);
    commandDefer.then(function(results){
            var resJson=JSON.parse(results);

        self.commandRouter.logger.info(resJson);
            var response={
                navigation: {
                    prev: {
                        uri: 'spotify'
                    },
                    list: []
                }
            };

            for(var i in resJson.playlists)
            {
                if(resJson.playlists[i].name!=='')
                {
                    response.navigation.list.push({
                        service: 'spop',
                        type: 'folder',
                        title: resJson.playlists[i].name,
                        icon: 'fa fa-folder-open-o',
                        uri: 'spotify/playlists/'+resJson.playlists[i].index
                    });
                }
            }

            defer.resolve(response);

        })
        .fail(function()
        {
            defer.fail(new Error('An error occurred while listing playlists'));
        });

    return defer.promise;
};

ControllerSpop.prototype.listPlaylist=function(curUri)
{
    var self=this;

    var uriSplitted=curUri.split('/');

    var defer=libQ.defer();
    var commandDefer=self.sendSpopCommand('ls',[uriSplitted[2]]);
    commandDefer.then(function(results){
            var resJson=JSON.parse(results);

            var response={
                navigation: {
                    prev: {
                        uri: 'spotify/playlists'
                    },
                    list: []
                }
            };

            for(var i in resJson.tracks)
            {
                response.navigation.list.push({
                    service: 'spop',
                    type: 'song',
                    title: resJson.tracks[i].title,
                    artist:resJson.tracks[i].artist,
                    album: resJson.tracks[i].album,
                    icon: 'fa fa-list-ol',
                    uri: resJson.tracks[i].uri
                });
            }

            defer.resolve(response);
        })
        .fail(function()
        {
            defer.fail(new Error('An error occurred while listing playlists'));
        });

    return defer.promise;
};




ControllerSpop.prototype.onStop = function() {
	var self = this;
	exec("killall spopd", function (error, stdout, stderr) {

	});
};






// Spop stop
ControllerSpop.prototype.stop = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerSpop::stop');

	return self.sendSpopCommand('stop', []);
};

// Spop pause
ControllerSpop.prototype.pause = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerSpop::pause');

	// TODO don't send 'toggle' if already paused
	return self.sendSpopCommand('toggle', []);
};

// Spop resume
ControllerSpop.prototype.resume = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerSpop::resume');

	// TODO don't send 'toggle' if already playing
	return self.sendSpopCommand('toggle', []);
};




// Spop get state
ControllerSpop.prototype.getState = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerSpop::getState');

	return self.sendSpopCommand('status', []);
};

// Spop parse state
ControllerSpop.prototype.parseState = function(sState) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerSpop::parseState');

	var objState = JSON.parse(sState);
    self.commandRouter.logger.info('STATE: '+JSON.stringify(objState));

	var nSeek = null;
	if ('position' in objState) {
		nSeek = objState.position * 1000;
	}

	var nDuration = null;
	if ('duration' in objState) {
		nDuration = objState.duration;
	}

	var sStatus = null;
	if ('status' in objState) {
		if (objState.status === 'playing') {
			sStatus = 'play';
		} else if (objState.status === 'paused') {
			sStatus = 'pause';
		} else if (objState.status === 'stopped') {
			sStatus = 'stop';
		}
	}

	var nPosition = null;
	if ('current_track' in objState) {
		nPosition = objState.current_track - 1;
	}

	return libQ.resolve({
		status: sStatus,
		position: nPosition,
		seek: nSeek,
		duration: nDuration,
		samplerate: null, // Pull these values from somwhere else since they are not provided in the Spop state
		bitdepth: null,
		channels: null
	});
};

// Announce updated Spop state
ControllerSpop.prototype.pushState = function(state) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerSpop::pushState');

	return self.commandRouter.servicePushState(state, self.servicename);
};

// Pass the error if we don't want to handle it
ControllerSpop.prototype.pushError = function(sReason) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerSpop::pushError(' + sReason + ')');

	// Return a resolved empty promise to represent completion
	return libQ.resolve();
};




ControllerSpop.prototype.explodeUri = function(uri) {
    var self = this;

    var defer=libQ.defer();

    var splitted=uri.split(':');

    self.spotifyApi.getTrack(splitted[2])
        .then(function(data) {
            var artist='';
            var album='';

            if(data.body.artists.length>0)
                artist=data.body.artists[0].name;

            if(data.body.album!==undefined)
                album=data.body.album.name;

            var albumart=self.getAlbumArt({artist:artist,album:album},"");

            defer.resolve({
                uri: uri,
                service: 'spop',
                name: data.body.name,
                artist: artist,
                album: album,
                type: 'track',
                tracknumber: data.body.track_number,
                albumart: albumart
            });

        })



    return defer.promise;
};

ControllerSpop.prototype.getAlbumArt = function (data, path) {

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

    return url;
};


ControllerSpop.prototype.logDone = function (timeStart) {
    var self = this;
    self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + '------------------------------ ' + (Date.now() - timeStart) + 'ms');
    return libQ.resolve();
};

ControllerSpop.prototype.logStart = function (sCommand) {
    var self = this;
    self.commandRouter.pushConsoleMessage('\n' + '[' + Date.now() + '] ' + '---------------------------- ' + sCommand);
    return libQ.resolve();
};





// New play mechanism. used method

ControllerSpop.prototype.play = function() {
    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerSpop::play');

    return this.sendSpopCommand('play', []);
};

ControllerSpop.prototype.seek = function(position) {
    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerSpop::seek');

    return this.sendSpopCommand('seek', [position]);
};


// Define a method to clear, add, and play an array of tracks
ControllerSpop.prototype.clearAddPlayTracks = function(arrayTrackUris) {
    var self = this;
    self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerSpop::clearAddPlayTracks');

    var methodPromise=libQ.defer();

    // Clear the queue, add the first track, and start playback
    var clearPromise=self.sendSpopCommand('qclear', []);
    clearPromise.then(function(){
        self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerSpop::Queue cleared');

        if (arrayTrackUris.length > 0) {
            var arrayPromise=[];

            for(var i in arrayTrackUris)
            {
                self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerSpop::Adding track '+arrayTrackUris[i]);
                arrayPromise.push(self.sendSpopCommand('uadd', [arrayTrackUris[i]]));
            }

            libQ.all(arrayPromise).then(function(){
                self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerSpop::Going to play');

                self.sendSpopCommand('play', []).then(function()
                {
                    methodPromise.resolve();
                })
                .fail(function(){
                    methodPromise.reject(new Error("Cannot play queue for plugin SPOP"));
                });
            })
            .fail(function(){
                methodPromise.reject(new Error('Error while adding track to SPOP'));
            });
        }

    })
    .fail(function(){
        methodPromise.reject(new Error("Cannot clear queue for plugin SPOP"));
    });

    return methodPromise.promise;
};


// Send command to Spop
ControllerSpop.prototype.sendSpopCommand = function(sCommand, arrayParameters) {
    var self = this;
    self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerSpop::sendSpopCommand');

    // Convert the array of parameters to a string
    var sParameters = libFast.reduce(arrayParameters, function(sCollected, sCurrent) {
        return sCollected + ' ' + sCurrent;
    }, '');

    // Pass the command to Spop when the command socket is ready
    self.spopCommandReady
        .then(function() {
            self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + sCommand + sParameters);
            return libQ.nfcall(libFast.bind(self.connSpopCommand.write, self.connSpopCommand), sCommand + sParameters + '\n', 'utf-8');
        });

    var spopResponseDeferred = libQ.defer();
    var spopResponse = spopResponseDeferred.promise;
    self.arrayResponseStack.push(spopResponseDeferred);

    // Return a promise for the command response
    return spopResponse;
};