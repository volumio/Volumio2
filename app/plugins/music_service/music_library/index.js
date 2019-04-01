var fs = require('fs-extra');
var path = require('path');
var libQ = require('kew');
var Sequelize = require('sequelize');
var FileScanner = require('./lib/fileScanner');
var metadata = require('./lib/metadata');
var utils = require('./lib/utils');

module.exports = MusicLibrary;

// TODO: move to config?
var ROOT = '/mnt';

// On startup, the database are copied to LIBRARY_DB_TEMP and be accessed\written from there.
// After each scanning routine has terminated, it's copied back to LIBRARY_DB.
// This is to minimize sd card writes.
var LIBRARY_DB = '/data/musiclibrary/library.db';
var LIBRARY_DB_TEMP = '/tmp/library.db';

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

	/**
	 * @type {Date}
	 */
	this.scanStartedAt = null;
	/**
	 * @type {string}
	 */
	this.scanPath = null;

	// initialize database
	try {
		var stat = fs.statSync(LIBRARY_DB);
		fs.copySync(LIBRARY_DB, LIBRARY_DB_TEMP);
		self.logger.info('MusicLibrary: Database backup loaded');
	} catch (e) {
		self.logger.info('MusicLibrary: No database backup');
	}


	this.sequelize = new Sequelize({
		// logging: false,
		dialect: 'sqlite',
		storage: LIBRARY_DB_TEMP
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
			cbStart: onScanStarted,
			cbStop: onScanFinished,
			cbFileFound: processFile,
			cbError: processError,
			cbOtherFound: function() {/* noop */
			}
		});

		//
		self.scanPath = ROOT;
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
			self.logger.info('MusicLibrary: remove files from library:', location);
			// remove content from the library
			return self.removeFolder(location);
		} else {
			self.logger.warn(err);
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

	/**
	 *
	 */
	function onScanStarted() {
		self.scanStartedAt = new Date();
	}

	/**
	 *
	 */
	function onScanFinished() {
		// remove all records which are not found during scan
		self.logger.info('MusicLibrary: remove all unaffected items');

		// wait for debounceTime, so we make sure all records are saved/updated
		return libQ.delay(config.debounceTime * 2).then(function() { // we multiply by 2 to make sure cache is processed
			return self.model.AudioMetadata.destroy({
				where: {
					[Sequelize.Op.and]: {
						// It's not clear, but 'endsWith' produce "LIKE 'hat%'" condition
						// http://docs.sequelizejs.com/manual/querying.html#operators
						location: {[Sequelize.Op.endsWith]: self.scanPath + path.sep},
						updatedAt: {[Sequelize.Op.lt]: self.scanStartedAt}
					}
				}
			});
		}).then(function(numDeleted) {
			self.logger.info('MusicLibrary: removed all unaffected items:', numDeleted);
			return self.backupDatabase();
		});
	}


} // -


/**
 * @return {Promise<*>}
 * @private
 */
MusicLibrary.prototype.backupDatabase = function() {
	var self = this;
	return libQ.nfcall(fs.ensureDir, path.dirname(LIBRARY_DB)).then(function() {
		return libQ.nfcall(fs.copy, LIBRARY_DB_TEMP, LIBRARY_DB);
	}).then(function() {
		self.logger.info('MusicLibrary: Database backup done', LIBRARY_DB);
	}).fail(function(err) {
		self.logger.error('MusicLibrary: Database backup failed', err);
	});
};


/**
 * Rescan location and update missing files.
 * Note: it doesn't update metadata for existed files
 * @param {string} [location]
 */
MusicLibrary.prototype.update = function(location) {
	this.fileScanner.addTarget(location);
};


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
	var updateDebounced = utils.debounceTimeAmount(updateRecords, config.debounceTime, config.debounceSize);


	return metadata.parseFile(location)
		.then(function(metadataArr) {
			return utils.iterateArrayAsync(metadataArr, updateMetadata);
		})
		.fail(function(err) {
			self.logger.error(err);
		});


	/**
	 * @param {AudioMetadata} metadata
	 * @return {Promise<any>}
	 * @private
	 */
	function updateMetadata(metadata) {
		self.logger.info('MusicLibrary: track found: %s - %s', metadata.album, metadata.title);

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
			} else {
				// update 'updatedAt' field
				return updateDebounced(record.id);
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

	/**
	 * Update 'updatedAt' field value.
	 * That's need to make sure file is stil exists and wouldn't be removed by when scan is finished.
	 * @see {@link onScanFinished}
	 *
	 * @param {Array<number>} ids
	 * @return {Promise<*>}
	 * @private
	 */
	function updateRecords(ids) {
		return self.sequelize.query('UPDATE AudioMetadata SET updatedAt = ? WHERE AudioMetadata.id in (' + ids.join(',') + ')', {
			replacements: [new Date()]
		});
	}

};

//
// /**
//  * @param {string} searchStr
//  * @return {Promise<AudioMetadata[]>}
//  */
// MusicLibrary.prototype.searchAll = function(searchStr) {
// 	var self = this;
//
// 	return libQ.resolve().then(function() {
// 		return self.model.AudioMetadata.findAll({
// 			where: {
// 				[Sequelize.Op.or]: {
// 					title: {[Sequelize.Op.substring]: searchStr},
// 					album: {[Sequelize.Op.substring]: searchStr},
// 					artist: {[Sequelize.Op.substring]: searchStr}
// 				}
// 			},
// 			raw: true
// 		});
// 	});
// };


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
	var self = this;
	trackOffset = typeof trackOffset == 'undefined' ? null : trackOffset;

	return libQ.resolve().then(function() {
		return self.model.AudioMetadata.findOne({
			where: {
				location: location,
				trackOffset: trackOffset
			},
			raw: true
		});
	});
};


/**
 * @param {string} searchStr
 * @param {string[]} [orderBy] any property of {@link AudioMetadata}
 * @return {Promise<AudioMetadata[]>}
 */
MusicLibrary.prototype.searchTracks = function(searchStr, orderBy) {
	var self = this;
	orderBy = orderBy || ['tracknumber'];

	return libQ.resolve().then(function() {
		return self.model.AudioMetadata.findAll({
			where: {
				[Sequelize.Op.or]: {
					title: {[Sequelize.Op.substring]: searchStr}
				}
			},
			order: orderBy,
			raw: true
		});
	});
};


/**
 * @param {string} [searchString]
 * @return {Promise<Array<string>>}
 */
MusicLibrary.prototype.searchArtists = function(searchString) {
	var self = this;
	return libQ.resolve().then(function() {
		// 'distinct'
		return self.model.AudioMetadata.findAll({
			attributes: [
				[Sequelize.fn('DISTINCT', Sequelize.col('artist')), 'artist']
			],
			where: searchString ? {
				artist: {[Sequelize.Op.substring]: searchString}
			} : {},
			order: ['artist'],
			raw: true
		}).then(function(records) {
			return records.map(function(record) {
				return record.artist;
			});
		});
	});
};

/**
 * @param {string} artistName
 * @param {string[]} [orderBy] any property of {@link AudioMetadata}
 * @return {Promise<Array<AudioMetadata>>}
 */
MusicLibrary.prototype.getByArtist = function(artistName, orderBy) {
	var self = this;
	orderBy = orderBy || ['tracknumber'];
	return libQ.resolve().then(function() {
		return self.model.AudioMetadata.findAll({
			where: {
				artist: {[Sequelize.Op.eq]: artistName}
			},
			order: orderBy,
			raw: true
		});
	});
};

/**
 * @param {string} [searchString]
 * @return {Promise<Array<string>>}
 */
MusicLibrary.prototype.searchAlbums = function(searchString) {
	var self = this;
	return libQ.resolve().then(function() {
		// 'distinct'
		return self.model.AudioMetadata.findAll({
			attributes: [
				[Sequelize.fn('DISTINCT', Sequelize.col('album')), 'album']
			],
			where: searchString ? {
				album: {[Sequelize.Op.substring]: searchString}
			} : {},
			order: ['album'],
			raw: true
		}).then(function(records) {
			return records.map(function(record) {
				return record.album;
			});
		});
	});
};

/**
 * @param {string} albumName
 * @param {string[]} [orderBy] any property of {@link AudioMetadata}
 * @return {Promise<Array<AudioMetadata>>}
 */
MusicLibrary.prototype.getByAlbum = function(albumName, orderBy) {
	var self = this;
	orderBy = orderBy || ['tracknumber'];
	return libQ.resolve().then(function() {
		return self.model.AudioMetadata.findAll({
			where: {
				album: {[Sequelize.Op.eq]: albumName}
			},
			order: orderBy,
			raw: true
		});
	});
};


/**
 * @param {string} [searchString]
 * @return {Promise<Array<string>>}
 */
MusicLibrary.prototype.searchGenres = function(searchString) {
	var self = this;
	return libQ.resolve().then(function() {
		// 'distinct'
		return self.model.AudioMetadata.findAll({
			attributes: [
				[Sequelize.fn('DISTINCT', Sequelize.col('genre')), 'genre']
			],
			where: searchString ? {
				genre: {[Sequelize.Op.substring]: searchString}
			} : {},
			order: ['genre'],
			raw: true
		}).then(function(records) {
			return records.map(function(record) {
				return record.genre;
			});
		});
	});
};

/**
 * @param {string} genreName
 * @param {string[]} [orderBy] any property of {@link AudioMetadata}
 * @return {Promise<Array<AudioMetadata>>}
 */
MusicLibrary.prototype.getByGenre = function(genreName, orderBy) {
	var self = this;
	orderBy = orderBy || ['tracknumber'];
	return libQ.resolve().then(function() {
		return self.model.AudioMetadata.findAll({
			where: {
				genre: {[Sequelize.Op.eq]: genreName}
			},
			order: orderBy,
			raw: true
		});
	});
};


/**
 * Get folder content
 * returns:
 *  - for file entry: {type: 'file', data:AudioMetadata}
 *  - for folder entry: {type: 'folder', data:string} where 'data'data is an absolute folder path
 *
 * @param {string} location
 * @return {Promise<Array<{type: 'file'|'folder', data:AudioMetadata|string}>>}
 */
MusicLibrary.prototype.lsFolder = function(location) {
	var self = this;

	// for root folders - we need to see if there any files inside
	// if no files - don't show it
	var isRoot = location == ROOT;

	return utils.readdir(location).then(function(folderEntries) {
		return utils.iterateArrayAsync(folderEntries, function(stats) {
			if(stats.name.startsWith(".")==false)
			{
				var fullname = path.join(location, stats.name);

				if (stats.isFile() && metadata.isMediaFile(fullname)) {
					// file

					return self.getTrack(fullname).then(function(record) {
						if (record) {
							return {type: 'file', data: record};
						}
						// else - ignore it
					});

				} else if (stats.isDirectory()) {
					// folder

					if (isRoot) {
						return libQ.nfcall(fs.readdir, fullname).then(function(folderEntries) {
							if (folderEntries.length > 0) {
								return {type: 'folder', data: fullname};
							} else {
								// return nothing = don't show it
								self.logger.info('MusicLibrary.lsFolder empty folder', fullname);
							}
						});
					} else {
						return {type: 'folder', data: fullname};
					}

				} else {
					self.logger.info('MusicLibrary.lsFolder unknown entry type', fullname);
				}
				// ignore all other types
			}


		});
	});
};


