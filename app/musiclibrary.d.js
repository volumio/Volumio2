
/**
 * @typedef {object} SearchResult
 * @property {string} title
 * @property {Array<'list'|'grid'>} availableListViews
 * @property {Array<SearchResultItem>} items
 */

/**
 * @typedef {object} SearchResultItem
 * @property {string} service
 * @property {'song'|'folder'} type
 * @property {string} [title]
 * @property {string} [artist]
 * @property {string} [album]
 * @property {string} uri
 * @property {string} albumart
 */


/**
 * @typedef {object} SearchQuery
 * @property {string} value
 */