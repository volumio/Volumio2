
var path = require('path');
var libQ = require('kew');
var utils = require('./utils');


module.exports = FileScanner;


/**
 * @typedef {object} FileScannerOption
 * @description Callbacks which are passed here is asynchronous. Scan process is suspeded untill the promise is fulfilled (either resolved or rejected)
 *
 * @property {Array<string>} [skip]
 * @property {(scanId: string) => void} [cbStart]   - callback which is called when scanner starts (NOTE: we don't wait for result in this callback)
 * @property {(scanId: string) => void} [cbStop]    - callback which is called when scanner stops
 * @property {(location?: string, stats?: Dirent) => Promise<any>} [cbFileFound]   - callback which is called when scanner founds a regular file
 * @property {(location?: string, stats?: Dirent) => Promise<any>} [cbFolderFound] - callback which is called when scanner founds a folder
 * @property {(location?: string, stats?: Dirent) => Promise<any>} [cbOtherFound]  callback which is called when scanner founds another stuff
 * @property {(e?: Error, location?: string)} [cbError]
 */


/**
 * recursive scan folder content
 * We use callbacks instead of event emitter because we need to wait for an event to be processed
 * @constructor
 * @param {FileScannerOption} [options]
 *
 * @example:
 *     function logFile(filename){
 *         console.log('File was found:', filename);
 *     }
 *     const scanner = new Scanner({cbFileFound: logFile});
 *     scanner.addTarget('/home/testuser');
 *     scanner.run();
 */
function FileScanner(options) {

  /**
   * @type {FileScannerOption}
   */
  this._options = Object.assign({}, {
    cbStart: FileScanner.cbNoOperation,
    cbStop: FileScanner.cbNoOperation,
    cbError: FileScanner.cbErrorDefault,
    cbFileFound: FileScanner.cbNoOperation,
    cbFolderFound: FileScanner.cbNoOperation,
    cbOtherFound: FileScanner.cbOtherFound,
  }, options);


  /**
   * @type {Array}
   * @private
   */
  this._scanTargets = [];

  /**
   * @type {string}
   */
  this.scanId = null;

  /**
   * @type {boolean}
   * @private
   */
  this.isScanning = false;
}

/**
 * Add one or multiple targets to scan queue
 * @param {string|Array<string>} target(s)
 * @return {string} scanning ID
 * @memberof FileScanner#
 */
FileScanner.prototype.addTarget = function(target) {
  var targets = Array.isArray(target) ? target : [target];
  Array.prototype.push.apply(this._scanTargets, targets);
  return this._digest();
};

/**
 * start scanning process
 * @return {string} scanning ID
 * @memberof FileScanner#
 */
FileScanner.prototype.run = function() {
  return this._digest();
};


/**
 * @private
 * @memberof FileScanner#
 * @return {string} scanning ID
 */
FileScanner.prototype._digest = function() {
  var self = this;

  if (self.isScanning) {
    return self.scanId;
  }

  var locationToScan = self._scanTargets.shift();
  if (locationToScan) {

    if (!self.scanId) {
      // scan process just started
      self.scanId = String(Date.now());
      self._options.cbStart(self.scanId);
    }

    // Note: it's important to set isScanning=true in the same tick when _digest() is called.
    // Otherwise at some place we'll see isScanning twitching between 'true' and 'false'
    self.isScanning = true;
    // nextTick resets call stack
    process.nextTick(function() {
      self.scanFolder(locationToScan).then(function() {
        self.isScanning = false;
        self._digest();
      });
    });

  } else {
    // scan process is finished
    var stoppedId = self.scanId;
    self.scanId = null;
    self._options.cbStop(stoppedId);
  }

  return self.scanId;
};


/**
 * @param {string} location
 * @return {Promise<any>} resolves when folder is scanned (with all nested folders)
 * @memberof FileScanner#
 */
FileScanner.prototype.scanFolder = function(location) {
  var self = this;
  return libQ.resolve()
    .then(function() {
      return self._scanFolder(location);
    })
    .fail(function(err){
      return self._options.cbError(err, location);
    })
    .fail(function(err){
      console.error(err);
    });
};

/**
 * @param {string} location
 * @return {Promise<any>} resolves when folder is scanned (with all nested folders)
 * @private
 * @memberof FileScanner#
 */
FileScanner.prototype._scanFolder = function(location) {
  var self = this;

  return utils.readdir(location).then(function(folderEntries) {

    return utils.iterateArrayAsync(folderEntries, function(stats) {
      // if (stats.isSymbolicLink()) {
      //   // skip symbolic link
      //   return;
      // }

      var childLocation = path.join(location, stats.name);
      // console.log('childLocation', childLocation);
      if (stats.isDirectory()) {
        self._scanTargets.unshift(childLocation);
        return self._options.cbFolderFound(childLocation, stats);
      } else if (stats.isFile()) {
        return self._options.cbFileFound(childLocation, stats);
      } else {
        return self._options.cbOtherFound(childLocation, stats);
      }
      
    });
  });
};


/**
 * This is a default error handler, which actually ignore the error
 * @param {Error} err
 * @return {Promise<any>} resolves when error has been processed
 * @static
 * @memberof FileScanner
 */
FileScanner.cbErrorDefault = function(err) {
  // skip no file and access warning
  console.warn(err);
  return libQ.resolve();
};


/**
 * @param {string} location
 * @param {Dirent} stats
 * @return {Promise<any>} resolves when error has been processed
 * @static
 * @memberof FileScanner
 */
FileScanner.cbNoOperation = function(location, stats) {
  return libQ.resolve();
};


/**
 * @param {string} location
 * @param {Dirent} stats
 * @return {Promise<any>} resolves when error has been processed
 * @static
 * @memberof FileScanner
 */
FileScanner.cbOtherFound = function(location, stats) {
  console.warn('FileScanner: Skip unknown entry type:', location);
  // console.warn('FileScanner: Skip unknown entry type:', location, stats);
  return libQ.resolve();
};

