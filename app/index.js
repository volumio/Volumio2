'use strict';

var libQ = require('kew');
var libFast = require('fast.js');
var fs = require('fs-extra');
var execSync = require('child_process').execSync;
var winston = require('winston');
var vconf = require('v-conf');


// Define the CoreCommandRouter class
module.exports = CoreCommandRouter;
function CoreCommandRouter(server) {

	fs.ensureFileSync('/var/log/volumio.log');
	this.logger = new (winston.Logger)({
		transports: [
			new (winston.transports.Console)(),
			new (winston.transports.File)({
				filename: '/var/log/volumio.log',
				json: false
			})
		]
	});

	this.callbacks = [];
	this.sharedVars = new vconf();
    this.sharedVars.registerCallback('language_code',this.loadI18nStrings.bind(this));

	this.logger.info("-------------------------------------------");
	this.logger.info("-----            Volumio2              ----");
	this.logger.info("-------------------------------------------");
	this.logger.info("-----          System startup          ----");
	this.logger.info("-------------------------------------------");

    //Checking for system updates
    this.checkAndPerformSystemUpdates();
    // Start the music library
    this.musicLibrary = new (require('./musiclibrary.js'))(this);

    // Start plugins
    this.pluginManager = new (require(__dirname + '/pluginmanager.js'))(this, server);
    this.pluginManager.checkIndex();
    this.pluginManager.pluginFolderCleanup();
    this.pluginManager.loadPlugins();
    this.pluginManager.startPlugins();

    this.loadI18nStrings();
    this.musicLibrary.updateBrowseSourcesLang();

    // Start the state machine
    this.stateMachine = new (require('./statemachine.js'))(this);


    // Start the volume controller
    this.volumeControl = new (require('./volumecontrol.js'))(this);

    // Start the playListManager.playPlaylistlist FS
    //self.playlistFS = new (require('./playlistfs.js'))(self);

    this.playListManager = new (require('./playlistManager.js'))(this);

    this.platformspecific = new (require(__dirname + '/platformSpecific.js'))(this);

    this.pushConsoleMessage('BOOT COMPLETED');

    this.startupSound();
}

// Methods usually called by the Client Interfaces ----------------------------------------------------------------------------



// Volumio Pause
CoreCommandRouter.prototype.volumioPause = function () {
	this.pushConsoleMessage('CoreCommandRouter::volumioPause');
	return this.stateMachine.pause();
};

// Volumio Stop
CoreCommandRouter.prototype.volumioStop = function () {
	this.pushConsoleMessage('CoreCommandRouter::volumioStop');
	return this.stateMachine.stop();
};

// Volumio Previous
CoreCommandRouter.prototype.volumioPrevious = function () {
	this.pushConsoleMessage('CoreCommandRouter::volumioPrevious');
	return this.stateMachine.previous();
};

// Volumio Next
CoreCommandRouter.prototype.volumioNext = function () {
	this.pushConsoleMessage('CoreCommandRouter::volumioNext');
	return this.stateMachine.next();
};

// Volumio Get State
CoreCommandRouter.prototype.volumioGetState = function () {
	this.pushConsoleMessage('CoreCommandRouter::volumioGetState');
	return this.stateMachine.getState();
};

// Volumio Get Queue
CoreCommandRouter.prototype.volumioGetQueue = function () {
	this.pushConsoleMessage('CoreCommandRouter::volumioGetQueue');
	return this.stateMachine.getQueue();
};

// Volumio Remove Queue Item
CoreCommandRouter.prototype.volumioRemoveQueueItem = function (nIndex) {
	this.pushConsoleMessage('CoreCommandRouter::volumioRemoveQueueItem');
	return this.stateMachine.removeQueueItem(nIndex);
};

// Volumio Clear Queue Item
CoreCommandRouter.prototype.volumioClearQueue = function () {
	this.pushConsoleMessage('CoreCommandRouter::volumioClearQueue');
	return this.stateMachine.clearQueue();
};

// Volumio Set Volume
CoreCommandRouter.prototype.volumiosetvolume = function (VolumeInteger) {
	this.callCallback("volumiosetvolume", VolumeInteger);
	return this.volumeControl.alsavolume(VolumeInteger);
};

// Volumio Update Volume
CoreCommandRouter.prototype.volumioupdatevolume = function (vol) {
	this.callCallback("volumioupdatevolume", vol);
	return this.stateMachine.updateVolume(vol);
};

// Volumio Retrieve Volume
CoreCommandRouter.prototype.volumioretrievevolume = function (vol) {
	this.pushConsoleMessage('CoreCommandRouter::volumioRetrievevolume');
	return this.volumeControl.retrievevolume();
};


CoreCommandRouter.prototype.volumioUpdateVolumeSettings = function (vol) {
	this.pushConsoleMessage('CoreCommandRouter::volumioUpdateVolumeSettings');
	if (this.volumeControl){
		return this.volumeControl.updateVolumeSettings(vol);
	}
};

CoreCommandRouter.prototype.addCallback = function (name, callback) {
	if (this.callbacks[name] == undefined) {
		this.callbacks[name] = [];
	}
	this.callbacks[name].push(callback);
	//this.logger.debug("Total " + callbacks[name].length + " callbacks for " + name);
};

CoreCommandRouter.prototype.callCallback = function (name, data) {
	var self = this;
	var calls = this.callbacks[name];
	if (calls != undefined) {
		var nCalls = calls.length;
		for (var i = 0; i < nCalls; i++) {
			var func = this.callbacks[name][i];
			try {
				func(data);
			} catch (e) {
				self.logger.error("Help! Some callbacks for " + name + " are crashing!");
				self.logger.error(e);
			}
		}
	} else {
		self.logger.debug("No callbacks for " + name);
	}
};

// Volumio Add Queue Uids
CoreCommandRouter.prototype.volumioAddQueueUids = function (arrayUids) {
	this.pushConsoleMessage('CoreCommandRouter::volumioAddQueueUids');
	return this.musicLibrary.addQueueUids(arrayUids);
};
/*

 TODO: This should become the default entry point for adding music to any service
 // Volumio Add Queue Uri
 CoreCommandRouter.prototype.volumioAddQueueUri = function(data) {
 var self = this;
 self.pushConsoleMessage( 'CoreCommandRouter::volumioAddQueueUri');
 var service = data.service;
 var uri = data.uri;
 return self.executeOnPlugin('music_service', 'mpd', 'add', uri);
 }
 */
// Volumio Rebuild Library
CoreCommandRouter.prototype.volumioRebuildLibrary = function () {
	this.pushConsoleMessage('CoreCommandRouter::volumioRebuildLibrary');
	return this.musicLibrary.buildLibrary();
};

// Volumio Get Library Index
CoreCommandRouter.prototype.volumioGetLibraryFilters = function (sUid) {
	this.pushConsoleMessage('CoreCommandRouter::volumioGetLibraryFilters');
	return this.musicLibrary.getIndex(sUid);
};

// Volumio Browse Library
CoreCommandRouter.prototype.volumioGetLibraryListing = function (sUid, objOptions) {
	this.pushConsoleMessage('CoreCommandRouter::volumioGetLibraryListing');
	return this.musicLibrary.getListing(sUid, objOptions);
};

// Volumio Browse Sources
CoreCommandRouter.prototype.volumioGetBrowseSources = function () {
	this.pushConsoleMessage('CoreCommandRouter::volumioGetBrowseSources');
	return this.musicLibrary.getBrowseSources();
};

CoreCommandRouter.prototype.volumioAddToBrowseSources = function (data) {
	this.pushConsoleMessage('CoreCommandRouter::volumioAddToBrowseSources' + data);
	return this.musicLibrary.addToBrowseSources(data);
};

CoreCommandRouter.prototype.volumioRemoveToBrowseSources = function (data) {
	this.pushConsoleMessage('CoreCommandRouter::volumioRemoveToBrowseSources' + data);
	return this.musicLibrary.removeBrowseSource(data);
};

CoreCommandRouter.prototype.volumioUpdateToBrowseSources = function (name,data) {
	this.pushConsoleMessage('CoreCommandRouter::volumioUpdateToBrowseSources' + data);
	return this.musicLibrary.updateBrowseSources(name,data);
};
// Volumio Get Playlist Index
CoreCommandRouter.prototype.volumioGetPlaylistIndex = function (sUid) {
	this.pushConsoleMessage('CoreCommandRouter::volumioGetPlaylistIndex');
	return this.playlistFS.getIndex(sUid);
};

// Service Update Tracklist
CoreCommandRouter.prototype.serviceUpdateTracklist = function (sService) {
	this.pushConsoleMessage('CoreCommandRouter::serviceUpdateTracklist');
	var thisPlugin = this.pluginManager.getPlugin('music_service', sService);
	return thisPlugin.rebuildTracklist();
};

// Start WirelessScan
CoreCommandRouter.prototype.volumiowirelessscan = function () {
	this.pushConsoleMessage('CoreCommandRouter::StartWirelessScan');
	var thisPlugin = this.pluginManager.getPlugin('music_service', sService);
	return thisPlugin.scanWirelessNetworks();
};

// Push WirelessScan Results (TODO SEND VIA WS)
CoreCommandRouter.prototype.volumiopushwirelessnetworks = function (results) {
	this.pushConsoleMessage(results);
};

// Volumio Import Playlists
CoreCommandRouter.prototype.volumioImportServicePlaylists = function () {
	this.pushConsoleMessage('CoreCommandRouter::volumioImportServicePlaylists');
	return this.playlistFS.importServicePlaylists();
};

// Volumio Search
CoreCommandRouter.prototype.volumioSearch = function (data) {
	this.pushConsoleMessage('CoreCommandRouter::Search '+data);
	var asd = this.musicLibrary.search(data);
	console.log(asd)
	return this.musicLibrary.search(data);
};

// Methods usually called by the State Machine --------------------------------------------------------------------

CoreCommandRouter.prototype.volumioPushState = function (state) {
	this.pushConsoleMessage('CoreCommandRouter::volumioPushState');
	this.executeOnPlugin('system_controller', 'volumiodiscovery', 'saveDeviceInfo', state);
	// Announce new player state to each client interface
	var self = this;
	var res = libQ.all(
		libFast.map(this.pluginManager.getPluginNames('user_interface'), function (sInterface) {
			var thisInterface = self.pluginManager.getPlugin('user_interface', sInterface);
			return thisInterface.pushState(state);
		})
	);
	self.callCallback("volumioPushState", state);
	return res;
};

CoreCommandRouter.prototype.volumioResetState = function () {
	this.pushConsoleMessage('CoreCommandRouter::volumioResetState');
	return this.stateMachine.resetVolumioState();
};

CoreCommandRouter.prototype.volumioPushQueue = function (queue) {
	this.pushConsoleMessage('CoreCommandRouter::volumioPushQueue');

	// Announce new player queue to each client interface
	var self = this;
	return libQ.all(
		libFast.map(this.pluginManager.getPluginNames('user_interface'), function (sInterface) {
			var thisInterface = self.pluginManager.getPlugin('user_interface', sInterface);
			return thisInterface.pushQueue(queue);
		})
	);
};

// MPD Clear-Add-Play
CoreCommandRouter.prototype.serviceClearAddPlayTracks = function (arrayTrackIds, sService) {
	this.pushConsoleMessage('CoreCommandRouter::serviceClearAddPlayTracks');
	var thisPlugin = this.pluginManager.getPlugin('music_service', sService);
	return thisPlugin.clearAddPlayTracks(arrayTrackIds);
};

// MPD Stop
CoreCommandRouter.prototype.serviceStop = function (sService) {
	this.pushConsoleMessage('CoreCommandRouter::serviceStop');
	var thisPlugin = this.pluginManager.getPlugin('music_service', sService);
	return thisPlugin.stop();
};

// MPD Pause
CoreCommandRouter.prototype.servicePause = function (sService) {
	this.pushConsoleMessage('CoreCommandRouter::servicePause');

	var thisPlugin = this.pluginManager.getPlugin('music_service', sService);
	return thisPlugin.pause();
};

// MPD Resume
CoreCommandRouter.prototype.serviceResume = function (sService) {
	this.pushConsoleMessage('CoreCommandRouter::serviceResume');

	var thisPlugin = this.pluginManager.getPlugin('music_service', sService);

	var state=this.stateMachine.getState();

	if(state==='stop')
	{
		thisPlugin.clearAddPlayTracks();
	}

	return thisPlugin.resume();
};

// Methods usually called by the service controllers --------------------------------------------------------------

CoreCommandRouter.prototype.servicePushState = function (state, sService) {
	this.pushConsoleMessage('CoreCommandRouter::servicePushState');
	return this.stateMachine.syncState(state, sService);
};

// Methods usually called by the music library ---------------------------------------------------------------------

// Get tracklists from all services and return them as an array
CoreCommandRouter.prototype.getAllTracklists = function () {
	this.pushConsoleMessage('CoreCommandRouter::getAllTracklists');

	// This is the synchronous way to get libraries, which waits for each controller to return its tracklist before continuing
	var self = this;
	return libQ.all(
		libFast.map(this.pluginManager.getPluginNames('music_service'), function (sService) {
			var thisService = self.pluginManager.getPlugin('music_service', sService);
			return thisService.getTracklist();
		})
	);
};

// Volumio Add Queue Items
CoreCommandRouter.prototype.addQueueItems = function (arrayItems) {
	this.pushConsoleMessage('CoreCommandRouter::volumioAddQueueItems');


	return this.stateMachine.addQueueItems(arrayItems);
};
CoreCommandRouter.prototype.replaceAndPlay = function (arrayItems) {
	this.pushConsoleMessage('CoreCommandRouter::volumioReplaceandPlayItems');

	this.stateMachine.clearQueue();
	return this.stateMachine.addQueueItems(arrayItems);
};


// Volumio Check Favourites
CoreCommandRouter.prototype.checkFavourites = function (data) {
	var self = this;
	//self.pushConsoleMessage('CoreCommandRouter::volumioAddQueueItems');

	return self.stateMachine.checkFavourites(data);
};

// Volumio Emit Favourites
CoreCommandRouter.prototype.emitFavourites = function (msg) {
	var plugin = this.pluginManager.getPlugin('user_interface', 'websocket');
	plugin.emitFavourites(msg);
};

// Volumio Play Playlist
CoreCommandRouter.prototype.playPlaylist = function (data) {
	var self = this;
	return self.playListManager.playPlaylist(data);
};

// Utility functions ---------------------------------------------------------------------------------------------

/**
 * Returns as an object the configuration file for a given plugin
 * @param category
 * @param plugin
 * @returns {*|string}
 */
CoreCommandRouter.prototype.getPlugConf = function (category, plugin) {
	var cName = category;
	var name = plugin;
	try{
		var config = fs.readJsonSync(("/data/configuration/" + cName + "/" +
			name + "/" + "config.json"), 'utf-8',
			{throws: false});
	}
	catch(e) {
		var config ="";
	}
	return config;
}

/**
 * Returns an array of plugins with status and configuration included, given a category
 * @param category
 * @param array
 * @returns {Array}
 */
CoreCommandRouter.prototype.catPluginsConf = function (category, array) {
	var self = this;
	var plugins = array;
	var plugConf = [];
	for (var j = 0; j < plugins.length; j++) {
		var name = plugins[j].name;
		var status = plugins[j].enabled;
		var config = self.getPlugConf(category, name);
		plugConf.push({name, status, config});
	}
	return plugConf;
}

/**
 * Returns the configuration of every plugins, sorted by category
 * @returns {Array}
 */
CoreCommandRouter.prototype.getPluginsConf = function () {
	var self = this;
	var paths = self.pluginManager.getPluginsMatrix();
	var confs = [];
	for (var i = 0; i < paths.length; i++){
		var cName = paths[i].cName;
		var plugins = paths[i].catPlugin;
		var plugConf = self.catPluginsConf(cName, plugins);
		confs.push({cName, plugConf});
	}
	return confs;
}

/**
 * Writes the configuration of every plugin into a json file
 */
CoreCommandRouter.prototype.writePluginsConf = function () {
	var self = this;
	var confs = self.getPluginsConf();

	var file = "/data/configuration/generalConfig";
	fs.outputJson(file, confs, function (err) {
		console.log(err)})
}

/* TO FINISH !!!!!!!!!!!!!!!!!!!!!
CoreCommandRouter.prototype.restorePluginsConf = function () {
	var self = this;

	var backup = fs.readJsonSync("/data/configuration/generalConfig");
	var current = self.pluginManager.getPluginsMatrix();
	var usefulConfs = [];

	for(var i = 0; i < current.length; i++){
		availPlugins = current[i].catPlugin;
		var backPlugins = [];
		var catName = "";
		var max = self.max(current.length, backup.length);
		var j = 0;
		while(current[i].cName != backup[j].cName && j < max){
			j++;
		}
		if(j < max) {
			catName = backup[j].name;
			backPlugins = backup[j].plugConf;
			j = 0;
			max = self.max(availPlugins.length, backPlugins.length);
			var existingPlug = [];
			for (var k = 0; k < availPlugins.length; k++) {
				while (availPlugins[k].name != backPlugins[j].name && j < max) {
					j++;
				}
				if(j < max){
					existingPlug.push(backPlugins[j]);
				}
			}
			usefulConfs.push({"cName":catName, "plugConf": existingPlug);
		}
	}

	for(var i = 0; i < usefulConfs.length; i++){
		for(var j = 0; j < usefulConfs[i].plugConf.length){
			var path = "/data/configuration/" + usefulConfs[i].cName +
				usefulConfs[i].plugConf[j].name + "config.json";
			fs.outputJsonSync(path, usefulConfs[i].plugConf[j].config);
		}
	}
}

CoreCommandRouter.prototype.max = function (a, b) {
	if (a < b)
		return b;
	else
		return a;
}*/

/**
 * loads the backup for the selected playlist, according to request, returns it
 * @param request
 * @returns {*}
 */
CoreCommandRouter.prototype.loadBackup = function (request) {
	var self = this;

	var defer = libQ.defer();

	var data = [];

	self.logger.info("Backup: retrieving "+ request.type + " backup");

	if(request.type == "playlist"){
		data = self.loadPlaylistsBackup();
		defer.resolve(data);
	}else if (request.type == "radio-favourites" || request.type == "favourites"
	|| request.type == "my-web-radio"){
		data = self.loadFavBackup(request.type);
		defer.resolve(data);
	} else{
		self.logger.info("Backup: request not accepted, unexisting category");
		defer.resolve(undefined);
	}

	return defer.promise;
}

/**
 * load backup for the playlists
 * @returns {Array}
 */
CoreCommandRouter.prototype.loadPlaylistsBackup = function () {
	var self = this;

	//data=[{"name": "", "content": []}]
	var data = [];
	var playlists = self.playListManager.retrievePlaylists();

	for (var i = 0; i < playlists.length; i++){
		var name = playlists[i];
		var path = self.playListManager.playlistFolder + name;
		var songs = fs.readJsonSync(path, {throws: false});
		data.push({"name": name, "content": songs});
	}

	return data;
}

/**
 * load backup for the selected playlist in favourites
 * @param type
 * @returns {Array}
 */
CoreCommandRouter.prototype.loadFavBackup = function (type) {
	var self = this;

	var path = self.playListManager.favouritesPlaylistFolder;
	var data = [];

	try{
		data = fs.readJsonSync(path + type, {throws: false});
	}catch(e){
		self.logger.info("No "+ type + " in favourites folder");
	};

	return data;
}

/**
 * writes the playlists and their content in a json
 */
CoreCommandRouter.prototype.writePlaylistsBackup = function () {
	var self = this;

	var data = self.loadPlaylistsBackup();

	var file = "/data/configuration/playlists";
	fs.outputJsonSync(file, data);
}

/**
 * writes radio and songs favourites in a json
 */
CoreCommandRouter.prototype.writeFavouritesBackup = function () {
	var self = this;

	var data = self.loadFavBackup("favourites");
	var radio = self.loadFavBackup("radio-favourites");
	var myRadio = self.loadFavBackup("my-web-radio");

	var favourites = {"songs": data, "radios": radio, "myRadios": myRadio};

	var file = "/data/configuration/favourites";
	fs.outputJsonSync(file, favourites);
}

/**
 * Restores the playlist from the available local backup file
 */
CoreCommandRouter.prototype.restorePlaylistBackup = function () {
	var self = this;
	var check = self.checkBackup("playlists");
	var path = self.playListManager.playlistFolder;
	var isbackup = check[0];
	var backup = check[1];

	if(isbackup){
		self.logger.info("Backup: restoring playlists");
		for (var i = 0; i < backup.length; i++){
			var name = backup[i].name;
			var songs = backup[i].content;
			fs.outputJsonSync(path + name, songs);
		}
	}
}

CoreCommandRouter.prototype.restoreFavouritesBackup = function (type) {
	var self = this;

	var backup = self.checkBackup("favourites");
	var isbackup = backup[0];
	var path = self.playListManager.favouritesPlaylistFolder;
	var kind = self.checkFavouritesType(type, backup[1]);
	var file = kind[0];
	var data = kind[1];

	if(isbackup){
		try{
			var fav = fs.readJsonSync(path + file);
			data = self.mergePlaylists(data, fav);
		}catch(e){
			self.logger.info("Backup: no previous favourite " + type);
		};
		self.logger.info("Backup: restoring " + type + " favourites");
		fs.outputJsonSync(path + file, data);
	}
}

/**
 * check if there's a backup for the given playlist, returns a boolean and the file
 * @param backup
 * @returns {*[]}
 */
CoreCommandRouter.prototype.checkBackup = function (backup) {
	var self = this;
	var isbackup = false;
	var file = [];
	var path = "/data/configuration/" + backup;

	try{
		file = fs.readJsonSync(path);
		isbackup = true;
	}catch(e){
		self.logger.info("Backup: no " + backup + " backup available");
	};

	return [isbackup, file];
}

CoreCommandRouter.prototype.checkFavouritesType = function (type, backup) {
	var self = this;
	var data = [];
	var file = "";

	if(type == "songs") {
		data = backup.songs;
		file = "favourites";
	}
	else if(type == "radios") {
		data = backup.radios;
		file = "radio-favourites";
	}
	else if(type == "myRadios") {
		data = backup.myRadios;
		file = "my-web-radio";
	}
	else
		self.logger.info("Error: category non existent");

	return [file, data];
}

/**
 * merges the backup with the current existing playlist, returns the whole
 * @param recent
 * @param old
 * @returns {*}
 */
CoreCommandRouter.prototype.mergePlaylists = function (recent, old) {
	var self = this;
	var backup = recent;
	var current = old;

	for (var i = 0; i < current.length; i++){
		var isthere = false;
		for (var j = 0; j < backup.length; j++){
			if (current[i].uri == backup[j].uri) {
				isthere = true;
			}
		}
		if (!isthere) {
			backup.push(current[i]);
		}
	}

	return backup;
}

/**
 * manages the backup for playlists, saves or restores it according to value
 * @param value
 * @returns {*}
 */
CoreCommandRouter.prototype.managePlaylists = function (value) {
	var self = this;

	var defer = libQ.defer();

	if (value == 0){
		setTimeout(function () {
			self.writePlaylistsBackup();
			defer.resolve();
		}, 10000);
	}else{
		setTimeout(function () {
			self.restorePlaylistBackup();
			defer.resolve();
		}, 10000);
	}

	return defer.promise;
}

/**
 * manages the backup for favourites, saves or restores it, according to value
 * @param value
 * @returns {*}
 */
CoreCommandRouter.prototype.manageFavourites = function (value) {
	var self = this;

	var defer = libQ.defer();

	if (value == 0){
		setTimeout(function () {
			self.writeFavouritesBackup();
			defer.resolve();
		}, 10000);
	}else{
		setTimeout(function () {
			self.restoreFavouritesBackup("songs");
		}, 10000);
		setTimeout(function () {
			self.restoreFavouritesBackup("radios");
		}, 10000);
		setTimeout(function () {
			self.restoreFavouritesBackup("myRadios");
			defer.resolve();
		}, 10000);
	}

	return defer.promise;
}

CoreCommandRouter.prototype.executeOnPlugin = function (type, name, method, data) {
	this.pushConsoleMessage('CoreCommandRouter::executeOnPlugin: ' + name + ' , ' + method);

	var thisPlugin = this.pluginManager.getPlugin(type, name);

	if (thisPlugin != undefined)
		if (thisPlugin[method]) {
			return thisPlugin[method](data);
		} else {
			this.pushConsoleMessage('Error : CoreCommandRouter::executeOnPlugin: No method [' + method + '] in plugin ' + name);
		}
	else return undefined;
};

CoreCommandRouter.prototype.getUIConfigOnPlugin = function (type, name, data) {
	this.pushConsoleMessage('CoreCommandRouter::getUIConfigOnPlugin');

	var thisPlugin = this.pluginManager.getPlugin(type, name);

	return thisPlugin.getUIConfig(data);
};

/* what is this?
 CoreCommandRouter.prototype.getConfiguration=function(componentCode)
 {
 console.log("_________ "+componentCode);
 }
 */

CoreCommandRouter.prototype.pushConsoleMessage = function (sMessage) {
	this.logger.info(sMessage);
	/*
	 var self = this;
	 return libQ.all(
	 libFast.map(self.pluginManager.getPluginNames.call(self.pluginManager, 'user_interface'), function(sInterface) {
	 var thisInterface = self.pluginManager.getPlugin.call(self.pluginManager, 'user_interface', sInterface);
	 if( typeof thisInterface.printConsoleMessage === "function")
	 return thisInterface.printConsoleMessage.call(thisInterface, sMessage);
	 })
	 );
	 */
};

CoreCommandRouter.prototype.pushToastMessage = function (type, title, message) {
	var self = this;
	return libQ.all(
		libFast.map(this.pluginManager.getPluginNames('user_interface'), function (sInterface) {
			var thisInterface = self.pluginManager.getPlugin('user_interface', sInterface);
			if (typeof thisInterface.printToastMessage === "function")
				return thisInterface.printToastMessage(type, title, message);
		})
	);
};

CoreCommandRouter.prototype.broadcastToastMessage = function (type, title, message) {
	var self = this;
	return libQ.all(
		libFast.map(this.pluginManager.getPluginNames('user_interface'), function (sInterface) {
			var thisInterface = self.pluginManager.getPlugin('user_interface', sInterface);
			if (typeof thisInterface.broadcastToastMessage === "function")
				return thisInterface.broadcastToastMessage(type, title, message);
		})
	);
};

CoreCommandRouter.prototype.broadcastMessage = function (msg, value) {
	var self = this;
	this.pushConsoleMessage('CoreCommandRouter::BroadCastMessage '+msg);

	return libQ.all(

		libFast.map(this.pluginManager.getPluginNames('user_interface'), function (sInterface) {
			var emit = {msg:msg,value:value};
			var thisInterface = self.pluginManager.getPlugin('user_interface', sInterface);
			if (typeof thisInterface.broadcastMessage === "function")
				return thisInterface.broadcastMessage(emit);
		})
	);
};

CoreCommandRouter.prototype.pushMultiroomDevices = function (data) {
	var self = this;
	return libQ.all(
		libFast.map(this.pluginManager.getPluginNames('user_interface'), function (sInterface) {
			var thisInterface = self.pluginManager.getPlugin('user_interface', sInterface);
			if (typeof thisInterface.pushMultiroomDevices === "function")
				return thisInterface.pushMultiroomDevices(data);
		})
	);
};

CoreCommandRouter.prototype.pushMultiroom = function (data) {
	var self = this;
	return libQ.all(
		libFast.map(this.pluginManager.getPluginNames('user_interface'), function (sInterface) {
			var thisInterface = self.pluginManager.getPlugin('user_interface', sInterface);
			if (typeof thisInterface.pushMultiroom === "function")
				return thisInterface.pushMultiroom(data);
		})
	);
};


CoreCommandRouter.prototype.pushAirplay = function (data) {
	var self = this;
	return libQ.all(
		libFast.map(this.pluginManager.getPluginNames('user_interface'), function (sInterface) {
			var thisInterface = self.pluginManager.getPlugin('user_interface', sInterface);
			if (typeof thisInterface.pushAirplay === "function")
				return thisInterface.pushAirplay(data);
		})
	);
};


// Platform specific & Hardware related options, they can be found in platformSpecific.js
// This allows to change system commands across different devices\environments
CoreCommandRouter.prototype.shutdown = function () {
	this.platformspecific.shutdown();
};

CoreCommandRouter.prototype.reboot = function () {
	this.platformspecific.reboot();
};

CoreCommandRouter.prototype.networkRestart = function () {
	this.platformspecific.networkRestart();
};

CoreCommandRouter.prototype.wirelessRestart = function () {
	this.platformspecific.wirelessRestart();
};

CoreCommandRouter.prototype.startupSound = function () {
	this.platformspecific.startupSound();
};

CoreCommandRouter.prototype.fileUpdate = function (data) {
	this.platformspecific.fileUpdate(data);
}




//------------------------- Multiservice queue methods -----------------------------------

CoreCommandRouter.prototype.explodeUriFromService = function (service, uri) {
	this.logger.info("Exploding uri "+uri+" in service "+service);

	var thisPlugin = this.pluginManager.getPlugin('music_service', service);
	if(thisPlugin.explodeUri !=undefined)
		return  thisPlugin.explodeUri(uri);
	else {
		var promise=libQ.defer();
		promise.resolve({
			uri: uri,
			service: service
		});
		return promise.promise;
	}
};







//------------------------ Used in new play system -------------------------------

// Volumio Play
CoreCommandRouter.prototype.volumioPlay = function (N) {
	this.pushConsoleMessage('CoreCommandRouter::volumioPlay');

    this.stateMachine.unSetVolatile();

	if(N===undefined)
		return this.stateMachine.play();
	else
	{
		return this.stateMachine.play(N);
	}
};


// Volumio Play
CoreCommandRouter.prototype.volumioSeek = function (position) {
	this.pushConsoleMessage('CoreCommandRouter::volumioSeek');
	return this.stateMachine.seek(position);
};

CoreCommandRouter.prototype.installPlugin = function (uri) {
	var self=this;
	var defer=libQ.defer();

	this.pluginManager.installPlugin(uri).then(function()
	{
		defer.resolve();
	}).fail(function(e){
		self.logger.info("Error: "+e);
		defer.reject(new Error('Cannot install plugin. Error: '+e));
	});

	return defer.promise;
};

CoreCommandRouter.prototype.updatePlugin = function (data) {
	var self=this;
	var defer=libQ.defer();

	this.pluginManager.updatePlugin(data).then(function()
	{
		defer.resolve();
	}).fail(function(e){
		self.logger.info("Error: "+e);
		self.logger.info("Error: "+e);
		defer.reject(new Error('Cannot Update plugin. Error: '+e));
	});

	return defer.promise;
};

CoreCommandRouter.prototype.unInstallPlugin = function (data) {
	var self = this;
	var defer=libQ.defer();

	self.logger.info('Starting Uninstall of plugin ' + data.category + ' - ' +data.name);

	this.pluginManager.unInstallPlugin(data.category,data.name).then(function()
	{
		defer.resolve();
	}).fail(function(){
		defer.reject(new Error('Cannot uninstall plugin'));
	});

	return defer.promise;
};

CoreCommandRouter.prototype.enablePlugin = function (data) {
	var defer=libQ.defer();

	this.pluginManager.enablePlugin(data.category,data.plugin).then(function()
	{
		defer.resolve();
	}).fail(function(){
		defer.reject(new Error('Cannot enable plugin'));
	});

	return defer.promise;
};

CoreCommandRouter.prototype.disablePlugin = function (data) {
	var defer=libQ.defer();

	this.pluginManager.disablePlugin(data.category,data.plugin).then(function()
	{
		defer.resolve();
	}).fail(function(){
		defer.reject(new Error('Cannot disable plugin'));
	});

	return defer.promise;
};

CoreCommandRouter.prototype.modifyPluginStatus = function (data) {
	var defer=libQ.defer();

	this.pluginManager.modifyPluginStatus(data.category,data.plugin,data.status).then(function()
	{
		defer.resolve();
	}).fail(function(){
		defer.reject(new Error('Cannot update plugin status'));
	});

	return defer.promise;
};

CoreCommandRouter.prototype.broadcastMessage = function (emit,payload) {
	var self = this;
	return libQ.all(
		libFast.map(this.pluginManager.getPluginNames('user_interface'), function (sInterface) {
			var thisInterface = self.pluginManager.getPlugin('user_interface', sInterface);
			if (typeof thisInterface.broadcastMessage === "function")
				return thisInterface.broadcastMessage(emit,payload);
		})
	);
};

CoreCommandRouter.prototype.getInstalledPlugins = function () {
	return this.pluginManager.getInstalledPlugins();
};

CoreCommandRouter.prototype.getAvailablePlugins = function () {
	return this.pluginManager.getAvailablePlugins();
};

CoreCommandRouter.prototype.getPluginDetails = function (data) {
	return this.pluginManager.getPluginDetails(data);
};



CoreCommandRouter.prototype.enableAndStartPlugin = function (category,name) {
	return this.pluginManager.enableAndStartPlugin(category,name);
};


CoreCommandRouter.prototype.disableAndStopPlugin = function (category,name) {
	return this.pluginManager.disableAndStopPlugin(category,name);
};


CoreCommandRouter.prototype.volumioRandom = function (data) {
	this.pushConsoleMessage('CoreCommandRouter::volumioRandom');
	return this.stateMachine.setRandom(data);
};

CoreCommandRouter.prototype.volumioRepeat = function (data) {
	this.pushConsoleMessage('CoreCommandRouter::volumioRandom');
	return this.stateMachine.setRepeat(data);
};

CoreCommandRouter.prototype.volumioConsume = function (data) {
	this.pushConsoleMessage('CoreCommandRouter::volumioConsume');
	return this.stateMachine.setConsume(data);
};

CoreCommandRouter.prototype.volumioSaveQueueToPlaylist = function (name) {
	var self=this;
    this.pushConsoleMessage('CoreCommandRouter::volumioSaveQueueToPlaylist');

	var queueArray=this.stateMachine.getQueue();
	var defer=this.playListManager.commonAddItemsToPlaylist(this.playListManager.playlistFolder,name,queueArray);

    defer.then(function()
    {
        self.pushToastMessage('success', self.getI18nString('COMMON.SAVE_QUEUE_SUCCESS') + name);
    })
    .fail(function () {
        self.pushToastMessage('success', self.getI18nString('COMMON.SAVE_QUEUE_ERROR')+name);
    });

    return defer;
};


CoreCommandRouter.prototype.volumioMoveQueue = function (from,to) {
	this.pushConsoleMessage('CoreCommandRouter::volumioMoveQueue');

	return this.stateMachine.moveQueueItem(from,to);
};

CoreCommandRouter.prototype.getI18nString = function (key) {
    var splitted=key.split('.');

	if(splitted.length==1)
    {
        if(this.i18nStrings[key]!==undefined)
            return this.i18nStrings[key];
        else return this.i18nStringsDefaults[key];
    }
    else {
        if(this.i18nStrings[splitted[0]][splitted[1]]!==undefined)
            return this.i18nStrings[splitted[0]][splitted[1]];
        else return this.i18nStringsDefaults[splitted[0]][splitted[1]];
    }
};

CoreCommandRouter.prototype.loadI18nStrings = function () {
    var self=this;
    var language_code=this.sharedVars.get('language_code');

    this.logger.info("Loading i18n strings for locale "+language_code);

    this.i18nStrings=fs.readJsonSync(__dirname+'/i18n/strings_'+language_code+".json");
    this.i18nStringsDefaults=fs.readJsonSync(__dirname+'/i18n/strings_en.json');

    var categories=this.pluginManager.getPluginCategories();
    for(var i in categories)
    {
        var category=categories[i];
        var names=this.pluginManager.getPluginNames(category);
        for(var j in names)
        {
            var name=names[j];
            var instance=this.pluginManager.getPlugin(category,name);

            if(instance.loadI18NStrings)
                instance.loadI18NStrings(language_code);

        }
    }
};

CoreCommandRouter.prototype.i18nJson = function (dictionaryFile,defaultDictionaryFile,jsonFile) {
    var self=this;
    var methodDefer=libQ.defer();
    var defers=[];


	try {
		fs.statSync(dictionaryFile);
	} catch(e) {
		dictionaryFile = defaultDictionaryFile;
	}

    defers.push(libQ.nfcall(fs.readJson,dictionaryFile));
    defers.push(libQ.nfcall(fs.readJson,defaultDictionaryFile));
    defers.push(libQ.nfcall(fs.readJson,jsonFile));

    libQ.all(defers).
            then(function(documents)
    {

        var dictionary=documents[0];
        var defaultDictionary=documents[1];
        var jsonFile=documents[2];

        self.translateKeys(jsonFile,dictionary,defaultDictionary);

        methodDefer.resolve(jsonFile);
    })
    .fail(function(err){
        self.logger.info("ERROR LOADING JSON "+err);

        methodDefer.reject(new Error());
    });

    return methodDefer.promise;

};

CoreCommandRouter.prototype.translateKeys = function (parent,dictionary,defaultDictionary) {
    var self=this;

    var keys=Object.keys(parent);

    for(var i in keys)
    {
        var obj=parent[keys[i]];
        var type=typeof(obj);

        if(type==='object')
        {
           self.translateKeys(obj,dictionary,defaultDictionary);
        }
        else if(type==='string')
        {
            if(obj.startsWith("TRANSLATE."))
            {
                var replaceKey=obj.slice(10);

                var dotIndex=replaceKey.indexOf('.');

                if(dotIndex==-1)
                {
                    var value=dictionary[replaceKey];
                    if(value===undefined)
                    {
                        value=defaultDictionary[replaceKey];
                    }
                    parent[keys[i]]=value;
                }
                else {
                    var category=replaceKey.slice(0,dotIndex);
                    var key=replaceKey.slice(dotIndex+1);

                    var value=dictionary[category][key];
                    if(value===undefined)
                    {
                        value=defaultDictionary[category][key];
                    }
                    parent[keys[i]]=value;
                }



            }

        }
    }
}

CoreCommandRouter.prototype.updateBrowseSourcesLang = function () {
	var self=this;

	return this.musicLibrary.updateBrowseSourcesLang();
}


/**
 * This function checks if update files are placed in the update folder
 */
CoreCommandRouter.prototype.checkAndPerformSystemUpdates = function () {
    //var defer=libQ.defer();
    var self=this;

    var updateFolder='/volumio/update';
	try {
		var files = fs.readdirSync(updateFolder);
	} catch (e)
	{
		//Nothing to do
	}

    if(files!==undefined && files.length>0)
    {
        self.logger.info("Updating system");

        try {
            for(var i in files)
            {
                var file=files[i];

                if(file.endsWith(".sh"))
                {
                    var output = execSync('sh '+updateFolder+'/'+file, { encoding: 'utf8' });
                }


            }

            for(var i in files)
            {
                var file=files[i];

                fs.unlinkSync(updateFolder+'/'+file);
            }
        }
        catch(err)
        {
            self.logger.error("An error occurred when updating Volumio. Details: "+err);

            //TODO: decide what to do in case of errors when updating
        }


    }
}
