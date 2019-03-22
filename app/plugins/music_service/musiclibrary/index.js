var fs = require('fs');
var path = require('path');
var libQ = require('kew');
var Sequelize = require('sequelize');
var FileScanner = require('./lib/fileScanner');
var metadata = require('./lib/metadata');
var utils = require('./lib/utils');

module.exports = MusicLibrary;

// TODO: move to config?
var ROOT = '/mnt';

var PLUGIN_PROTOCOL = 'musiclibrary';
var PLUGIN_NAME = 'musiclibrary';


var config = {
	debounceTime: 1000,
	debounceSize: 20
};

/**
 *
 */
function MusicLibrary(context) {
	var self = this;

	// Save a reference to the parent commandRouter
	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;


	// initialize database
	this.sequelize = new Sequelize({
		// logging: false,
		dialect: 'sqlite',
		storage: __dirname + '/library.db'
		// storage: 'app/db/library.db' // this is fails with "SQLITE_ERROR: no such column: albumartist" o_O
	});

	this.model = {};

	/**
	 * @type {AudioMetadata}
	 */
	this.model.AudioMetadata = this.sequelize.import(__dirname + '/model/audioMetadata');
	// load more models here

	this.sequelize.sync().then(function() {

		// initialize file scanning service
		self.fileScanner = new FileScanner({
			cbFileFound: processFile,
			cbError: processError,
			cbOtherFound: function() {/* noop */
			}
		});

		// TODO: don't scan all library on start
		self.fileScanner.addTarget(ROOT);

		// The recursive option is only supported on macOS and Windows. =(
		// https://nodejs.org/api/fs.html#fs_caveats
		self.fileWatcher = fs.watch(ROOT, {recursive: true}, onFsChanges);
	});


	/**
	 * @param {'rename'|'change'} eventType
	 * @param {string} filename
	 */
	function onFsChanges(eventType, filename) {
		// console.log('MusicLibrary.onFsChanges', eventType, filename);
		self.fileScanner.addTarget(path.join(ROOT, filename));
	}

	/**
	 * @param {Error} err
	 * @param {string} location
	 * @more NodeJS errors: https://nodejs.org/api/os.html#os_error_constants
	 */
	function processError(err, location) {
		if (err.code == 'EACCES' || err.code == 'ENOSYS' || err.code == 'EIO') {
			// console.log('MusicLibrary: error %s at %s', err.code, err.path);
			return;
		}

		if (err.code == 'ENOENT') {
			console.log('MusicLibrary: remove files from library:', location);
			// remove content from the library
			return self.removeFolder(location);
		} else {
			console.warn(err);
		}
	}


	/**
	 * @param {string} location
	 */
	function processFile(location) {
		// console.log('MusicLibrary.processFile: File was found:', location);
		if (!metadata.isMediaFile(location)) {
			return;
		}
		return self.addFile(location);
	}

} // -


/**
 * @param {string} location
 * @return {Promise<*>}
 * @private
 */
MusicLibrary.prototype.removeFolder = function(location) {
	return this.model.AudioMetadata.destroy({
		where: {
			// It's not clear, but 'endsWith' produce "LIKE 'hat%'" condition
			// http://docs.sequelizejs.com/manual/querying.html#operators
			location: {[Sequelize.Op.endsWith]: location + path.sep}
		}
	});
};


/**
 * Add file to library
 * Debounce is used during scanning process to reduce write operations
 * @param {string} location
 * @return {Promise<*>}
 * @private
 */
MusicLibrary.prototype.addFile = function(location) {
	var self = this;

	var saveDebounced = utils.debounceTimeAmount(saveRecords, config.debounceTime, config.debounceSize);


	return metadata.parseFile(location)
		.then(function(metadataArr) {
			return utils.iterateArrayAsync(metadataArr, updateMetadata);
		})
		.fail(function(err) {
			console.error(err);
		});


	/**
	 * @param {AudioMetadata} metadata
	 * @return {Promise<any>}
	 * @private
	 */
	function updateMetadata(metadata) {
		console.log('MusicLibrary: track found: %s - %s', metadata.album, metadata.title);

		metadata.trackOffset = (typeof metadata.trackOffset == 'undefined') ? null : metadata.trackOffset;
		return self.model.AudioMetadata.findOne({
			where: {
				location: metadata.location,
				trackOffset: metadata.trackOffset
			}
		}).then(function(record) {
			if (!record) {
				// all 'write' operations should be debounced to reduce write operations count
				return saveDebounced(metadata);
				// return AudioMetadata.create(recordData);
			}
		});
	}

	/**
	 * @param {Array<AudioMetadata>} records
	 * @return {Promise<*>}
	 * @private
	 */
	function saveRecords(records) {
		return self.model.AudioMetadata.bulkCreate(records);
	}

};


/**
 * @param {SearchQuery} query
 * @return {Promise<SearchResult[]>}
 */
MusicLibrary.prototype.search = function(query) {
	var self = this;

	console.log('MusicLibrary.search', query);
	console.time('MusicLibrary.search');
	var safeValue = query.value.replace(/"/g, '\\"');

	return libQ.resolve().then(function() {
		return self.model.AudioMetadata.findAll({
			where: {
				[Sequelize.Op.or]: {
					title: {[Sequelize.Op.substring]: safeValue},
					album: {[Sequelize.Op.substring]: safeValue},
					artist: {[Sequelize.Op.substring]: safeValue}
				}
			}
		});
	}).then(function(records) {
		return records.map(MusicLibrary.record2SearchResult);
	}).then(function(tracks) {
		console.log('MusicLibrary.search: found %s track(s)', tracks.length);

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
		console.timeEnd('MusicLibrary.search');
		return searchResult;
	}).fail(function(e) {
		console.error(e);
		throw e;
		// TODO: errors in promise are not printed in console =(
	});
};


/**
 * @param {SearchQuery} query
 */
MusicLibrary.prototype.searchSong = function(query) {
	// TODO: search songs
};


/**
 * @param {SearchQuery} query
 */
MusicLibrary.prototype.searchArtist = function(query) {
	// TODO: search artists
};


/**
 * @param {SearchQuery} query
 */
MusicLibrary.prototype.searchAlbum = function(query) {
	// TODO: search albums
};


/**
 * @return {boolean}
 */
MusicLibrary.prototype.isScanning = function() {
	return this.fileScanner.isScanning;
};


/**
 * Load track info from database
 * @param {string} location
 * @param {number} [trackOffset]
 * @return {Promise<AudioMetadata>}
 */
MusicLibrary.prototype.getTrack = function(location, trackOffset) {
	trackOffset = typeof trackOffset == 'undefined' ? null : trackOffset;
	return this.model.AudioMetadata.findOne({
		where: {
			location: location,
			trackOffset: trackOffset
		}
	});
};


/**
 * @return {Promise<TrackInfo>}
 * @implement
 */
MusicLibrary.prototype.explodeUri = function(uri) {
	var trackInfo = MusicLibrary._parseTrackUri(uri);
	return this.getTrack(trackInfo.location, trackInfo.trackOffset).then(function(track) {

		var result = {
			uri: track.location.substr(1), // mpd expects absolute path without first '/'
			service: 'mpd',
			name: track.title,
			artist: track.artist,
			album: track.album,
			type: 'track',
			tracknumber: track.tracknumber,
			albumart: '',
			duration: '',
			samplerate: '',
			bitdepth: '',
			trackType: track.location.split('.').pop()
		};

		return [result];
	});
};


/**
 *
 * @param {string} uri
 * @return {Promise<BrowseResult>}
 * @implement
 */
MusicLibrary.prototype.handleBrowseUri = function(uri) {
	var self = this;
	var info = MusicLibrary._parseTrackUri(uri);

	return libQ.resolve().then(function() {
		return self.lsFolder(info.location);
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
					uri: uri == PLUGIN_PROTOCOL + '://' ? '' : uri.substring(0, uri.lastIndexOf(path.sep))
				}
			}
		};
	});

	// {
	// 	type: dirtype,
	// 		title: name,
	// 	service:'mpd',
	// 	albumart: albumart,
	// 	icon: 'fa fa-music',
	// 	uri: s0 + path
	// }
};


/**
 * @param {string} location
 *
 * @return {Promise<AudioMetadata>}
 */
MusicLibrary.prototype.lsFolder = function(location) {
	var self = this;

	return utils.readdir(location).then(function(folderEntries) {
		return utils.iterateArrayAsync(folderEntries, function(stats) {
			var fullname = path.join(location, stats.name);
			if (stats.isFile() && metadata.isMediaFile(fullname)) {
				return self.model.AudioMetadata.findOne({
					where: {
						location: fullname
					}
				}).then(function(record) {
					return MusicLibrary.record2SearchResult(record);
				});
			} else if (stats.isDirectory()) {
				return MusicLibrary.folder2SearchResult(fullname);
			} else {
				// ignore all other types
			}

		});
	});
};


/**
 * Get track uri
 * @param {{location:string, trackOffset?:number}} track
 * @return {string}
 * @private
 */
MusicLibrary._getTrackUri = function(track) {
	var params = track.trackOffset !== null ? 'trackoffset=' + track.trackOffset : null;
	return track.location.replace(ROOT, PLUGIN_PROTOCOL + '://') + (params ? '?' + params : '');
};

/**
 * @param {string} uri
 * @return {{location:string, trackOffset:number}} - primary key for AudioMetadata
 * @private
 */
MusicLibrary._parseTrackUri = function(uri) {
	var parts = uri.split('?');

	var location = parts[0].replace(PLUGIN_PROTOCOL + '://', ROOT);
	var params = utils.parseQueryParams(parts[1] || '');
	return {
		location: location,
		trackOffset: params.trackoffset
	};
};

/**
 * @param {AudioMetadata} record
 * @return {SearchResultItem}
 * @private
 */
MusicLibrary.record2SearchResult = function(record) {
	return {
		// service: 'music-library',
		service: PLUGIN_NAME,
		type: 'song',
		title: record.title || '',
		artist: record.artist || '',
		album: record.album || '',
		albumart: '',	// TODO: album art
		icon: 'fa fa-music',
		uri: MusicLibrary._getTrackUri(record)
	};
};


/**
 * @param {string} location
 * @return {SearchResultItem}
 * @private
 */
MusicLibrary.folder2SearchResult = function(location) {

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
		uri: MusicLibrary._getTrackUri({location: location})
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

