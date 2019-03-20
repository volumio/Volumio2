var fs = require('fs');
var path = require('path');
var Sequelize = require('sequelize');
var FileScanner = require('./lib/fileScanner');
var metadata = require('./lib/metadata');
var iterateArrayAsync = require('./lib/utils').iterateArrayAsync;

module.exports = MusicLibrary;


// var ROOT = '/mnt';
var ROOT = '/home/chertkov/Downloads/mnt/USB';


var config = {
	debounceTime: 1000,
	debounceSize: 20
};

/**
 *
 */
function MusicLibrary(commandRouter) {
	var self = this;

	// Save a reference to the parent commandRouter
	// self.commandRouter = commandRouter;
	// self.logger = self.commandRouter.logger;


	/**
	 * @type {AudioMetadata[]}
	 */
	var _insertCache = [];

	var _debounceTimer = null;


	// initialize database
	this._sequelize = new Sequelize({
		logging: false,
		dialect: 'sqlite',
		storage: __dirname + '/library.db'
	});

	this._model = {};

	/**
	 * @type {AudioMetadata}
	 */
	this._model.AudioMetadata = this._sequelize.import(__dirname + '/model/audioMetadata');

	this._sequelize.sync().then(function() {

		// initialize file scanning service
		self._fileScanner = new FileScanner({
			cbFileFound: _processFile,
			cbError: _processError,
			cbOtherFound: function() {/* noop */}
		});

		// TODO: don't scan all library on start
		self._fileScanner.addTarget(ROOT);

		// The recursive option is only supported on macOS and Windows. =(
		// https://nodejs.org/api/fs.html#fs_caveats
		self._fileWatcher = fs.watch(ROOT, {recursive: true}, _onFsChanges);
	});


	/**
	 * @param {'rename'|'change'} eventType
	 * @param {string} filename
	 */
	function _onFsChanges(eventType, filename) {
		// console.log('MusicLibrary._onFsChanges', eventType, filename);
		self._fileScanner.addTarget(path.join(ROOT, filename));
	}

	/**
	 * @param {Error} err
	 * @param {string} location
	 * @more NodeJS errors: https://nodejs.org/api/os.html#os_error_constants
	 */
	function _processError(err, location) {
		if (err.code == 'EACCES' || err.code == 'ENOSYS' || err.code == 'EIO') {
			// console.log('MusicLibrary: error %s at %s', err.code, err.path);
			return;
		}

		if (err.code == 'ENOENT') {
			console.log('MusicLibrary: remove files from library:', location);
			// remove content from the library
			return removeFolder(location);
		} else {
			console.warn(err);
		}
	}


	/**
	 * @param {string} location
	 */
	function _processFile(location) {
		// console.log('MusicLibrary._processFile: File was found:', location);
		if (!metadata.isMediaFile(location)) {
			return;
		}

		// parse metadata
		return metadata.parseFile(location)
			.then(function(metadata) {
				return iterateArrayAsync(metadata, updateMetadata);
			})
			.fail(function(err) {
				console.error(err);
			});
	}


	/**
	 * @param {string} location
	 * @return {Promise<*>}
	 */
	function removeFolder(location) {
		var AudioMetadata = self._model.AudioMetadata;
		return AudioMetadata.destroy({
			where: {
				// It's not clear, but 'endsWith' produce "LIKE 'hat%'" condition
				// http://docs.sequelizejs.com/manual/querying.html#operators
				location: {[Sequelize.Op.endsWith]: location + path.sep}
			}
		});
	}


	// save record
	/**
	 * @param {AudioMetadata} metadata
	 * @return {Promise<any>}
	 * @private
	 */
	function updateMetadata(metadata) {
		console.log('MusicLibrary: track found: %s - %s', metadata.album, metadata.title);

		var AudioMetadata = self._model.AudioMetadata;
		metadata.trackOffset = (typeof metadata.trackOffset == 'undefined') ? null : metadata.trackOffset;
		return AudioMetadata.findOne({
			where: {
				location: metadata.location,
				trackOffset: metadata.trackOffset
			}
		}).then(function(record) {
			if (!record) {
				// all 'write' operations should be debounced to reduce write operations count
				return _saveDebounced(metadata);
				// return AudioMetadata.create(recordData);
			}
		});
	}


	/**
	 * @param {AudioMetadata} audioMetadata
	 * @return {Promise<any>}
	 */
	function _saveDebounced(audioMetadata) {
		_insertCache.push(audioMetadata);

		// check debounce conditions
		if (_debounceTimer) {
			clearTimeout(_debounceTimer);
		}

		if (_insertCache.length >= config.debounceSize) {
			return __flushUpdateCache();
		} else {
			// TODO: technically, we can run in two concurrent write operations here
			_debounceTimer = setTimeout(__flushUpdateCache, config.debounceTime);
		}
	}

	/**
	 * @return {Promise<*>}
	 * @private
	 */
	function __flushUpdateCache() {
		var cache = _insertCache;
		_insertCache = [];
		return self._model.AudioMetadata.bulkCreate(cache);
	}


} // -


/**
 * @return {Promise<AudioMetadata[]>}
 * TODO: searchAll
 */
MusicLibrary.prototype.searchAll = function(token) {
	return this._model.AudioMetadata.findAll({
		where: {
			[Sequelize.Op.or]: {
				title: {[Sequelize.Op.substring]: token},
				album: {[Sequelize.Op.substring]: token},
				artist: {[Sequelize.Op.substring]: token}
			}
		},
		limit: 10
	});
};


/**
 * @return {boolean}
 */
MusicLibrary.prototype.isScanning = function() {
	return this._fileScanner.isScanning;
};