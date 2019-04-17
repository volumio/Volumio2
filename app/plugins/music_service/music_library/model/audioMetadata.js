/**
 * @typedef {object} AudioMetadata
 * @extends {Model}
 * @property {number} [id]
 * @property {string} album
 * @property {string} albumartist
 * @property {string} artist
 * @property {string} artists   - comma-separated artists
 * @property {string} composer
 * @property {string} date
 * @property {string} genre		- comma-separated artists
 * @property {string} rating
 * @property {string} title
 * @property {string} fileType
 * @property {number} samplerate
 * @property {number} duration
 * @property {number} year
 * @property {number} disk		- disc number
 * @property {number} tracknumber - track number
 * @property {object} format
 * @property {number} format.duration
 * @property {number} format.bitdepth
 * @property {number} format.bitrate
 * @property {number} format.channels
 * @property {string} format.encoding
 * @property {string} format.lossless
 *
 * @property {*} [extra]
 * @property {boolean} [favorite]
 *
 * @property {string} location
 * @property {number} trackOffset
 * @property {boolean} isMetafile
 * @property {string} metafile
 *
 * @property {Date} updatedAt
 * @property {*} dataValues
 */

/**
 * Metadata fields: https://github.com/borewit/music-metadata/blob/HEAD/doc/common_metadata.md
 * Data types: http://docs.sequelizejs.com/manual/data-types.html
 */
module.exports = function(sequelize, DataTypes) {


	return sequelize.define('AudioMetadata', {

		// media info
		album: DataTypes.TEXT,
		albumartist: DataTypes.TEXT,
		artist: DataTypes.TEXT,
		artists: DataTypes.TEXT,		// comma-separated artists
		composer: DataTypes.TEXT,  		// Composer
		date: DataTypes.TEXT,  			// Release date
		genre: DataTypes.TEXT,			// comma-separated genres
		rating: DataTypes.TEXT,  		// Object holding rating score [0..1] (0.0 worst rating, 1.0 best rating) and source (e.g. user e-mail)
		title: DataTypes.TEXT,
        fileType: DataTypes.TEXT,
		year: DataTypes.INTEGER,
        samplerate: DataTypes.INTEGER,
		duration: DataTypes.INTEGER,
		disk: DataTypes.INTEGER,  // Disk or media number
		tracknumber: DataTypes.INTEGER, // Track number on the media

        /**
         * file format informtions
         */
        format: DataTypes.JSON,


		/**
		 * raw metadata from parser
		 */
		extra: DataTypes.JSON,

		// user-defined data

		/**
		 * user marked song as favorite
		 */
		favorite: {type: DataTypes.BOOLEAN, defaultValue: false},


		// system stuff

		/**
		 * string used for search
		 * This is case-insensitive string (sqlite and postgre only)
		 *
		 * TODO: use full-text search: http://www.sqlitetutorial.net/sqlite-full-text-search/
		 */
		// search:  {type: DataTypes.CITEXT},

		/**
		 * file location
		 * @type {string}
		 */
		location: {type: DataTypes.TEXT},

		/**
		 * track offset in seconds
		 * It's used when single file contains multiple tracks
		 */
		trackOffset: {type: DataTypes.INTEGER, defaultValue: null},


		/**
		 * metafile supposed to have multiple tracks
		 * Metafile example are: cue, m3u, etc
		 */
		isMetafile: {type: DataTypes.BOOLEAN, defaultValue: false},

		/**
		 * metafile location.
		 * It's used for cue files
		 * It's used when single file contains multiple tracks
		 */
		metafile: {type: DataTypes.TEXT, defaultValue: null}


		// By default, Sequelize will add the attributes createdAt and updatedAt to your model so you will be able to know when the database entry went into the db and when it was updated last.
	}, {
		indexes: [
			{
				name: 'location_idx',
				fields: ['location']
			},
			{
				name: 'metafile_idx',
				fields: ['metafile']
			},
			{
				name: 'album_idx',
				fields: ['album']
			}
		]
	});
};


/*
{
  "format": {
    "tagTypes": [
      "ID3v2.3"
    ],
    "lossless": false,
    "dataformat": "mp3",
    "bitrate": 128000,
    "sampleRate": 44100,
    "numberOfChannels": 2,
    "encoder": "LAME3.97 ",
    "duration": 245.7861224489796,
    "codecProfile": "V2.3"
  },
  "common": {
    "track": {
      "no": 1,
      "of": null
    },
    "disk": {
      "no": 1,
      "of": 1
    },
    "label": [
      "Sequel"
    ],
    "language": "English",
    "title": "Ordinary Day",
    "artists": [
      "Dolores O'Riordan"
    ],
    "artist": "Dolores O'Riordan",
    "albumartist": "Dolores O'Riordan",
    "album": "Are You Listening?",
    "year": 2007,
    "genre": [
      "Alternative Pop"
    ],
    "composer": [
      "Dolores O'Riordan"
    ]
  }
}
 */
