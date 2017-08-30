////
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
var Client = require('node-ssdp').Client;
var client = new Client();
var xml2js = require('xml2js');
var http = require('http');
var browseDLNAServer = require("dlna-browser-utils");

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
	var data = {name: 'DLNA', uri: 'upnp',plugin_type:'music_service',plugin_name:'upnp_browser'};
	this.commandRouter.volumioAddToBrowseSources(data);
};


ControllerUPNPBrowser.prototype.onStart = function() {
	var self = this;
	this.addToBrowseSources();

	client.on('response', function responseHandler(headers, code, rinfo) {
			var urlraw = headers.LOCATION.replace('http://', '').split('/')[0].split(':');
			var server = {'url': 'http://'+urlraw[0], 'port': urlraw[1], 'endpoint': headers}
			var location = server;
			xmlToJson(headers.LOCATION, function(err, data) {
        if (err) {
					//TODO: Handle this
          return console.err(err);
        }
				var server = {};
        server.name = data.root.device[0].friendlyName[0];
        server.UDN = data.root.device[0].UDN + "";
        server.icon = data.root.device[0].iconList[0].icon[0].url;
				server.lastTimeAlive = Date.now();
				server.location = location.url + ":" + location.port;
				var services = data.root.device[0].serviceList[0].service;
				var ContentDirectoryService = false;
				//Finding ContentDirectory Service
				for(var s = 0; s < services.length; s++){
					if(services[s].serviceType[0] === "urn:schemas-upnp-org:service:ContentDirectory:1"){
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
    });
	});
	client.search('urn:schemas-upnp-org:device:MediaServer:1');
	setInterval(() => {
		client.search('urn:schemas-upnp-org:device:MediaServer:1');
	}, 10000);

	this.mpdPlugin=this.commandRouter.pluginManager.getPlugin('music_service', 'mpd');
	//this.startDjmount();
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

	console.log("handleBrowseUri");


		if (curUri == 'upnp')
			response = self.listRoot(curUri);
		else {
			var uri = curUri.replace('upnp/', '');
			response = self.listUPNP(uri);
		}

	return response;
}


ControllerUPNPBrowser.prototype.listRoot = function()
{
	var self = this;
	var listitems = [];
	var defer = libQ.defer();

	client.search('urn:schemas-upnp-org:device:MediaServer:1');
	var obj = {
		"navigation":{
			"lists":[
				{
					"availableListViews": ["list"],
					"items":[

					]
				}
			]
		}
	};
	for(var i = 0; i < this.DLNAServers.length; i++){
		if(Date.now() - this.DLNAServers[i].lastTimeAlive < 15000){
			obj.navigation.lists[0].items.push({
				service: "upnp_browser",
				type: "folder",
				"title": this.DLNAServers[i].name,
				"icon": "fa fa-microphone",
				"uri": "upnp/" + this.DLNAServers[i].location  + "@0"//@ separator, 0 for root element
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

	console.log("listUPNP");

	var defer = libQ.defer();
	var address = data.split("@")[0];
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
			console.log(err);
			return;
		}
		if(data.container){
			for(var i = 0; i < data.container.length; i++){
				obj.navigation.lists[0].items.push({
					"service": "upnp_browser",
					"type": "folder",
					"title": data.container[i].title,
					"artist": "",
					"album": "",
					"uri": "upnp/" + address + "@" + data.container[i].id
				});
			}
		}
		if(data.item){
			for(var i = 0; i < data.item.length; i++){
				if(data.item[i]["upnp:class"] && data.item[i]["upnp:class"][0] === "object.item.audioItem.musicTrack"){
					var item = {
						"service": "mpd",
						"type": "song"
					}
					if(data.item[i]["dc:title"])
						item.title = data.item[i]["dc:title"][0];
					if(data.item[i]["upnp:artist"])
						item.artist = data.item[i]["upnp:artist"][0];
					if(data.item[i]["upnp:album"])
						item.album = data.item[i]["upnp:album"][0];

					obj.navigation.lists[0].items.push(item);
				}
			}
		}
		browseDLNAServer(id, address, {browseFlag: "BrowseMetadata"}, (err, data) => {
			if(err){
				console.log(err);
				return;
			}
			if(data.container[0].parentID){
				obj.navigation.prev.uri = "upnp/" + address + "@" + data.container[0].parentID;
			}
			defer.resolve(obj);
		});
	});

	return defer.promise;
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
