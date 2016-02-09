'use strict';

var libQ = require('kew');
var libFast = require('fast.js');
var libLevel = require('level');
var libMusicBrainz = require('musicbrainz');
var libCoverArt = require('coverart');
var libFileSystem = require('fs');

// Define the CoreMetadataCache class
// This module manages a database of the metadata that is slow to read or not available from the track itself.
// Examples include album art, artist images, related artist listing, biographies, etc.
// This database has the same structure and keys as the music library database, but does not get cleared
// with a music library rebuild. It is essentially a local cache of album art, artist images, etc.
// This module queries external (or internal) source to fetch this metadata in the background as the
// rest of the Volumio player continues operating. This minimizes music library build/update time.
module.exports = CoreMetadataCache;
function CoreMetadataCache(musicLibrary) {
	// This fixed variable will let us refer to 'this' object at deeper scopes
	var self = this;

	// Save a reference to the parent musicLibrary
	self.musicLibrary = musicLibrary;

	self.metadataCacheReadyDeferred = null;
	self.metadataCacheReady = libQ.resolve();
	self.metadataCache = {};

	self.sMetadataCachePath = './db/metadatacache';
	//self.loadMetadataCacheFromDB();
	self.metadataCache = libLevel(self.sMetadataCachePath, {'valueEncoding': 'json', 'createIfMissing': true});

	self.arrayTaskStack = [];
	self.promisedTasks = libQ.resolve();

	libQ.nfcall(libFast.bind(dbMetadataCache.get, dbMetadataCache), 'taskstack')
		.then(function(arrayStoredTasks) {
			self.arrayTaskStack = self.arrayTaskStack.concat(objStoredTasks);
		});

	self.coverArtClient = new libCoverArt({userAgent:'Volumio2'});
	self.sAlbumArtPath = './db/albumart';
}

// External Methods --------------------------------------------------------------------------------------------------------
// Load a LevelDB from disk containing the extra metadata and the task stacks
CoreMetadataCache.prototype.loadMetadataCacheFromDB = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreMetadataCache::loadMetadataCacheFromDB');

	self.arrayTaskStack = [];
	self.metadataCache = {};

	self.metadataCacheReadyDeferred = libQ.defer();
	self.metadataCacheReady = self.metadataCacheReadyDeferred.promise;

	var dbMetadataCache = libLevel(self.sMetadataCachePath, {'valueEncoding': 'json', 'createIfMissing': true});
	return libQ.resolve()
		.then(function() {
			return libQ.nfcall(libFast.bind(dbMetadataCache.get, dbMetadataCache), 'metadatacache');
		})
		.then(function(result) {
			self.metadataCache = result;

			return libQ.nfcall(libFast.bind(dbMetadataCache.get, dbMetadataCache), 'taskstack');
		})
		.then(function(result) {
			self.arrayTaskStack = result;

			try {
				self.metadataCacheReadyDeferred.resolve();
			} catch (error) {
				throw new Error('Unable to resolve metadataCacheReady promise: ' + error);
			}

			return libQ.resolve();
		})
		.fail(function(sError) {
			try {
				self.metadataCacheReadyDeferred.reject(sError);
			} catch (error) {
				throw new Error('Unable to reject metadataCacheReady promise: ' + error);
			}

			throw new Error('Error reading DB: ' + sError);
		})
		.fin(libFast.bind(dbMetadataCache.close, dbMetadataCache));
};

CoreMetadataCache.prototype.addTask = function(sTable, sKey) {
	var self = this;
	self.arrayTaskStack.push({'table': sTable, 'key': sKey});

	return self.enqueueNextTask();
};

// Internal methods ----------------------------------------------------------------------------------------
CoreMetadataCache.prototype.enqueueNextTask = function() {
	var self = this;

	return self.promisedTasks
		.then(function() {
			// Wait for both metadata cache and music library to become ready
			return libQ.all([self.metadataCacheReady, self.musicLibrary.libraryReady]);
		})
		.then(function() {
			// Then process the next task
			var curTask = self.arrayTaskStack.shift();
			var sTable = curTask.table;
			var sKey = curTask.key;
			var promisedSubTasks = libQ.resolve();

			if (!(sTable in self.metadataCache)) {
				self.metadataCache[sTable] = {};
			}

			if (!(sKey in self.metadataCache[sTable])) {
				self.metadataCache[sTable][sKey] = {};
			}

			// All objects will first get their MBID (Musicbrainz ID) stored
			var sType = self.musicLibrary.library[sTable][sKey].type;
			var sName = self.musicLibrary.library[sTable][sKey].name;
			if (!('mbid' in self.metadataCache[sTable][sKey])) {
				promisedSubTasks = promisedSubTasks
					.then(function() {
						return self.fetchMbid(sType, sName);
					})
					.then(function(sMbid) {
						self.metadataCache[sTable][sKey].mbid = sMbid;
					})
			}

			if (sType === 'album') {
				// Then if the object is an album, also pull album art
				if (!('albumart' in self.metadataCache[sTable][sKey])) {
					promisedSubTasks = promisedSubTasks
						.then(function() {
							return self.fetchAlbumArt(self.metadataCache[sTable][sKey].mbid, self.sAlbumArtPath);
						})
						.then(function(sPath) {
							self.metadataCache[sTable][sKey].albumart = sPath;
						});
				}
			}
			// TODO - store task stack in DB here
			return promisedSubTasks;
		});
};

CoreMetadataCache.prototype.fetchMbid = function(sType, sValue) {
	var self = this;

	return libQ.resolve()
		.then(function() {
			if (sType === 'album') {
				return libQ.nfcall(libMusicBrainz.searchReleases, sValue, {});
			} else if (sType === 'artist') {
				return libQ.nfcall(libMusicBrainz.searchArtists, sValue, {});
			}
		})
		.then(function(arrayResults) {
console.log(arrayResults[0].id);
			return arrayResults[0].id;
		})
		.fail(function(error) {
			// Have this clause to catch errors so the parent promise does not abort
			return '';
		});
};

CoreMetadataCache.prototype.fetchAlbumArt = function(sMbid, sBasePath) {
	var self = this;
	var bufferImage = null;
	var sPath = '';

console.log('fetching art for ' + sMbid);
	return libQ.nfcall(libFast.bind(self.coverArtClient.release, self.coverArtClient), sMbid, {piece: 'front'})
		.then(function(out) {
			bufferImage = out.image;
			sPath = sBasePath + '/' + sMbid + out.extension;
console.log(sPath);
			return libQ.nfcall(libFileSystem.open, sPath, 'w');
		})
		.then(function(file) {
			return libQ.nfcall(libFileSystem.write, file, bufferImage, 0, 'binary');
		})
		.then(function(result) {
			console.log('file written');
			return sPath;
		})
		.fail(function(error) {
			// Have this clause to catch errors so the parent promise does not abort
			return sPath;
		});
};