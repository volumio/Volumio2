var fs = require('fs');
var path = require('path');

var libQ = require('kew');


module.exports = {
	readdir: readdir,
	iterateArrayAsync: iterateArrayAsync,
	parseQueryParams: parseQueryParams
};

/**
 * @typedef {object} Dirent
 * @more: https://nodejs.org/api/fs.html#fs_class_fs_dirent
 *
 * @property {string} name
 * @property {function():boolean} isBlockDevice
 * @property {function():boolean} isCharacterDevice
 * @property {function():boolean} isDirectory
 * @property {function():boolean} isFIFO
 * @property {function():boolean} isFile
 * @property {function():boolean} isSocket
 * @property {function():boolean} isSymbolicLink
 */


/**
 * @typedef {object} Stats
 * @description nodejs Stats class
 * @more https://nodejs.org/api/fs.html#fs_class_fs_stats
 */


/**
 * Get folder entry (not just a names, but 'Dirent' object)
 * @param {string} location
 * @param {object} [options]
 * @return {Promise<Dirent[]>}
 */
function readdir(location, options) {
	// TODO: we can use 'withFileTypes' flag with node >=10.10 to simplify this method
	// More: https://nodejs.org/api/fs.html#fs_fs_readdir_path_options_callback
	return libQ.nfcall(fs.readdir, location, options).then(function(folderEntries) {
		return iterateArrayAsync(folderEntries, function(folderEntry) {
			var childLocation = path.join(location, folderEntry);

			// get stats
			return libQ.nfcall(fs.stat, childLocation).then(function(stats) {
				// 'Stats' are a little bit different from 'Dirent'
				stats.name = folderEntry;
				return stats;
			});
		});
	});
}


/**
 * Iterate array with async function
 * Technically it's a replacement for the next code:
 * ```bash
 * for (let i=0; i<array.length; i++){
 *     await iterator(array[i], i);
 * }
 * ```
 * @param {Array<*>} array
 * @param {function(*, number?, Array<*>?):Promise<*>} iterator
 * @return {Promise<*>}
 */
function iterateArrayAsync(array, iterator) {
	var defer = libQ.defer();

	var i = -1;
	var result = [];

	function __iteration() {
		process.nextTick(function() {
			if (++i >= array.length) {
				defer.resolve(result);
				return;
			}

			// run iterator inside promise, so it'll process results and errors
			libQ.resolve().then(function() {
				return iterator(array[i], i, array);
			}).then(function(iterationResult) {
				if (typeof iterationResult != 'undefined') {
					result.push(iterationResult);
				}
			}).then(__iteration).fail(function(err) {
				defer.reject(err);
			});
		});
	}

	__iteration();

	return defer.promise;
}


/**
 * Parse string 'a=1&b=2&c=3' into object {a:1, b:2, c:3}
 * @param {string} query
 * @param {string} [groupSeparator='&']
 * @param {string} [valueSeparator='=']
 * @return {*}
 */
function parseQueryParams(query, groupSeparator, valueSeparator) {
	groupSeparator = groupSeparator || '&';
	valueSeparator = valueSeparator || '=';
	var result = {};
	var groups = query.split(groupSeparator);
	for (var i = 0; i < groups.length; i++) {
		var tokens = groups[i].split(valueSeparator, 2) || [];
		if (tokens[0]) {
			result[tokens[0]] = tokens[1];
		}
	}
	return result;
}