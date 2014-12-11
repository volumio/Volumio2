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

var stats = { // DUMMY FOR NOW!
    "uptime"        : 91938,
    "playtime"      : 100,
    "artists"       : 4,
    "albums"        : 3,
    "songs"         : 416,
    "db_playtime"   : 169329,
    "db_update"     : 1417789242
}

var status = { // DUMMY FOR NOW!
    "volume"        : 85,
    "repeat"        : 0,
    "random"        : 0,
    "single"        : 0,
    "consume"       : 0,
    "playlist"      : 4,
    "playlistlength": 8,
    "mixrampdb"     : 0.000000,
    "state"         : 'pause',
    "song"          : 2,
    "songid"        : 3,
    "time"          : '16:0',
    "elapsed"       : 16.242,
    "bitrate"       : 320,
    "audio"         : '44100:24:2',
    "nextsong"      : 3,
    "nextsongid"    : 4
}

var playlistId = { // DUMMY FOR NOW!
    "file"          : 'USB/Music/Example1.mp3',
    "Last-Modified" : '2013-07-02T17:51:12Z',
    "Date"          : 2013,
    "Time"          : 3261,
    "Pos"           : 0,
    "Id"            : 9,
    "file"          : 'USB/Music/Example2.mp3',
    "Last-Modified" : '2014-08-19T09:03:52Z',
    "Time"          : 2961,
    "Pos"           : 1,
    "Id"            : 10
}

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
	socket.on('error', handleError);// on incoming message
	
	var buffer = ""; //Buffer since we may not receive whole lines
	var lineIndex = 0;  //Store the index of "\n" (<- end of line sign)
	socket.on('data', function(data) {
		buffer += data.toString(); // add new incoming data to our buffer
		lineIndex = buffer.indexOf('\n'); // check if we have a complete line
		
		if(lineIndex == -1) {
		    return; // our buffer has received no full line yet
		}
		
		// while we still have a complete line in our buffer (os.EOL == end of line (\r\n))
		while(results = buffer.split(/\r?\n/)) {
		    // get 1 line from our buffer to process
		    var message = results[0];
		    // Print message (for debugging purposes)
		    sys.puts("Received: "+message);
		    
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
		    sys.puts("Command: " + sCommand + "\nParam: "+sParam);
		    
		    switch(sCommand) {
		            case command.ADD :
	                        sendSingleCommandToCore(sCommand, sParam);
	                        socket.write("OK\n");
	                        break;
	                    case command.COMMANDS :
	                            socket.write(printCommandList(socket));
	                            socket.write("OK\n");
	                            break;
	                    case command.CROSSFADE :
	                            sendSingleCommandToCore(sCommand, sParam);
	                            socket.write("OK\n");
	                            break;
	                    case command.DELETE :
	                            sendSingleCommandToCore(sCommand, sParam);
	                            socket.write("OK\n");
	                            break;
	                    case command.NEXT :
	                            sendSingleCommandToCore(sCommand, sParam);
	                            socket.write("OK\n");
	                            break;
	                    case command.PAUSE :
	                            sendSingleCommandToCore(sCommand, sParam);
	                            socket.write("OK\n");
	                            break;
		            case command.PLAY :
	                            sendSingleCommandToCore(sCommand, sParam);
	                            socket.write("OK\n");
	                            break;
	                    case command.PLAYLISTID :
	                            socket.write(printPlaylistId());
	                            socket.write("OK\n");
	                            break;
		            case command.PREVIOUS:
	                            sendSingleCommandToCore(sCommand, sParam);
	                            socket.write("OK\n");
	                            break;
	                    case command.RANDOM :
	                            sendSingleCommandToCore(sCommand, sParam);
	                            socket.write("OK\n");
	                            break;
	                    case command.REPEAT :
	                            sendSingleCommandToCore(sCommand, sParam);
	                            socket.write("OK\n");
	                            break;
	                    case command.SEEK:
	                            sendSingleCommandToCore(sCommand, sParam);
	                            socket.write("OK\n");
	                            break;
	                    case command.SETVOL:
	                            sendSingleCommandToCore(sCommand, sParam);
	                            socket.write("OK\n");
	                            break;
	                    case command.SHUFFLE :
	                            sendSingleCommandToCore(sCommand, sParam);
	                            socket.write("OK\n");
	                            break;
	                    case command.SINGLE :
	                            sendSingleCommandToCore(sCommand, sParam);
	                            socket.write("OK\n");
	                            break;
	                    case command.STATS :
	                            socket.write(printStats());
	                            socket.write("OK\n");
	                            break;
	                    case command.STATUS :
	                            socket.write(printStatus());
	                            socket.write("OK\n");
	                            break;
	                    case command.STOP :
	                            sendSingleCommandToCore(sCommand, sParam);
	                            socket.write("OK\n");
	                            break;
	                    case command.UPDATE :
	                            sendSingleCommandToCore(sCommand, sParam);
	                            socket.write("OK\n");
	                            break;
	                    case command.VOLUME :
	                            sendSingleCommandToCore(sCommand, sParam);
	                            socket.write("OK\n");
	                            break;
		            default:
                            sys.puts("default");
		    }
		    buffer = buffer.substring(lineIndex+1); // Cuts off the processed line
		    break;
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
	volumioCore.executeCmd(command,'', function(err,msg){
		if(err){
			// TODO report error to the client
			console.log('An error has occurred');
		}else{
			// TODO report success to the client, somenthing like socket.write("OK");
			console.log(command + ' has been executed');
		}
	});
}

// method to print a list of available commands (command.COMMANDS)
function printCommandList() {
    var output = "";
    // for the length of command (nr of commands)
    for(var index in command) {
        // print command: 'command' [newline]
        output += "command: " + command[index] + "\n";
    }
    return output;
}

// method to print the stats (command.STATS)
function printStats() {
    var output = "";
    // for the length of stats (nr of attributes)
    for(var index in stats) {
        // print "stat: value"
        output += index + ": " + stats[index] + "\n";
    }
    return output;
}

// method to print the status (command.STATuS)
function printStatus() {
    var output = "";
    // for the length of statuss (nr of attributes)
    for(var index in status) {
        // print "stat: value"
        output += index + ": " + status[index] + "\n";
    }
    return output;
}

// method to print the playlist info (command.PLAYLISTID)
function printPlaylistId() {
    var output = "";
    // for the length of statuss (nr of attributes)
    for(var index in playlistId) {
        // print "stat: value"
        output += index + ": " + playlistId[index] + "\n";
    }
    return output;
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
