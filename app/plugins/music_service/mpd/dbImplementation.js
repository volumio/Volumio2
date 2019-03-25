/**
 * @type {DBImplementation}
 */
module.exports = DBImplementation;

function DBImplementation() {
}

DBImplementation.prototype.search = function(query) {
	console.log('DBImplementation.search is not implemented');
};

DBImplementation.prototype.handleBrowseUri = function(curUri, previous) {
	console.log('DBImplementation.handleBrowseUri is not implemented');
	/**
	 * Shall handle uris:
	 * albums://
	 * aritsts://
	 * playlists://
	 * genres://
	 * mounts://<MOUNT_NAME>
	 */
};

DBImplementation.prototype.explodeUri = function(uri) {
	console.log('DBImplementation.explodeUri is not implemented');
};
