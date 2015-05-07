var libQ = require('kew');
var libFast = require('fast.js');
var libSortOn = require('sort-on');
var libCrypto = require('crypto');
var libBase64Url = require('base64-url');
var libLevel = require('level');

// Define the CoreMusicLibrary class
module.exports = CoreMusicLibrary;
function CoreMusicLibrary (commandRouter) {

	// This fixed variable will let us refer to 'this' object at deeper scopes
	var self = this;

	// Save a reference to the parent commandRouter
	self.commandRouter = commandRouter;

	// These are hash tables of all items in library
	// Rebuilding a library creates these from scratch
	self.tableGenres = new Object();
	self.tableArtists = new Object();
	self.tableAlbums = new Object();
	self.tableTracks = new Object();
	self.tableItems = new Object();

	// This is a sorted index of all items in library
	self.index = new Object();

	// These are sorted indexes of all items in library, to be used for browsing
	self.arrayIndexDefinitions = [
		['Genres', 'tableGenres', 'metadata.name'],
		['Artists', 'tableArtists', 'metadata.name'],
		['Albums', 'tableAlbums', 'metadata.name'],
		['Tracks', 'tableTracks', 'metadata.name']

	];

	// Start library promise as rejected, so requestors do not wait for it if not immediately available.
	// This is okay because no part of Volumio requires a populated library to function.
	self.libraryReadyDeferred = null;
	self.libraryReady = libQ.reject('Library not yet loaded.');

	// Attempt to load library from database on disk
	self.sLibraryPath = './db/musicLibrary';
	self.loadLibraryFromDB()
		.fail(libFast.bind(self.pushError, self));

}

// Public methods -----------------------------------------------------------------------------------

CoreMusicLibrary.prototype.loadLibraryFromDB = function () {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreMusicLibrary::loadLibraryFromDB');

	self.tableGenres = new Object();
	self.tableArtists = new Object();
	self.tableAlbums = new Object();
	self.tableTracks = new Object();
	self.tableItems = new Object();
	self.index = new Object();

	self.libraryReadyDeferred = libQ.defer();
	self.libraryReady = self.libraryReadyDeferred.promise;

	var dbLibrary = libLevel(self.sLibraryPath, {'valueEncoding': 'json', 'createIfMissing': true});

	return libQ.resolve()
		.then(function () {
			return libQ.nfcall(libFast.bind(dbLibrary.get, dbLibrary), 'tableGenres');

		})
		.then(function (result) {
			self['tableGenres'] = result;
			return libQ.nfcall(libFast.bind(dbLibrary.get, dbLibrary), 'tableArtists');

		})
		.then(function (result) {
			self['tableArtists'] = result;
			return libQ.nfcall(libFast.bind(dbLibrary.get, dbLibrary), 'tableAlbums');

		})
		.then(function (result) {
			self['tableAlbums'] = result;
			return libQ.nfcall(libFast.bind(dbLibrary.get, dbLibrary), 'tableTracks');

		})
		.then(function (result) {
			self['tableTracks'] = result;
			return libQ.nfcall(libFast.bind(dbLibrary.get, dbLibrary), 'tableItems');

		})
		.then(function (result) {
			self['tableItems'] = result;
			return libQ.nfcall(libFast.bind(dbLibrary.get, dbLibrary), 'index');

		})
		.then(function (result) {
			self['index'] = result;

			self.commandRouter.pushConsoleMessage('Library loaded from DB.');

			try {
				self.libraryReadyDeferred.resolve();
			} catch (error) {
				self.pushError('Unable to resolve library promise: ' + error);
			}

			self.commandRouter.pushConsoleMessage('Genres: ' + Object.keys(self['tableGenres']).length);
			self.commandRouter.pushConsoleMessage('Artists: ' + Object.keys(self['tableArtists']).length);
			self.commandRouter.pushConsoleMessage('Albums: ' + Object.keys(self['tableAlbums']).length);
			self.commandRouter.pushConsoleMessage('Tracks: ' + Object.keys(self['tableTracks']).length);
			self.commandRouter.pushConsoleMessage('Items: ' + Object.keys(self['tableItems']).length);

			return libQ.resolve();

		})
		.fail(function (sError) {
			try {
				self.libraryReadyDeferred.reject(sError);
			} catch (error) {
				self.pushError('Unable to reject library promise: ' + error);
			}

			throw new Error('Error reading DB: ' + sError);

		})
		.fin(libFast.bind(dbLibrary.close, dbLibrary));

}

CoreMusicLibrary.prototype.rebuildLibrary = function (arrayAllTrackLists) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreMusicLibrary::rebuildLibrary');

	self.tableGenres = new Object();
	self.tableArtists = new Object();
	self.tableAlbums = new Object();
	self.tableTracks = new Object();
	self.tableItems = new Object();
	self.index = new Object();

	self.libraryReadyDeferred = libQ.defer();
	self.libraryReady = self.libraryReadyDeferred.promise;

	var dbLibrary = libLevel(self.sLibraryPath, {'valueEncoding': 'json', 'createIfMissing': true});

	return self.commandRouter.getAllTracklists()
		.then(function (arrayAllTrackLists) {
			self.commandRouter.pushConsoleMessage('Populating library...');

			return libFast.map(arrayAllTrackLists, function (arrayTrackList) {
				return self.populateLibraryFromTracklist(arrayTrackList);

			});

		})
		.then(function () {
			self.commandRouter.pushConsoleMessage('Generating indexes...');

			return libFast.map(self.arrayIndexDefinitions, function (curIndexDefinition) {
				return self.rebuildSingleIndex(curIndexDefinition[0], curIndexDefinition[1], curIndexDefinition[2]);

			});

		})
		.then(function () {
			self.commandRouter.pushConsoleMessage('Storing library in db...');

			var ops = [
				{type: 'put', key: 'tableGenres', value: self['tableGenres']},
				{type: 'put', key: 'tableArtists', value: self['tableArtists']},
				{type: 'put', key: 'tableAlbums', value: self['tableAlbums']},
				{type: 'put', key: 'tableTracks', value: self['tableTracks']},
				{type: 'put', key: 'tableItems', value: self['tableItems']},
				{type: 'put', key: 'index', value: self['index']}

			];

			return libQ.nfcall(libFast.bind(dbLibrary.batch, dbLibrary), ops);

		})
		.then(function () {
			self.commandRouter.pushConsoleMessage('Library rebuild complete.');

			try {
				self.libraryReadyDeferred.resolve();
			} catch (error) {
				self.pushError('Unable to resolve library promise: ' + error);
			}

			self.commandRouter.pushConsoleMessage('Genres: ' + Object.keys(self['tableGenres']).length);
			self.commandRouter.pushConsoleMessage('Artists: ' + Object.keys(self['tableArtists']).length);
			self.commandRouter.pushConsoleMessage('Albums: ' + Object.keys(self['tableAlbums']).length);
			self.commandRouter.pushConsoleMessage('Tracks: ' + Object.keys(self['tableTracks']).length);
			self.commandRouter.pushConsoleMessage('Items: ' + Object.keys(self['tableItems']).length);

			return libQ.resolve();

		})
		.fail(function (sError) {
			try {
				self.libraryReadyDeferred.reject(sError);
			} catch (error) {
				self.pushError('Unable to reject library promise: ' + error);
			}

			throw new Error('Library Rebuild Error: ' + sError);

		})
		.fin(libFast.bind(dbLibrary.close, dbLibrary));

}

CoreMusicLibrary.prototype.browseLibrary = function (sId) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreMusicLibrary::browseLibrary');

	if (sId === '') {
		return self.getIndexRoot();

	} else {
		var arrayIdParts = sId.split(':');

		if (arrayIdParts[0] === 'index') {
			return self.getIndex(arrayIdParts[1]);

		} else if (arrayIdParts[0] === 'genre') {
			return self.getGenre(arrayIdParts[1]);

		} else if (arrayIdParts[0] === 'artist') {
            return self.getArtist(arrayIdParts[1]);

        } else if (arrayIdParts[0] === 'album') {
            return self.getAlbum(arrayIdParts[1]);

        }

		return libQ.reject('ID ' + sId + ' not recognized.');

	}

}

CoreMusicLibrary.prototype.getIndexRoot = function () {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreMusicLibrary::getIndexRoot');

	return self.libraryReady
		.then(function () {
			return libFast.map(self.arrayIndexDefinitions, function (curEntry) {
				return {'id': 'index:' + curEntry[1], 'name': curEntry[0]};

			})

		});

}

CoreMusicLibrary.prototype.getIndex = function (sIndex) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreMusicLibrary::getIndex');

	return self.libraryReady
		.then(function () {
			return self.index[sIndex];

		});

}

CoreMusicLibrary.prototype.getGenre = function (sInput) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreMusicLibrary::getGenre');

	return self.libraryReady
		.then(function () {
			return libFast.map(Object.keys(self.tableGenres[sInput]['children']), function (curChildKey) {
				return {'id': 'artist:' + curChildKey, 'name': self.tableArtists[curChildKey]['metadata']['name']};

			})

		});

}

CoreMusicLibrary.prototype.getArtist = function (sInput) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreMusicLibrary::getArtist');

	return self.libraryReady
		.then(function () {
			return libFast.map(Object.keys(self.tableArtists[sInput]['children']), function (curChildKey) {
				return {'id': 'album:' + curChildKey, 'name': self.tableAlbums[curChildKey]['metadata']['name']};

			})

		});

}

CoreMusicLibrary.prototype.getAlbum = function (sInput) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreMusicLibrary::getAlbum');

	return self.libraryReady
		.then(function () {
			return libFast.map(Object.keys(self.tableAlbums[sInput]['children']), function (curChildKey) {
				return {'id': 'track:' + curChildKey, 'name': self.tableTracks[curChildKey]['metadata']['name']};

			})

		});

}

// Internal methods ---------------------------------------------------------------------------

// Pass the error if we don't want to handle it
CoreMusicLibrary.prototype.pushError = function (sReason) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreMusicLibrary::pushError(' + sReason + ')');

	// Return a resolved empty promise to represent completion
	return libQ.resolve();

}

// Put the contents of a tracklist into the library
CoreMusicLibrary.prototype.populateLibraryFromTracklist = function (arrayTrackList) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreMusicLibrary::populateLibraryFromTracklist');

	return libFast.map(arrayTrackList, function (curTrack) {
		return self.addLibraryItem(
			curTrack['service'],
			curTrack['uri'],
			curTrack['metadata']['title'],
			curTrack['metadata']['album'],
			curTrack['metadata']['artists'],
			curTrack['metadata']['genres']

		);

	});

}

// Create a single index of a given table
CoreMusicLibrary.prototype.rebuildSingleIndex = function (sIndexName, sTableName, sPathToSortField) {

	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreMusicLibrary::rebuildSingleIndex');
self.commandRouter.pushConsoleMessage('Building index for "' + sIndexName + '"');
	if (!(sTableName in self)) {
		self.commandRouter.pushConsoleMessage('Specified table ' + sTableName + ' not found in library for indexing');
		return;

	}

	var arrayPathToSortField = sPathToSortField.split('.');

	var unsortedIndex = libFast.map(Object.keys(self[sTableName]), function (curKey) {

		var curSortValue = libFast.reduce(arrayPathToSortField, function (objCollector, curPathToSortField) {
			if (!(curPathToSortField in objCollector)) {
				return '';

			}

			return objCollector[curPathToSortField];

		}, self[sTableName][curKey]);

		return {'id': self[sTableName][curKey]['id'], 'name': curSortValue};

	});

	self.index[sTableName] = libSortOn(unsortedIndex, 'name');

	return libQ.resolve();

}

// Function to add an item to the database, to be called by service controllers.
// Metadata fields to roughly conform to Ogg Vorbis standards (http://xiph.org/vorbis/doc/v-comment.html)
CoreMusicLibrary.prototype.addLibraryItem = function (sService, sUri, sTitle, sAlbum, arrayArtists, arrayGenres) {

	var self = this;

	var tableGenres = self.tableGenres;
	var tableArtists = self.tableArtists;
	var tableAlbums = self.tableAlbums;
	var tableTracks = self.tableTracks;
	var tableItems = self.tableItems;

	curItemKey = convertStringToHashkey(sService + sUri);

	tableItems[curItemKey] = {
		metadata: {
/*			title: sTitle,
			album: sAlbum,
			artists: arrayArtists,
			genres: arrayGenres*/
			service: sService,
			uri: sUri
		},
		id: 'item:' + curItemKey,

	};

	tableItems[curItemKey]['children'] = new Object();
	tableItems[curItemKey]['parents'] = new Object();

	curTrackKey = convertStringToHashkey(sAlbum + sTitle);

	if (!(curTrackKey in tableTracks)) {
		tableTracks[curTrackKey] = new Object();
		tableTracks[curTrackKey]['metadata'] = new Object();
		tableTracks[curTrackKey]['metadata']['name'] = sTitle;
		tableTracks[curTrackKey]['id'] = 'track:' + curTrackKey;
		tableTracks[curTrackKey]['children'] = new Object();
		tableTracks[curTrackKey]['parents'] = new Object();

	}

	tableTracks[curTrackKey]['children'][curItemKey] = null;
	tableItems[curItemKey]['parents'][curTrackKey] = null;

	if (sAlbum === 'Greatest Hits') {
		// The 'Greatest Hits' album name is a repeat offender for unrelated albums being grouped together.
		// If that is the album name, derive the key using a combination of the first artist and album name instead.
		curAlbumKey = convertStringToHashkey(arrayArtists[0] + sAlbum);

	} else {
		// Otherwise, tracks which share the same album name but not the same artist are probably actually
		// in the same album.
		curAlbumKey = convertStringToHashkey(sAlbum);

	}

	if (!(curAlbumKey in tableAlbums)) {
		tableAlbums[curAlbumKey] = new Object();
		tableAlbums[curAlbumKey]['metadata'] = new Object();
		tableAlbums[curAlbumKey]['metadata']['name'] = sAlbum;
		tableAlbums[curAlbumKey]['id'] = 'album:' + curAlbumKey;
		tableAlbums[curAlbumKey]['children'] = new Object();
		tableAlbums[curAlbumKey]['parents'] = new Object();

	}

	tableAlbums[curAlbumKey]['children'][curTrackKey] = null;
	tableTracks[curTrackKey]['parents'][curAlbumKey] = null;

	for (var iArtist = 0; iArtist < arrayArtists.length; iArtist++) {
		curArtistKey = convertStringToHashkey(arrayArtists[iArtist]);

		if (!(curArtistKey in tableArtists)) {
			tableArtists[curArtistKey] = new Object();
			tableArtists[curArtistKey]['metadata'] = new Object();
			tableArtists[curArtistKey]['metadata']['name'] = arrayArtists[iArtist];
			tableArtists[curArtistKey]['id'] = 'artist:' + curArtistKey;
			tableArtists[curArtistKey]['children'] = new Object();
			tableArtists[curArtistKey]['parents'] = new Object();

		}

		tableArtists[curArtistKey]['children'][curAlbumKey] = null;
		tableAlbums[curAlbumKey]['parents'][curArtistKey] = null;

		for (var iGenre = 0; iGenre < arrayGenres.length; iGenre++) {
			curGenreKey = convertStringToHashkey(arrayGenres[iGenre]);

			if (!(curGenreKey in tableGenres)) {
				tableGenres[curGenreKey] = new Object();
				tableGenres[curGenreKey]['metadata'] = new Object();
				tableGenres[curGenreKey]['metadata']['name'] = arrayGenres[iGenre];
				tableGenres[curGenreKey]['id'] = 'genre:' + curGenreKey;
				tableGenres[curGenreKey]['children'] = new Object();
				tableGenres[curGenreKey]['parents'] = new Object();

			}

			tableGenres[curGenreKey]['children'][curArtistKey] = null;
			tableArtists[curArtistKey]['parents'][curGenreKey] = null;

		}

	}

	return libQ.resolve();

}

// Helper functions ------------------------------------------------------------------------------------

function convertStringToHashkey (input) {
    if (input === null) {
        input = '';

    }

	return libBase64Url.escape(libCrypto.createHash('sha256').update(input, 'utf8').digest('base64'));

}

