

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
	/**
	 * Shall handle uris:
	 * albums://
	 * aritsts://
	 * playlists://
	 * genres://
	 * mounts://<MOUNT_NAME>
	 */
	return this.library.handleBrowseUri(uri);

};

DBImplementation.prototype.explodeUri = function(uri) {
	return this.library.explodeUri(uri);
};
