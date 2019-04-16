var fs = require('fs');
var path = require('path');

var libQ = require('kew');


module.exports = {
	formatTime: formatTime,
	readdir: readdir,
	iterateArrayAsync: iterateArrayAsync,
	parseQueryParams: parseQueryParams,
	debounceTimeAmount: debounceTimeAmount
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
 * @return {Promise<Array<Dirent|Error>>}
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
			}).fail(function(err) {
				// skip errors
				console.log(err);
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
 * @template {T} array element type
 * @template {R} array element type
 *
 * @param {Array<T>} array
 * @param {function(T, number?, Array<T>?):Promise<R>} iterator
 * @return {Promise<R[]>}
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
 * Debounce function call using timeout and number of executions (whatever run first).
 * @param {function} fn
 * @param {number} debounceInterval
 * @param {number} debounceSize
 * @return {function}
 *
 *
 * @example
 *    ```js
 *    var debounced = debounceTimeAmount(myFn, 1000, 3);
 *    await debounced(1);
 *    await debounced(2);
 *    await debounced(3); // here myFn will be called with arguments [1, 2, 3]
 *  ```
 *
 * @example
 *    ```js
 *    var debounced = debounceTimeAmount(myFn, 1000, 3);
 *    await debounced(1);
 *    await debounced(2);
 *    // wait for more than 1 second
 *    // myFn will be called with arguments [1, 2] in a separate call stack
 *  ```
 */
function debounceTimeAmount(fn, debounceInterval, debounceSize) {

	resultFn._cache = [];

	/**
	 * @private
	 */
	var debounceTimer = null;

	/**
	 * @return {Promise<*>}
	 */
	function runFn() {
		// unlink cache before calling anything
		var cacheLink = resultFn._cache;
		resultFn._cache = [];
		// clear cache before calling 'fn'
		return fn(cacheLink);
	}

	/**
	 * @param {*} data
	 * @return {Promise<*>}
	 */
	function resultFn(data) {
		resultFn._cache.push(data);

		// check debounce conditions
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		if (resultFn._cache.length >= debounceSize) {
			return runFn();
		} else {
			// TODO: technically, we can run in two concurrent write operations here
			debounceTimer = setTimeout(runFn, debounceInterval);
		}
	}

	return resultFn;
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


/**
 * minutes
 * @param {number} seconds
 * @return {string} time in format: '1d 2:03:40'
 */
function formatTime(seconds) {
	var day = Math.floor(seconds / (24 * 3600));
	var hour = Math.floor(seconds % (24 * 3600) / 3600);
	var min = Math.floor(seconds % 3600 / 60);
	var sec = Math.floor(seconds % 60);

	if (day > 0) {
		return `${day}d ${zeropad(hour)}:${zeropad(min)}:${zeropad(sec)}`;
	} else if (hour > 0) {
		return `${hour}:${zeropad(min)}:${zeropad(sec)}`;
	} else {
		return `${min}:${zeropad(sec)}`;
	}
}
/**
 * @param {number} num
 * @return {string}
 */
function zeropad(num) {
	return num < 10 ? '0' + num : ('' + num);
}


