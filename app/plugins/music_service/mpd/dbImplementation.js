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
	this.albumArtPlugin = this.commandRouter.pluginManager.getPlugin('miscellanea', 'albumart');
	this.library = new MusicLibrary(context);
}


/**
 * @param {SearchQuery} query
 * @return {Promise<SearchResult[]>}
 * @implement plugin api
 */
DBImplementation.prototype.search = function(query) {
	var self = this;

	var protocolParts = (query.uri || '').split('://', 2);
	var protocol = protocolParts[0];

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
		// TODO: caller doesn't log the error
		console.error(e);
		throw e;
	});
};


/**
 * @param {string} searchValue
 * @return {Promise<SearchResultItem[]>}
 */
DBImplementation.prototype.searchArtists = function(searchValue) {
	return this.library.searchArtists(searchValue).then(function(artistsArr) {
		return artistsArr.map(function(artist) {
			return DBImplementation.artist2SearchResult(artist);
		});
	});
};

/**
 * @param {string} searchValue
 * @return {Promise<SearchResultItem[]>}
 */
DBImplementation.prototype.searchAlbums = function(searchValue) {
	return this.library.searchAlbums(searchValue).then(function(albumsArr) {
		return albumsArr.map(function(album) {
			return DBImplementation.album2SearchResult(album);
		});
	});
};


/**
 * @param {string} searchValue
 * @return {Promise<SearchResultItem[]>}
 */
DBImplementation.prototype.searchTracks = function(searchValue) {
	return this.library.searchTracks(searchValue).then(function(trackArr) {
		return trackArr.map(function(track) {
			return DBImplementation.track2SearchResult(track);
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
	return libQ.resolve().then(function() {
		// fix: uri should always ends with '://'
		if (uri.indexOf('://') < 0) {
			uri += '://';
		}

		var protocolParts = uri.split('://', 2);
		var protocol = protocolParts[0];
		self.logger.info('DBImplementation.handleBrowseUri', uri, protocol);

		var promise;
		switch (protocol) {
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
 * @return {Promise<BrowseResult>}
 */
DBImplementation.prototype.handleLibraryUri = function(uri) {
	var self = this;
	var uriInfo = DBImplementation.parseUri(uri);

	return self.library.lsFolder(uriInfo.location).then(function(folderEntries) {
		var items = folderEntries.map(function(entry) {
			if (entry.type == 'file') {
				return DBImplementation.track2SearchResult(entry.data);
			} else if (entry.type == 'folder') {
				return DBImplementation.folder2SearchResult(entry.data);
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
					uri: isRoot ? '' : DBImplementation.getUri({location: path.dirname(uriInfo.location)})
				}
			}
		};
	});
};


/**
 * @param {string} uri
 * @return {Promise<BrowseResult>}
 */
DBImplementation.prototype.handleArtistsUri = function(uri) {
	var self = this;
	var protocolParts = uri.split('://', 2);
	var artistName = decodeURIComponent(protocolParts[1]);

	var promise;
	if (!artistName) {
		// list all artists
		promise = self.library.searchArtists().then(function(artistArr) {
			return artistArr.map(function(artist) {
				return DBImplementation.artist2SearchResult(artist);
			});
		});
	} else {
		// list artist tracks
		var orderBy = ['tracknumber'];
		promise = self.library.getByArtist(artistName, orderBy).then(function(trackArr) {
			return trackArr.map(function(track) {
				return DBImplementation.track2SearchResult(track);
			});
		});
	}

	return promise.then(function(items) {
		return {
			navigation: {
				lists: [{
					availableListViews: [
						'list', 'grid'
					],
					items: items
				}],
				prev: {
					uri: artistName ? PROTOCOL_ARTISTS + '://' : ''
				}
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
	var protocolParts = uri.split('://', 2);
	var albumName = decodeURIComponent(protocolParts[1]);

	var promise;
	if (!albumName) {
		// list all albums
		promise = self.library.searchAlbums().then(function(albumArr) {
			return albumArr.map(function(album) {
				return DBImplementation.album2SearchResult(album);
			});
		});
	} else {
		// list album tracks
		var orderBy = ['tracknumber'];
		promise = self.library.getByAlbum(albumName, orderBy).then(function(trackArr) {
			return trackArr.map(function(track) {
				return DBImplementation.track2SearchResult(track);
			});
		});
	}

	return promise.then(function(items) {
		return {
			navigation: {
				lists: [{
					availableListViews: [
						'list', 'grid'
					],
					items: items
				}],
				prev: {
					uri: albumName ? PROTOCOL_ALBUMS + '://' : ''
				}
			}
		};

	});
};

/**
 * @param {string} uri
 * @return {Promise<BrowseResult>}
 *
 * @example uri:
 *   genres://Genre/Artist/
 */
DBImplementation.prototype.handleGenresUri = function(uri) {
	var self = this;
	var protocolParts = uri.split('://', 2);
	var genreComponents = decodeURIComponent(protocolParts[1]).split('/');
	var genreName = genreComponents[0];

	var promise;
	if (!genreName) {
		// list all albums
		promise = self.library.searchGenres().then(function(genresArr) {
			return genresArr.map(function(genre) {
				return DBImplementation.genre2SearchResult(genre);
			});
		});
	} else {
		// list tracks by genre
		var orderBy = ['tracknumber'];
		promise = self.library.getByGenre(genreName, orderBy).then(function(trackArr) {
			return trackArr.map(function(track) {
				return DBImplementation.track2SearchResult(track);
			});
		});
	}

	return promise.then(function(items) {
		return {
			navigation: {
				lists: [{
					availableListViews: [
						'list'
					],
					items: items
				}],
				prev: {
					uri: genreName ? PROTOCOL_GENRES + '://' : ''
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
				promise = self.explodeAlbumUri(uri);
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

	var trackInfo = DBImplementation.parseUri(uri);
	return this.library.getTrack(trackInfo.location, trackInfo.trackOffset).then(function(track) {

		var result = {
			uri: track.location.substr(1), // mpd expects absolute path without first '/'
			service: 'mpd',
			name: track.title,
			artist: track.artist,
			album: track.album,
			type: 'track',
			tracknumber: track.tracknumber,
			albumart: self.getAlbumArt({
				artist: track.artist,
				album: track.album
			}, path.dirname(track.location), 'fa-music'),
			duration: track.format.duration,
			samplerate: track.samplerate,
			bitdepth: track.format.bitdepth,
			trackType: path.extname(track.location)
		};

		return [result];
	});
};


/**
 * @param {string} uri
 * @return {Promise<TrackInfo>}
 */
DBImplementation.prototype.explodeAlbumUri = function(uri) {
	var self = this;

	var protocolParts = uri.split('://', 2);
	var artistName = decodeURIComponent(protocolParts[1]);
	return this.library.query({
		where: {
			artist: {[Sequelize.Op.eq]: artistName}
		},
		order: [],
		raw: true
	}).then(function(tracks) {
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
	var info = DBImplementation.parseUri(uri);
	this.logger.info('DBImplementation.updateDb', info.location);

	this.library.update(info.location);
};


/**
 * @param {{artist: string, album?:string, size?:string}} data
 * @param {string} path  path to album art folder to scan
 * @param {string} icon  icon to show
 * @return {string}
 * @private
 */
DBImplementation.prototype.getAlbumArt = function(data, path, icon) {
	if (this.albumArtPlugin)
		return this.albumArtPlugin.getAlbumArt(data, path, icon);
	else {
		return '/albumart';
	}
};


/**
 * Get track uri
 * @param {{location:string, trackOffset?:number}} track
 * @return {string}
 * @private
 * @static
 */
DBImplementation.getUri = function(track) {
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
DBImplementation.parseUri = function(uri) {
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
 * @param {AudioMetadata} record
 * @return {SearchResultItem}
 * @private
 * @static
 */
DBImplementation.track2SearchResult = function(record) {
	return {
		service: 'mpd',	// TODO: 'music_library' are not routed to this plugin
		// service: PLUGIN_NAME,
		type: 'song',
		title: record.title || '',
		artist: record.artist || '',
		album: record.album || '',
		albumart: '',	// TODO: album art for a folder
		// albumart : self.getAlbumArt({artist: artist, album: album}, self.getParentFolder('/mnt/' + path),'fa-tags')
		icon: 'fa fa-music',
		uri: DBImplementation.getUri(record)
	};
};



/**
 * Technically, plays track
 * @param {AudioMetadata} record
 * @return {SearchResultItem}
 * @private
 * @static
 */
DBImplementation.prototype.track2mpd = function(record) {
	var self = this;
	return {
		uri: record.location.substr(1), // mpd expects absolute path without first '/'
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
		trackType: path.extname(record.location)
	};
};



/**
 * @param {string} artistName
 * @return {SearchResultItem}
 * @private
 * @static
 */
DBImplementation.artist2SearchResult = function(artistName) {
	return {
		service: 'mpd',
		// service: PLUGIN_NAME,
		type: 'folder',
		title: artistName,
		albumart: '',	// TODO: album art for an artist
		// albumart: self.getAlbumArt({artist: artist},undefined,'users')
		uri: PROTOCOL_ARTISTS + '://' + encodeURIComponent(artistName)
	};
};

/**
 * @param {string} albumName
 * @return {SearchResultItem}
 * @private
 * @static
 */
DBImplementation.album2SearchResult = function(albumName) {
	return {
		service: PLUGIN_NAME,
		type: 'folder',
		title: albumName,
		albumart: '',	// TODO: album art for an album
		// albumart: self.getAlbumArt({artist: artist, album: album}, self.getParentFolder('/mnt/' + path),'fa-tags')
		uri: PROTOCOL_ALBUMS + '://' + encodeURIComponent(albumName)
	};
};


/**
 * @param {string} genreName
 * @return {SearchResultItem}
 * @private
 * @static
 */
DBImplementation.genre2SearchResult = function(genreName) {

	return {
		service: PLUGIN_NAME,
		type: 'folder',
		title: genreName,
		albumart: '',	// TODO: album art for genre
		// albumart: self.getAlbumArt({},undefined,'fa-tags');
		uri: PROTOCOL_GENRES + '://' + encodeURIComponent(genreName)
	};
};


/**
 * @param {string} location
 * @return {SearchResultItem}
 * @private
 * @static
 */
DBImplementation.folder2SearchResult = function(location) {

	// '/mnt/USB/folder1/folder2/..' to 'USB'
	var rootSubfolder = location.replace(ROOT + path.sep, '');
	rootSubfolder = rootSubfolder.split(path.sep, 2)[0];

	var dirtype, diricon;
	switch (rootSubfolder) {
		case 'USB':
			dirtype = 'remdisk';
			diricon = 'fa fa-usb';
			break;
		case 'INTERNAL':
			dirtype = 'internal-folder';
			diricon = 'fa fa-folder-open-o';
			break;
		default:
			dirtype = 'folder';
			diricon = 'fa fa-folder-open-o';
	}

	return {
		service: PLUGIN_NAME,
		type: dirtype,
		title: path.basename(location),
		albumart: '',	// TODO: album art for a folder
		icon: diricon,
		uri: DBImplementation.getUri({location: location})
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



