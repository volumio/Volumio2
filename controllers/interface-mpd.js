// This module work as interface for all the third parties client wich want to talk with an MPD server.
// This module get all the MPD client request but they will be handled from Volumio Core Module

var net = require('net');
var sys = require('sys');
// server settings
var mpdPort = null;
var mpdHost = null;
// keep track of connected clients (for broadcasts)
var clients = [];
// Volumio Core Modules. All the incoming request will be parsed and then paased to the core module
var volumioCore = null;

var command = { // List of all MPD commands
    ADD             : 'add',
    ADDID           : 'addid',
    ADDTAGID        : 'addtagid',
    CHANNELS        : 'channels',
    CLEAR           : 'clear',
    CLEARERROR      : 'clearerror',
    CLEARTAGID      : 'cleartagid',
    CLOSE           : 'close',
    COMMANDS        : 'commands',
    CONFIG          : 'config',
    CONSTUME        : 'consume',
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
    NOTCOMMANDs     : 'notcommands',
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

// create server
var protocolServer = net.createServer(function(socket) {
	socket.setEncoding('utf8');
	// add client to list
	socket.on('connection', function(socket) {
		sys.puts("New client connected: " + socket.remoteAddress +':'+ socket.remotePort);
		clients.push(socket);
	});
	// MPD welcome command
	socket.write("OK MPD 0.19.0\n"); // TODO not hardcoded?
	// handle errors in handleError function
	socket.on('error', handleError);
	// on incoming message
	socket.on('data', function(data) {
	// log data (only for debugging)
		sys.puts("received: " + data);
		// cast message to string
		var message = data.toString();
		// read command
		if(message.startsWith('next')) {
		// next command
			sys.puts("next command received");
			sendSingleCommandToCore("next");
			socket.write("OK\n");
		} else if(message.startsWith('pause')) {
		// pause command
			sys.puts("pause command received");
			sendSingleCommandToCore("pause");
			socket.write("OK\n");
		} else if(message.startsWith('play')) {
		// play command
			sys.puts("play command received");
			sendSingleCommandToCore("play");
			socket.write("OK\n");
		} else if(message.startsWith("previous")) {
		// previous command
			sys.puts("previous command received");
			sendSingleCommandToCore("previous");
			socket.write("OK\n");
		} else if(message.startsWith("stop")) {
		// stop command
			sys.puts("stop command received");
			sendSingleCommandToCore("stop");
			socket.write("OK\n");
		} else {
		// no known command
			sys.puts("command not recognized: " + message);
			socket.write("ACK\n");
		}
	});
	function handleError(err) {
		sys.puts("socket error:", err.stack);
		socket.destroy();
	}
});
// on error
protocolServer.on('error', function(err) {
	if (err.code === 'EADDRINUSE') {
		// address is in use
		sys.puts("Failed to bind MPD protocol to port " + mpdPort +
		": Address in use.");
	} else {
		throw err;
	}
});
// start the server

// method to forward commands that dont need a response
function sendSingleCommandToCore(command) {
	// Foward the command to the Core (no editing needed)
	// Right now forwards it to MPD (localhost:6600)
//	connMpdCommand.write(command + '\n');
	volumioCore.executeCmd('mpd',command,'');//.sendCommand(command + '\n');
}

String.prototype.startsWith = function (str){
	return this.slice(0, str.length) == str;
};

// method to initialize the mpd interface to listen on setMpdIntercaePort, setMpdInterfaceHost and the connection to the "real" MPD setConnMpdCommand
function initProtocolServer(setMpdIntercaePort, setMpdInterfaceHost, setVolumioCore){
	volumioCore = setVolumioCore;
	mpdPort = setMpdIntercaePort;
	mpdHost = setMpdInterfaceHost;
	protocolServer.listen(mpdPort, mpdHost, function() {
		sys.puts("Abstract MPD layer listening at: " +
		mpdHost + ":" + mpdPort);
	});
}

module.exports = initProtocolServer;
