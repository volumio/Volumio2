const dgram = require('dgram');
const ShairportSyncReader = require('./shairport-sync-reader-base');

class ShairportSyncReaderUDP extends ShairportSyncReader {
	constructor(opts) {
		super();
		var self = this;
		this._source = dgram.createSocket('udp4');

		this._source.bind(opts.port);
        this._source.on('error', () => console.log('Error in binding UDP Server: '+error));
        this._source.on('listening', function() {
            try{
            	self._source.addMembership(opts.address)
            } catch(e){
				console.log('Error adding Membership: '+e)
                }
            });

		this._source.on('message', msg =>
			this.useData({
				type: msg.toString(undefined, 0, 4),
				code: msg.toString(undefined, 4, 8),
				cont: msg.slice(8)
			})
		);
	}
}

module.exports = ShairportSyncReaderUDP;