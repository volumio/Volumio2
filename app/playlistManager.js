'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var S = require('string');

module.exports = PlaylistManager;

function PlaylistManager(commandRouter) {
	var self = this;

	self.commandRouter = commandRouter;

	self.playlistFolder = '/data/playlist/';
	self.favouritesPlaylistFolder = '/data/favourites/';

	fs.ensureDirSync(self.playlistFolder);
	fs.ensureDirSync(self.favouritesPlaylistFolder);

	self.logger = self.commandRouter.logger;
}

PlaylistManager.prototype.createPlaylist = function (name) {
	var self = this;

	var defer = libQ.defer();

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Creating playlist ' + name);

	var playlist = [];
	var filePath = self.playlistFolder + name;

	fs.exists(filePath, function (exists) {
		if (exists)
			defer.resolve({success: false, reason: 'Playlist already exists'});
		else {
			fs.writeJson(filePath, playlist, function (err) {
				if (err)
					defer.resolve({success: false});
				else defer.resolve({success: true});
			});
		}

	});

	return self.listPlaylist();
};

PlaylistManager.prototype.deletePlaylist = function (name) {
	var self = this;

	var defer = libQ.defer();

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Deleting playlist ' + name);

	var playlist = [];
	var filePath = self.playlistFolder + name;

	fs.exists(filePath, function (exists) {
		if (!exists)
			defer.resolve({success: false, reason: 'Playlist does not exist'});
		else {
			fs.unlink(filePath, function (err) {
				if (err)
					defer.resolve({success: false});
				else defer.resolve({success: true});
			});
		}

	});

	return defer.promise;
};

PlaylistManager.prototype.listPlaylist = function () {
	var self = this;

	var defer = libQ.defer();

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Listing playlists');

	var playlists = [];

	var folderContents = fs.readdirSync(self.playlistFolder);
	for (var j in folderContents) {
		var fileName = folderContents[j];
		playlists.push(fileName);
	}

	defer.resolve(playlists);

	return defer.promise;
};

PlaylistManager.prototype.getPlaylistContent = function (name) {
	var self = this;

	return self.commonGetPlaylistContent(self.playlistFolder, name);
};

PlaylistManager.prototype.addToPlaylist = function (name, service, uri) {
	var self = this;

	//self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Adding uri '+uri+' to playlist '+name);
	self.commandRouter.pushToastMessage('success', "Added", uri + ' to playlist ' + name);
	return self.commonAddToPlaylist(self.playlistFolder, name, service, uri);
};

PlaylistManager.prototype.removeFromPlaylist = function (name, service, uri) {
	var self = this;

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Removing uri ' + uri + ' to playlist ' + name);

	return self.commonRemoveFromPlaylist(self.playlistFolder, name, service, uri);
};

PlaylistManager.prototype.playPlaylist = function (name) {
	var self = this;

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Play playlist ' + name);

	return self.commonPlayPlaylist(self.playlistFolder, name);
};

PlaylistManager.prototype.enqueue = function (name) {
	var self = this;

	var defer = libQ.defer();

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Enqueue ' + name);

	var filePath = self.playlistFolder + name;

	fs.exists(filePath, function (exists) {
		if (!exists)
			defer.resolve({success: false, reason: 'Playlist does not exist'});
		else {
			fs.readJson(filePath, function (err, data) {
				if (err)
					defer.resolve({success: false});
				else {
					var promises = [];
					var promise;

					for (var i in data) {
						var fullUri = S(data[i].uri);
						if (fullUri.startsWith('music-library')) {
							var uri = fullUri.chompLeft('music-library/').s;
						} else if (fullUri.startsWith('/')) {
							var uri = fullUri.chompLeft('/').s;
						} else var uri = data[i].uri;
						promise = self.commandRouter.executeOnPlugin('music_service', 'mpd', 'add', uri);
						promises.push(promise);
					}

					libQ.all(promises)
						.then(function (data) {
							defer.resolve({success: true});
						})
						.fail(function (e) {
							defer.resolve({success: false, reason: e});
						});


				}
			});
		}

	});

	return defer.promise;
};

// Favourites
PlaylistManager.prototype.getFavouritesContent = function (name) {
	var self = this;

	return self.commonGetPlaylistContent(self.favouritesPlaylistFolder, 'favourites');
};

PlaylistManager.prototype.addToFavourites = function (service, uri) {
	var self = this;

	self.commandRouter.pushToastMessage('success', "Added", uri + ' to Favourites ');

	if (service === 'dirble') {
		return self.commonAddToPlaylist(self.favouritesPlaylistFolder, 'radio-favourites', service, uri);
	} else {
		return self.commonAddToPlaylist(self.favouritesPlaylistFolder, 'favourites', service, uri);
	}
};

PlaylistManager.prototype.removeFromFavourites = function (name, service, uri) {
	var self = this;

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Removing uri ' + uri + ' from favourites');


};

PlaylistManager.prototype.playFavourites = function () {
	var self = this;

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Playing favourites');

	return self.commonPlayPlaylist(self.favouritesPlaylistFolder, 'favourites');
};

// Radio Favourites

PlaylistManager.prototype.getRadioFavouritesContent = function (name) {
	var self = this;

	return self.commonGetPlaylistContent(self.favouritesPlaylistFolder, 'radio-favourites');
};

PlaylistManager.prototype.addToRadioFavourites = function (service, uri) {
	var self = this;

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Adding uri ' + uri + ' to radio-favourites');

	return self.commonAddToPlaylist(self.favouritesPlaylistFolder, 'radio-favourites', service, uri);
};

PlaylistManager.prototype.removeFromRadioFavourites = function (name, service, uri) {
	var self = this;

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Removing uri ' + uri + ' from radio-favourites');

	return self.commonRemoveFromPlaylist(self.favouritesPlaylistFolder, 'radio-favourites', service, uri);
};

PlaylistManager.prototype.playRadioFavourites = function () {
	var self = this;

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Playing radio-favourites');

	return self.commonPlayPlaylist(self.favouritesPlaylistFolder, 'radio-favourites');
};

// My Web Radio

PlaylistManager.prototype.getMyWebRadioContent = function (name) {
	var self = this;

	return self.commonGetPlaylistContent(self.favouritesPlaylistFolder, 'my-web-radio');
};

PlaylistManager.prototype.addToMyWebRadio = function (service, radio_name, uri) {
	var self = this;

	var defer = libQ.defer();

	var playlist = [];
	var filePath = self.favouritesPlaylistFolder + 'my-web-radio';

	fs.exists(filePath, function (exists) {
		if (!exists) {
			fs.writeJsonSync(filePath, playlist);
		}

		fs.readJson(filePath, function (err, data) {
			if (err)
				defer.resolve({success: false});
			else {
				//searching for item with same name
				var alreadyExists = false;

				for (var i in data) {
					if (data[i].name == radio_name) {
						alreadyExists = true;
						data[i].uri = uri;
					}
				}

				if (alreadyExists == false) {
					data.push({service: service, name: radio_name, uri: uri});
				}

				fs.writeJson(filePath, data, function (err) {
					if (err)
						defer.resolve({success: false});
					else defer.resolve({success: true});
				})
			}
		});
	});

	return defer.promise;
};

PlaylistManager.prototype.removeFromMyWebRadio = function (name, service, uri) {
	var self = this;

	var defer = libQ.defer();

	var playlist = [];
	var filePath = self.favouritesPlaylistFolder + 'my-web-radio';

	fs.exists(filePath, function (exists) {
		if (!exists) {
			fs.writeJsonSync(filePath, playlist);
		}

		fs.readJson(filePath, function (err, data) {
			if (err)
				defer.resolve({success: false});
			else {
				//searching for item with same name
				for (var i in data) {
					if (data[i].name == name) {
						data.splice(i, 1);
					}
				}

				fs.writeJson(filePath, data, function (err) {
					if (err)
						defer.resolve({success: false});
					else defer.resolve({success: true});
				})
			}
		});
	});

	return defer.promise;
};

PlaylistManager.prototype.playMyWebRadio = function () {
	var self = this;

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Playing my-web-radio');

	return self.commonPlayPlaylist(self.favouritesPlaylistFolder, 'my-web-radio');
};

//  COMMON methods
PlaylistManager.prototype.commonAddToPlaylist = function (folder, name, service, uri) {
	var self = this;

	var defer = libQ.defer();

	var playlist = [];
	var filePath = folder + name;
	var path = uri;


	if (uri.indexOf('music-library/') >= 0) {
		path = uri.replace('music-library/', '');
	}

	fs.exists(filePath, function (exists) {
		if (!exists) {
			fs.writeJsonSync(filePath, playlist);
		}
		if (service === 'mpd') {

			var prms = self.commandRouter.executeOnPlugin('music_service', 'mpd', 'lsInfo', uri);
			prms.then(function (info) {
				//
				// Collate new entries
				//
				var list = info.navigation.list;
				var nItems = list.length;

				var entries = [];
				for (var i = 0; i < nItems; i++) {
					var item = list[i];

					if (item.type == 'song') {
						var artUrl = self.commandRouter.executeOnPlugin('music_service', 'mpd', 'getAlbumArt', {
							artist: item.artist,
							album: item.album,
							path: path
						});
						var itemUri = item.uri.startsWith('music-library/') ? item.uri.slice(14) : item.uri;
						entries.push({
							service: service,
							uri: itemUri,
							title: item.title,
							artist: item.artist,
							album: item.album,
							albumart: artUrl
						});
					} else if (item.type == 'folder') {
						// TODO: Deal with folders
					}
				}

				fs.readJson(filePath, function (err, data) {
					if (err)
						defer.resolve({success: false});
					else {
						var output = data.concat(entries);
						fs.writeJson(filePath, output, function (err) {
							if (err)
								defer.resolve({success: false});
							else
								var favourites = self.commandRouter.checkFavourites({uri: path});
							defer.resolve(favourites);
						})
					}
				});

			});
		} else if (service === 'dirble') {
			fs.readJson(filePath, function (err, data) {
				if (err)
					defer.resolve({success: false});
				else {
					data.push({
						service: service, uri: uri, title: uri,
						icon: 'fa-microphone'
					});

					fs.writeJson(filePath, data, function (err) {
						if (err)
							defer.resolve({success: false});
						else
							var favourites = self.commandRouter.checkFavourites({uri: uri});
						defer.resolve(favourites);
					})
				}
			});
		}
	});

	return defer.promise;
};


PlaylistManager.prototype.commonRemoveFromPlaylist = function (folder, name, service, uri) {
	var self = this;

	var defer = libQ.defer();

	var playlist = [];
	var filePath = folder + name;

	fs.exists(filePath, function (exists) {
		if (!exists)
			defer.resolve({success: false, reason: 'Playlist does not exist'});
		else {
			fs.readJson(filePath, function (err, data) {
				if (err)
					defer.resolve({success: false});
				else {
					var newData = [];

					for (var i = 0; i < data.length; i++) {
						if (!(data[i].service == service &&
							data[i].uri == uri)) {
							newData.push(data[i]);
						}

					}

					fs.writeJson(filePath, newData, function (err) {
						if (err) {
							self.commandRouter.pushToastMessage('error', "Cannot Remove", uri);
							defer.resolve(name);
						}
						else {
							self.commandRouter.pushToastMessage('success', "Removed", uri);
							defer.resolve(name);
						}
					})
				}
			});
		}

	});

	return defer.promise;
};

PlaylistManager.prototype.commonPlayPlaylist = function (folder, name) {
	var self = this;

	var defer = libQ.defer();

	var filePath = folder + name;

	fs.exists(filePath, function (exists) {
		if (!exists)
			defer.resolve({success: false, reason: 'Playlist does not exist'});
		else {
			fs.readJson(filePath, function (err, data) {
				if (err)
					defer.resolve({success: false});
				else {
					self.commandRouter.volumioClearQueue();

					var uris = [];
					for (var i in data) {
						var uri;
						var fullUri = S(data[i].uri);

						if (fullUri.startsWith('music-library')) {
							uri = fullUri.chompLeft('music-library/').s;
						} else if (fullUri.startsWith('/')) {
							uri = fullUri.chompLeft('/').s;
						} else uri = data[i].uri;
						uris.push(uri);
					}

					self.commandRouter.executeOnPlugin('music_service', 'mpd', 'clearAddPlayTracks', uris);

				}
			});
		}

	});

	return defer.promise;
};

PlaylistManager.prototype.commonGetPlaylistContent = function (folder, name) {
	var defer = libQ.defer();

	var filePath = folder + name;

	fs.exists(filePath, function (exists) {
		if (!exists)
			defer.resolve([]);
		else {
			fs.readJson(filePath, function (err, data) {
				if (err)
					defer.reject(new Error("Error reading playlist"));
				else {
					defer.resolve(data);
				}
			});
		}

	});

	return defer.promise;
};

/**
 *  This section contains all methods to handle favourites songs inside Volumio
 */
PlaylistManager.prototype.listFavourites = function (uri) {
	var self = this;

	var defer = libQ.defer();

	var promise = self.getFavouritesContent();
	promise.then(function (data) {
			var response = {
				navigation: {
					prev: {
						uri: ''
					},
					list: []
				}
			};

			for (var i in data) {
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

			defer.resolve(response);

		})
		.fail(function () {
			defer.reject(new Error("Cannot list Favourites"));
		});

	return defer.promise;
};