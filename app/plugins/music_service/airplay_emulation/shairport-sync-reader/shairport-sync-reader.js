const ShairportSyncReaderUDP = require('./shairport-sync-reader-udp');
const ShairportSyncReaderPIPE = require('./shairport-sync-reader-pipe');

var cache = {};

module.exports = new Proxy(function() {}, {
	construct: function(_, argumentsList) {
		var opts = argumentsList[0],
			key,
			Class;

		if (!!opts.path) {
			key = opts.path;
			Class = ShairportSyncReaderPIPE;
		} else {
			key = [opts.address, opts.port].join(':');
			Class = ShairportSyncReaderUDP;
		}

		if (!cache[key]) {
			cache[key] = new Class(opts);
		}

		return cache[key];
	}
});