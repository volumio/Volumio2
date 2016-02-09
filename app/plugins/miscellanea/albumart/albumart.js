'use strict';

var albumart = require('album-art');
var Q = require('kew');
var download = require('file-download');
var S = require('string');
var fs = require('fs-extra');
var uuid = require('node-uuid');
var nodetools = require('nodetools');
var mm = require('musicmetadata');

var winston = require('winston');
var logger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)(),
		new (winston.transports.File)({
			filename: '/var/log/albumart.log',
			json: false
		})
	]
});

var albumArtRootFolder = '/data/albumart';

var setFolder = function (newFolder) {
	logger.info("Setting folder " + newFolder);
	albumArtRootFolder = S(newFolder).ensureRight('/').s;
};

var searchOnline = function (defer, web) {
	/**
	 * If we arrive to this point the file albumart has not been passed or doesn't exists
	 */

	var artist, album, resolution;

	if (web != undefined) {
		var splitted = nodetools.urlDecode(web).split('/');

		if (splitted.length < 3) {
			defer.reject(new Error('The web link ' + web + ' is malformed'));
			return defer.promise;
		}

		if (splitted.length == 3) {
			artist = splitted[0];
			album = splitted[1];
			resolution = splitted[2];
		}
		else if (splitted.length == 4) {
			artist = splitted[1];
			album = splitted[2];
			resolution = splitted[3];
		}
	}
	else {
		defer.reject(new Error('No parameters defined'));
		return defer.promise;
	}

	/**
	 * Loading album art from network
	 */
	var folder = albumArtRootFolder + artist + '/' + album + '/';
	var fileName = resolution;

	fs.ensureDirSync(folder);
	var infoPath = folder + 'info.json';

	var infoJson = {};

	if (fs.existsSync(infoPath) == false) {
		fs.ensureFileSync(infoPath);
		fs.writeJsonSync(infoPath, infoJson);
	}

	var stats = fs.statSync(infoPath)
	var fileSizeInBytes = stats["size"]

	if (fileSizeInBytes > 0)
		infoJson = fs.readJsonSync(infoPath, {throws: false})

	if (infoJson[resolution] == undefined) {
		albumart(artist, album, resolution, function (err, url) {
			if (err) {
				albumart(artist, function (err, url) {
					if (err) {
						console.log("ERRORE: " + err);
						defer.reject(new Error(err));
						return defer.promise;
					}
					else {
						if (url != undefined && url != '') {
							var splitted = url.split('.');
							var fileExtension = splitted[splitted.length - 1];
							var diskFileName = uuid.v4() + '.' + fileExtension;

							var options = {
								directory: folder,
								filename: diskFileName
							}

							console.log("URL: " + url);
							download(url, options, function (err) {
								if (err) defer.reject(new Error(err));
								else defer.resolve(folder + diskFileName);
							});

							infoJson[resolution] = diskFileName;
						}
						else {
							defer.reject(new Error('No albumart URL'));
							return defer.promise;
						}
					}

					fs.writeJsonSync(infoPath, infoJson);
				});
			}
			else {
				if (url != undefined && url != '') {
					var splitted = url.split('.');
					var fileExtension = splitted[splitted.length - 1];
					var diskFileName = uuid.v4() + '.' + fileExtension;

					var options = {
						directory: folder,
						filename: diskFileName
					}
					download(url, options, function (err) {
						if (err) defer.reject(new Error(err));
						else defer.resolve(folder + diskFileName);
					});
				}
				else {
					defer.reject(new Error('No albumart URL'));
					return defer.promise;
				}

				infoJson[resolution] = diskFileName;

			}

			fs.writeJsonSync(infoPath, infoJson);
		});
	}
	else {
		defer.resolve(folder + infoJson[resolution]);
	}
};

var searchInFolder = function (defer, path, web) {
	var coverFolder = '';
	var splitted = path.split('/');

	for (var k = 0; k < splitted.length - 1; k++) {
		coverFolder = coverFolder + '/' + splitted[k];
	}

	if (fs.existsSync(coverFolder)) {
		logger.info("Searching in folder " + coverFolder);
		var stats = fs.statSync(coverFolder);

		if (stats.isFile()) {
			var fileSizeInBytes = stats["size"];
			if (fileSizeInBytes > 0) {
				defer.resolve(coverFolder);
				return defer.promise;
			}
			else {
				defer.reject(new Error('Filesize is zero'));
				return defer.promise;
			}
		}

		/**
		 * Trying to read albumart from file
		 */

		var covers = ['coverart.jpg', 'albumart.jpg', 'coverart.png', 'albumart.png',
			'cover.jpg', 'Cover.jpg', 'folder.jpg', 'Folder.jpg',
			'cover.png', 'Cover.png', 'folder.png', 'Folder.png'];
		splitted = path.split('/');


		for (var i in covers) {
			var coverFile = coverFolder + '/' + covers[i];
			console.log("Searching for cover " + coverFile);
			if (fs.existsSync(coverFile)) {
				defer.resolve(coverFile);
				return defer.promise;
			}
		}

		var files = fs.readdirSync(coverFolder);
		for (var j in files) {
			var fileName = S(files[j]);

			console.log(fileName.s);
			if (fileName.endsWith('.png') || fileName.endsWith('.jpg')) {
				defer.resolve(coverFolder + '/' + fileName.s);
				return defer.promise;
			}

		}
	} else {
		logger.info('Folder ' + coverFolder + ' does not exist');
	}
	searchOnline(defer, web);

};

/**
 *    This method searches for the album art, downloads it if needed
 *    and returns its file path. The return value is a promise
 **/
var processRequest = function (web, path) {
	var defer = Q.defer();

	if (web == undefined && path == undefined) {
		defer.reject(new Error(''));
		return defer.promise;
	}

	if (path != undefined) {
		path = '/mnt/' + path;
		logger.info(path);
		if (fs.existsSync(path)) {

			var parser = mm(fs.createReadStream(path), function (err, metadata) {
				if (err) {
					logger.info(err);
					searchInFolder(defer, path, web);
				}
				else {
					try {
						//logger.info(JSON.stringify(metadata));
						if (metadata.picture != undefined && metadata.picture.length > 0) {
							logger.info("Found art in file " + path);

							fs.writeFile('/tmp/albumart', metadata.picture[0].data, function (err) {
								console.log('file has been written');
								defer.resolve('/tmp/albumart');
							});


						}
						else searchInFolder(defer, path, web);
					}
					catch (ecc) {
						logger.info(ecc);
					}


				}
			});
		} else {
			logger.info('File' + path + ' doesnt exist');
			searchInFolder(defer, path, web);
		}

	}
	return defer.promise;
};


/**
 *    This method processes incoming request from express.
 *    The following variables are needed to be in req.params
 *   artist
 *    album
 *    resolution
 *
 *    To achieve this assign this function to a path like /:artist/:album/:resolution
 **/
var processExpressRequest = function (req, res) {
	var web = req.query.web;
	var path = req.query.path;


	var promise = processRequest(web, path);
	promise.then(function (filePath) {
			logger.info('Sending file ' + filePath);
			res.sendFile(filePath);
		})
		.fail(function () {
			res.sendFile(__dirname + '/default.png');
		});
};


module.exports.processExpressRequest = processExpressRequest;
module.exports.processRequest = processRequest;
module.exports.setFolder = setFolder;
