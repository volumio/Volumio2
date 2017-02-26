'use strict';

var libQ = require('kew');
var libxmljs = require("libxmljs");
var unirest = require('unirest');
var pidof = require('pidof');
var cachemanager=require('cache-manager');
var memoryCache = cachemanager.caching({store: 'memory', max: 100, ttl: 10*60/*seconds*/});
var libMpd = require('mpd');
var nodetools=require('nodetools');
var mm = require('musicmetadata');

// Define the ControllerUPNPBrowser class
module.exports = ControllerUPNPBrowser;
function ControllerUPNPBrowser(context) {
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;
}



ControllerUPNPBrowser.prototype.getConfigurationFiles = function()
{
	return ['config.json'];
}

ControllerUPNPBrowser.prototype.addToBrowseSources = function () {
	var data = {name: 'UPNP', uri: 'upnp',plugin_type:'music_service',plugin_name:'upnp_browser'};
	this.commandRouter.volumioAddToBrowseSources(data);
};


ControllerUPNPBrowser.prototype.onStart = function() {
	this.addToBrowseSources();

	this.mpdPlugin=this.commandRouter.pluginManager.getPlugin('music_service', 'mpd');
	this.startDjmount();
	return libQ.resolve();
};

ControllerUPNPBrowser.prototype.startDjmount = function() {
	var self = this;

	exec('/usr/bin/sudo /bin/systemctl start djmount.service', {uid:1000, gid:1000},
		function (error, stdout, stderr) {
			if (error){
				self.logger.error('Cannot Start Djmount: ' + error);
			} else {
				self.logger.info('DJMOUNT Started')
			}
		});

	return libQ.resolve();
};

ControllerUPNPBrowser.prototype.handleBrowseUri=function(curUri)
{
	var self=this;

	var response;


		if (curUri == 'upnp' || curUri == 'upnp/mnt/UPNP')
			response = self.listRoot(curUri);
		else {
			var uri = curUri.replace('upnp/', '');
			response = self.listUPNP(uri);
		}


	return response;
}


ControllerUPNPBrowser.prototype.listRoot=function()
{  var self = this;
	var listitems = [];
	var defer = libQ.defer();

	fs.readFile('/mnt/UPNP/devices','utf8', (err, data) => {
		if (err) {
			self.logger.error('Cannot Browse UPNP top level');
		} else {

		var devices = data.split(/\n/);
		for (var i in devices) {

			if (devices[i].length > 0) {
				var item = {
					service: 'upnp_browser',
					type: 'category',
					title: devices[i],
					artist: '',
					album: '',
					icon: 'fa fa-circle-o',
					uri: 'upnp/mnt/UPNP/'+devices[i]
					};
		listitems.push(item);
				}
			}
		}

	defer.resolve(
		{
			"navigation": {
				"lists": [
					{
						"availableListViews": [
							"list"
						],
						"items": listitems
					}
				],
				"prev": {
					"uri": "/"
				}
			}
		});
});
	return defer.promise;
}

ControllerUPNPBrowser.prototype.listUPNP = function (data) {
	var self = this;

	var defer = libQ.defer();
	var prevuri = 'upnp/'+data.substring(0, data.lastIndexOf("/"));
	var promises = [];
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
			],
			"prev": {
				"uri": prevuri
			}
		}
	};

	var browser = self.browseUPNPuri(data);

	browser.then(function(browsedata)
	{
		var items = self.getContent(browsedata);

		items.then(function(itemsarray)
		{
			response.navigation.lists[0].items = itemsarray;
			defer.resolve(response)
		});

	});


	return defer.promise;
};

ControllerUPNPBrowser.prototype.browseUPNPuri = function (curUri) {
	var self = this;
	var defer = libQ.defer();
	//console.log('AAAAAAAAAAAAAA'+curUri)
	var level = curUri;
	//console.log('LEVEL'+level)

	fs.readdir(level, function (err, files) {
		if (err) {
			throw err;
		}
		var data = [];
		files
			.forEach(function (file) {
				if (file[0] !== '.' && file[0] !== '_') {
				try {
					//console.log("processingile);
					var isDirectory = fs.statSync(level+'/'+file).isDirectory();
					if (isDirectory) {
						data.push({ Name : file, IsDirectory: true, Path : level+'/'+file  });
					} else {

						data.push({ Name : file, IsDirectory: false, Path : level+'/'+file });
					}

				} catch(e) {
					console.log(e);
				}
				}

			});

		//console.log(data);
		defer.resolve(data);
	});

	return defer.promise;
};




// Define a method to clear, add, and play an array of tracks
ControllerUPNPBrowser.prototype.clearAddPlayTrack = function(track) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerUPNPBrowser::clearAddPlayTrack');

	return self.mpdPlugin.sendMpdCommand('stop',[])
		.then(function()
		{
			return self.mpdPlugin.sendMpdCommand('clear',[]);
		})
		.then(function()
		{
			return self.mpdPlugin.sendMpdCommand('add "file:///'+track.uri+'"',[]);
		})
		.then(function()
		{
			self.commandRouter.stateMachine.setConsumeUpdateService('mpd');
			return self.mpdPlugin.sendMpdCommand('play',[]);
		});
};

// Spop stop
ControllerUPNPBrowser.prototype.stop = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerUPNPBrowser::stop');

	return self.mpdPlugin.sendMpdCommand('stop',[]);
};

// Spop pause
ControllerUPNPBrowser.prototype.pause = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerUPNPBrowser::pause');

	// TODO don't send 'toggle' if already paused
	return self.mpdPlugin.sendMpdCommand('pause',[]);
};

// Spop resume
ControllerUPNPBrowser.prototype.resume = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerUPNPBrowser::resume');

	// TODO don't send 'toggle' if already playing
	return self.mpdPlugin.sendMpdCommand('play',[]);
};

ControllerUPNPBrowser.prototype.seek = function(position) {
	var self=this;
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerUPNPBrowser::seek');

	return self.mpdPlugin.seek(position);
};

ControllerUPNPBrowser.prototype.explodeUri = function(uri) {
	var self = this;

	var defer=libQ.defer();

	var metas = self.parseTrack(uri);
	defer.resolve(metas);

	return defer.promise;
};





ControllerUPNPBrowser.prototype.search = function (query) {
	var self = this;

	var defer = libQ.defer();
	var list = {
		"title": 'UPNP',
		"icon": "fa icon",
		"availableListViews": [
			"list"
		],
		"items": [

		]
	};
	defer.resolve(list)

	return defer.promise;
};

ControllerUPNPBrowser.prototype.parseTrack = function (uri) {
	var self = this;

	var defer = libQ.defer();
	var readableStream = fs.createReadStream(uri);
	var parser = mm(readableStream, function (err, metadata) {
		if (err) {
			console.log(error);
		}

		var item = {
			service : 'upnp_browser',
			type: 'song',
			title: metadata.title,
			name: metadata.title,
			artist: metadata.artist[0],
			album: metadata.album,
			albumart: self.getAlbumArt({artist:  metadata.artist[0], album: metadata.album}, '/'+uri.substring(0, uri.lastIndexOf("/")).replace('/mnt','')),
			uri: uri
		};
		defer.resolve(item)
		readableStream.close();
	});


	return defer.promise;
};

ControllerUPNPBrowser.prototype.getContent = function (content) {
	var self = this;
	var promises = [];
	var defer = libQ.defer();

	for (var i = 0; i < content.length; i++) {

		if (content[i].IsDirectory) {
			var item = {
				service : 'upnp_browser',
				type: 'streaming-category',
				title: content[i].Name,
				icon: 'fa fa-folder-open-o',
				uri: 'upnp/'+content[i].Path
			};

			promises.push(item);
		} else {
			var upnppath = content[i].Path;
			var metas = self.parseTrack(upnppath);
			promises.push(metas);
		}

	}
	libQ.all(promises)
		.then(function (result) {

			defer.resolve(result)
		})
		.fail(function (err) {
			console.log('Cannot get content '+err);
			defer.reject(new Error());
		});

	return defer.promise
};

ControllerUPNPBrowser.prototype.getAlbumArt = function (data, path,icon) {

	if(this.albumArtPlugin==undefined)
	{
		//initialization, skipped from second call
		this.albumArtPlugin=  this.commandRouter.pluginManager.getPlugin('miscellanea', 'albumart');
	}

	if(this.albumArtPlugin)
		return this.albumArtPlugin.getAlbumArt(data,path,icon);
	else
	{
		return "/albumart";
	}
};
