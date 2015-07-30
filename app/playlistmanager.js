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

	self.playlistFS = {};
	self.root = [];
}

// Import existing playlists and folders from the various services
CorePlaylistManager.prototype.importServicePlaylists = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlaylistManager::importServicePlaylists');

	return self.commandRouter.getAllTracklists()
		.then(function(arrayAllTracklists) {
			self.commandRouter.pushConsoleMessage('Importing playlists from music services...');

			return libQ.all(libFast.map(arrayAllTracklists, function(arrayTracklist) {
				return libQ.all(libFast.map([arrayTracklist[0], arrayTracklist[1], arrayTracklist[2]], function(curTrack) {
					return self.addPlaylistItem(curTrack);
				}));
			}));
		})
		.then(function() {
			console.log(libUtil.inspect(self.root, {depth: null}));
			self.commandRouter.pushConsoleMessage('Playlists imported.');
		});
}

CorePlaylistManager.prototype.getRoot = function() {
	var self = this;

	return self.root;
}

// Add an track into the playlist filesystem
CorePlaylistManager.prototype.addPlaylistItem = function(curTrack) {
	var self = this;

	var arrayPath = curTrack.browsepath;
	var arrayCurFullPath = [];
	var curFolderKey = '';

	libFast.map(arrayPath, function(sCurPath, nIndex) {
		arrayCurFullPath = arrayCurFullPath.concat(sCurPath);

		curFolderKey = convertStringToHashkey(arrayCurFullPath.join('/'));
		if (!(curFolderKey in self.playlistFS)) {
			self.playlistFS[curFolderKey] = {
				'name': sCurPath,
				'type': 'folder',
				'uid': curFolderKey,
				'fullpath': arrayCurFullPath,
				'childindex': [],
				'childuids': {}
			};

			if (nIndex === 0) {
				self.root.push({
					'name': sCurPath,
					'type': 'folder',
					'uid': curFolderKey
				});
			}
		}

		var arrayParentPath = arrayCurFullPath.slice(0, -1);
		if (arrayParentPath.length > 0) {
			var sParentKey = convertStringToHashkey(arrayParentPath.join('/'));
			if (!(curFolderKey in self.playlistFS[sParentKey].childuids)) {
				var objChildEntry = {
					'name': sCurPath,
					'type': 'folder',
					'uid': curFolderKey
				};

				self.playlistFS[sParentKey].childindex.push(objChildEntry);
				self.playlistFS[sParentKey].childuids[curFolderKey] = null;
			}
		}
	});

	var curTrackKey = convertStringToHashkey(curTrack.album + curTrack.name);
	self.playlistFS[curFolderKey].childindex.push({
		'name': curTrack.name,
		'type': 'item',
		'trackuid': 'track:' + curTrackKey,
		'service': curTrack.service,
		'uri': curTrack.uri,
		'duration': curTrack.duration
	});
	self.playlistFS[curFolderKey].childuids[curTrackKey] = null;

}

// Create a URL safe hashkey for a given string. The result will be a constant length string containing
// upper and lower case letters, numbers, '-', and '_'.
function convertStringToHashkey(input) {
    if (input === null) {
        input = '';

    }

	return libBase64Url.escape(libCrypto.createHash('sha256').update(input, 'utf8').digest('base64'));
}

