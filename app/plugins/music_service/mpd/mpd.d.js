/**
 * @typedef {object} BrowseResult
 * @property {object} navigation
 * @property {SearchResult[]} navigation.lists
 * @property {object} prev
 * @property {string} prev.uri
 * @property {BrowseResultInfo} [info]
 */


/**
 * @typedef {object} SearchResult
 * @property {string} title
 * @property {Array<'list'|'grid'>} availableListViews
 * @property {Array<SearchResultItem>} items
 */

/**
 * @typedef {object} SearchResultItem
 * @property {string} service
 * @property {'song'|'folder'|'internal-folder'|'remdisk'|'track'} type
 * @property {string} title
 * @property {string} [artist]
 * @property {string} [album]
 * @property {string} uri
 * @property {string} albumart
 */


/**
 * @typedef {object} MPDTrack
 * @extends {SearchResultItem}
 *
 * @property {'mpd'} service
 * @property {'track'} type
 * @property {string} [trackType]
 * @property {string} [bitdepth]
 * @property {string} [samplerate]
 * @property {string} [duration]
 */



/**
 * @typedef {object} BrowseResultInfo
 * @property {string} service
 * @property {'artist'|'album'} type
 * @property {string} title
 * @property {string} uri
 * @property {string} albumart
 */


/**
 * @typedef {object} SearchQuery
 * @property {string} value
 * @property {'any'} [type]
 * @property {string} [uri]
 *
 * TODO: @property {string} [sortBy]
 */



/**
 * @typedef {object} TrackInfo
 * @description Track info used by mpd to start playing sound
 *
 * @property {string} uri
 * @property {'mpd'} service
 * @property {string} name	 	- track title
 * @property {string} artist	- track artist
 * @property {string} album	 	- track album
 * @property {'track'} type
 * @property {number} tracknumber
 * @property {string} albumart
 *
 * @property {string} duration
 * @property {string} samplerate
 * @property {string} bitdepth
 * @property {string} trackType - file extension
 */
