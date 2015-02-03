// This module work as interface for all the third parties client wich want to talk with an MPD server.
// This module get all the MPD client request but they will be handled from Volumio Core Module
var libQ = require('q');
var net = require('net');
var sys = require('sys');
// server settings
var mpdPort = null;
var mpdHost = null;
// keep track of connected clients (for broadcasts)
var clients = [];
// Volumio Core Modules. All the incoming request will be parsed and then paased to the core module
var volumioCore = null;
// Protocol, holds all status's
var protocol = require('./interface-mpd-protocol');

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
    NOIDLE          : 'noidle',
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

const tagtypes = { // List of all MPD tagtypes
		ARTIST                     : 'Artist',
		ARTISTSORT                 : 'ArtistSort',
		ALBUM                      : 'Album',
		ALBUMARTIST                : 'AlbumArtist',
		ALBUMTITLE                 : 'AlbumTitle',
		TITLE                      : 'Title',
		TRACK                      : 'Track',
		NAME                       : 'Name',
		GENRE                      : 'Genre',
		DATE                       : 'Date',
		PERFORMER                  : 'Performer',
		DISC                       : 'Disc',
		MUSICBRAINZ_ARTIS          : 'MUSICBRAINZ_ARTISTID',
		MUSICBRAINZ_ALBUMARTISTID  : 'MUSICBRAINZ_ALBUMARTISTID',
		MUSICBRAINZ_TRACKID        : 'MUSICBRAINZ_TRACKID',
};


// Define the InterfaceMPD class
module.exports = InterfaceMPD;
function InterfaceMPD (server, commandRouter) {
	var _this = this;

	// create server
	var protocolServer = net.createServer(function(socket) {
		socket.setEncoding('utf8');
		
		// add client to list
		clients.push(socket);
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
				//sys.puts("Received: "+message);
				
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
				//sys.puts("Command: " + sCommand + "\nParam: "+sParam);
				
				switch(sCommand) {
						case command.ADD :
								sendSingleCommandToCore(sCommand, sParam);
								socket.write("OK\n");
								break;
							case command.COMMANDS :
									socket.write(printCommandList());
									socket.write("OK\n");
									break;
							case command.NOTCOMMANDS :
									socket.write("OK\n");
									break;  
							case command.TAGTYPES :
									socket.write(printTagTypes());
									socket.write("OK\n");
									break;
							case command.OUTPUTS :
							// Hardcoded, but MUST be tied to system later	
								socket.write("outputid: 0\n");
								socket.write("outputname: Default\n");
								socket.write("outputenabled: 1\n");	                 
								socket.write("OK\n");
								break;    
							case command.NOIDLE :
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
									logStart('Client requests Volumio next' )
										.then(commandRouter.volumioNext.bind(commandRouter))
										.catch(console.log)
										.done(logDone);
									socket.write("OK\n");
									break;
							case command.PAUSE :
									logStart('Client requests Volumio pause' )
										.then(commandRouter.volumioPause.bind(commandRouter))
										.catch(console.log)
										.done(logDone);
									socket.write("OK\n");
									break;
						case command.PLAY :
									logStart('Client requests Volumio play' )
										.then(commandRouter.volumioPlay.bind(commandRouter))
										.catch(console.log)
										.done(logDone);
									socket.write("OK\n");
									break;
							case command.PLAYLISTID :
									// Temporary Disabled and HardCoded
									//socket.write(printArray(protocol.getPlaylistId()));
									//socket.write("OK\n");
									socket.write("ACK [50@0] {playlistid} No such song\n");
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
							case command.PREVIOUS:
									logStart('Client requests Volumio previous' )
										.then(commandRouter.volumioPrevious.bind(commandRouter))
										.catch(console.log)
										.done(logDone);
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
									socket.write(printArray(protocol.getStats()));
									socket.write("OK\n");
									break;
							case command.STATUS :
									socket.write(printArray(protocol.getStatus()));
									socket.write("OK\n");
									break;
							case command.STOP :
									logStart('Client requests Volumio stop' )
										.then(commandRouter.volumioStop.bind(commandRouter))
										.catch(console.log)
										.done(logDone);
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
	}).listen(6500, '0.0.0.0');
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

function printTagTypes() {
    var output = "";
    for(var index in tagtypes) {
        // print tagtype: 'tagtype' [newline]
        output += "tagtype: " + tagtypes[index] + "\n";
    }
    return output;
}

// method to print any array that uses (key: value) layout
function printArray(array) {
    var output = "";
    // for the length of statuss (nr of attributes)
    for(var index in array) {
        // print "stat: value"
        output += index + ": " + array[index] + "\n";
    }
    return output;
}

String.prototype.startsWith = function (str){
	return this.slice(0, str.length) == str;
};

// Receive console messages from commandRouter and broadcast to all connected clients
InterfaceMPD.prototype.printConsoleMessage = function (message) {

	console.log('InterfaceMPD::printConsoleMessage');
	// Push the message all clients
	//this.libSocketIO.emit('printConsoleMessage', message);

	// Return a resolved empty promise to represent completion
	return libQ();

}

// Receive player queue updates from commandRouter and broadcast to all connected clients
InterfaceMPD.prototype.volumioPushQueue = function (queue, connWebSocket) {

	console.log('InterfaceMPD::volumioPushQueue');
	
	/**
	var _this = this;

	if (connWebSocket) {
		return libQ.invoke(connWebSocket, 'emit', 'volumioPushQueue', queue);

	} else {
		// Push the updated queue to all clients
		return libQ.invoke(_this.libSocketIO, 'emit', 'volumioPushQueue', queue);

	}
	*/
}

// Receive player state updates from commandRouter and broadcast to all connected clients
InterfaceMPD.prototype.volumioPushState = function (state) {

	console.log('InterfaceMPD::volumioPushState');
	//console.log('volumioPushState: ' + JSON.stringify(state));
	
	//var _this = this;

	clients.forEach(function () {
	      client.write(message);
    	});

}

function logDone () {

	console.log('------------------------------');
	return libQ();

}

function logStart (sCommand) {

	console.log('\n---------------------------- ' + sCommand);
	return libQ();

}
