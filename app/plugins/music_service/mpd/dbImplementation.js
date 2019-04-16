var libQ = require('kew');
var path = require('path');
var url = require('url');
var Sequelize = require('sequelize');

// TODO: I think we can keep this module inside 'mpd' folder
var MusicLibrary = require('../music_library/index');
var utils = require('../music_library/lib/utils');

module.exports = DBImplementation;


/////////////////////////////

// TODO: move to config?
var ROOT = '/mnt';


var PLUGIN_NAME = 'music_library';


var PROTOCOL_LIBRARY = 'music-library';
var PROTOCOL_ARTISTS = 'artists';
var PROTOCOL_ALBUMS = 'albums';
var PROTOCOL_GENRES = 'genres';

/**
 * @class
 */
function DBImplementation(context) {

	// Save a reference to the parent commandRouter
	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;


	//initialization
	// this.albumArtPlugin = this.commandRouter.pluginManager.getPlugin('miscellanea', 'albumart');
	this.library = new MusicLibrary(context);
}


/**
 * @param {SearchQuery} query
 * @return {Promise<SearchResult[]>}
 * @implement plugin api
 */
DBImplementation.prototype.search = function(query) {
	var self = this;

	var uriInfo = DBImplementation.parseUri(query.uri);
	var protocol = uriInfo.protocol;

	self.logger.info('DBImplementation.search', query, protocol);
	console.time('DBImplementation.search');
	var searchValue = query.value;

	var isSearchTracks = !protocol || protocol == PROTOCOL_LIBRARY;
	var isSearchArtists = isSearchTracks || protocol == PROTOCOL_ARTISTS;
	var isSearchAlbums = isSearchTracks || protocol == PROTOCOL_ALBUMS;


	var titleCommon = self.commandRouter.getI18nString('COMMON.FOUND');
	var promiseResultArr = [];

	if (isSearchArtists) {
		promiseResultArr.push(this.searchArtists(searchValue).then(function(items) {
			var artistdesc = self.commandRouter.getI18nString(items.length > 1 ? 'COMMON.ARTISTS' : 'COMMON.ARTIST');
			return {
				'title': titleCommon + ' ' + items.length + ' ' + artistdesc + ' \'' + searchValue + '\'',
				'availableListViews': [
					'list', 'grid'
				],
				'items': items
			};
		}));
	}

	if (isSearchAlbums) {
		promiseResultArr.push(this.searchAlbums(searchValue).then(function(items) {
			var albumdesc = self.commandRouter.getI18nString(items.length > 1 ? 'COMMON.ALBUMS' : 'COMMON.ALBUM');
			return {
				'title': titleCommon + ' ' + items.length + ' ' + albumdesc + ' \'' + searchValue + '\'',
				'availableListViews': [
					'list', 'grid'
				],
				'items': items
			};
		}));
	}
	if (isSearchTracks) {
		promiseResultArr.push(this.searchTracks(searchValue).then(function(items) {
			var trackdesc = self.commandRouter.getI18nString(items.length > 1 ? 'COMMON.TRACKS' : 'COMMON.TRACK');
			return {
				'title': titleCommon + ' ' + items.length + ' ' + trackdesc + ' \'' + searchValue + '\'',
				'availableListViews': [
					'list'
				],
				'items': items
			};
		}));
	}

	return libQ.all(promiseResultArr).then(function(searchResultArr) {
		console.timeEnd('DBImplementation.search');
		return searchResultArr.filter(function(data) {
			return data.items.length > 0;
		});
	}).fail(function(e) {
		// TODO: caller doesn't log an error
		console.error(e);
		throw e;
	});
};


/**
 * @param {string} [searchValue]
 * @return {Promise<SearchResultItem[]>}
 */
DBImplementation.prototype.searchArtists = function(searchValue) {
	var self = this;
	return this.library.searchArtists({
		where: searchValue ? {
			artist: {[Sequelize.Op.substring]: searchValue}
		} : {
			artist: {[Sequelize.Op.not]: null}
		},
		order: ['artist'],
		raw: true
	}).then(function(artistsArr) {
		return artistsArr.map(function(artist) {
			return self.artist2SearchResult(artist);
		});
	});
};

/**
 * @param {string} [searchValue]
 * @return {Promise<SearchResultItem[]>}
 */
DBImplementation.prototype.searchAlbums = function(searchValue) {
	var self = this;
	return this.library.searchAlbums({
		where: searchValue ? {
			album: {[Sequelize.Op.substring]: searchValue}
		} : {
			album: {[Sequelize.Op.not]: null}
		},
		order: ['album']
	}).then(function(albumsArr) {
		return albumsArr.map(function(album) {
			return self.album2SearchResult(album);
		});
	});
};


/**
 * @param {string} searchValue
 * @return {Promise<SearchResultItem[]>}
 */
DBImplementation.prototype.searchTracks = function(searchValue) {
	var self = this;
	if (!searchValue) {
		return libQ.reject(new Error('DBImplementation.searchTracks: search value is empty'));
	}

	return this.library.searchTracks({
		where: {
			[Sequelize.Op.or]: {
				title: {[Sequelize.Op.substring]: searchValue}
			}
		},
		order: ['tracknumber'],
		raw: true
	}).then(function(trackArr) {
		return trackArr.map(function(track) {
			return self.track2SearchResult(track);
		});
	});
};


/**
 *
 * Shall handle uris:
 * albums://
 * artitsts://
 * playlists://
 * genres://
 * mounts://<MOUNT_NAME>
 *
 * @param {string} uri
 * @param {string} [previousUri]
 * @return {!Promise<BrowseResult>}
 * @implement plugin api
 */
DBImplementation.prototype.handleBrowseUri = function(uri, previousUri) {
	var self = this;

	var uriInfo;
	return libQ.resolve().then(function() {

		uriInfo = DBImplementation.parseUri(uri);
		self.logger.info('DBImplementation.handleBrowseUri', uriInfo, previousUri);

		var promise;
		switch (uriInfo.protocol) {
			case PROTOCOL_LIBRARY:
				promise = self.handleLibraryUri(uri);
				break;
			case PROTOCOL_ARTISTS:
				promise = self.handleArtistsUri(uri);
				break;
			case PROTOCOL_ALBUMS:
				promise = self.handleAlbumsUri(uri);
				break;
			case PROTOCOL_GENRES:
				promise = self.handleGenresUri(uri);
				break;
			default:
				promise = libQ.reject('Unknown protocol: ' + uriInfo.protocol);
		}
		return promise;
	}).then(function(response) {
		response.navigation.prev.uri = previousUri || response.navigation.prev.uri || DBImplementation.getParentUri(uriInfo);
		return response;
	}).fail(function(e) {
		// TODO: caller doesn't log the error
		console.error(e);
		throw e;
	});
};


/**
 * @param {string} uri
 * @return {Promise<BrowseResult>}
 */
DBImplementation.prototype.handleLibraryUri = function(uri) {
	var self = this;
	var uriInfo = DBImplementation.parseTrackUri(uri);

	return self.library.lsFolder(uriInfo.location).then(function(folderEntries) {
		var items = folderEntries.map(function(entry) {
			if (entry.type == 'file') {
				return self.track2SearchResult(entry.data);
			} else if (entry.type == 'folder') {
				return self.folder2SearchResult(entry.data);
			}
		});

		var isRoot = uriInfo.location == ROOT;
		return {
			navigation: {
				lists: [{
					availableListViews: [
						'list', 'grid'
					],
					items: items
				}],
				prev: {
					uri: isRoot ? '' : DBImplementation.getTrackUri({location: path.dirname(uriInfo.location)})
				}
			}
		};
	});
};


/**
 * @param {string} uri - //artistName/albumName
 * @return {Promise<BrowseResult>}
 */
DBImplementation.prototype.handleArtistsUri = function(uri) {
	var self = this;
	var uriInfo = DBImplementation.parseUri(uri);

	var promise;
	if (uriInfo.parts.length === 0) {
		// list all artists
		promise = self.listArtists();
	} else if (uriInfo.parts.length === 1) {
		promise = self.listArtist(uriInfo.parts[0], PROTOCOL_ARTISTS);
	} else if (uriInfo.parts.length === 2) {
		promise = self.listAlbumSongs(uriInfo.parts[0], uriInfo.parts[1]);
	}

	return promise;
};


/**
 * @return {Promise<BrowseResult>}
 * @private
 */
DBImplementation.prototype.listArtists = function() {
	var self = this;

	return self.searchArtists().then(function(items) {
		return {
			navigation: {
				'lists': [{
					'icon': 'fa icon',
					'availableListViews': [
						'list',
						'grid'
					],
					'items': items
				}],
				prev: {
					'uri': ''
				}
			}
		};
	});
};


/**
 * @param {string} artistName
 * @param {string} [protocol]
 * @param {string} [path]
 * @return {Promise<BrowseResult>}
 * @private
 */
DBImplementation.prototype.listArtist = function(artistName, protocol, path) {
	var self = this;

	// list albums, which are belong to the artist
	return libQ.all([


		// albums
		self.library.searchAlbums({
			where: {
				artist: {[Sequelize.Op.eq]: artistName},
			},
			order: ['disk', 'tracknumber', 'title'],
		}).then(function(albumArr) {
			return albumArr.map(function(album) {
				return self.album2SearchResult(album, protocol, path);
			});
		}),


		// tracks
		self.library.searchTracks({
			where: {
				artist: {[Sequelize.Op.eq]: artistName},
			},
			order: ['disk', 'tracknumber', 'title'],
		}).then(function(trackArr) {
			return trackArr.map(function(track) {
				return self.track2SearchResult(track);
			});
		})

	]).then(function(lists) {
		return {
			navigation: {
				'lists': [{
					'title': self.commandRouter.getI18nString('COMMON.ALBUMS') + ' (' + decodeURIComponent(artistName) + ')',
					'icon': 'fa icon',
					'availableListViews': [
						'list',
						'grid'
					],
					'items': lists[0]
				}, {
					'title': self.commandRouter.getI18nString('COMMON.TRACKS') + ' (' + decodeURIComponent(artistName) + ')',
					'icon': 'fa icon',
					'availableListViews': [
						'list'
					],
					'items': lists[1]
				}],
				prev: {
					'uri': ''
				},
				info: self.artistInfo(artistName)
			}
		};
	});
};

/**
 * @param {string} artistName
 * @param {string} albumName
 * @return {Promise<BrowseResult>}
 * @private
 */
DBImplementation.prototype.listAlbumSongs = function(artistName, albumName) {
	var self = this;

	/**
	 * @type {AudioMetadata}
	 */
	var firstFoundTrack;

	// tracks
	return self.library.searchTracks({
		where: {
			artist: {[Sequelize.Op.eq]: artistName},
			album: {[Sequelize.Op.eq]: albumName},
		},
		order: ['disk', 'tracknumber', 'title'],
	}).then(function(trackArr) {
		firstFoundTrack = trackArr[0];
		return trackArr.map(function(track) {
			return self.track2SearchResult(track);
		});
	}).then(function(items) {
		return {
			navigation: {
				'lists': [{
					// 'title': self.commandRouter.getI18nString('COMMON.TRACKS') + ' (' + decodeURIComponent(artistName) + ')',
					'icon': 'fa icon',
					'availableListViews': [
						'list'
					],
					'items': items
				}],
				prev: {
					'uri': ''
				},
				info: self.albumInfo(artistName, albumName, firstFoundTrack.location)
			}
		};
	});
};


/**
 * @param {string} uri
 * @return {Promise<BrowseResult>}
 */
DBImplementation.prototype.handleAlbumsUri = function(uri) {

	var self = this;
	var uriInfo = DBImplementation.parseUri(uri);

	var promise;
	if (uriInfo.parts.length < 2) {
		// list all artists
		promise = self.listAlbums();
	} else if (uriInfo.parts.length >= 2) {
		promise = self.listAlbumSongs(uriInfo.parts[0], uriInfo.parts[1]).then(function(response) {
			response.navigation.prev.uri = uriInfo.protocol + '://';
			return response;
		});
	}

	return promise;
};


/**
 * @return {Promise<BrowseResult>}
 * @private
 */
DBImplementation.prototype.listAlbums = function() {
	var self = this;

	return self.library.searchAlbums().then(function(albumArr) {
		return albumArr.map(function(album) {
			return self.album2SearchResult(album);
		});
	}).then(function(items) {
		return {
			navigation: {
				lists: [{
					availableListViews: [
						'list', 'grid'
					],
					items: items
				}],
				prev: {
					uri: ''
				},
				// info: info
			}
		};
	});
};


/**
 * @param {string} uri
 * @return {Promise<BrowseResult>}
 *
 * @example uri:
 *   genres://Genre/Artist/Album
 */
DBImplementation.prototype.handleGenresUri = function(uri) {
	var self = this;
	var uriInfo = DBImplementation.parseUri(uri);

	var promise;
	if (uriInfo.parts.length === 0) {
		// list all genres
		promise = self.listGenres();
	} else if (uriInfo.parts.length == 1) {
		promise = self.listGenre(uriInfo.parts[0]);
	} else if (uriInfo.parts.length == 2) {
		promise = self.listArtist(uriInfo.parts[1], PROTOCOL_GENRES, uriInfo.parts[0]);
	} else if (uriInfo.parts.length >= 3) {
		promise = self.listAlbumSongs(uriInfo.parts[1], uriInfo.parts[2]).then(function(response) {
			if (uriInfo.query.skipartist) {
				response.navigation.prev.uri = uriInfo.protocol + '://' + encodeURIComponent(uriInfo.parts[0]);
			}
			return response;
		});
	}

	return promise;
};


/**
 * @return {Promise<BrowseResult>}
 * @private
 */
DBImplementation.prototype.listGenres = function() {
	var self = this;

	return self.library.searchGenres().then(function(genresArr) {
		return genresArr.map(function(genre) {
			return self.genre2SearchResult(genre);
		});
	}).then(function(items) {
		return {
			navigation: {
				lists: [{
					availableListViews: [
						'list', 'grid'
					],
					items: items
				}],
				prev: {
					uri: ''
				},
				// info: info
			}
		};
	});
};

/**
 * @param {string} genreName
 * @return {Promise<BrowseResult>}
 * @private
 */
DBImplementation.prototype.listGenre = function(genreName) {
	var self = this;

	return libQ.all([

		// artists
		self.library.searchArtists({
			where: {
				genre: {[Sequelize.Op.eq]: genreName},
				artist: {[Sequelize.Op.ne]: null}
			},
			order: ['artist'],
		}).then(function(artistArr) {
			return artistArr.map(function(artist) {
				return self.artist2SearchResult(artist, PROTOCOL_GENRES, genreName);
			});
		}),

		// albums
		self.library.searchAlbums({
			where: {
				genre: {[Sequelize.Op.eq]: genreName},
				album: {[Sequelize.Op.ne]: null}
			},
			order: ['album'],
		}).then(function(albumArr) {
			return albumArr.map(function(album) {
				return self.album2SearchResult(album, PROTOCOL_GENRES, genreName);
			});
		}).then(function(items) {
			for (var i = 0; i < items.length; i++) {
				items[i].uri += '?skipartist';
			}
			return items;
		}),

		// tracks
		self.library.searchTracks({
			where: {
				genre: {[Sequelize.Op.eq]: genreName}
			},
			order: ['disk', 'tracknumber', 'title'],
			raw: true
		}).then(function(trackArr) {
			return trackArr.map(function(track) {
				return self.track2SearchResult(track);
			});
		}),
	]).then(function(lists) {
		return {
			navigation: {
				'lists': [{
					'title': self.commandRouter.getI18nString('COMMON.ARTISTS') + ' ' + self.commandRouter.getI18nString('COMMON.WITH') + ' \'' + genreName + '\' ' + self.commandRouter.getI18nString('COMMON.GENRE') + ' ' + self.commandRouter.getI18nString('COMMON.TRACKS'),
					'icon': 'fa icon',
					'availableListViews': [
						'list',
						'grid'
					],
					'items': lists[0]
				}, {
					'title': self.commandRouter.getI18nString('COMMON.ALBUMS') + ' ' + self.commandRouter.getI18nString('COMMON.WITH') + ' \'' + genreName + '\' ' + self.commandRouter.getI18nString('COMMON.GENRE') + ' ' + self.commandRouter.getI18nString('COMMON.TRACKS'),
					'icon': 'fa icon',
					'availableListViews': [
						'list',
						'grid'
					],
					'items': lists[1]
				}, {
					'title': self.commandRouter.getI18nString('COMMON.TRACKS') + ' - \'' + genreName + '\' ' + self.commandRouter.getI18nString('COMMON.GENRE'),
					'icon': 'fa icon',
					'availableListViews': [
						'list'
					],
					'items': lists[2]
				}],
				prev: {
					'uri': ''
				}
			}
		};
	});
};


/**
 * @param {string} uri
 * @return {Promise<TrackInfo>}
 * @implement plugin api
 */
DBImplementation.prototype.explodeUri = function(uri) {
	var self = this;
	return libQ.resolve().then(function() {

		var protocolParts = uri.split('://', 2);
		var protocol = protocolParts[0];
		self.logger.info('DBImplementation.explodeUri', uri, protocol);

		var promise;
		switch (protocol) {
			case PROTOCOL_LIBRARY:
				promise = self.explodeLibraryUri(uri);
				break;
			case PROTOCOL_ARTISTS:
				promise = self.explodeArtistsUri(uri);
				break;
			case PROTOCOL_ALBUMS:
				promise = self.explodeAlbumsUri(uri);
				break;
			case PROTOCOL_GENRES:
				promise = self.explodeGenresUri(uri);
				break;

			default:
				promise = libQ.reject('Unknown protocol: ' + protocol);
		}

		return promise;
	}).fail(function(e) {
		// TODO: caller doesn't log the error
		console.error(e);
		throw e;
	});
};


/**
 * @param {string} uri
 * @return {Promise<TrackInfo>}
 */
DBImplementation.prototype.explodeLibraryUri = function(uri) {
	var self = this;

	var protocolParts = uri.split('://', 2);
	var protocol = protocolParts[0];
	self.logger.info('DBImplementation.explodeLibraryUri', uri, protocol);

	var trackInfo = DBImplementation.parseTrackUri(uri);
	return this.library.getTrack(trackInfo.location, trackInfo.trackOffset).then(function(track) {
		return [self.track2mpd(track)];
	});
};


/**
 * @param {string} uri
 * @return {Promise<TrackInfo>}
 */
DBImplementation.prototype.explodeArtistsUri = function(uri) {
	var self = this;

	var uriInfo = DBImplementation.parseUri(uri);

	var promise;
	if (uriInfo.parts.length >= 2) {
		promise = this.library.searchTracks({
			where: {
				artist: {[Sequelize.Op.eq]: uriInfo.parts[0]},
				album: {[Sequelize.Op.eq]: uriInfo.parts[1]}
			},
			order: ['disk', 'tracknumber', 'title'],
			raw: true
		});
	} else if (uriInfo.parts.length == 1) {
		promise = this.library.searchTracks({
			where: {
				artist: {[Sequelize.Op.eq]: uriInfo.parts[0]},
			},
			order: ['disk', 'tracknumber', 'title'],
			raw: true
		});
	} else {
		return libQ.reject('DBImplementation.explodeArtistsUri: empty uri');
	}
	return promise.then(function(tracks) {
		return tracks.map(self.track2mpd.bind(self));
	});

};


/**
 * @param {string} uri
 * @return {Promise<TrackInfo>}
 */
DBImplementation.prototype.explodeAlbumsUri = function(uri) {
	var self = this;

	var uriInfo = DBImplementation.parseUri(uri);
	return this.library.searchTracks({
		where: {
			album: {[Sequelize.Op.eq]: uriInfo.parts[1]}
		},
		order: ['disk', 'tracknumber', 'title'],
		raw: true
	}).then(function(tracks) {
		return tracks.map(self.track2mpd.bind(self));
	});

};

/**
 * @param {string} uri
 * @return {Promise<TrackInfo>}
 */
DBImplementation.prototype.explodeGenresUri = function(uri) {
	var self = this;

	var uriInfo = DBImplementation.parseUri(uri);

	var promise;
	switch (uriInfo.parts.length) {
		case 1:
			// play all genre songs
			promise = this.library.searchTracks({
				where: {
					genre: {[Sequelize.Op.eq]: uriInfo.parts[0]}
				},
				order: ['disk', 'tracknumber', 'title'],
				raw: true
			});
			break;
		case 2:
			// play all artist songs
			promise = this.library.searchTracks({
				where: {
					// genre: {[Sequelize.Op.eq]: uriInfo.parts[0]}, // ignore genre in this case
					artist: {[Sequelize.Op.eq]: uriInfo.parts[1]}
				},
				order: ['disk', 'tracknumber', 'title'],
				raw: true
			});
			break;
		case 3:
		default:
			// play all artist/album songs
			promise = this.library.searchTracks({
				where: {
					artist: {[Sequelize.Op.eq]: uriInfo.parts[1]},
					album: {[Sequelize.Op.eq]: uriInfo.parts[2]}
				},
				order: ['disk', 'tracknumber', 'title'],
				raw: true
			});
	}


	return promise.then(function(tracks) {
		return tracks.map(self.track2mpd.bind(self));
	});

};


/**
 * @param {string} [uri]
 * @return {void}
 * @implement
 */
DBImplementation.prototype.updateDb = function(uri) {
	uri = uri || (PROTOCOL_LIBRARY + '://');
	var info = DBImplementation.parseTrackUri(uri);
	this.logger.info('DBImplementation.updateDb', info.location);

	this.library.update(info.location);
};


/**
 * @param {{artist: string, album?:string, size?:string}} data
 * @param {string} path  path to album art folder to scan
 * @param {string} icon  icon to show
 * @return {string}
 * @private
 *

 // track
 albumart = self.getAlbumArt({artist: artist, album: album}, self.getParentFolder('/mnt/' + path),'fa-tags');

 // artist
 albumart = self.getAlbumArt({artist: artist},undefined,'users');
 */
DBImplementation.prototype.getAlbumArt = function(data, path, icon) {
	if (this.albumArtPlugin == undefined) {
		//initialization, skipped from second call
		this.albumArtPlugin = this.commandRouter.pluginManager.getPlugin('miscellanea', 'albumart');
	}

	if (this.albumArtPlugin)
		return this.albumArtPlugin.getAlbumArt(data, path, icon);
	else {
		return '/albumart';
	}
};


/**
 * @param {AudioMetadata} record
 * @return {SearchResultItem}
 * @private
 */
DBImplementation.prototype.track2SearchResult = function(record) {
	var self = this;
	return {
		service: 'mpd',
		// service: PLUGIN_NAME,
		type: 'song',
		title: record.title || '',
		artist: record.artist || '',
		album: record.album || '',
		albumart: self.getAlbumArt({
			artist: record.artist,
			album: record.album
		}, path.relative(ROOT, path.dirname(record.location)), 'fa-tags'),
		// icon: 'fa fa-music', // icon hides album art
		uri: DBImplementation.getTrackUri(record)
	};
};


/**
 * Technically, plays track
 * @param {AudioMetadata} record
 * @return {MPDTrack}
 * @private
 */
DBImplementation.prototype.track2mpd = function(record) {
	var self = this;
	return {
		service: 'mpd',
		name: record.title,
		artist: record.artist,
		album: record.album,
		type: 'track',
		tracknumber: record.tracknumber,
		albumart: self.getAlbumArt({
			artist: record.artist,
			album: record.album
		}, path.dirname(record.location), 'fa-music'),
		duration: record.format.duration,
		samplerate: record.samplerate,
		bitdepth: record.format.bitdepth,
		trackType: path.extname(record.location),
		uri: record.location.substr(1), // mpd expects absolute path without first '/'
	};
};


/**
 * @param {string} artistName
 * @param {string} [protocol]
 * @param {string} [pathPrefix]
 * @return {SearchResultItem}
 * @private
 */
DBImplementation.prototype.artist2SearchResult = function(artistName, protocol, pathPrefix) {
	var self = this;
	var prefix = pathPrefix ? encodeURIComponent(pathPrefix) + '/' : '';
	return {
		service: 'mpd',
		// service: PLUGIN_NAME,
		type: 'folder',
		title: artistName,
		albumart: self.getAlbumArt({artist: artistName}, undefined, 'users'),
		uri: (protocol || PROTOCOL_ARTISTS) + '://' + prefix + encodeURIComponent(artistName)
	};
};

/**
 * @param {Album} album
 * @param {string} [protocol]
 * @param {string} [pathPrefix]
 * @return {SearchResultItem}
 * @private
 */
DBImplementation.prototype.album2SearchResult = function(album, protocol, pathPrefix) {
	var self = this;
	var prefix = pathPrefix ? encodeURIComponent(pathPrefix) + '/' : '';
	return {
		service: 'mpd',
		// service: PLUGIN_NAME,
		type: 'folder',
		artist: album.artist,
		title: album.album,
		albumart: self.getAlbumArt({artist: album.artist, album: album.album}, path.dirname(album.trackLocation), 'fa-tags'),
		uri: (protocol || PROTOCOL_ALBUMS) + '://' + prefix + encodeURIComponent(album.artist) + '/' + encodeURIComponent(album.album)
	};
};


/**
 * @param {string} genreName
 * @param {string} [protocol]
 * @param {string} [pathPrefix]
 * @return {SearchResultItem}
 * @private
 */
DBImplementation.prototype.genre2SearchResult = function(genreName, protocol, pathPrefix) {
	var self = this;
	var prefix = pathPrefix ? encodeURIComponent(pathPrefix) + '/' : '';
	return {
		// service: PLUGIN_NAME,
		service: 'mpd',
		type: 'folder',
		title: genreName,
		albumart: self.getAlbumArt({}, undefined, 'fa-tags'),
		uri: (protocol || PROTOCOL_GENRES) + '://' + prefix + encodeURIComponent(genreName)
	};
};


/**
 * @param {string} location
 * @return {SearchResultItem}
 * @private
 */
DBImplementation.prototype.folder2SearchResult = function(location) {
	var self = this;
	var sourceTyped = {
		'USB': {
			dirtype: 'remdisk',
			diricon: 'fa fa-usb'
		},
		'INTERNAL': {
			dirtype: 'internal-folder',
		},
		'NAS': {
			dirtype: 'folder',
			diricon: 'fa fa-folder-open-o'
		},
		default: {
			dirtype: 'folder',
			diricon: 'fa fa-folder-open-o'
		}
	};

	// '/mnt/USB/folder1/folder2/..' to 'USB/folder1/folder2/..'
	var relativeFolder = path.relative(ROOT, location);

	var albumart;
	switch (relativeFolder) {
		case 'USB':
			albumart = self.getAlbumArt('', '', 'usb');
			break;
		case 'INTERNAL':
			albumart = self.getAlbumArt('', '', 'microchip');
			break;
		case 'NAS':
			albumart = self.getAlbumArt('', '', 'server');
			break;
		default:
			// any nested folder goes here (for example: 'INTERNAL/music')
			albumart = self.getAlbumArt('', location, 'folder-o');
	}

	return {
		service: PLUGIN_NAME,
		type: (sourceTyped[relativeFolder] || sourceTyped['default']).dirtype,
		// icon: (sourceTyped[relativeFolder] || sourceTyped['default']).diricon,
		title: path.basename(location),
		albumart: albumart,
		uri: DBImplementation.getTrackUri({location: location})
	};
};

//
// if (uri === 'music-library') {
// 	switch(path) {
// 		case 'INTERNAL':
// 			var albumart = self.getAlbumArt('', '','microchip');
// 			break;
// 		case 'NAS':
// 			var albumart = self.getAlbumArt('', '','server');
// 			break;
// 		case 'USB':
// 			var albumart = self.getAlbumArt('', '','usb');
// 			break;
// 		default:
// 			var albumart = self.getAlbumArt('', '/mnt/' + path,'folder-o');
// 	}
// } else {
// 	var albumart = self.getAlbumArt('', '/mnt/' + path,'folder-o');
// }


/**
 * @param {string} artistName
 * @return {BrowseResultInfo}
 * @private
 */
DBImplementation.prototype.artistInfo = function(artistName) {
	var self = this;
	return {
		service: 'mpd',
		type: 'artist',
		title: artistName,
		albumart: self.getAlbumArt({artist: artistName}, undefined, 'users'),
		uri: PROTOCOL_ARTISTS + '://' + encodeURIComponent(artistName)
	};
};


/**
 * @param {string} artistName
 * @param {string} albumName
 * @param {string} trackLocation - any track of the album
 * @return {BrowseResultInfo}
 * @private
 */
DBImplementation.prototype.albumInfo = function(artistName, albumName, trackLocation) {
	var self = this;
	return {
		service: 'mpd',
		type: 'album',
		// title: albumName, // ui shows title instead of artist+album when it's present
		artist: artistName,
		album: albumName,
		albumart: self.getAlbumArt({artist: artistName, album: albumName}, path.dirname(trackLocation), 'fa-tags'),
		uri: PROTOCOL_ARTISTS + '://' + encodeURIComponent(artistName) + '/' + encodeURIComponent(albumName)
	};
};


/**
 * Get track uri
 * @param {{location:string, trackOffset?:number}} track
 * @return {string}
 * @private
 * @static
 */
DBImplementation.getTrackUri = function(track) {
	var params = (track.trackOffset !== null && track.trackOffset !== undefined) ? 'trackoffset=' + track.trackOffset : null;
	return track.location.replace(ROOT, PROTOCOL_LIBRARY + '://') + (params ? '?' + params : '');
};

/**
 * Parse track uri
 *
 * Note: the following uri are valid:
 *  1. 'root' url: 'music-library'
 *  2. non-'root' url: 'music-library://USB/some/folder'
 * @param {string} uri
 * @return {{protocol:string, location:string, trackOffset:number}} - primary key for AudioMetadata
 * @static
 */
DBImplementation.parseTrackUri = function(uri) {
	var protocolParts = uri.split('://', 2);
	var protocol = protocolParts[0];

	var queryParts = (protocolParts[1] || '').split('?', 2);
	var location = protocol == PROTOCOL_LIBRARY ? path.join(ROOT, queryParts[0] || '') : queryParts[0] || '';

	var params = utils.parseQueryParams(queryParts[1] || '');
	return {
		protocol: protocol,
		location: location,
		trackOffset: params.trackoffset
	};
};


/**
 * @param {{protocol:string, parts:Array<string>}} uriInfo
 * @return {string}
 * @static
 */
DBImplementation.getParentUri = function(uriInfo) {
	if (uriInfo.parts.length == 0) {
		return '';
	}
	var allButLast = uriInfo.parts.slice(0, uriInfo.parts.length - 1);
	return uriInfo.protocol + '://' + allButLast.join('/');
};

/**
 * Parse artist uri
 * @param {string} uri
 * @return {{protocol:string, parts:Array<string>, query: object}}
 * @static
 */
DBImplementation.parseUri = function(uri) {

	// fix: uri should always ends with '://'
	if (uri.indexOf('://') < 0) {
		uri += '://';
	}

	var protocolParts = uri.split('://', 2);
	var protocol = protocolParts[0];
	var queryPart = (protocolParts[1] || '').split('?');

	var parts = ((queryPart[0] || '').split('/') || []).map(function(part) {
		return part ? decodeURIComponent(part) : undefined;
	}).filter(function(part) {
		return !!part;
	});


	var query = ((queryPart[1] || '').split('&') || []).map(function(part) {
		var values = part.split('=', 2);
		return {
			key: values[0] ? decodeURIComponent(values[0]) : null,
			value: values[0] ? decodeURIComponent(values[1]) : null
		};
	}).reduce(function(result, item) {
		if(item.key) {
			result[item.key] = item.value;
		}
		return result;
	}, {});


	return {
		protocol: protocol,
		parts: parts,
		query: query
	};
};
