var libQ = require('kew');
var libFast = require('fast.js');
var libSortOn = require('sort-on');
var libCrypto = require('crypto');
var libBase64Url = require('base64-url');

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

// Function to populate a music library, to be called by service controllers.
// Metadata fields to roughly follow Ogg Vorbis standards (http://xiph.org/vorbis/doc/v-comment.html)
CoreMusicLibrary.prototype.populateLibrary = function (objTrackList) {
	var tableGenres = new Object();
	var tableArtists = new Object();
	var tableAlbums = new Object();
	var tableTitles = new Object();
	var objReturn = {'genretable': tableGenres, 'artisttable': tableArtists, 'albumtable': tableAlbums, 'titletable': tableTitles};

	var arrayTrackKeys = Object.keys(objTrackList);

	var curAlbums = new Array();
	var curArtists = new Array();
	var curGenres = new Array();
	for (var iTrackKey = 0; iTrackKey < arrayTrackKeys.length; iTrackKey++) {
		curTrackKey = arrayTrackKeys[iTrackKey];
		curTrackObject = objTrackList[curTrackKey];

		curTitleKey = convertStringToHashkey(curTrackObject['metadata']['title']);

		if (!(curTitleKey in tableTitles)) {
			tableTitles[curTitleKey] = new Object();
			tableTitles[curTitleKey]['tracks'] = new Object();
			tableTitles[curTitleKey]['albums'] = new Object();

		}

		tableTitles[curTitleKey]['tracks'][curTrackKey] = null;

		curAlbums = curTrackObject['metadata']['albums'];
		for (var iAlbum = 0; iAlbum < curAlbums.length; iAlbum++) {
			curAlbumKey = convertStringToHashkey(curAlbums[iAlbum]);

			if (!(curAlbumKey in tableAlbums)) {
				tableAlbums[curAlbumKey] = new Object();
				tableAlbums[curAlbumKey]['titles'] = new Object();
				tableAlbums[curAlbumKey]['artists'] = new Object();

			}

			tableAlbums[curAlbumKey]['titles'][curTitleKey] = null;
			tableTitles[curTitleKey]['albums'][curAlbumKey] = null;

			curArtists = curTrackObject['metadata']['artists'];
			for (var iArtist = 0; iArtist < curArtists.length; iArtist++) {
				curArtistKey = convertStringToHashkey(curArtists[iArtist]);

				if (!(curArtistKey in tableArtists)) {
					tableArtists[curArtistKey] = new Object();
					tableArtists[curArtistKey]['albums'] = new Object();
					tableArtists[curArtistKey]['genres'] = new Object();

				}

				tableArtists[curArtistKey]['albums'][curAlbumKey] = null;
				tableAlbums[curAlbumKey]['artists'][curArtistKey] = null;

				curGenres = curTrackObject['metadata']['genres'];
				for (var iGenre = 0; iGenre < curGenres.length; iGenre++) {
					curGenreKey = convertStringToHashkey(curGenres[iGenre]);

					if (!(curGenreKey in tableGenres)) {
						tableGenres[curGenreKey] = new Object();
						tableGenres[curGenreKey]['artists'] = new Object();

					}

					tableGenres[curGenreKey]['artists'][curArtistKey] = null;
					tableArtists[curArtistKey]['genres'][curGenreKey] = null;

				}

			}

		}

	}

	return objReturn;

}

function convertStringToHashkey (input) {
	return libBase64Url.escape(libCrypto.createHash('sha256').update(input, 'utf8').digest('base64'));

}
