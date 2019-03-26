var fs = require('fs');
var path = require('path');
var musicMetadata = require('music-metadata');
var cueParser = require('cue-parser');
var libQ = require('kew');
var _ = require('underscore');
var iterateArrayAsync = require('./utils').iterateArrayAsync;


module.exports = {
	isMediaFile: isMediaFile,
	parseFile: parseFile
};


var METADATA_EXTRACTOR_CONFIG = {
	'music-metadata': [
		// got from: https://github.com/Borewit/music-metadata/blob/master/src/ParserFactory.ts#L77
		'.mp2',
		'.mp3',
		'.m2a',
		'.ape',
		'.aac',
		'.mp4',
		'.m4a',
		'.m4b',
		'.m4pa',
		'.m4v',
		'.m4r',
		'.3gp',
		'.wma',
		'.wmv',
		'.asf',
		'.flac',
		'.ogg',
		'.ogv',
		'.oga',
		'.ogm',
		'.ogx',
		'.opus',
		'.spx',
		'.aif',
		'.aiff',
		'.aifc',
		'.wav',
		'.wv',
		'.wvp',
		'.mpc'
	],
	'cue-parser': [
		'.cue'
	]
};


/**
 * @param {string} filename
 * @return {boolean}
 */
function isMediaFile(filename) {
	var ext = path.extname(filename);
	return METADATA_EXTRACTOR_CONFIG['music-metadata'].indexOf(ext) >= 0
		|| METADATA_EXTRACTOR_CONFIG['cue-parser'].indexOf(ext) >= 0;
}

/**
 * @param {string} filename
 * @return {Promise<AudioMetadata[]>}
 */
function parseFile(filename) {
	return libQ.resolve().then(function() {
		var ext = path.extname(filename);
		if (METADATA_EXTRACTOR_CONFIG['music-metadata'].indexOf(ext) >= 0) {
			return _parseCommon(filename).then(function(d) {
				return [d];
			});
		} else if (METADATA_EXTRACTOR_CONFIG['cue-parser'].indexOf(ext) >= 0) {
			return _parseCue(filename);
		} else {
			throw new Error('metadata: unknown extension');
		}
	});
}

/**
 * @param filename
 * @return {Promise<AudioMetadata>}
 */
function _parseCommon(filename) {
	return musicMetadata.parseFile(filename, {native: false})
		.then(function(metadata) {
			// console.log('metadata._parseCommon', JSON.stringify(metadata));
			// console.log('%s - %s\n\tat %s', metadata.common.album, metadata.common.title, filename);
			return mm2custom(filename, metadata);
		});
}


/**
 * @param {string} filename
 * @return {Promise<AudioMetadata[]>}
 */
function _parseCue(filename) {
	/**
	 * @type {CueSheet}
	 */
	var cuesheet = cueParser.parse(filename) || {};
	// console.log('metadata._parseCue', JSON.stringify(cuesheet));

	/**
	 * @type {Array<AudioMetadata>}
	 */
	var tracks = [];

	// iterate through each file
	return iterateArrayAsync(cuesheet.files || [], function(fileData, i) {
		// check that file exists
		var location = path.join(path.dirname(filename), fileData.name);
		return libQ.nfcall(fs.stat, location).then(function(stats) {
			if (!stats.isFile()) {
				console.warn('metadata._parseCue: Referred file has wrong format:', location);
				return;
			}
			return _parseCommon(location);
		}).then(function(commonMetadata) {

			// iterate through each track in file
			// return iterateArrayAsync(fileData.tracks || [], function(_t, j) {
			(fileData.tracks || []).forEach(function(_t, j) {
				var cueMetadata = cue2custom(location, cuesheet, i, j);

				var mergedMetadata = _.defaults({}, cueMetadata, commonMetadata);
				tracks.push(mergedMetadata);
			});
		}).fail(function(err) {
			if (err.code == 'ENOENT') {
				console.log('metadata._parseCue: Referred file doesn\'t exist:', location);
			} else {
				throw err;
			}
		});
	}).then(function() {
		// console.log('metadata._parseCue: result:', tracks);
		return tracks;
	});
}


/**
 * Convert metadata from 'music-metadata' format to 'AudioMetadata'
 * @param {string} location
 * @param {IAudioMetadata} metadata
 * @return {AudioMetadata}
 */
function mm2custom(location, metadata) {
	// TODO: process media picture
	delete metadata.common.picture;
	// console.log(JSON.stringify(metadata));

	return {
        album: metadata.common.album,
        albumartist: metadata.common.albumartist,
        artist: metadata.common.artist,
        artists: (metadata.common.artists || []).join(',') || null,
        composer: (metadata.common.composer || []).join(',') || null,
        date: metadata.common.date,
        genre: (metadata.common.genre || []).join(',') || null,
        rating: ((metadata.common.rating || [])[0] || {}).rating,	// get first rating value
        title: metadata.common.title || path.basename(location),
        fileType: location.split('.').pop(),
        year: parseInt(metadata.common.year) || null,
        samplerate: parseSampleRate(parseInt(metadata.format.sampleRate) || 44100),
        disk: parseInt(metadata.common.disk.no) || null,
        tracknumber: parseInt(metadata.common.track.no) || null,
        format: {
            duration: parseInt(metadata.format.duration) || null,
            bitdepth: (parseInt(metadata.format.bitsPerSample) || 16) + ' bit',
            bitrate: parseInt(metadata.format.bitrate) || null,
			channels: parseInt(metadata.format.numberOfChannels) || null,
			encoding: metadata.format.dataformat,
			lossless: metadata.format.lossless
        },
		extra: metadata.common,
		location: location,
		trackOffset: null
	};
}

/**
 * Convert metadata from 'cue-parser' format to 'AudioMetadata'
 * @param {string} location
 * @param {CueSheet} cuesheet
 * @param {number} fileIndex
 * @param {number} trackIndex
 * @return {AudioMetadata}
 */
function cue2custom(location, cuesheet, fileIndex, trackIndex) {
	var trackData = _.defaults({},
		cuesheet.files[fileIndex].tracks[trackIndex],
		cuesheet.files[fileIndex],
		cuesheet,
		{
			rem: [],
			title: path.basename(location)
		});
	delete trackData.files;
	delete trackData.tracks;

	// TODO: cue2common may be updated later
	return {
		album: cuesheet.title,
		albumartist: cuesheet.performer,
		artist: trackData.performer,
		artists: trackData.performer,
		composer: trackData.songWriter,
		// date: undefined,
		genre: getRemData(trackData.rem, 'GENRE'),
		// rating: undefined,
		title: trackData.title,
		year: parseInt(getRemData(trackData.rem, 'DATE')) || null,
		// disk: undefined,
		tracknumber: parseInt(trackData.number) || null,

		extra: trackData,

		location: location,
		trackOffset: getTrackOffset(trackData.indexes)
	};
}

/**
 * Convert samplerate string into string to show to user
 * @param {string} bitrate
 */
function parseSampleRate(sampleRate) {
	//todo proper parse dsd data

	return sampleRate / 1000 + ' kHz';
}

/**
 * Extract data from 'rem' field
 * @example
 * "rem": [
 *     "GENRE Pop",
 *     "DATE 1992",
 *     "DISCID EE0E0910",
 *     "COMMENT \"ExactAudioCopy v0.99pb4\""
 * ]
 * @param {string[]} rem
 * @param {string} name
 * @return {string}
 */
function getRemData(rem, name) {
	rem = rem || [];
	for (var i = 0; i < rem.length; i++) {
		if (rem[i].substring(0, name.length + 1) == name + ' ') {
			return rem[i].substring(name.length + 1);
		}
	}
}


/**
 * Extract data from 'rem' field
 * @example
 * "indexes":
 * [
 *   {
	    "number": 1,
	    "time": {
		  "min": 0,
		  "sec": 0,
		  "frame": 0
	    }
	 }
 * ]
 * @param {ICueIndex[]} indexes
 * @return {number} number of seconds
 */
function getTrackOffset(indexes) {
	/**
	 * @type {ICueIndex}
	 */
	var index = (indexes || [])[0] || {};

	/**
	 * @type {ICueTime}
	 */
	var time = index.time || {}; // actually, time is 'ICueTime', not 'string'
	return (time.min || 0) * 60 + (time.sec || 0);
}
