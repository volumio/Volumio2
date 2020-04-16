const ShairportSyncReaderUDP = require('./shairport-sync-reader-udp');


var cache = {};

module.exports = new Proxy(function() {}, {
	construct: function(_, argumentsList) {
		var opts = argumentsList[0],
			key = [opts.address, opts.port].join(':'),
			Class = ShairportSyncReaderUDP;

		if (!cache[key]) {
			cache[key] = new Class(opts);
		}

		return cache[key];
	}
});