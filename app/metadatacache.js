var libQ = require('kew');
var libFast = require('fast.js');
var libLevel = require('level');
//var libMusicBrainz = require('musicbrainz');
//var libCoverArt = require('coverart');
var libFileSystem = require('fs');
var libCrypto = require('crypto');
var libBase64Url = require('base64-url');

// Define the CoreMetadataCache class
// This module manages a database of the metadata that is slow to read or not available from the track itself.
// Examples include album art, artist images, related artist listing, biographies, etc.
// This database has the same structure and keys as the music library database, but does not get cleared
// with a music library rebuild. It is essentially a local cache of album art, artist images, etc.
// This module queries external (or internal) source to fetch this metadata in the background as the
// rest of the Volumio player continues operating. This minimizes music library build/update time.
module.exports = CoreMetadataCache;
function CoreMetadataCache(commandRouter, musicLibrary) {
	// This fixed variable will let us refer to 'this' object at deeper scopes
	var self = this;

	// Save a reference to the parent musicLibrary
	self.musicLibrary = musicLibrary;
	self.commandRouter = commandRouter;

	self.metadataCacheReadyDeferred = null;
	self.metadataCacheReady = libQ.resolve();
	self.metadataCache = {};

	self.sMetadataCachePath = './app/db/metadatacache';
	//self.loadMetadataCacheFromDB();
	self.metadataCache = libLevel(self.sMetadataCachePath, {'valueEncoding': 'json', 'createIfMissing': true});

	self.arrayTaskStack = [];
	self.promisedTasks = libQ.resolve();

	/*
	libQ.nfcall(libFast.bind(dbMetadataCache.get, dbMetadataCache), 'taskstack')
		.then(function(arrayStoredTasks) {
			self.arrayTaskStack = self.arrayTaskStack.concat(objStoredTasks);
		});
	*/
	//self.coverArtClient = new libCoverArt({userAgent:'Volumio2'});
	self.sAlbumArtPath = './app/db/albumart';
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
}

CoreMetadataCache.prototype.addTask = function(sTable, sKey) {
	var self = this;
	self.arrayTaskStack.push({'table': sTable, 'key': sKey});

	return self.enqueueNextTask();
}

CoreMetadataCache.prototype.updateAllItems = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreMetadataCache::updateAllItems');

	libFast.map(Object.keys(self.musicLibrary.library.album), function(curKey) {
		self.addTask('album', curKey);
	});

	return libQ.resolve();
}

// Internal methods ----------------------------------------------------------------------------------------
CoreMetadataCache.prototype.enqueueNextTask = function() {
	var self = this;

	self.promisedTasks = self.promisedTasks
		.then(function() {
			// Wait for metadata cache to become ready
			return self.metadataCacheReady;
		})
		.then(function() {
			// Then process the next task
console.log('process task');
			var curTask = self.arrayTaskStack.shift();
			var sTable = curTask.table;
			var sKey = curTask.key;
			var promisedSubTasks = libQ.resolve();
			var curLibraryObject = self.musicLibrary.library[sTable][sKey];

			if (!(sTable in self.metadataCache)) {
				self.metadataCache[sTable] = {};
			}

			if (!(sKey in self.metadataCache[sTable])) {
				self.metadataCache[sTable][sKey] = {};
			}

			var curObject = self.metadataCache[sTable][sKey];
			if (!('images' in curObject)) {
				curObject.images = {};
			}
			// All objects will first get their MBID (Musicbrainz ID) stored
/*
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
*/
			if (curLibraryObject.type === 'album') {
				libFast.map(Object.keys(curLibraryObject.imageuris), function(curService) {
					if (!(curService in curObject.images)) {
						var sAlbumArtUri = curLibraryObject.imageuris[curService];

						promisedSubTasks = promisedSubTasks
							.then(function() {
								return self.fetchAlbumArt(curService, sAlbumArtUri);
							})
							.then(function(sPath) {
								curObject.images[curService] = sPath;
							});
					}
				});
			}
			// TODO - store task stack in DB here
			return promisedSubTasks;
		})
		.fail(function(error) {
			console.log(error.stack);
		});

}

CoreMetadataCache.prototype.fetchMbid = function(sType, sValue) {
	var self = this;

console.log(sValue);
	return libQ.resolve()
		.then(function() {
			// Remove some special characters - otherwise has been seen to result in malformed xml respose
			var sCleanedValue = sValue.replace(new RegExp('[!./?]', 'g'), '');

			if (sType === 'album') {
				return libQ.nfcall(libMusicBrainz.searchReleases, sCleanedValue, {});
			} else if (sType === 'artist') {
				return libQ.nfcall(libMusicBrainz.searchArtists, sCleanedValue, {});
			} else {
				throw new Error('Type \"' + sType + '\" has no metadata cache actions');
			}
		})
		.then(function(arrayResults) {
console.log(arrayResults[0].id);
			return arrayResults[0].id;
		})
		.fail(function(error) {
			// Have this clause to catch errors so the parent promise does not abort
console.log(error);
			return '';
		});
}

CoreMetadataCache.prototype.fetchAlbumArt = function(sService, sAlbumArtUri) {
	var self = this;
	var bufferImage = null;
	var sPath = '';

console.log('fetching art for ' + sAlbumArtUri);
	//return libQ.nfcall(libFast.bind(self.coverArtClient.release, self.coverArtClient), sMbid, {piece: 'front'})
	return self.commandRouter.serviceFetchAlbumArt.call(self.commandRouter, sService, sAlbumArtUri)
		.then(function(objReturned) {
			if (objReturned) {
				bufferImage = objReturned.image;
				sExtension = objReturned.extension;
				sPath = self.sAlbumArtPath + '/' + convertStringToHashkey(sService + sAlbumArtUri) + '.' + sExtension;
console.log(sPath);
				return libQ.nfcall(libFileSystem.writeFile, sPath, bufferImage);
			} else {
				throw new Error('No album art returned');
			}
		})
		.then(function(result) {
console.log('file written');
			return sPath;
		})
		.fail(function(error) {
			// Have this clause to catch errors so the parent promise does not abort
console.log(error.stack);
			return sPath;
		});
}

// Create a URL safe hashkey for a given string. The result will be a constant length string containing
// upper and lower case letters, numbers, '-', and '_'.
function convertStringToHashkey(input) {
    if (input === null) {
        input = '';

    }

	return libBase64Url.escape(libCrypto.createHash('sha256').update(input, 'utf8').digest('base64'));
}
