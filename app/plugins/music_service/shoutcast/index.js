'use strict';

var libQ = require('kew');
var unirest = require('unirest');
var S = require('string');
var http = require('http');
var url = require('url');

module.exports = ControllerShoutcast;
function ControllerShoutcast(context) {
	var self = this;

	self.context = context;

	self.config = new (require('v-conf'))();

	self.commandRouter = self.context.coreCommand;
}

/*
 * This method can be defined by every plugin which needs to be informed of the startup of Volumio.
 * The Core controller checks if the method is defined and executes it on startup if it exists.
 */
ControllerShoutcast.prototype.onVolumioStart = function () {
	var self = this;

	var configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');
	self.config.loadFile(configFile);

    self.addToBrowseSources();

    return libQ.resolve();

};

ControllerShoutcast.prototype.getConfigurationFiles = function () {
	var self = this;

	return ['config.json'];
};

//Registering into Browse Sources
ControllerShoutcast.prototype.addToBrowseSources = function () {
	var self = this;
	var data = {name: 'WebRadio', uri: 'radio',plugin_type:'music_service',plugin_name:'shoutcast'};

	self.commandRouter.volumioAddToBrowseSources(data);
};

ControllerShoutcast.prototype.onStop = function () {
	//Perform startup tasks here
};

ControllerShoutcast.prototype.onRestart = function () {
	//Perform startup tasks here
};

ControllerShoutcast.prototype.onInstall = function () {
	//Perform your installation tasks here
};

ControllerShoutcast.prototype.onUninstall = function () {
	//Perform your installation tasks here
};

ControllerShoutcast.prototype.getUIConfig = function () {
	return {success: true, plugin: "dirble"};
};

ControllerShoutcast.prototype.setUIConfig = function (data) {
	//Perform your installation tasks here
};

ControllerShoutcast.prototype.getConf = function (varName) {
	//Perform your installation tasks here
};

ControllerShoutcast.prototype.setConf = function (varName, varValue) {
	//Perform your installation tasks here
};


//Optional functions exposed for making development easier and more clear
ControllerShoutcast.prototype.getSystemConf = function (pluginName, varName) {
	//Perform your installation tasks here
};

ControllerShoutcast.prototype.setSystemConf = function (pluginName, varName) {
	//Perform your installation tasks here
};

ControllerShoutcast.prototype.getAdditionalConf = function () {
	//Perform your installation tasks here
};

ControllerShoutcast.prototype.setAdditionalConf = function () {
	//Perform your installation tasks here
};

// Load the tracklist from database on disk
ControllerShoutcast.prototype.loadTracklistFromDB = function () {
	return libQ.resolve();
};

// Rebuild a library of user's playlisted Dirble tracks
ControllerShoutcast.prototype.rebuildTracklist = function () {
	return libQ.resolve();
};

// Define a method to clear, add, and play an array of tracks
ControllerShoutcast.prototype.clearAddPlayTrack = function (track) {
   
};

// Dirble stop
ControllerShoutcast.prototype.stop = function () {
	return libQ.resolve();
};

// Dirble pause
ControllerShoutcast.prototype.pause = function () {
	return libQ.resolve();
};

// Dirble resume
ControllerShoutcast.prototype.resume = function () {
	return libQ.resolve();
};

// Dirble music library
ControllerShoutcast.prototype.getTracklist = function () {
	return libQ.resolve([]);
};

ControllerShoutcast.prototype.listRadioCategories = function () {
	var self = this;

	var defer = libQ.defer();

    defer.resolve();
    

	return defer.promise;
};

ControllerShoutcast.prototype.listRadioForCategory = function (uri) {
	var self = this;

    defer.resolve();

	return defer.promise;
};


ControllerShoutcast.prototype.listFirstLevelRadioSections = function (callback) {
	var self = this;

	var defer = libQ.defer();

    defer.resolve();
	return defer.promise;
};


ControllerShoutcast.prototype.getPrimariesCategories = function (callback) {
	var self = this;

	var Request = unirest.get(self.config.get('url_categories_primary'));
	Request.query({
		token: self.config.get('api_token')
	}).end(function (response) {
		callback(null, response.body);
	});

};

ControllerShoutcast.prototype.getRadioForCategory = function (id, per_page, page, callback) {
	var self = this;

	var Request = unirest.get(self.config.get('url_category_stations') + id + '/stations');
	Request.query({
		token: self.config.get('api_token'),
		all:1
	}).query({
		page: page,
		per_page: per_page
	}).end(function (response) {
		callback(null, response.body);
	});

};


ControllerShoutcast.prototype.listRadioCountries = function () {
	var self = this;

	var defer = libQ.defer();

	var response = {
		navigation: {
			prev: {
				uri: 'radio'
			},
			list: []
		}
	};

	var dirbleDefer = libQ.defer();
	self.getCountries(dirbleDefer.makeNodeResolver());
	dirbleDefer.promise.then(function (data) {
		//we sort datas alphabetically by name of country
		data.sort(
			function (a, b) {
				if (a.name < b.name)
					return -1;
				if (a.name > b.name)
					return 1;
				return 0;
			}
		);
		for (var i in data) {
			var category = {
				type: 'radio-category',
				title: data[i].name,
				icon: 'fa fa-globe',
				uri: 'radio/byCountry/' + data[i].country_code
			};

			response.navigation.list.push(category);
		}

		defer.resolve(response);
	});


	return defer.promise;
};

ControllerShoutcast.prototype.getCountries = function (callback) {
	var self = this;

	var Request = unirest.get(self.config.get('url_countries'));
	Request.query({
		token: self.config.get('api_token')
	}).end(function (response) {
		callback(null, response.body);
	});

};

ControllerShoutcast.prototype.listRadioForCountry = function (uri) {
	var self = this;

	var defer = libQ.defer();

	var response = {
		navigation: {
			prev: {
				uri: 'radio/byCountry'
			},
			list: []
		}
	};

	var id = uri.split('/')[2];


	var paginationPromises = [];

	for (var i = 0; i < 1; i++) {
		var dirbleDefer = libQ.defer();
		self.getStationsForCountry(id, 30, i, dirbleDefer.makeNodeResolver());

		paginationPromises.push(dirbleDefer);
	}

	libQ.all(paginationPromises)
		.then(function (results) {
			//console.log(results);

			for (var j in results) {
				var pageData = results[j];
				//we sort datas alphabetically by name of station
				pageData.sort(
					function (a, b) {
						if (a.name < b.name)
							return -1;
						if (a.name > b.name)
							return 1;
						return 0;
					}
				);

				for (var k in pageData) {
					if (pageData[k].streams.length > 0) {
						var category = {
							service: 'dirble',
							type: 'webradio',
							title: pageData[k].name,
							id: pageData[k].id,
							artist: '',
							album: '',
							icon: 'fa fa-microphone',
							uri: pageData[k].streams[0].stream
						};
						response.navigation.list.push(category);
					}
				}
			}

			defer.resolve(response);
		});

	return defer.promise;
};

ControllerShoutcast.prototype.getStationsForCountry = function (id, per_page, page, callback) {
	var self = this;

	var Request = unirest.get('http://api.dirble.com/v2/countries/' + id + '/stations');
	Request.query({
		token: self.config.get('api_token'),
		page: page,
		per_page: per_page
	}).end(function (response) {
		callback(null, response.body);
	});

};

ControllerShoutcast.prototype.listRadioFavourites = function (uri) {
	var self = this;

	var defer = libQ.defer();

	var promise = self.commandRouter.playListManager.getRadioFavouritesContent();
	promise.then(function (data) {
			//console.log(data);
			var response = {
				navigation: {
					prev: {
						uri: 'radio'
					},
					list: []
				}
			};

			for (var i in data) {
				var ithdata = data[i];
				var song = {
					service: ithdata.service,
					type: 'webradio',
					title: ithdata.title,
					//artist: ithdata.artist,
					//album: ithdata.album,
					icon: 'fa fa-microphone',
					uri: ithdata.uri
				};

				response.navigation.list.push(song);
			}

			defer.resolve(response);

		})
		.fail(function () {
			defer.reject(new Error("Cannot list Favourites"));
		});

	return defer.promise;
};


ControllerShoutcast.prototype.listMyWebRadio = function (uri) {
	var self = this;

	var defer = libQ.defer();

	var promise = self.commandRouter.playListManager.getMyWebRadioContent()
	promise.then(function (data) {
			//console.log(data);
			var response = {
				navigation: {
					prev: {
						uri: 'radio'
					},
					list: []
				}
			};

			for (var i in data) {
				var ithdata = data[i];
				var song = {
					service: ithdata.service,
					type: 'mywebradio',
					title: ithdata.name,
					uri: ithdata.uri,
					icon: '/albumart'
				};

				response.navigation.list.push(song);
			}

			defer.resolve(response);

		})
		.fail(function () {
			defer.reject(new Error("Cannot list Favourites"));
		});

	return defer.promise;
};

/*
 Let the user add a web radio. The given name is a key to the array
 */
ControllerShoutcast.prototype.addMyWebRadio = function (data) {
	var self = this;

	var defer = libQ.defer();
	var name = data.name;
	var uri = S(data.uri);

	var checkDefer = libQ.defer();
	var parsed = url.parse(uri.s);

	var options = {
		hostname: parsed.hostname,
		port: parsed.port,
		path: parsed.path,
		method: 'GET'
	};

	var req = http.request(options, function (res) {

		res.on('data', function (chunk) {
			var splitted = chunk.toString('utf-8').split('\n');
			var hasFound = false;
			var isPls = false;
			var isM3u = false;

			for (var i in splitted) {
				var string = S(splitted[i]);

				if (isPls == false && isM3u == false) {
					if (string.startsWith('[playlist]')) {
						isPls = true;
					}
					else if (string.startsWith('#EXTM3U')) {
						isM3u = true;
					}
				}
				else {
					if (string.startsWith('File1')) {
						checkDefer.resolve(string.trim().chompLeft('File1=').s);
						hasFound = true;
						break;
					}
					else if (string.startsWith('http://')) {
						checkDefer.resolve(string.s);
						hasFound = true;
						break;
					}
				}

			}

			if (hasFound == false)
				checkDefer.reject(new Error('Valid information has not been found in pls file'));

			req.abort();
		});


	});

	req.on('error', function () {
		//console.log("Cannot connect to url");
		defer.reject(new Error('Cannot connect to url'));
	});

	req.end();

	checkDefer.then(function (plsuri) {
		self.commandRouter.playListManager.addToMyWebRadio('dirble', name, plsuri);
		defer.resolve({});
	}).fail(function () {
		self.commandRouter.playListManager.addToMyWebRadio('dirble', name, uri.s);
		defer.resolve({});
	});

	return defer.promise;
};

ControllerShoutcast.prototype.removeMyWebRadio = function (data) {
	var self = this;

	var defer = libQ.defer();
	var name = data.name;

	self.commandRouter.playListManager.removeFromMyWebRadio(name);
	defer.resolve({});
	return defer.promise;
};

ControllerShoutcast.prototype.handleBrowseUri=function(curUri)
{
    var self=this;

    var response;
    if (curUri.startsWith('radio')) {
        if (curUri == 'radio')
            response = self.listFirstLevelRadioSections(curUri);
        else {
            if (curUri.startsWith('radio/myWebRadio')) {
                response = self.listMyWebRadio(curUri);
            }
            else if (curUri.startsWith('radio/favourites'))
                response = self.listRadioFavourites(curUri);
            else if (curUri.startsWith('radio/byGenre')) {
                if (curUri == 'radio/byGenre')
                    response = self.listRadioCategories(curUri);
                else
                    response = self.listRadioForCategory(curUri);

            }
            else if (curUri.startsWith('radio/byCountry')) {
                if (curUri == 'radio/byCountry')
                    response = self.listRadioCountries(curUri);
                else
                    response = self.listRadioForCountry(curUri);

            }
        }
    }

    return response;
}
