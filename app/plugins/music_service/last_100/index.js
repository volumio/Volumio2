'use strict';

var io = require('socket.io-client');
var fs = require('fs-extra');
var config = new (require('v-conf'))();
var libQ = require('kew');
var currentSong = {"uri":""};

module.exports = last_100;

function last_100(context) {

    var self = this;

    this.context = context;
    this.commandRouter = this.context.coreCommand;
    this.logger = this.context.logger;
    this.configManager = this.context.configManager;
}

last_100.prototype.onVolumioStart = function () {
    var self = this;
    //Perform startup tasks here

    return libQ.resolve();
};

last_100.prototype.onStart = function () {
    var self = this;
    var defer = libQ.defer();
    self.addToBrowseSources();
    setTimeout(function() {
        self.listenState();
    },3000)


    return defer.promise;
}

/**
 * listen to changes in the state, saves them and write them on file
 */
last_100.prototype.listenState = function () {
    var self = this;

    var currentSong = {"uri":""};
    var socket= io.connect('http://localhost:3000');
    socket.emit('getState', '');

    socket.on('pushState', function(data) {

        var stateFile     = '/data/laststates.json';
        var newlastStates = [];
        if (data.status != 'stop' && data.service != 'webradio' && data.volatile != true){
            if (data.uri != currentSong.uri){
                if (data.service && data.title && data.artist && data.album) {
                    if (data.uri.startsWith('http://') || data.uri.startsWith('https://')) {
                        data = self.parseStreamingUri(data);
                    }
                    currentSong.uri = data.uri;
                    var currentsong = {uri:data.uri, service:data.service,title:data.title, artist:data.artist, album:data.album, albumart:data.albumart, type:'song'};
                    newlastStates.push(currentsong);
                    try {
                        // This may not always return an array
                        var lastStates = fs.readJsonSync(stateFile, {throws: true});
                    } catch (e) {
                        var lastStates = [];
                    }
                    if (Array.isArray(lastStates) && lastStates.length > 0) {
                        var j = 0;
                        for (var i in lastStates) {
                            if ((lastStates[i].uri != currentSong.uri) && j < 99) {
                                newlastStates.push(lastStates[i]);
                                j++;
                            }

                        }
                    }
                    try {
                        fs.outputJsonSync(stateFile, newlastStates, {spaces: 2});
                    } catch (e) {
                        console.log('Error saving last played file: '+e);
                    }
                }
            }
        }
    })
}

last_100.prototype.rewriteForUri = function (array) {
    var self = this;
    var lastPlayed = array;

    for(var i = 0; i < lastPlayed.length; i++){
        lastPlayed[i].type = "song";
    }

    return lastPlayed;
}

last_100.prototype.handleBrowseUri = function (curUri) {
    var self = this;
    var response = [];
    var lastPlayed = [];
    var defer = libQ.defer();
    var stateFile = '/data/laststates.json';

    try {
        lastPlayed = fs.readJsonSync(stateFile, {throws: true});
        lastPlayed = self.rewriteForUri(lastPlayed);
        response = {
            navigation: {
                prev: {
                    uri: "/"
                },
                lists: [{
                    "availableListViews": ["list"],
                    "items": lastPlayed
                }]
            }
        };
        defer.resolve(response)
    } catch(e) {
        console.log('Error Retrieving last played file: '+e);
        response = {
            navigation: {
                prev: {
                    uri: "/"
                },
                lists: [{
                    "availableListViews": ["list"],
                    "items": []
                }]
            }
        };
        defer.resolve(response)
    }

    return defer.promise;
}

last_100.prototype.addToBrowseSources = function () {
    var data = {albumart: '/albumart?sourceicon=music_service/last_100/icon.png', name: 'Last_100', uri: 'Last_100', plugin_type:'music_service',
        plugin_name:'last_100'};
    this.commandRouter.volumioAddToBrowseSources(data);
};

last_100.prototype.onStop = function () {
    var self = this;
    //Perform stop tasks here
};

last_100.prototype.onRestart = function () {
    var self = this;
    //Perform restart tasks here
};

last_100.prototype.onInstall = function () {
    var self = this;
    //Perform your installation tasks here
};

last_100.prototype.onUninstall = function () {
    var self = this;
    //Perform your deinstallation tasks here
};

last_100.prototype.getUIConfig = function () {
    var self = this;

    return {success: true, plugin: "last_100"};
};

last_100.prototype.setUIConfig = function (data) {
    var self = this;
    //Perform your UI configuration tasks here
};

last_100.prototype.getConf = function (varName) {
    var self = this;
    //Perform your tasks to fetch config data here
};

last_100.prototype.setConf = function (varName, varValue) {
    var self = this;
    //Perform your tasks to set config data here
};

//Optional functions exposed for making development easier and more clear
last_100.prototype.getSystemConf = function (pluginName, varName) {
    var self = this;
    //Perform your tasks to fetch system config data here
};

last_100.prototype.setSystemConf = function (pluginName, varName) {
    var self = this;
    //Perform your tasks to set system config data here
};

last_100.prototype.getAdditionalConf = function () {
    var self = this;
    //Perform your tasks to fetch additional config data here
};

last_100.prototype.setAdditionalConf = function () {
    var self = this;
    //Perform your tasks to set additional config data here
};

last_100.prototype.parseStreamingUri = function (data) {
    var self = this;
    try {
        var queue = this.commandRouter.volumioGetQueue();
        var currentSong = queue[data.position];
        if (currentSong.realUri) {
            currentSong.uri = currentSong.realUri;
        }
        return currentSong
    } catch(e) {
        return data
    }
};
