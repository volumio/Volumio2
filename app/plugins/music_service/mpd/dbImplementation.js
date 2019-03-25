
var libQ= require('kew');

// TODO: I think we can keep this module inside 'mpd' folder
var MusicLibrary = require('../music_library/index');

module.exports = DBImplementation;



/////////////////////////////


function DBImplementation(context) {
	this.library = new MusicLibrary(context);
}

DBImplementation.prototype.search = function(query) {
	return this.library.search(query);
};

DBImplementation.prototype.handleBrowseUri = function(uri, previousUri){
	var uriInfo = MusicLibrary.parseUri(uri);
	console.log('DBImplementation.handleBrowseUri', uri, uriInfo);

	/**
	 * Shall handle uris:
	 * albums://
	 * aritsts://
	 * playlists://
	 * genres://
	 * mounts://<MOUNT_NAME>
	 */

	var promise;
	switch (uriInfo.protocol) {
		case 'music-library':
			promise = this.listFolders(uri);
			break;

		case 'artists':
			promise = this.getArtists();
			break;

		default:
			promise = libQ.reject('Unknown protocol: ' + uriInfo.protocol);
	}

	return promise.fail(function(e) {
		console.error(e);
		throw e;
	});
};

/**
 * @param {string} uri
 * @return {Promise<TrackInfo>}
 */
DBImplementation.prototype.explodeUri = function(uri) {
	return this.library.explodeUri(uri);
};


/**
 * @param {string} uri
 * @return {Promise<BrowseResult>}
 */
DBImplementation.prototype.listFolders = function(uri) {
	return this.library.handleBrowseUri(uri);
};



/**
 * @return {Promise<BrowseResult>}
 */
DBImplementation.prototype.getArtists = function() {
	// TODO: incomplete: wrong data format
	return this.library.getArtists().then(function(data){
		console.log('DBImplementation TODO: getArtists', data);
		return data
	});
};
