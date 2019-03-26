var libQ = require('kew');
var path = require('path');
var url = require('url');

// TODO: I think we can keep this module inside 'mpd' folder
var MusicLibrary = require('../music_library/index');
var utils = require('../music_library/lib/utils');

module.exports = DBImplementation;


/////////////////////////////

// TODO: move to config?
var ROOT = '/mnt';


var PLUGIN_PROTOCOL = 'music-library';
var PLUGIN_NAME = 'music_library';


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

	self.logger.info('DBImplementation.search', query);
	console.time('DBImplementation.search');
	var searchValue = query.value;

	return this.library.searchAll(searchValue).then(function(records) {
		return records.map(DBImplementation.record2SearchResult);
	}).then(function(tracks) {
		console.log('DBImplementation.search: found %s track(s)', tracks.length);

		var trackdesc = self.commandRouter.getI18nString(tracks.length > 1 ? 'COMMON.TRACKS' : 'COMMON.TRACK');
		var title = self.commandRouter.getI18nString('COMMON.FOUND');
		return [{
			'title': title + ' ' + tracks.length + ' ' + trackdesc + ' \'' + query.value + '\'',
			'availableListViews': [
				'list'
			],
			'items': tracks
		}];

	}).then(function(searchResult) {
		console.timeEnd('DBImplementation.search');
		return searchResult;
	}).fail(function(e) {
		// TODO: caller doesn't log the error
		console.error(e);
		throw e;
	});
};


/**
 * @param {string} searchValue
 * @return {Promise<Album[]>}
 */
DBImplementation.prototype.searchAlbums = function(searchValue) {

};


/**
 *
 * Shall handle uris:
 * albums://
 * aritsts://
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
			case 'music-library':
				promise = self.handleLibraryUri(uri);
				break;
			case 'artists':
				promise = self.handleArtistsUri(uri);
				break;
			case 'albums':
				promise = self.handleAlbumsUri(uri);
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
 * @implement plugin api
 */
DBImplementation.prototype.explodeUri = function(uri) {
	var self = this;
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

	return this.library.lsFolder(uriInfo.location).then(function(folderEntries) {
		var items = folderEntries.map(function(entry) {
			if (entry.type == 'file') {
				return DBImplementation.record2SearchResult(entry.data);
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
	var artistName = decodeURI(protocolParts[1]);

	var promise;
	if (!artistName) {
		// list all artists
		promise = this.library.getArtists().then(function(artistArr) {
			return artistArr.map(function(artist) {
				return DBImplementation.artist2SearchResult(artist);
			});
		});
	} else {
		// list artist tracks
		promise = this.library.getByArtist(artistName).then(function(trackArr) {
			return trackArr.map(function(track) {
				return DBImplementation.record2SearchResult(track);
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
					uri: artistName ? 'artists://' : ''
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
	var albumName = decodeURI(protocolParts[1]);

	var promise;
	if (!albumName) {
		// list all albums
		promise = this.library.getAlbums().then(function(albumArr) {
			return albumArr.map(function(album) {
				return DBImplementation.album2SearchResult(album);
			});
		});
	} else {
		// list album tracks
		promise = this.library.getByAlbum(albumName).then(function(trackArr) {
			return trackArr.map(function(track) {
				return DBImplementation.record2SearchResult(track);
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
					uri: albumName ? 'albums://' : ''
				}
			}
		};

	});
};



/**
 * @param {string} [uri]
 * @return {void}
 * @implement
 */
DBImplementation.prototype.updateDb = function(uri) {
	uri = uri || (PLUGIN_PROTOCOL + '://');
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
	return track.location.replace(ROOT, PLUGIN_PROTOCOL + '://') + (params ? '?' + params : '');
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
	var location = protocol == PLUGIN_PROTOCOL ? path.join(ROOT, queryParts[0] || '') : queryParts[0] || '';

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
DBImplementation.record2SearchResult = function(record) {
	return {
		service: 'mpd',	// TODO: 'music_library' are not routed to this plugin
		// service: PLUGIN_NAME,
		type: 'song',
		title: record.title || '',
		artist: record.artist || '',
		album: record.album || '',
		albumart: '',	// TODO: album art for a folder
		icon: 'fa fa-music',
		uri: DBImplementation.getUri(record)
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
		service: PLUGIN_NAME,
		type: 'folder',
		title: artistName,
		albumart: '',	// TODO: album art for an artist
		uri: 'artists://' + encodeURI(artistName)
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
		uri: 'albums://' + encodeURI(albumName)
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
		albumart: '',	// TODO: album art
		icon: diricon,
		uri: DBImplementation.getUri({location: location})
	};
};




