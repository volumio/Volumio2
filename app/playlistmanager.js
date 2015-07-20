var libQ = require('kew');
var libFast = require('fast.js');
var libCrypto = require('crypto');
var libBase64Url = require('base64-url');
var libLevel = require('level');
var libUtil = require('util');

// Define the CorePlaylistManager class
module.exports = CorePlaylistManager;
function CorePlaylistManager (commandRouter) {
	// This fixed variable will let us refer to 'this' object at deeper scopes
	var self = this;

	// Save a reference to the parent commandRouter
	self.commandRouter = commandRouter;

	self.playlistDB = {'index': []};
}

// Import existing playlists and folders from the various services
CorePlaylistManager.prototype.importServicePlaylists = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlaylistManager::importServicePlaylists');

	return self.commandRouter.getAllTracklists()
		.then(function(arrayAllTracklists) {
			self.commandRouter.pushConsoleMessage('Importing playlists from music services...');

			return libQ.all(libFast.map(arrayAllTracklists, function(arrayTracklist) {
				return libQ.all(libFast.map(arrayTracklist, function(curTrack) {
					return self.addPlaylistItem(curTrack);
				}));
			}));
		});
		.then(function() {
			//console.log(libUtil.inspect(self.playlistDB, {depth: null}));
			 self.commandRouter.pushConsoleMessage('Playlists imported.');
		});
}

// Add an track into the playlist filesystem
CorePlaylistManager.prototype.addPlaylistItem = function(curTrack) {
	var self = this;

	var arrayPath = curTrack.browsepath;
	var objCurDepth = self.playlistDB.root;
	var arrayCurFullPath = [];
	var sCurKey = '';

	libFast.map(arrayPath, function(sCurPath) {
		arrayCurFullPath = arrayCurFullPath.concat(sCurPath);

		sCurKey = convertStringToHashkey(arrayCurFullPath.join('/'));
		if (!(sCurKey in self.playlistDB)) {
			self.playlistDB[sCurKey] = {
				'name': sCurPath,
				'uid': sCurKey,
				'type': 'folder',
				'fullpath': arrayCurFullPath,
				'children': []
			};
		}

		var objIndexEntry = {
			'name': sCurPath,
			'uid': sCurKey,
			'type': 'folder'
		};
		var arrayParentPath = arrayCurFullPath.slice(0, -1);
		if (arrayParentPath.length > 0) {
			var sParentKey = convertStringToHashkey(arrayParentPath.join('/'));
			self.playlistDB[sParentKey].children.push(objIndexEntry);
		} else {
			self.playlistDB.index.push(objIndexEntry);
		}
	});

	var curTrackKey = convertStringToHashkey(curTrack.album + curTrack.name);
	self.playlistDB[sCurKey].children.push({
		'name': curTrack.name,
		'uid': curTrackKey,
		'type': 'track',
		'service': curTrack.service,
		'uri': curTrack.uri,
		'artists': curTrack.artists,
		'albums': curTrack.albums,
		'tracknumber': curTrack.tracknumber,
		'date': curTrack.date,
		'duration': curTrack.duration
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

