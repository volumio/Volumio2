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
CoreMusicLibrary.prototype.populateLibrary = function (arrayItems) {
	var tableGenres = new Object();
	var tableArtists = new Object();
	var tableAlbums = new Object();
	var tableTracks = new Object();
	var tableItems = new Object();
	var objReturn = {'genretable': tableGenres, 'artisttable': tableArtists, 'albumtable': tableAlbums, 'tracktable': tableTracks, 'itemtable': tableItems};

	var timeLastUpdate = Date.now();

	var curAlbums = new Array();
	var curArtists = new Array();
	var curGenres = new Array();
	for (var iItem = 0; iItem < arrayItems.length; iItem++) {
		if (Date.now() - timeLastUpdate > 3000) {
			console.log('   ' + (Math.round((iItem + 1) / arrayItems.length * 1000) / 10) + '%');
			timeLastUpdate = Date.now();

		}

		curItemObject = arrayItems[iItem];

		curItemKey = convertStringToHashkey(curItemObject['service'] + curItemObject['uri']);
		tableItems[curItemKey] = curItemObject;
		tableItems[curItemKey]['trackkey'] = new Object();

		curTrackKey = convertStringToHashkey(curItemObject['metadata']['title']);

		if (!(curTrackKey in tableTracks)) {
			tableTracks[curTrackKey] = new Object();
			tableTracks[curTrackKey]['itemkeys'] = new Object();
			tableTracks[curTrackKey]['albumkeys'] = new Object();
			tableTracks[curTrackKey]['metadata'] = new Object();
			tableTracks[curTrackKey]['metadata']['title'] = curItemObject['metadata']['title'];

		}

		tableTracks[curTrackKey]['itemkeys'][curItemKey] = null;
		tableItems[curItemKey]['trackkey'][curTrackKey] = null;

		curAlbums = curItemObject['metadata']['albums'];
		for (var iAlbum = 0; iAlbum < curAlbums.length; iAlbum++) {
			curAlbumKey = convertStringToHashkey(curAlbums[iAlbum]);

			if (!(curAlbumKey in tableAlbums)) {
				tableAlbums[curAlbumKey] = new Object();
				tableAlbums[curAlbumKey]['trackkeys'] = new Object();
				tableAlbums[curAlbumKey]['artistkeys'] = new Object();
				tableAlbums[curAlbumKey]['metadata'] = new Object();
				tableAlbums[curAlbumKey]['metadata']['title'] = curAlbums[iAlbum];

			}

			tableAlbums[curAlbumKey]['trackkeys'][curTrackKey] = null;
			tableTracks[curTrackKey]['albumkeys'][curAlbumKey] = null;

			curArtists = curItemObject['metadata']['artists'];
			for (var iArtist = 0; iArtist < curArtists.length; iArtist++) {
				curArtistKey = convertStringToHashkey(curArtists[iArtist]);

				if (!(curArtistKey in tableArtists)) {
					tableArtists[curArtistKey] = new Object();
					tableArtists[curArtistKey]['albumkeys'] = new Object();
					tableArtists[curArtistKey]['genrekeys'] = new Object();
					tableArtists[curArtistKey]['metadata'] = new Object();
					tableArtists[curArtistKey]['metadata']['name'] = curArtists[iArtist];

				}

				tableArtists[curArtistKey]['albumkeys'][curAlbumKey] = null;
				tableAlbums[curAlbumKey]['artistkeys'][curArtistKey] = null;

				curGenres = curItemObject['metadata']['genres'];
				for (var iGenre = 0; iGenre < curGenres.length; iGenre++) {
					curGenreKey = convertStringToHashkey(curGenres[iGenre]);

					if (!(curGenreKey in tableGenres)) {
						tableGenres[curGenreKey] = new Object();
						tableGenres[curGenreKey]['artistkeys'] = new Object();
						tableGenres[curGenreKey]['metadata'] = new Object();
						tableGenres[curGenreKey]['metadata']['name'] = curGenres[iGenre];

					}

					tableGenres[curGenreKey]['artistkeys'][curArtistKey] = null;
					tableArtists[curArtistKey]['genrekeys'][curGenreKey] = null;

				}

			}

		}

	}

	return objReturn;

}

function convertStringToHashkey (input) {
	return libBase64Url.escape(libCrypto.createHash('sha256').update(input, 'utf8').digest('base64'));

}
