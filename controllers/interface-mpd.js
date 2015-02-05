var net = require('net');
var libQ = require('q');

// MPD info
var mpdPort = 6500;
var mpdAddress = '0.0.0.0';

// TODO check if we can move this to the helper and make it GLOBAL?
const command = { // List of all MPD commands
    ADD             : 'add',
    ADDID           : 'addid',
    ADDTAGID        : 'addtagid',
    CHANNELS        : 'channels',
    CLEAR           : 'clear',
    CLEARERROR      : 'clearerror',
    CLEARTAGID      : 'cleartagid',
    CLOSE           : 'close',
    COMMANDS        : 'commands',
    NOTCOMMANDS     : 'notcommands',
    CONFIG          : 'config',
    CONSUME        : 'consume',
    COUNT           : 'count',
    CROSSFADE       : 'crossfade',
    CURRENTSONG     : 'currentsong',
    DECODERS        : 'decoders',
    DELETE          : 'delete',
    DELETEID        : 'deleteid',
    DISABLEOUTPUT   : 'disableoutput',
    ENABLEOUTPUT    : 'enableoutput',
    FIND            : 'find',
    FINDADD         : 'findadd',
    IDLE            : 'idle',
    KILL            : 'kill',
    LIST            : 'list',
    LISTALL         : 'listall',
    LISTALLINFO     : 'listallinfo',
    LISTFILES       : 'listfiles',
    LISTMOUNTS      : 'listmounts',
    LISTPLAYLIST    : 'listplaylist',
    LISTPLAYLISTINFO: 'listplaylistinfo',
    LISTPLAYLISTS   : 'listplaylists',
    LOAD            : 'load',
    LSINFO          : 'lsinfo',
    MIXRAMPDB       : 'mixrampdb',
    MIXRAMPDELAY    : 'mixrampdelay',
    MOUNT           : 'mount',
    MOVE            : 'move',
    MOVEID          : 'moveid',
    NEXT            : 'next',
    NOIDLE          : 'noidle',
    NOTCOMMANDS     : 'notcommands',
    OUTPUTS         : 'outputs',
    PASSWORD        : 'password',
    PAUSE           : 'pause',
    PING            : 'ping',
    PLAY            : 'play',
    PLAYID          : 'playid',
    PLAYLIST        : 'playlist',
    PLAYLISTADD     : 'playlistadd',
    PLAYLISTCLEAR   : 'playlistclear',
    PLAYLISTDELETE  : 'playlistdelete',
    PLAYLISTFIND    : 'playlistfind',
    PLAYLISTID      : 'playlistid',
    PLAYLISTINFO    : 'playlistinfo',
    PLAYLISTMOVE    : 'playlistmove',
    PLAYLISTSEARCH  : 'playlistsearch',
    PLCHANGES       : 'plchanges',
    PLCHANGEPOSID   : 'plchangesposid',
    PREVIOUS        : 'previous',
    PRIO            : 'prio',
    PRIOID          : 'prioid',
    RANDOM          : 'random',
    RANGEID         : 'rangeid',
    READCOMMENTS    : 'readcomments',
    READMESSAGES    : 'readmessages',
    RENAME          : 'rename',
    REPEAT          : 'repeat',
    REPLAY_GAIN_MODE: 'replay_gain_mode',
    REPLAY_GAIN_STATUS: 'replay_gain_status',
    RESCAN          : 'rescan',
    REMOVE          : 'rm',
    SAVE            : 'save',
    SEARCH          : 'search',
    SEARCHADD       : 'searchadd',
    SEARCHADDPL     : 'searchaddpl',
    SEEK            : 'seek',
    SEEKCUR         : 'seekcur',
    SEEKID          : 'seekid',
    SENDMESSAGE     : 'sendmessage',
    SETVOL          : 'setvol',
    SHUFFLE         : 'shuffle',
    SINGLE          : 'single',
    STATS           : 'stats',
    STATUS          : 'status',
    STICKER         : 'sticker',
    STOP            : 'stop',
    SUBSCRIBE       : 'subscribe',
    SWAP            : 'swap',
    SWAPID          : 'swapid',
    TAGTYPES        : 'tagtypes',
    TOGGLEOUTPUT    : 'toggleoutput',
    UNMOUNT         : 'unmount',
    UNSUBSCRIBE     : 'unsubscribe',
    UPDATE          : 'update',
    URLHANDLERS     : 'urlhandlers',
    VOLUME          : 'volume'    
};

// Define the InterfaceMPD class
module.exports = InterfaceMPD;
function InterfaceMPD (server, commandRouter) {
	
	var _this = this;
	this.commRouter = commandRouter;

	// helpers
	this.helper = require('./interface-mpd-helper.js');
	this.idles = [];

	// create server
	var protocolServer = net.createServer(function(client) {
		// set Encoding (TODO check if this is necessary)
		client.setEncoding('utf8');
				
		// MPD welcome command
		client.write("OK MPD 0.19.0\n"); // TODO not hardcoded?
		
		// Incoming message (maybe a command?)
		var buffer = ""; //Buffer since we may not receive whole lines
		var lineIndex = 0;  //Store the index of "\n" (<- end of line sign)
		client.on('data', function(data) {
			// add new incoming data to our buffer
			buffer += data.toString(); 
			// check if we have a complete line
			lineIndex = buffer.indexOf('\n'); 
			
			if(lineIndex == -1) {
				return; // our buffer has received no full line yet
			}
			
			// while we still have a complete line in our buffer (os.EOL == end of line (\r\n))
			while(results = buffer.split(/\r?\n/)) {
				// get 1 line from our buffer to process
				var message = results[0];
				// Handle message elsewhere (keep it clean)
				_this.handleMessage(message, client);
				
				buffer = buffer.substring(lineIndex+1); // Cuts off the processed line
				break;
			}	
		});	
	}).listen(mpdPort, mpdAddress); // start server
	
	// On server error
	protocolServer.on('error', function(err) {
		if (err.code === 'EADDRINUSE') {
			// address is in use
			console.log("Failed to bind MPD protocol to port " + mpdPort +
			": Address in use.");
		} else {
			throw err;
		}
	});
}

// ================================ INTERNAL FUNCTIONS

// Incoming message handler
InterfaceMPD.prototype.handleMessage = function (message, socket) {
	
	var _this = this;

	// some vars to help extract command/parameters from line
	var nSpaceLocation = 0;
	var sCommand = '';
	var sParam = '';
	
	// check if there is a space
	nSpaceLocation = message.indexOf(' ');
	if(nSpaceLocation == -1) {
		// no space, only 1 command
		sCommand = message.substring(/\r?\n/);
	} else {
		// a space, before space command, rest parameter
		sCommand = message.substring(0,nSpaceLocation);
		sParam = message.substring(nSpaceLocation+1, message.length);
	}
	
	//console.log("Incoming command: " + sCommand + "\nParam: "+sParam);
	
	switch(sCommand) {
		case command.ADD :
			socket.write("OK\n");
			break;
		case command.ADDID :
			socket.write("OK\n");
			break;			
		case command.ADDTAGID :
			socket.write("OK\n");
			break;		
		case command.CHANNELS :
			socket.write("OK\n");
			break;		
		case command.CLEAR :
			socket.write("OK\n");
			break;		
		case command.CLEARERROR :
			socket.write("OK\n");
			break;		
		case command.CLEARTAGID :
			socket.write("OK\n");
			break;		
		case command.CLOSE :
			socket.write("OK\n");
			break;
		case command.COMMANDS :
			socket.write("OK\n");
			break;  		
		case command.CONFIG :
			socket.write("OK\n");
			break;		
		case command.CONSUME :
			socket.write("OK\n");
			break;		
		case command.COUNT :
			socket.write("OK\n");
			break;
		case command.CROSSFADE :
			socket.write("OK\n");
			break;		
		case command.CURRENTSONG :
			socket.write("OK\n");
			break;		
		case command.DECODERS :
			socket.write("OK\n");
			break;
		case command.DELETE :
			socket.write("OK\n");
			break;		
		case command.DELETEID :
			socket.write("OK\n");
			break;		
		case command.DISABLEOUTPUT :
			socket.write("OK\n");
			break;		
		case command.ENABLEOUTPUT :
			socket.write("OK\n");
			break;		
		case command.FIND :
			socket.write("OK\n");
			break;		
		case command.FINDADD :
			socket.write("OK\n");
			break;
		case command.IDLE :
			_this.idles.push(socket);
			break;		
		case command.KILL :
			socket.write("OK\n");
			break;		
		case command.LIST :
			socket.write("OK\n");
			break;		
		case command.LISTALL :
			socket.write("OK\n");
			break;		
		case command.LISTALLINFO :
			socket.write("OK\n");
			break;		
		case command.LISTFILES :
			socket.write("OK\n");
			break;		
		case command.LISTMOUNTS :
			socket.write("OK\n");
			break;		
		case command.LISTPLAYLIST :
			socket.write("OK\n");
			break;		
		case command.LISTPLAYLISTINFO :
			socket.write("OK\n");
			break;		
		case command.LISTPLAYLISTS :
			socket.write("OK\n");
			break;		
		case command.LOAD :
			socket.write("OK\n");
			break;		
		case command.LSINFO :
			socket.write("OK\n");
			break;		
		case command.MIXRAMPDB :
			socket.write("OK\n");
			break;		
		case command.MIXRAMPDELAY :
			socket.write("OK\n");
			break;		
		case command.MOUNT :
			socket.write("OK\n");
			break;		
		case command.MOVE :
			socket.write("OK\n");
			break;		
		case command.MOVEID :
			socket.write("OK\n");
			break;
		case command.NEXT :
			logStart('Client requests Volumio next' )
				.then(_this.commRouter.volumioNext.bind(_this.commRouter))
				.catch(console.log)
				.done(logDone);
			socket.write("OK\n");
			break;
		case command.NOIDLE :
			socket.write("OK\n");
			break;	
		case command.NOTCOMMANDS :
			socket.write("OK\n");
			break;  
		case command.OUTPUTS :
			// Hardcoded, but MUST be tied to system later	
			socket.write("outputid: 0\n");
			socket.write("outputname: Default\n");
			socket.write("outputenabled: 1\n");	                 
			socket.write("OK\n");
			break;  		
		case command.PASSWORD :
			socket.write("OK\n");
			break;
		case command.PAUSE :
			logStart('Client requests Volumio pause' )
				.then(_this.commRouter.volumioPause.bind(_this.commRouter))
				.catch(console.log)
				.done(logDone);
			socket.write("OK\n");
			break;		
		case command.PING :
			socket.write("OK\n");
			break;
		case command.PLAY :
			logStart('Client requests Volumio play' )
				.then(_this.commRouter.volumioPlay.bind(_this.commRouter))
				.catch(console.log)
				.done(logDone);
			socket.write("OK\n");
			break;		
		case command.PLAYID :
			socket.write("OK\n");
			break;
		case command.PLAYLIST :
			logStart('Client requests Volumio queue')
				.then(_this.commRouter.volumioGetQueue.bind(_this.commRouter))
				.then(function (queue) {
					_this.helper.setQueue(queue);
				}).then(function() {
					socket.write(_this.helper.printPlaylist());
					socket.write("OK\n");
				})
				.catch(console.log)
				.done(logDone);
			break;		
		case command.PLAYLISTADD :
			socket.write("OK\n");
			break;		
		case command.PLAYLISTCLEAR :
			socket.write("OK\n");
			break;		
		case command.PLAYLISTDELETE :
			socket.write("OK\n");
			break;		
		case command.PLAYLISTFIND :
			socket.write("OK\n");
			break;		
		case command.PLAYLISTID :
			// Temporary Disabled and HardCoded
			//socket.write(_this.helper.getPlaylistId()));
			//socket.write("OK\n");
			socket.write("ACK [50@0] {playlistid} No such song\n");
			break;    		
		case command.PLAYLISTINFO :
			socket.write("OK\n");
			break;		
		case command.PLAYLISTMOVE :
			socket.write("OK\n");
			break;		
		case command.PLAYLISTSEARCH :
			socket.write("OK\n");
			break;		
		case command.PLCHANGES :
			socket.write("OK\n");
			break;		
		case command.PLCHANGEPOSID :
			socket.write("OK\n");
			break;
		case command.PREVIOUS:
			logStart('Client requests Volumio previous' )
				.then(_this.commRouter.volumioPrevious.bind(_this.commRouter))
				.catch(console.log)
				.done(logDone);
			socket.write("OK\n");
			break;		
		case command.PRIO :
			socket.write("OK\n");
			break;		
		case command.PRIOID :
			socket.write("OK\n");
			break;
		case command.RANDOM :
			socket.write("OK\n");
			break;		
		case command.RANGEID :
			socket.write("OK\n");
			break;		
		case command.READCOMMENTS :
			socket.write("OK\n");
			break;		
		case command.READMESSAGES :
			socket.write("OK\n");
			break;		
		case command.RENAME :
			socket.write("OK\n");
			break;
		case command.REPEAT :
			socket.write("OK\n");
			break;		
		case command.REPLAY_GAIN_MODE :
			socket.write("OK\n");
			break;		
		case command.REPLAY_GAIN_STATUS :
			socket.write("OK\n");
			break;		
		case command.RESCAN :
			socket.write("OK\n");
			break;		
		case command.REMOVE :
			socket.write("OK\n");
			break;		
		case command.SAVE :
			socket.write("OK\n");
			break;		
		case command.SEARCH :
			socket.write("OK\n");
			break;		
		case command.SEARCHADD :
			socket.write("OK\n");
			break;		
		case command.SEARCHADDPL :
			socket.write("OK\n");
			break;
		case command.SEEK:
			socket.write("OK\n");
			break;		
		case command.SEEKCUR :
			socket.write("OK\n");
			break;		
		case command.SEEKID :
			socket.write("OK\n");
			break;		
		case command.SENDMESSAGE :
			socket.write("OK\n");
			break;
		case command.SETVOL:
			socket.write("OK\n");
			break;
		case command.SHUFFLE :
			socket.write("OK\n");
			break;
		case command.SINGLE :
			socket.write("OK\n");
			break;
		case command.STATS :
			logStart('Client requests Volumio stats')
				.then(socket.write(_this.helper.printStats()))
				.done(logDone);
			socket.write("OK\n");
			break;
		case command.STATUS :
			logStart('Client requests Volumio status')
				.then(_this.commRouter.volumioGetState.bind(_this.commRouter))
				.then(function (state) {
					_this.volumioPushState.call(_this, state, socket);
				})
				.catch(console.log)
				.done(logDone);
			socket.write("OK\n");
			break;		
		case command.STICKER :
			socket.write("OK\n");
			break;
		case command.STOP :
			logStart('Client requests Volumio stop' )
				.then(_this.commRouter.volumioStop.bind(_this.commRouter))
				.catch(console.log)
				.done(logDone);
			socket.write("OK\n");
			break;		
		case command.SUBSCRIBE :
			socket.write("OK\n");
			break;		
		case command.SWAP :
			socket.write("OK\n");
			break;		
		case command.SWAPID :
			socket.write("OK\n");
			break;
		case command.TAGTYPES :
			socket.write(_this.helper.printTagTypes());
			socket.write("OK\n");
			break;		
		case command.TOGGLEOUTPUT :
			socket.write("OK\n");
			break;		
		case command.UNMOUNT :
			socket.write("OK\n");
			break;		
		case command.UNSUBSCRIBE :
			socket.write("OK\n");
			break;
		case command.UPDATE :
			socket.write("OK\n");
			break;
		case command.URLHANDLERS:
			socket.write("handler: http://\n");
			socket.write("handler: mms://\n");
			socket.write("handler: mmsh://\n");
			socket.write("handler: mmst://\n");
			socket.write("handler: mmsu://\n");
			socket.write("handler: gopher://\n");
			socket.write("handler: rtp://\n");
			socket.write("handler: rtsp://\n");
			socket.write("handler: rtmp://\n");
			socket.write("handler: rtmpt://\n");
			socket.write("handler: rtmps://\n");
			socket.write("OK\n");
			break;    
		case command.VOLUME :
			socket.write("OK\n");
			break;
		default:
			console.log("default");
	}
}

// Handles commands that dont respond
InterfaceMPD.prototype.singleCommand = function (sCommand, sParam) {
	// TODO route to CommandRouter
}

function logDone () {

	console.log('------------------------------');
	return libQ();

}

function logStart (sCommand) {

	console.log('\n---------------------------- ' + sCommand);
	return libQ();

}
// END OF INTERNAL FUNCTIONS

// ================================ PUBLIC FUNCTIONS
// Receive console messages from commandRouter and broadcast to all connected clients
InterfaceMPD.prototype.printConsoleMessage = function (message) {

	console.log('InterfaceMPD::printConsoleMessage');
	
	// MPD clients dont need to receive console messages
	
	// Return a resolved empty promise to represent completion
	return libQ();

}

// Receive player queue updates from commandRouter and broadcast to all connected clients
InterfaceMPD.prototype.volumioPushQueue = function (queue) {

	console.log('InterfaceMPD::volumioPushQueue');
	
	// pass queue to the helper
	this.helper.setQueue(queue);

	// broadcast playlist changed to all idlers
	this.idles.forEach(function (client) {
		client.write("changed: playlist\n");
	});

	// TODO q-stuff
}

// Receive player state updates from commandRouter and broadcast to all connected clients
InterfaceMPD.prototype.volumioPushState = function (state, socket) {

	console.log('InterfaceMPD::volumioPushState');	
	var _this = this;
	
	// if requested by client, respond
	if(socket) {
		socket.write(_this.helper.printStatus(state));
	// else broadcast to all idlers
	} else {
		// pass state to the helper
		_this.helper.setStatus(state);
		
		// broadcast state changed to all idlers
		this.idles.forEach(function (client) {
			client.write("changed: player\n");
		});
	}
	// TODO q-stuff

}
// END OF PUBLIC FUNCTIONS