////
'use strict';

var libQ = require('kew');
var libxmljs = require("libxmljs");
var unirest = require('unirest');
var cachemanager=require('cache-manager');
var memoryCache = cachemanager.caching({store: 'memory', max: 100, ttl: 10*60/*seconds*/});
var nodetools=require('nodetools');
var mm = require('musicmetadata');
var Client = require('node-ssdp').Client;
var xml2js = require('xml2js');
var http = require('http');
var browseDLNAServer = require(__dirname + "/dlna-browser.js");
var singleBrowse = false;


try {
    var client = new Client();
} catch (e) {
	console.log('SSDP Client error: '+e)
}

// Define the ControllerUPNPBrowser class
module.exports = ControllerUPNPBrowser;
function ControllerUPNPBrowser(context) {
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;
	this.DLNAServers = [];
}



ControllerUPNPBrowser.prototype.getConfigurationFiles = function()
{
	return ['config.json'];
}

ControllerUPNPBrowser.prototype.addToBrowseSources = function () {

	var data = {name: 'Media Servers', uri: 'upnp', plugin_type:'music_service', plugin_name:'upnp_browser', "albumart": "/albumart?sourceicon=music_service/upnp_browser/dlnaicon.png"};
	this.commandRouter.volumioAddToBrowseSources(data);
};


ControllerUPNPBrowser.prototype.onStart = function() {
	var self = this;


    var singleBrowseConf = self.commandRouter.executeOnPlugin('music_service', 'mpd', 'getConfigParam', 'singleBrowse');
    if (singleBrowseConf == undefined) {
        singleBrowseConf = false;
	}
	singleBrowse = singleBrowseConf;
	if (!singleBrowseConf) {
        this.addToBrowseSources();
	}

	client.on('response', function responseHandler(headers, code, rinfo) {
		var urlraw = headers.LOCATION.replace('http://', '').split('/')[0].split(':');
		var server = {'url': 'http://'+urlraw[0], 'port': urlraw[1], 'endpoint': headers}
		var location = server;
		xmlToJson(headers.LOCATION, function(err, data) {
			try{
        if (err) {
					//TODO: Handle this
          return self.logger.error(err);
        }
        var server = {};
        server.name = data.root.device[0].friendlyName[0];
        server.UDN = data.root.device[0].UDN + "";
        server.icon = "http://" + urlraw[0] + ":" + urlraw[1] + data.root.device[0].iconList[0].icon[0].url;
				server.lastTimeAlive = Date.now();
				server.location = location.url + ":" + location.port;
				var services = data.root.device[0].serviceList[0].service;
				var ContentDirectoryService = false;
				//Finding ContentDirectory Service
				for(var s = 0; s < services.length; s++){
					if(services[s].serviceType[0] == "urn:schemas-upnp-org:service:ContentDirectory:1"){
						ContentDirectoryService = services[s];
						server.location += ContentDirectoryService.controlURL[0];
					}
				}

				var duplicate = false;
				for(var i = 0; i < self.DLNAServers.length; i++){
					if(self.DLNAServers[i].UDN === server.UDN){
						duplicate = true;
						self.DLNAServers[i] = server;
					}
				}
				if(!duplicate){
					self.DLNAServers.push(server);
				}
			}catch(e){
                self.logger.error(e);
			}
  	});
	});
	client.search('urn:schemas-upnp-org:device:MediaServer:1');
	setInterval(() => {
		client.search('urn:schemas-upnp-org:device:MediaServer:1');
	}, 50000);
	this.mpdPlugin=this.commandRouter.pluginManager.getPlugin('music_service', 'mpd');
	//this.startDjmount();
	return libQ.resolve();
};

ControllerUPNPBrowser.prototype.discover = function(){
	var defer = libQ.defer();
	var self = this;
	client.search('urn:schemas-upnp-org:device:MediaServer:1');
	setTimeout(function(){
		defer.resolve(self.DLNAServers);
	}, 2000);
	return defer.promise;
}


ControllerUPNPBrowser.prototype.handleBrowseUri=function(curUri)
{
	var self=this;

	var response;

	if (curUri == 'upnp')
		response = self.listRoot();
	else if(curUri.startsWith("upnp/")){
		var uri = curUri.replace('upnp/', '');
		response = self.listUPNP(uri);
	}

	return response;
}


ControllerUPNPBrowser.prototype.listRoot = function()
{
	var self = this;
	var defer = libQ.defer();


	var obj = {
		"navigation":{
			"lists":[
				{
					"availableListViews": ["grid","list"],
					"items":[

					]
				}
			]
		}
	};

    if (singleBrowse) {
        obj.navigation.prev ={'uri': 'music-library'}
    }
	for(var i = 0; i < this.DLNAServers.length; i++){
		if(Date.now() - this.DLNAServers[i].lastTimeAlive < 60000){
			obj.navigation.lists[0].items.push({
				service: "upnp_browser",
				type: "streaming-category",
				"title": this.DLNAServers[i].name,
				"uri": "upnp/" + this.DLNAServers[i].location  + "@0",//@ separator, 0 for root element,
				"albumart": this.DLNAServers[i].icon
			});
		}else{
			this.DLNAServers.splice(i, 1);
		}
	}
	defer.resolve(obj);


	return defer.promise;
}

ControllerUPNPBrowser.prototype.listUPNP = function (data) {
	var self = this;

	var defer = libQ.defer();
	var address = data.split("@")[0];
	var info = true;
	var curUri = "upnp/" + data;
	var albumart = '';
	var title = '';
	if(address.startsWith("folder/"))
		address = address.replace("folder/", "");
	var id = data.split("@")[1];
	var obj = {
		"navigation":{
			"prev": {
				"uri": "upnp"
			},
			"lists": [
				{
					"availableListViews": ["list"],
					"items": [

					]
				}
			]
		}
	}

	browseDLNAServer(id, address, {}, (err, data) => {
		if(err){
            self.logger.error(err);
			return;
		}
		if(data.container){
			for(var i = 0; i < data.container.length; i++){
				if (data.container[i].title != undefined && data.container[i].title.indexOf('>>') < 0){
                    info = false;
                    var type = 'streaming-category';
                    albumart = '/albumart?icon=folder-o';
                    if (data.container[i].children > 0) {
                        type = 'folder';
                    }
                    albumart = self.getAlbumartClass(data.container[i].class)

                    obj.navigation.lists[0].items.push({
                        "service": "upnp_browser",
                        "type": type,
                        "title": data.container[i].title,
                        "artist": "",
                        "albumart": albumart,
                        "album": "",
                        "uri": "upnp/folder/" + address + "@" + data.container[i].id
                    });
				}
			}
		}
		if(data.item){
			for(var i = 0; i < data.item.length; i++){
				if(data.item[i].class == "object.item.audioItem.musicTrack"){
					var item = data.item[i];
					var albumart = '/albumart?icon=music';
                    if (item.image != undefined && item.image.length >0) {
                        albumart = item.image;
                    }
					var track = {
						"service": "upnp_browser",
						"type": "song",
						"uri": "upnp/" + address + "@" + item.id,
						"title": item.title,
						"artist": item.artist,
						"album": item.album,
						"albumart": albumart
					}
					obj.navigation.lists[0].items.push(track);
				}
			}
		}
		browseDLNAServer(id, address, {browseFlag: "BrowseMetadata"}, (err, data) => {
			if(err){
                self.logger.error(err);
				return;
			}
			if(data && data.container && data.container[0] && data.container[0].parentId && data.container[0].parentId != "-1"){
				obj.navigation.prev.uri = "upnp/" + address + "@" + data.container[0].parentId;
				title = data.container[0].title;
				albumart = self.getAlbumartClass(data.container[0].class)

			}else{
				obj.navigation.prev.uri = "upnp";
			}
			if (info) {
				obj.navigation.info = {
					'uri': curUri,
                    'service': "upnp_browser",
            		'title': title,
					'type': 'song',
            		'albumart': albumart
        		}
    		}
			defer.resolve(obj);
		});
	});

	return defer.promise;
};

ControllerUPNPBrowser.prototype.getAlbumartClass = function (data) {
    var self = this;
    var albumart = '';

    switch(data) {
        case 'object.container.person.musicArtist':
            albumart = '/albumart?icon=users';
            break;
        case 'object.container.album.musicAlbum':
            albumart = '/albumart?icon=dot-circle-o';
            break;
        case 'object.container.genre.musicGenre':
            albumart = '/albumart?sourceicon=music_service/mpd/genreicon.png';
            break;
        case 'object.container.playlistContainer':
            albumart = '/albumart?sourceicon=music_service/mpd/playlisticon.svg';
            break;
        default:
            albumart = '/albumart?icon=folder-o';
    }
    return albumart
};

// ControllerUPNPBrowser.prototype.browseUPNPuri = function (curUri) {
// 	var self = this;
// 	var defer = libQ.defer();
// 	var address = curUri.split("@")[0];
// 	var id = curUri.split("@")[1];
//
// 	browseDLNAServer(id, address, {}, (err, data) => {
// 		var obj = {
// 			"navigation":{
// 				"prev": {
// 					"uri": "dlna:" + address + "@" + id
// 				},
// 				"lists": [
// 					{
// 						"availableListViews": ["list"],
// 						"items": [
//
// 						]
// 					}
// 				]
// 			}
// 		}
// 		data = JSON.parse(data);
// 		for(var i = 0; i < data.container.length; i++){
// 			obj.navigation.lists[0].items.push({
// 				"service": "upnp_browser",
// 				"type": "dlna",
// 				"title": data.container[i].title,
// 				"artist": "",
//         "album": "",
// 				"uri": "dlna:" + address + "@" + data.container[i].id
// 			});
// 		}
// 	});
//
//
//	return defer.promise;
//};




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
        return self.mpdPlugin.sendMpdCommand('load "'+track.uri+'"',[]);
    })
    .fail(function (e) {
        return self.mpdPlugin.sendMpdCommand('add "'+track.uri+'"',[]);
    })
		.then(function()
		{
			self.commandRouter.stateMachine.setConsumeUpdateService('mpd', false, false);
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
	uri = uri.replace("upnp/", "");//Removing upnp/
	var folder = uri.startsWith("folder/");
	if(folder)
		uri = uri.replace("folder/");
	var address = uri.split("@")[0];//Getting server address
	var id = uri.split("@")[1];//Getting item ID
	var browseFlag = folder ? "BrowseDirectChildren" : "BrowseMetadata";
	browseDLNAServer(id, address, {browseFlag: browseFlag}, (err, data) => {
		if(err){
            self.logger.error(err);
			return;
		}
		var result = [];
		if(data){
			if(data.item){
				for(var i = 0; i < data.item.length; i++){
					var item = data.item[i];
					if(item.class == "object.item.audioItem.musicTrack"){
						var albumart = '';
						if (item.image != undefined && item.image.length > 0) {
                            albumart = item.image;
						} else {
                            albumart = self.getAlbumArt({artist:item.artist,album: item.album},'');
						}
						var obj = {
							"service": "upnp_browser",
							"uri": item.source,
							"type": "song",
							"albumart": albumart,
							"artist": item.artist,
							"album": item.album,
							"name": item.title,
							"title": item.title,
							"duration": item.duration,
						};
						result.push(obj);
					}
				}
			}
			defer.resolve(result);
		}
	});

	return defer.promise;
};





ControllerUPNPBrowser.prototype.search = function (query) {
	var self = this;

	var defer = libQ.defer();
	var list = {
		"title": 'Media Servers',
		"icon": "fa icon",
		"availableListViews": [
			"list"
		],
		"items": [

		]
	};
	defer.resolve()

	return defer.promise;
};

ControllerUPNPBrowser.prototype.parseTrack = function (uri) {
	var self = this;

	var defer = libQ.defer();
	var readableStream = fs.createReadStream(uri);
	var parser = mm(readableStream, function (err, metadata) {
		if (err) {
            self.logger.error(error);
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
            self.logger.error('Cannot get content '+err);
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

function xmlToJson(url, callback) {

    var req = http.get(url, function(res) {
        var xml = '';

        res.on('data', function(chunk) {
            xml += chunk;
        });

        res.on('error', function(e) {
            callback(e, null);
        });

        res.on('timeout', function(e) {
            callback(e, null);
        });

        res.on('end', function() {
            var parser = new xml2js.Parser();
            parser.parseString(xml, function(err, result) {
                callback(null, result);
            });
        });
    });
}
