var libQ = require('kew');
var libFast = require('fast.js');
var libSortOn = require('sort-on');

// Define the CoreMusicLibrary class
module.exports = CoreMusicLibrary;
function CoreMusicLibrary (commandRouter) {

	this.commandRouter = commandRouter;

}

CoreMusicLibrary.prototype.getLibraryByTitle = function (sPath) {

	console.log('[' + Date.now() + '] ' + 'CoreMusicLibrary::getLibraryByTitle');
	return this.commandRouter.getCombinedLibrary()
		.then(function (unsortedLibrary) {
			return libQ.fcall(libSortOn, unsortedLibrary, 'metadata.title');

		});

}
