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

	var logfile = '/var/log/volumio.log';

	fs.ensureFileSync(logfile);
	fs.watchFile(logfile, function () {
		fs.stat(logfile, function (err, stats) {
			if (stats.size > 15728640) {
				var now = new Date();
				console.log('******** LOG FILE REACHED 15MB IN SIZE, CLEANING IT ********');
				fs.writeFile(logfile, '------------------- Log Cleaned at '+ now + ' -------------------', function(){
					console.log('******** LOG FILE SUCCESSFULLY CLEANED ********');
				})
			}
		});
	});
	this.logger = new (winston.Logger)({
		transports: [
			new (winston.transports.Console)(),
			new (winston.transports.File)({
				filename: logfile,
				json: false
			})
		]
	});

	this.callbacks = [];
	this.pluginsRestEndpoints = [];
	this.sharedVars = new vconf();
    this.sharedVars.registerCallback('language_code',this.loadI18nStrings.bind(this));
    this.sharedVars.addConfigValue('selective_search','boolean',true);

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
    this.configManager=new(require(__dirname+'/configManager.js'))(this.logger);

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
	this.closeModals();

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
	var self = this;
	this.callCallback("volumiosetvolume", VolumeInteger);

	var volSet = this.volumeControl.alsavolume(VolumeInteger);
    volSet.then(function (result) {
		 return self.volumioupdatevolume(result);
    })
};

// Volumio Update Volume
CoreCommandRouter.prototype.volumioupdatevolume = function (vol) {
	this.callCallback("volumioupdatevolume", vol);
	this.writeVolumeStatusFiles(vol);
	return this.stateMachine.updateVolume(vol);
};

// Volumio Retrieve Volume
CoreCommandRouter.prototype.volumioretrievevolume = function () {
	this.pushConsoleMessage('CoreCommandRouter::volumioRetrievevolume');
	return this.volumeControl.retrievevolume();
};


CoreCommandRouter.prototype.volumioUpdateVolumeSettings = function (vol) {
	this.pushConsoleMessage('CoreCommandRouter::volumioUpdateVolumeSettings');
	if (this.volumeControl){
		return this.volumeControl.updateVolumeSettings(vol);
	}
};

CoreCommandRouter.prototype.updateVolumeScripts = function (data) {
    this.pushConsoleMessage('CoreCommandRouter::volumioUpdateVolumeScripts');
    if (this.volumeControl){
        return this.volumeControl.updateVolumeScript(data);
    }
};

CoreCommandRouter.prototype.retrieveVolumeLevels = function () {
    this.pushConsoleMessage('CoreCommandRouter::volumioRetrieveVolumeLevels');
    return this.stateMachine.getcurrentVolume();
};

CoreCommandRouter.prototype.setStartupVolume = function () {
    this.pushConsoleMessage('CoreCommandRouter::volumiosetStartupVolume');
    if (this.volumeControl){
        return this.volumeControl.setStartupVolume();
    }
};

CoreCommandRouter.prototype.writeVolumeStatusFiles = function (vol) {

	if (vol.mute !== undefined && vol.mute === true) {
		this.executeWriteVolumeStatusFiles(0);
	} else if (vol && vol.vol && typeof vol.vol == 'number') {
        this.executeWriteVolumeStatusFiles(vol.vol);
	} else {
        this.executeWriteVolumeStatusFiles(100);
	}
};

CoreCommandRouter.prototype.executeWriteVolumeStatusFiles = function (value) {
    fs.writeFile('/tmp/volume', value, function (err) {
        if (err) {
        	this.logger.error('Could not save Volume value to status file: ' + err);
		}
    });
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

// TODO CLEANUP THIS FUNCTION
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

CoreCommandRouter.prototype.volumioGetVisibleBrowseSources = function () {
    this.pushConsoleMessage('CoreCommandRouter::volumioGetVisibleSources');
    return this.musicLibrary.getVisibleBrowseSources();
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
	this.pushConsoleMessage('CoreCommandRouter::volumioUpdateToBrowseSources');
	return this.musicLibrary.updateBrowseSources(name,data);
};

CoreCommandRouter.prototype.setSourceActive = function (data) {
    this.pushConsoleMessage('CoreCommandRouter::volumiosetSourceActive' + data);
    return this.musicLibrary.setSourceActive(data);
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
			if (typeof thisInterface.pushState === "function")
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
			if (typeof thisInterface.pushQueue === "function")
				return thisInterface.pushQueue(queue);
		})
	);
};

// Clear-Add-Play
CoreCommandRouter.prototype.serviceClearAddPlayTracks = function (arrayTrackIds, sService) {
	this.pushConsoleMessage('CoreCommandRouter::serviceClearAddPlayTracks');
    if (sService != undefined) {
        var thisPlugin = this.pluginManager.getPlugin('music_service', sService);

        if (thisPlugin != undefined && typeof thisPlugin.clearAddPlayTracks === "function") {
            return thisPlugin.clearAddPlayTracks(arrayTrackIds);
        } else {
            this.logger.error('WARNING: No clearAddPlayTracks method for service ' + sService);
        }
    }
};

// MPD Stop
CoreCommandRouter.prototype.serviceStop = function (sService) {

    if (sService != undefined) {
        this.pushConsoleMessage('CoreCommandRouter::serviceStop');
        var thisPlugin = this.getMusicPlugin(sService);
        if (thisPlugin != undefined && typeof thisPlugin.stop === "function") {
            return thisPlugin.stop();
        } else {
            this.logger.error('WARNING: No stop method for service ' + sService);
        }

    } else {
        this.pushConsoleMessage('Received STOP, but no service to execute it');
        return libQ.resolve('');
    }
};

// MPD Pause
CoreCommandRouter.prototype.servicePause = function (sService) {
    this.pushConsoleMessage('CoreCommandRouter::servicePause');

    var thisPlugin = this.getMusicPlugin(sService);
    if (thisPlugin != undefined && typeof thisPlugin.pause === "function") {
        return thisPlugin.pause();
    } else {
        this.logger.error('WARNING: No pause method for service ' + sService);
    }
};

// MPD Resume
CoreCommandRouter.prototype.serviceResume = function (sService) {
    this.pushConsoleMessage('CoreCommandRouter::serviceResume');

    var thisPlugin = this.getMusicPlugin(sService);
    var state=this.stateMachine.getState();

    if(state==='stop')
    {
        if (thisPlugin != undefined && typeof thisPlugin.clearAddPlayTracks === "function") {
            thisPlugin.clearAddPlayTracks();
        }
    }
    if (thisPlugin != undefined && typeof thisPlugin.resume === "function") {
        return thisPlugin.resume();
    }
};

// Methods usually called by the service controllers --------------------------------------------------------------

CoreCommandRouter.prototype.servicePushState = function (state, sService) {
    this.pushConsoleMessage('CoreCommandRouter::servicePushState');
    return this.stateMachine.syncState(state, sService);
};

CoreCommandRouter.prototype.getMusicPlugin = function (sService) {
    // Check first if its a music service
    var thisPlugin = this.pluginManager.getPlugin('music_service', sService);
    if (!thisPlugin) {
        // check if its a audio interface
        thisPlugin = this.pluginManager.getPlugin('audio_interface', sService);
    }

    return thisPlugin
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
CoreCommandRouter.prototype.replaceAndPlay = function (data) {
	var defer = libQ.defer();
	this.pushConsoleMessage('CoreCommandRouter::volumioReplaceandPlayItems');

	this.stateMachine.clearQueue();

    if (data.uri != undefined) {
    	if (data.uri.indexOf('playlists/') >= 0 && data.uri.indexOf('://') == -1) {
            this.playPlaylist(data.title);
            defer.resolve();
		} else {
            this.stateMachine.addQueueItems(data)
                .then((e)=> {
                	this.volumioPlay(e.firstItemIndex);
            		defer.resolve();
        	});
		}
    } else if (data.list!=undefined && data.index!=undefined) {
        this.stateMachine.addQueueItems(data.list)
            .then(()=>{
                this.volumioPlay(data.index);
        		defer.resolve();
            });
    } else if ((!(data.list && data.index) && data.item && data.item.uri)) {
        this.stateMachine.addQueueItems(data.item)
            .then((e)=>{
                this.volumioPlay(e.firstItemIndex);
        		defer.resolve();
            });
    } else {
    	self.logger.error('Could not Replace and Play Item');
        defer.reject('Could not Replace and Play Item');
	}

	return defer.promise;
};

CoreCommandRouter.prototype.replaceAndPlayCue = function (arrayItems) {
    this.pushConsoleMessage('CoreCommandRouter::volumioReplaceandPlayCue');
    this.stateMachine.clearQueue();

    if (arrayItems.uri != undefined && arrayItems.uri.indexOf('playlists/') >= 0) {
        return this.playPlaylist(arrayItems.title)
    } else  {
        return this.stateMachine.addQueueItems(arrayItems);
    }
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
 * Returns informations about device and current time
 * @returns {{name: *, uuid: *, time: string}}
 */
CoreCommandRouter.prototype.getId = function () {
	var self = this;

	var file = fs.readJsonSync("data/configuration/system_controller/system/config.json");

	var name = file.playerName.value;
	var uuid = file.uuid.value;
	var date = new Date();
	var time = date.getDate() + "/" + date.getMonth() + "/" + date.getFullYear() + " - " +
			date.getHours() + ":" + date.getMinutes();

	return {'name': name, 'uuid': uuid, 'time': time};
}

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

	var identification = self.getId();
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

/**
 * restores plugins configuration, given in the request, returns a promise
 * @param request
 * @returns {*}
 */
CoreCommandRouter.prototype.restorePluginsConf = function (request) {
	var self = this;

	var defer = libQ.defer();
	var backup = request;
	var current = self.pluginManager.getPluginsMatrix();
	var usefulConfs = [];

	for(var i = 0; i < current.length; i++){
		var j = 0;
		while(j < backup.length && current[i].cName != backup[j].cName){
			j++;
		}
		if(j < backup.length) {
			var availPlugins = current[i].catPlugin;
			var backPlugins = backup[j];
			usefulConfs.push(self.usefulBackupConfs(availPlugins, backPlugins));
		}
	}

	defer.resolve(usefulConfs);
	self.writeConfs(usefulConfs);
	return defer.promise;
}

/**
 * check in the backups for plugins already installed, if it remains with plugins in the backup
 * not installed in the device, it calls the proper function
 * @param currArray is the array of existing plugins
 * @param backArray is the array of backed up plugins
 * @returns {{cName: *, plugConf: Array}}
 */
CoreCommandRouter.prototype.usefulBackupConfs = function (currArray, backArray) {
	var self = this;
	var availPlugins = currArray;
	var catName = backArray.cName;
	var backPlugins = backArray.plugConf;
	var backNum = backPlugins.length;
	var i = 0;

	var existingPlug = [];
	while (i < availPlugins.length && backNum > 0) {
		var j = 0;
		while (j < backPlugins.length && availPlugins[i].name != backPlugins[j].name) {
			j++;
		}
		if(j < backPlugins.length){
			existingPlug.push(backPlugins[j]);
			backNum--;
			backPlugins.splice(j, 1);
		}
		i++;
	}
	if (backNum > 0){
		self.installBackupPlugins(catName, backPlugins);
	}
	return {'cName': catName, 'plugConf': existingPlug};
}

/**
 * writes each config.json in the appropriate folder
 * @param data is a json with useful plugin's configuration files, sorted by category
 */
CoreCommandRouter.prototype.writeConfs = function (data) {
	var self = this;

	var usefulConfs = data;
	for(var i = 0; i < usefulConfs.length; i++){
		for(var j = 0; j < usefulConfs[i].plugConf.length; j++){
			if (usefulConfs[i].plugConf[j].config != "") {
				var path = "/data/configuration/" + usefulConfs[i].cName + "/" +
					usefulConfs[i].plugConf[j].name + "/config.json";
				fs.outputJsonSync(path, usefulConfs[i].plugConf[j].config);
			}
		}
	}
}

/**
 * self explanatory
 * @param a
 * @param b
 * @returns {*}
 */
CoreCommandRouter.prototype.min = function (a, b) {
	var self = this;

	if (a < b)
		return a;
	else
		return b;
}

/**
 * checks if remaining backed up plugins are available for installation, installs them if found
 * @param name category name
 * @param array array of plugins
 */
CoreCommandRouter.prototype.installBackupPlugins = function (name, array) {
	var self = this;

	var availablePlugins = self.pluginManager.getAvailablePlugins();
	var cat = [];
	availablePlugins.then(function (available) {
		cat = available.categories;
		var plug = [];

		for (var i = 0; i < cat.length; i++) {
			if (cat[i].name == name) {
				plug = cat[i].plugins;
			}
		}

		if (plug.length > 0) {
			for (var j = 0; j < array.length; j++) {
				var k = 0;
				while (k < plug.length && array[j].name != plug[k].name) {
					k++;
				}
				if (k < plug.length) {
					self.logger.info("Backup: installing plugin: " + plug[k].name);
					self.pluginManager.installPlugin(plug[k].url);
				}
			}
			self.writeConfs([{'cName': name, 'plugConf': array}]);
		}
	});
}

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
		var identification = self.getId();
		data = {'id' : identification, 'backup': self.loadPlaylistsBackup()};
		defer.resolve(data);
	}else if (request.type == "radio-favourites" || request.type == "favourites"
	|| request.type == "my-web-radio"){
		var identification = self.getId();
		data = {'id' : identification, 'backup': self.loadFavBackup(request.type)};
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

	if(isbackup){
		self.restorePlaylist({'type': "playlist", 'backup': backup});
	}
}

/**
 * restores the default playlist specified in type, from the avilable local backup
 * @param type
 */
CoreCommandRouter.prototype.restoreFavouritesBackup = function (type) {
	var self = this;

	var backup = self.checkBackup("favourites");
	var isbackup = backup[0];
	var path = self.playListManager.favouritesPlaylistFolder;

	if(isbackup){
		var kind = self.checkFavouritesType(type, backup[1]);
		var file = kind[0];
		var data = kind[1];
		self.restorePlaylist({'type': type, 'path': file, 'backup': data});
	}
}

/**
 * restores the playlist specified in req.type, given the data in req.backup and the eventual
 * @param req
 */
CoreCommandRouter.prototype.restorePlaylist = function (req) {
	var self = this;
	var path = "";
	var backup = req.backup;

	if (req.type == "playlist") {
		path = self.playListManager.playlistFolder;
		self.logger.info("Backup: restoring playlists");
		for (var i = 0; i < backup.length; i++) {
			var name = backup[i].name;
			var songs = backup[i].content;
			fs.outputJsonSync(path + name, songs);
		}
	}
	else if(req.type == "favourites" || req.type == "radio-favourites" ||
		req.type == "my-web-radio"){
		path = self.playListManager.favouritesPlaylistFolder + req.type;
		try{
			var fav = fs.readJsonSync(path);
			backup = self.mergePlaylists(backup, fav);
		}catch(e){
			self.logger.info("Backup: no existing playlist for selected category");
		};
		self.logger.info("Backup: restoring " + req.type + "!");
		fs.outputJsonSync(path, backup);
	}
	else
		self.logger.info("Backup: impossible to restore data");
}

CoreCommandRouter.prototype.getPath = function (type){
	if(type == "songs")
		return "favourites";
	else if (type == "radios")
		return "radio-favourites";
	else if (type == "myRadios")
		return "my-web-radio";
	return "";
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

/**
 * selects the type of a default playlist from a json, returns the path and a json with
 * the correspondent data
 * @param type
 * @param backup
 * @returns {*[]}
 */
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
	var self=this
    this.pushConsoleMessage('CoreCommandRouter::getUIConfigOnPlugin');
	var noConf = {"page": {"label": self.getI18nString('PLUGINS.NO_CONFIGURATION_AVAILABLE')}, "sections": []};

	var defer=libQ.defer()

	var thisPlugin = this.pluginManager.getPlugin(type, name);

	try {
        thisPlugin.getUIConfig(data)
            .then(function(uiconf){
                var filePath=__dirname + '/plugins/'+type+'/'+name+'/override.json'

                self.overrideUIConfig(uiconf,filePath)
                    .then(function(){
                        defer.resolve(uiconf)
                    })
                    .fail(function()
                    {
                        defer.reject(new Error());
                    })
            })
            .fail(function()
            {
                defer.reject(new Error("Error retrieving UIConfig from plugin "+name))
            })
	} catch(e) {
        defer.resolve(noConf)
	}



	return defer.promise;
};

CoreCommandRouter.prototype.writePlayerControls = function (config) {
	var self = this;
	var pCtrlFile = '/data/playerstate/playback-controls.json';

	this.pushConsoleMessage('CoreCommandRouter::writePlayerControls');

	var state = self.stateMachine.getState();

	var data = Object.assign({
		random: state.random,
		repeat: state.repeat
	}, config);

	fs.writeFile(pCtrlFile, JSON.stringify(data, null, 4), function (err) {
		if (err) self.pushConsoleMessage('Failed setting player state in CoreCommandRouter::initPlayerState');
	});
};

CoreCommandRouter.prototype.initPlayerControls = function () {
	var pCtrlFile = '/data/playerstate/playback-controls.json';
	var self = this;

	this.pushConsoleMessage('CoreCommandRouter::initPlayerControls');

	function handleError() {
		self.pushConsoleMessage('Failed setting player state in CoreCommandRouter::initPlayerControls');
	}

	fs.ensureFile(pCtrlFile, function (err) {
		if (err) handleError();

		fs.readFile(pCtrlFile, function (err, data) {
			if (err) handleError();

			try {
				var config = JSON.parse(data.toString());
				self.stateMachine.setRepeat(config.repeat);
				self.stateMachine.setRandom(config.random);
			} catch(e) {
				var state = self.stateMachine.getState();
				var config = {
					random: state.random,
					repeat: state.repeat
				};

				fs.writeFile(pCtrlFile, JSON.stringify(config, null, 4), function (err) {
					if (err) handleError();
				});
			}
		});
	});
};


/**
 * This method shall be used to push debug messages
 * @param sMessage The debug message to push
 */
CoreCommandRouter.prototype.pushDebugConsoleMessage = function (sMessage) {
    this.logger.info(sMessage);
};

/**
 * This method shall be used to push error messages
 * @param sMessage The error message to push
 */
CoreCommandRouter.prototype.pushErrorConsoleMessage = function (sMessage) {
    this.logger.error(sMessage);
};

CoreCommandRouter.prototype.pushConsoleMessage = function (sMessage) {
	// Uncomment for more logging
	this.logger.info(sMessage);
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

	var audioOutputPlugin = this.pluginManager.getPlugin('audio_interface', 'multiroom');
    if (audioOutputPlugin != undefined && typeof audioOutputPlugin.pushOutputsState === "function") {
        audioOutputPlugin.pushOutputsState(data);
    }
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
	var self = this;
	
	self.pluginManager.onVolumioShutdown().then( function() {
		self.platformspecific.shutdown();
	}).fail(function(e){
		self.logger.info("Error in onVolumioShutdown Plugin Promise handling: "+ e);
		self.platformspecific.shutdown();
	});
	
};

CoreCommandRouter.prototype.reboot = function () {
	var self = this;
	
	self.pluginManager.onVolumioReboot().then( function() {
		 self.platformspecific.reboot();
	}).fail(function(e){
		self.logger.info("Error in onVolumioReboot Plugin Promise handling: "+ e);
		self.platformspecific.reboot();
	});
	
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
CoreCommandRouter.prototype.volumioVolatilePlay = function () {
    this.pushConsoleMessage('CoreCommandRouter::volumioVolatilePlay');

    return this.stateMachine.volatilePlay();
};

// Volumio Toggle
CoreCommandRouter.prototype.volumioToggle = function () {
    this.pushConsoleMessage('CoreCommandRouter::volumioToggle');

    var state=this.stateMachine.getState();

	if (state.status != undefined) {
		if(state.status==='stop' || state.status==='pause')
		{
			return this.stateMachine.play();
		} else {
			if(state.trackType == 'webradio') {
				return this.stateMachine.stop();
			} else {
				return this.stateMachine.pause();
			}
		}
    }
};


// Volumio Seek
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

	this.writePlayerControls({
		random: data
	});

	return this.stateMachine.setRandom(data);
};




CoreCommandRouter.prototype.randomToggle = function(){
    var self = this;

    var state = self.stateMachine.getState();

    if(state.random){
        var random = false;
    }
    else{
        var random = true;
    }

    this.writePlayerControls({
        random: random
	});

    return self.stateMachine.setRandom(random);

}

CoreCommandRouter.prototype.volumioRepeat = function (repeat,repeatSingle) {
    this.pushConsoleMessage('CoreCommandRouter::volumioRandom');

    this.writePlayerControls({
        repeat: repeat
    });

    return this.stateMachine.setRepeat(repeat,repeatSingle);
};

CoreCommandRouter.prototype.repeatToggle = function () {
    var self = this;

    var state = self.stateMachine.getState();

    if(state.repeat){
        var repeat = false;
    }
    else{
        var repeat = true;
    }

    this.writePlayerControls({
        repeat: repeat
    });

    return self.stateMachine.setRepeat(repeat, false);
}

CoreCommandRouter.prototype.volumioConsume = function (data) {
	this.pushConsoleMessage('CoreCommandRouter::volumioConsume');
	return this.stateMachine.setConsume(data);
};

/**
 * This method implements Fast Forward and Rewind, depending on the sign of method parameter.
 * Return a promise
 */
CoreCommandRouter.prototype.volumioFFWDRew = function (millisecs) {
    this.pushConsoleMessage('CoreCommandRouter::volumioFFWDRew '+millisecs);

    return this.stateMachine.ffwdRew(millisecs);
};

CoreCommandRouter.prototype.volumioSkipBackwards = function (data) {
    this.pushConsoleMessage('CoreCommandRouter::volumioSkipBackwards');

    return this.stateMachine.skipBackwards(data);
};

CoreCommandRouter.prototype.volumioSkipForward = function (data) {
    this.pushConsoleMessage('CoreCommandRouter::volumioSkipForward');

    return this.stateMachine.skipForward(data);
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
	var defer = libQ.defer();
	this.pushConsoleMessage('CoreCommandRouter::volumioMoveQueue');

	if (from && to) {
        return this.stateMachine.moveQueueItem(from,to);
	} else {
		this.logger.error('Cannot move item in queue, from or to parameter missing');
        var queueArray=this.stateMachine.getQueue();
        defer.resolve(queueArray);
        return defer.promise
	}

};

CoreCommandRouter.prototype.getI18nString = function (key) {
    var splitted=key.split('.');

    if (this.i18nStrings) {
        if(splitted.length==1)
        {
            if(this.i18nStrings[key]!==undefined)
                return this.i18nStrings[key];
            else return this.i18nStringsDefaults[key];
        }
        else {
            if(this.i18nStrings[splitted[0]]!==undefined &&
                this.i18nStrings[splitted[0]][splitted[1]]!==undefined)
                return this.i18nStrings[splitted[0]][splitted[1]];
            else return this.i18nStringsDefaults[splitted[0]][splitted[1]];
        }
	} else {
    	var emptyString = '';
    	return emptyString
	}

};

CoreCommandRouter.prototype.loadI18nStrings = function () {
    var self=this;
    var language_code=this.sharedVars.get('language_code');

	this.i18nStringsDefaults=fs.readJsonSync(__dirname+'/i18n/strings_en.json');
	
    try {
        this.logger.info("Loading i18n strings for locale "+language_code);
    	this.i18nStrings=fs.readJsonSync(__dirname+'/i18n/strings_'+language_code+".json");
    } catch(e){
        this.logger.error("Failed to load i18n strings for locale "+language_code + ": " +e);
        this.i18nStrings = this.i18nStringsDefaults;
    }
    
    var categories=this.pluginManager.getPluginCategories();
    for(var i in categories)
    {
        var category=categories[i];
        var names=this.pluginManager.getPluginNames(category);
        for(var j in names)
        {
            var name=names[j];
            var instance=this.pluginManager.getPlugin(category,name);

            if (instance && instance.getI18nFile) {
              var pluginI18NFile = instance.getI18nFile(language_code);
              if (pluginI18NFile && fs.pathExistsSync(pluginI18NFile)) {
                var pluginI18nStrings = fs.readJsonSync(pluginI18NFile);
      
                for (var locale in pluginI18nStrings) {
                  // check if locale does not already exist to avoid that volumio
                  // strings get overwritten
                  if (!this.i18nStrings[locale]) {
                    this.i18nStrings[locale] = pluginI18nStrings[locale];
                  } else {
                    this.logger.info("Plugin " + name + " has duplicated i18n key " + locale + ". It is ignored.");
                  }
                }
              }
            }
        }
    }
};

CoreCommandRouter.prototype.i18nJson = function (dictionaryFile,defaultDictionaryFile,jsonFile) {
    var self=this;
    var methodDefer=libQ.defer();
    var defers=[];


	try {
		fs.readJsonSync(dictionaryFile);
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

    try {
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

                        if(dictionary[category]===undefined || dictionary[category][key]===undefined)
                        {
                            var value=defaultDictionary[category][key];
                        } else {
                            var value=dictionary[category][key];
                        }
                        parent[keys[i]]=value;
                    }
                }
            }
        }
	} catch(e) {
    	self.logger.error('Cannot translate keys: ' + e);
	}
}

CoreCommandRouter.prototype.overrideUIConfig = function (uiconfig, overrideFile) {
    var self=this;
    var methodDefer=libQ.defer();

    fs.readJson(overrideFile, function(err,override){

        if(err)
        {
            methodDefer.resolve()
        }
        else {
            for(var i in override)
            {
                var attr=override[i]

                var attribute_name=attr.attribute_name
                var attribute_value=attr.value
                var id=attr.id

                self.overrideField(uiconfig,id,attribute_name,attribute_value)
            }

            methodDefer.resolve()
        }
    })

    return methodDefer.promise;

};

CoreCommandRouter.prototype.overrideField = function (parent,id,attribute_name,attribute_value) {
    var self=this;

    if(typeof(parent)==='object')
    {
        if(parent.id===id)
        {
            parent[attribute_name]=attribute_value
        } else {
            var keys=Object.keys(parent);

            for(var i in keys)
            {
                var obj=parent[keys[i]];

                self.overrideField(obj,id,attribute_name,attribute_value);
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

CoreCommandRouter.prototype.safeRemoveDrive = function (data) {
    var self=this;
    var defer = libQ.defer();

    exec("/usr/bin/sudo /bin/umount /mnt/USB/"+data, function (error, stdout, stderr) {
        if (error !== null) {
            self.pushConsoleMessage(error);
            self.pushToastMessage('error',data,
                self.getI18nString('SYSTEM.CANNOT_REMOVE_MEDIA')+ ': ' +error);
        } else {
            self.pushToastMessage('success',self.getI18nString('SYSTEM.MEDIA_REMOVED_SUCCESSFULLY'),
                self.getI18nString('SYSTEM.MEDIA_REMOVED_SUCCESSFULLY'));
            self.executeOnPlugin('music_service', 'mpd', 'updateMpdDB', '/USB/');
            execSync('/usr/bin/mpc update', { uid:1000, gid:1000, encoding: 'utf8' });
            exec('/usr/bin/mpc idle update', {uid:1000, gid:1000, timeout: 10000}, function (error, stdout, stderr) {
                if (error !== null) {
                } else {
                    var response = self.musicLibrary.executeBrowseSource('music-library/USB');
                    if (response != undefined) {
                        response.then(function (result) {
                            defer.resolve(result);
                        })
                            .fail(function () {
                                defer.reject();
                            });
                    }
				}
            });
        }
    });
    return defer.promise;
}

CoreCommandRouter.prototype.closeModals = function () {
    var self=this;
    this.pushConsoleMessage('CoreCommandRouter::Close All Modals sent');

    return self.broadcastMessage('closeAllModals', '');
}

CoreCommandRouter.prototype.getMyVolumioToken = function () {
    var self=this;
    var defer = libQ.defer();

    var response = self.executeOnPlugin('system_controller', 'my_volumio', 'getMyVolumioToken', '');

    if (response != undefined) {
        response.then(function (result) {
            defer.resolve(result);
        })
            .fail(function () {
                var jsonobject = {"tokenAvailable":false}
                defer.resolve(jsonobject);
            });
    }

    return defer.promise;
}

CoreCommandRouter.prototype.setMyVolumioToken = function (data) {
    var self=this;
    var defer = libQ.defer();

    var response = self.executeOnPlugin('system_controller', 'my_volumio', 'setMyVolumioToken', data);

    if (response != undefined) {
        response.then(function (result) {
            defer.resolve(result);
        })
            .fail(function () {

                defer.resolve('');
            });
    }

    return defer.promise;
}

CoreCommandRouter.prototype.getMyVolumioStatus = function () {
    var self=this;
    var defer = libQ.defer();

    var response = self.executeOnPlugin('system_controller', 'my_volumio', 'getMyVolumioStatus', '');

    if (response != undefined) {
        response.then(function (result) {
            defer.resolve(result);
        })
            .fail(function () {
                var jsonobject = {"loggedIn":false}
                defer.resolve(jsonobject);
            });
    }

    return defer.promise;
}

CoreCommandRouter.prototype.myVolumioLogout = function () {
    var self=this;
    var defer = libQ.defer();

    return self.executeOnPlugin('system_controller', 'my_volumio', 'myVolumioLogout', '');
}

CoreCommandRouter.prototype.enableMyVolumioDevice = function (device) {
    var self=this;
    var defer = libQ.defer();

    return self.executeOnPlugin('system_controller', 'my_volumio', 'enableMyVolumioDevice', device);
}

CoreCommandRouter.prototype.disableMyVolumioDevice = function (device) {
    var self=this;
    var defer = libQ.defer();

    return self.executeOnPlugin('system_controller', 'my_volumio', 'disableMyVolumioDevice', device);
}

CoreCommandRouter.prototype.deleteMyVolumioDevice = function (device) {
    var self=this;
    var defer = libQ.defer();

    return self.executeOnPlugin('system_controller', 'my_volumio', 'deleteMyVolumioDevice', device);
}

CoreCommandRouter.prototype.reloadUi = function () {
    var self=this;
    this.pushConsoleMessage('CoreCommandRouter::Reload Ui');

    return self.broadcastMessage('reloadUi', '');
}

CoreCommandRouter.prototype.getMenuItems = function () {
    var self=this;
    var defer = libQ.defer();
    var lang_code = self.sharedVars.get('language_code');

    self.i18nJson(__dirname+'/i18n/strings_'+lang_code+'.json',
        __dirname+'/i18n/strings_en.json',
        __dirname + '/mainmenu.json')
        .then(function(menuItemsJson)
        {
            if (fs.existsSync('/myvolumio/')) {
                var menuItems = [{"id": "my-volumio"}];
                menuItems = menuItems.concat(menuItemsJson.menuItems);
            } else {
                var menuItems = menuItemsJson['menuItems'];
            }
            defer.resolve(menuItems);
        });
    return defer.promise
}

CoreCommandRouter.prototype.usbAudioAttach = function () {
    var self=this;
    var defer = libQ.defer();

    if (typeof self.platformspecific.usbAudioAttach === "function") {
        self.platformspecific.usbAudioAttach();
    } else {
        defer.resolve();
	}
    return defer.promise
}

CoreCommandRouter.prototype.usbAudioDetach = function () {
    var self=this;
    var defer = libQ.defer();

    if (typeof self.platformspecific.usbAudioDetach === "function") {
        self.platformspecific.usbAudioDetach();
    } else {
        defer.resolve();
    }
    return defer.promise
}

CoreCommandRouter.prototype.getMyMusicPlugins = function () {
    var self=this;

    return  this.pluginManager.getMyMusicPlugins();
}

CoreCommandRouter.prototype.enableDisableMyMusicPlugin = function (data) {
    var self=this;

    return  this.pluginManager.enableDisableMyMusicPlugin(data);
}

CoreCommandRouter.prototype.addPluginRestEndpoint = function (data) {
    var self=this;
    var updated = false;

    if (data.endpoint && data.type && data.name && data.method) {
        if (self.pluginsRestEndpoints.length) {
            for (var i in self.pluginsRestEndpoints) {
                var endpoint = self.pluginsRestEndpoints[i];
                if (endpoint.endpoint === data.endpoint) {
                    updated = true;
                    endpoint = data;
                    return self.logger.info('Updating ' + data.endpoint + ' REST Endpoint for plugin: ' + data.type + '/' + data.name);
                }
            }
            if (!updated) {
                self.logger.info('Adding ' + data.endpoint + ' REST Endpoint for plugin: ' + data.type + '/' + data.name);
                self.pluginsRestEndpoints.push(data);
            }
        } else {
            self.logger.info('Adding ' + data.endpoint + ' REST Endpoint for plugin: ' + data.type + '/' + data.name);
            self.pluginsRestEndpoints.push(data);
        }
    } else {
        self.logger.error('Not Adding plugin to REST Endpoints, missing parameters');
    }
}

CoreCommandRouter.prototype.getPluginsRestEndpoints = function () {
    var self=this;

    return self.pluginsRestEndpoints
}

CoreCommandRouter.prototype.getPluginEnabled = function (category, pluginName) {
    var self=this;

    return this.pluginManager.isEnabled(category, pluginName);
}

CoreCommandRouter.prototype.getSystemVersion = function () {
    var self=this;

    return this.executeOnPlugin('system_controller', 'system', 'getSystemVersion', '');
}

CoreCommandRouter.prototype.getAdvancedSettingsStatus = function () {
    var self=this;

    return this.executeOnPlugin('system_controller', 'system', 'getAdvancedSettingsStatus', '');
}

CoreCommandRouter.prototype.getExperienceAdvancedSettings = function () {
    var self=this;

    return this.executeOnPlugin('system_controller', 'system', 'getExperienceAdvancedSettings', '');
}

CoreCommandRouter.prototype.broadcastUiSettings = function () {
    var self=this;
    var returnedData = self.executeOnPlugin('miscellanea', 'appearance', 'getUiSettings', '');

    if (returnedData != undefined) {
        returnedData.then(function (data) {
            self.broadcastMessage('pushUiSettings', data);
        });
    }
}

// ============================  AUDIO OUTPUTS =================================


CoreCommandRouter.prototype.addAudioOutput = function (data) {
	var self = this;

	var audioOutputPlugin = this.pluginManager.getPlugin('audio_interface', 'outputs');
	if (audioOutputPlugin != undefined && typeof audioOutputPlugin.addAudioOutput === "function") {
		return audioOutputPlugin.addAudioOutput(data);
	} else {
		this.logger.error('WARNING: No Audio Output plugin found');
	}

};

CoreCommandRouter.prototype.updateAudioOutput = function (data) {
	var self = this;

	var audioOutputPlugin = this.pluginManager.getPlugin('audio_interface', 'outputs');
	if (audioOutputPlugin != undefined && typeof audioOutputPlugin.updateAudioOutput === "function") {
		return audioOutputPlugin.updateAudioOutput(data);
	} else {
		this.logger.error('WARNING: No Audio Output plugin found');
	}
};

CoreCommandRouter.prototype.removeAudioOutput = function (id) {
	var self = this;

	var audioOutputPlugin = this.pluginManager.getPlugin('audio_interface', 'outputs');
	if (audioOutputPlugin != undefined && typeof audioOutputPlugin.removeAudioOutput === "function") {
		return audioOutputPlugin.removeAudioOutput(id);
	} else {
		this.logger.error('WARNING: No Audio Output plugin found');
	}
};

CoreCommandRouter.prototype.getAudioOutputs = function () {
	var self = this;

	var audioOutputPlugin = this.pluginManager.getPlugin('audio_interface', 'outputs');
	if (audioOutputPlugin != undefined && typeof audioOutputPlugin.getAudioOutputs === "function") {
		return audioOutputPlugin.getAudioOutputs();
	} else {
		this.logger.error('WARNING: No Audio Output plugin found');
	}
};

CoreCommandRouter.prototype.enableAudioOutput = function (data) {
	var self = this;

	var audioOutputPlugin = this.pluginManager.getPlugin('audio_interface', 'outputs');
	if (audioOutputPlugin != undefined && typeof audioOutputPlugin.enableAudioOutput === "function") {
		return audioOutputPlugin.enableAudioOutput(data);
	} else {
		this.logger.error('WARNING: No Audio Output plugin found');
	}
};

CoreCommandRouter.prototype.disableAudioOutput = function (id) {
	var self = this;

	var audioOutputPlugin = this.pluginManager.getPlugin('audio_interface', 'outputs');
	if (audioOutputPlugin != undefined && typeof audioOutputPlugin.disableAudioOutput === "function") {
		return audioOutputPlugin.disableAudioOutput(id);
	} else {
		this.logger.error('WARNING: No Audio Output plugin found');
	}
};

CoreCommandRouter.prototype.setAudioOutputVolume = function (data) {
	var self = this;

	var audioOutputPlugin = this.pluginManager.getPlugin('audio_interface', 'outputs');
	if (audioOutputPlugin != undefined && typeof audioOutputPlugin.setAudioOutputVolume === "function") {
		return audioOutputPlugin.setAudioOutputVolume(data);
	} else {
		this.logger.error('WARNING: No Audio Output plugin found');
	}
};

CoreCommandRouter.prototype.getHwuuid = function () {
    var self = this;

    return self.executeOnPlugin('system_controller', 'system', 'getHwuuid', '');
};