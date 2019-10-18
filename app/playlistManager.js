'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var S = require('string');
var singleBrowse = false;

module.exports = PlaylistManager;

function PlaylistManager(commandRouter) {
	var self = this;

	self.commandRouter = commandRouter;

	self.playlistFolder = '/data/playlist/';
	self.favouritesPlaylistFolder = '/data/favourites/';

	fs.ensureDirSync(self.playlistFolder);
	fs.ensureDirSync(self.favouritesPlaylistFolder);

	self.logger = self.commandRouter.logger;
    singleBrowse = self.commandRouter.executeOnPlugin('music_service', 'mpd', 'getConfigParam', 'singleBrowse');
}

PlaylistManager.prototype.createPlaylist = function (name) {
	var self = this;

	var defer = libQ.defer();

	self.commandRouter.pushConsoleMessage('Creating playlist ' + name);

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

	self.commandRouter.pushConsoleMessage('Deleting playlist ' + name);

	var playlist = [];
	var filePath = self.playlistFolder + name;

	fs.exists(filePath, function (exists) {
		if (!exists)
			defer.resolve({success: false, reason: 'Playlist does not exist'});
		else {
			fs.unlink(filePath, function (err) {
				if (err) {
					defer.resolve({success: false});
				} else {
					var playlists = self.listPlaylist();
					self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('PLAYLIST.REMOVE_SUCCESS'),
						name + ' ' +  self.commandRouter.getI18nString('PLAYLIST.REMOVE_SUCCESS'));
					defer.resolve(playlists);
				}
			});
		}

	});

	return defer.promise;
};

PlaylistManager.prototype.listPlaylist = function () {

	var defer = libQ.defer();

	this.commandRouter.pushConsoleMessage('Listing playlists');

	fs.readdir(this.playlistFolder, function(err,folderContents) {
		defer.resolve(folderContents);
	});

	return defer.promise;
};

PlaylistManager.prototype.retrievePlaylists = function () {
	var self = this;
	var content = [];

	content = fs.readdirSync(this.playlistFolder);

	return content;
}


PlaylistManager.prototype.getPlaylistContent = function (name) {
	var self = this;

	return self.commonGetPlaylistContent(self.playlistFolder, name);
};

PlaylistManager.prototype.addToPlaylist = function (name, service, uri) {
	var self = this;

	//self.commandRouter.pushConsoleMessage('Adding uri '+uri+' to playlist '+name);
	self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('PLAYLIST.ADDED_TITLE'),
        uri +  self.commandRouter.getI18nString('PLAYLIST.ADDED_TO_PLAYLIST') + name);
	return self.commonAddToPlaylist(self.playlistFolder, name, service, uri);
};

PlaylistManager.prototype.addItemsToPlaylist = function (name, data) {
    var self = this;

    //self.commandRouter.pushConsoleMessage('Adding uri '+uri+' to playlist '+name);
    return self.commonAddToPlaylist(self.playlistFolder, name, service, uri);
};


PlaylistManager.prototype.removeFromPlaylist = function (name, service, uri) {
	var self = this;

	self.commandRouter.pushConsoleMessage('Removing uri ' + uri + ' to playlist ' + name);

	return self.commonRemoveFromPlaylist(self.playlistFolder, name, service, uri);
};

PlaylistManager.prototype.playPlaylist = function (name) {
    var self = this;
    
	// notify potential clients / plugins of the playlist requested
	self.commandRouter.broadcastMessage('playingPlaylist', name);

	self.commandRouter.pushConsoleMessage('Play playlist ' + name);

	if (name === 'favourites') {
        return self.playFavourites();
	} else {
        return self.commonPlayPlaylist(self.playlistFolder, name);
	}


};

PlaylistManager.prototype.enqueue = function (name) {
	var self = this;

	var defer = libQ.defer();

	self.commandRouter.pushConsoleMessage('Enqueue ' + name);

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

                    var array = [];

                    for (var i in data) {
                        var item = {
                            service: data[i].service,
                            uri: data[i].uri,
                            name: data[i].title,
                            artist: data[i].artist,
                            album: data[i].album,
                            albumart: data[i].albumart
                        }

                        array.push(item);
                    }

                    self.commandRouter.addQueueItems(array);

                    defer.resolve();
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

PlaylistManager.prototype.addToFavourites = function (service, uri, title) {
	var self = this;

	if (title){
		self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('PLAYLIST.ADDED_TITLE'), title + self.commandRouter.getI18nString('PLAYLIST.ADDED_TO_FAVOURITES'));
	} else {
	    self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('PLAYLIST.ADDED_TITLE'), uri + self.commandRouter.getI18nString('PLAYLIST.ADDED_TO_FAVOURITES'));
    }

	if (service === 'webradio') {
		return self.commonAddToPlaylist(self.favouritesPlaylistFolder, 'radio-favourites', service, uri, title);
	} else {
        var plugin = this.commandRouter.pluginManager.getPlugin('music_service', service);
        if(plugin && typeof(plugin.addToFavourites) === typeof(Function))
        {
            self.logger.info('Adding ' + uri + ' to favourites with specific ' + service + ' method');
            return plugin.addToFavourites({uri:uri,service:service});
        } else {
            self.logger.info('Adding ' + uri + ' to favourites using generic method');
            return self.commonAddToPlaylist(self.favouritesPlaylistFolder, 'favourites', service, uri);
        }
	}
};

PlaylistManager.prototype.removeFromFavourites = function (name, service, uri) {
	var self = this;

	self.commandRouter.pushConsoleMessage('Removing uri ' + uri + ' from favourites');

	if (service === 'webradio') {
		return self.commonRemoveFromPlaylist(self.favouritesPlaylistFolder,'radio-favourites',service,uri);
	} else {
        self.commandRouter.executeOnPlugin('music_service', service,'removeFromFavourites',{uri:uri,service:service});
		return self.commonRemoveFromPlaylist(self.favouritesPlaylistFolder,'favourites',service,uri)
			.then(function(data) {
				if(data.success !== false)
					self.commandRouter.emitFavourites({service: service, uri: uri, favourite: false});
				return data;
			});
    }
};

PlaylistManager.prototype.playFavourites = function () {
	var self = this;

	self.commandRouter.pushConsoleMessage('Playing favourites');

	return self.commonPlayPlaylist(self.favouritesPlaylistFolder, 'favourites');
};

// Radio Favourites

PlaylistManager.prototype.getRadioFavouritesContent = function (name) {
	var self = this;

	return self.commonGetPlaylistContent(self.favouritesPlaylistFolder, 'radio-favourites');
};

PlaylistManager.prototype.addToRadioFavourites = function (service, uri) {
	var self = this;

	self.commandRouter.pushConsoleMessage('Adding uri ' + uri + ' to radio-favourites');

	return self.commonAddToPlaylist(self.favouritesPlaylistFolder, 'radio-favourites', service, uri);
};

PlaylistManager.prototype.removeFromRadioFavourites = function (name, service, uri) {
	var self = this;

	self.commandRouter.pushConsoleMessage('Removing uri ' + uri + ' from radio-favourites');

	return self.commonRemoveFromPlaylist(self.favouritesPlaylistFolder, 'radio-favourites', service, uri);
};

PlaylistManager.prototype.playRadioFavourites = function () {
	var self = this;

	self.commandRouter.pushConsoleMessage('Playing radio-favourites');

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
    var folder = self.favouritesPlaylistFolder;
    var name = 'my-web-radio';
    var filePath = folder + name;

	fs.exists(filePath, function (exists) {
	    var fileDefer;
		if (!exists) {
            playlist.push({service: service, name: radio_name, uri: uri});
            fileDefer=self.saveJSONFile(folder, name, playlist);
		} else fileDefer=libQ.resolve();

		fileDefer.then(function(){
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

                    self.saveJSONFile(folder, name, data).then(function(){
                        defer.resolve({success: true});
                        self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('WEBRADIO.WEBRADIO') + ' ' + self.commandRouter.getI18nString('PLAYLIST.ADDED_TITLE'), radio_name);
                    }).fail(function(){
                        self.commandRouter.pushToastMessage('error', self.commandRouter.getI18nString('WEBRADIO.WEBRADIO') , '');
                        defer.resolve({success: false});
                    })
                }
            });
        })
	});

	return defer.promise;
};

PlaylistManager.prototype.removeFromMyWebRadio = function (name, service, uri) {
	var self = this;

	var defer = libQ.defer();

	var playlist = [];
	var folder = self.favouritesPlaylistFolder;
	var filename = 'my-web-radio';
	var filePath = folder + filename;

	fs.exists(filePath, function (exists) {
		if (!exists) {
            self.saveJSONFile(folder, filename, playlist);
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

				self.saveJSONFile(folder, filename, data).then(function(){
                    defer.resolve({success:true});
                }).fail(function(){
                    defer.resolve({success:false});
                })
			}
		});
	});

	return defer.promise;
};

PlaylistManager.prototype.playMyWebRadio = function () {
	var self = this;

	self.commandRouter.pushConsoleMessage('Playing my-web-radio');

	return self.commonPlayPlaylist(self.favouritesPlaylistFolder, 'my-web-radio');
};

//  COMMON methods
PlaylistManager.prototype.commonAddToPlaylist = function (folder, name, service, uri, title) {
	var self = this;

	var defer = libQ.defer();

	var playlist = [];
	var filePath = folder + name;
	var path = uri;

	if (uri && uri.indexOf('music-library/') >= 0) {
		path = uri.replace('music-library/', '/mnt/');
		uri = uri.replace('music-library/', 'mnt/');
	}

	fs.exists(filePath, function (exists) {
	    var fileDefer=libQ.defer();


		if (!exists) {
		        //console.log("Setting default value for favourite "+folder+" "+name)
                //fileDefer=self.saveJSONFile(folder, name, playlist)
            fs.writeJson(folder + name, playlist, function (err) {
                if (err)
                    fileDefer.reject(new Error());
                else fileDefer.resolve();
            })

		} else fileDefer.resolve();

		fileDefer.then(function() {
            if (service === 'mpd') {
                var listingDefer=libQ.defer();

                var mpdPlugin = self.commandRouter.pluginManager.getPlugin('music_service', 'mpd');

                if(uri.startsWith("genres://"))
                {
                    mpdPlugin.listGenre(uri)
                    .then(function(entries){
                        listingDefer.resolve(entries.navigation.lists[2].items);
                    }).fail(function(){
                        listingDefer.reject(new Error());
                    })
                }
                else if(uri.startsWith("artists://"))
                {
                    var s = uri.split('/');
                    if (s.length == 3) {
                        // no album in uri
                        mpdPlugin.listArtist(uri,2,'')
                        .then(function(entries){
                            listingDefer.resolve(entries.navigation.lists[1].items);
                        }).fail(function(){
                            listingDefer.reject(new Error());
                        })
                    } else if (s.length > 3) {
                        mpdPlugin.listAlbumSongs(uri,2,'')
                        .then(function(entries){
                            listingDefer.resolve(entries.navigation.lists[0].items);
                        }).fail(function(){
                            listingDefer.reject(new Error());
                        })
                    }
                }
                else if(uri.startsWith("albums://"))
                {
                    mpdPlugin.listAlbumSongs(uri,2,'')
                    .then(function(entries){
                        listingDefer.resolve(entries.navigation.lists[0].items);
                    }).fail(function(){
                        listingDefer.reject(new Error());
                    })
                }
                else if (uri.startsWith("mnt/")) {

                    var lsfolder = mpdPlugin.listallFolder(uri);
                    lsfolder.then(function (info) {
                        var list = info.navigation.lists[0].items;
                        var nItems = list.length;
                        var entries = [];
                        for (var i = 0; i < nItems; i++) {
                            var item = list[i];
                            if (item.type == 'song') {
                                if (item.uri.indexOf('music-library/') >= 0) {
                                    var itemUri = item.uri.replace('music-library', '');
                                }
                                else {
                                    var itemUri = item.uri;
                                }
                                entries.push({
                                    service: service,
                                    uri: itemUri,
                                    title: item.title,
                                    artist: item.artist,
                                    album: item.album,
                                    albumart: item.albumart
                                });
                            }
                        }
                        listingDefer.resolve(entries);
                    });
                }
                else {
                    var prms = self.commandRouter.executeOnPlugin('music_service', 'mpd', 'lsInfo', uri);
                    prms.then(function (info) {
                        //
                        // Collate new entries
                        //

                        var list = info.navigation.lists[0].items;
                        var nItems = list.length;

                        var entries = [];
                        for (var i = 0; i < nItems; i++) {
                            var item = list[i];

                            if (item.type == 'song') {
                                var artUrl = self.commandRouter.executeOnPlugin('music_service', 'mpd', 'getAlbumArt', {
                                    artist: item.artist,
                                    album: item.album
                                }, path, '');
                                if (item.uri.indexOf('music-library/') >= 0) {
                                    var itemUri = item.uri.replace('music-library', '');
                                } else var itemUri = item.uri;

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

                        listingDefer.resolve(entries);
                    });
                }


                listingDefer.then(function(entries)
                {
                    //console.log("Reading filepath "+filePath)
                    fs.readJson(filePath, function (err, data) {
                        if (err)
                        {
                            //console.log("ERR "+err)
                            defer.resolve({success: false});
                        }

                        else {

                            //console.log("Read this data "+data)
                            if(!data)
                                data=[];

                            var output = data.concat(entries);

                            self.saveJSONFile(folder, name, output).then(function(){
                                var favourites = self.commandRouter.checkFavourites({uri: path});
                                defer.resolve(favourites);
                            }).fail(function(){
                                defer.resolve({success:false});
                            })
                        }
                    });
                });

            } else if (service === 'webradio') {
                fs.readJson(filePath, function (err, data) {
                    if (err)
                        defer.resolve({success: false});
                    else {
                        if(!data)
                            data=[];

                        data.push({
                            service: service, uri: uri, title: title,
                            icon: 'fa-microphone'
                        });

                        self.saveJSONFile(folder, name, data).then(function(){
                            var favourites = self.commandRouter.checkFavourites({uri: path});
                            defer.resolve(favourites);
                        }).fail(function(){
                            defer.resolve({success:false});
                        })
                    }
                });
            } else if (service === 'spop') {
                var uriSplitted = uri.split(':');
                var spotifyItem = self.commandRouter.executeOnPlugin('music_service', 'spop', 'getTrack', uriSplitted[2]);
                spotifyItem.then(function (info) {
                    var entries = [];
                    var track = info[0];
                    entries.push({
                        service: service,
                        uri: uri,
                        title: track.name,
                        artist: track.artist,
                        album: track.album,
                        albumart: track.albumart
                    });
                    fs.readJson(filePath, function (err, data) {
                        if (err)
                            defer.resolve({success: false});
                        else {

                            if(!data)
                                data=[];

                            var output = data.concat(entries);

                            self.saveJSONFile(folder, name, output).then(function(){
                                var favourites = self.commandRouter.checkFavourites({uri: path});
                                defer.resolve(favourites);
                            }).fail(function(){
                                defer.resolve({success:false});
                            })
                        }
                    });

                });
            } else {
                var explodedUri = self.commandRouter.executeOnPlugin('music_service', service,'explodeUri',uri);
                explodedUri.then(function(info){
                    var entries = [];
                    var track = info[0];
                    entries.push({
                        service: service,
                        uri: uri,
                        title: track.name,
                        artist: track.artist,
                        album: track.album,
                        albumart: track.albumart
                    });
                    fs.readJson(filePath, function (err, data) {
                        if (err)
                            defer.resolve({success: false});
                        else {

                            if(!data)
                                data=[];

                            var output = data.concat(entries);

                            self.saveJSONFile(folder, name, output).then(function(){
                                var favourites = self.commandRouter.checkFavourites({uri: path});
                                defer.resolve(favourites);
                            }).fail(function(){
                                defer.resolve({success:false});
                            })
                        }
                    });

                    })
                    .fail(function(err){
                        self.logger.error('Could not add to playlist: ' + uri);
                    })

            }
        })

	});

	return defer.promise;
};


PlaylistManager.prototype.saveJSONFile = function(localFolder, fileName, data)
{
    var self=this;
    var defer=libQ.defer();

    if(this.commandRouter.sharedVars.get('myVolumio.cloudDeviceEnabled') === true && this.commandRouter.sharedVars.get('myvolumio.uid') !== '0')
    {   self.logger.info('Saving Cloud item ' + fileName);
        return self.commandRouter.executeOnPlugin('system_controller', 'my_volumio', 'saveCloudItem', {
            fileName:fileName,
            data:data
        });
    } else {
        self.logger.info('Saving local item ' + fileName);
        fs.writeJson(localFolder + fileName, data, function (err) {
            if (err)
                defer.reject(new Error());
            else defer.resolve();
        })
    }

    return defer.promise;
}



PlaylistManager.prototype.commonRemoveFromPlaylist = function (folder, name, service, uri) {
	var self = this;

	var defer = libQ.defer();

	fs.readJson(folder+name, function (err, data) {
		if (err) {
			self.commandRouter.pushToastMessage('error', self.commandRouter.getI18nString('PLAYLIST.REMOVE_ERROR'), uri);
			defer.resolve({success: false, reason: 'Cannot open Playlist'});
		}
		else {
			var removedItem;

			for (var i = 0; i < data.length; i++) {
				if (data[i].service == service && data[i].uri == uri) {
					removedItem = data.splice(i,1)[0];
					break;
				}
			}

			var itemName = removedItem ? (removedItem.title || uri) : uri;
            self.saveJSONFile(folder, name, data).then(function(){
                self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('PLAYLIST.REMOVE_SUCCESS'), itemName);
                defer.resolve(data);
            }).fail(function(){
                self.commandRouter.pushToastMessage('error', self.commandRouter.getI18nString('PLAYLIST.REMOVE_ERROR'), itemName);
                defer.resolve({success: false, reason: 'Cannot write Playlist'});
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
						} /*else if (fullUri.startsWith('/')) {
							uri = fullUri.chompLeft('/').s;
						}*/ else uri = data[i].uri;


                        var service;

                        if(data[i].service===undefined)
                            service='mpd';
                        else service=data[i].service;

						uris.push({uri:uri,service:service});
					}

                    self.commandRouter.addQueueItems(uris)
                        .then(function()
                        {
                            self.commandRouter.volumioPlay(0);
                            defer.resolve();
                        })
                        .fail(function()
                        {
                            defer.reject(new Error());
                        })
					//self.commandRouter.executeOnPlugin('music_service', 'mpd', 'clearAddPlayTracks', uris);

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
					info: {
                        uri: 'playlists/favourites',
						title:  self.commandRouter.getI18nString('COMMON.FAVOURITES'),
						name: 'favourites',
						service: 'mpd',
                        type:  'play-playlist',
						albumart: '/albumart?sourceicon=music_service/mpd/favouritesicon.png'
					},
					lists: [{availableListViews:['list'],items:[]}]
				}
			};

        if (singleBrowse) {
            response.navigation.prev.uri = 'music-library';
        }

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

				response.navigation.lists[0].items.push(song);
			}

			defer.resolve(response);

		})
		.fail(function () {
			defer.reject(new Error("Cannot list Favourites"));
		});

	return defer.promise;
};



PlaylistManager.prototype.commonAddItemsToPlaylist = function (folder, name, data) {
    var self = this;

    var defer = libQ.defer();

    var playlist = [];

    for(var i in data)
    {
        playlist.push({
            service: data[i].service,
            uri: self.sanitizeUri(data[i].uri),
            title: data[i].name,
            artist: data[i].artist,
            album: data[i].album,
            albumart: data[i].albumart
        });
    }

    self.saveJSONFile(folder,name, playlist).then(function(){
        defer.resolve();
    }).fail(function(){
        defer.reject(new Error('Cannot write playlist file'));
    })

    return defer.promise;
};

PlaylistManager.prototype.sanitizeUri = function (uri) {
    return uri.replace('music-library/', '').replace('mnt/', '');
}
