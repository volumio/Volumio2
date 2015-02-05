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
            handleAdd(sCommand, sParam, socket);
            break;
        case command.ADDID :
            handleAddid(sCommand, sParam, socket);
            break;
        case command.ADDTAGID :
            handleAddtagid(sCommand, sParam, socket);
            break;
        case command.CHANNELS :
            handleChannels(sCommand, sParam, socket);
            break;
        case command.CLEAR :
            handleClear(sCommand, sParam, socket);
            break;
        case command.CLEARERROR :
            handleClearerror(sCommand, sParam, socket);
            break;
        case command.CLEARTAGID :
            handleCleartagid(sCommand, sParam, socket);
            break;
        case command.CLOSE :
            handleClose(sCommand, sParam, socket);
            break;
        case command.COMMANDS :
            handleCommands(sCommand, sParam, socket);
            break;
        case command.CONFIG :
            handleConfig(sCommand, sParam, socket);
            break;
        case command.CONSUME :
            handleConsume(sCommand, sParam, socket);
            break;
        case command.COUNT :
            handleCount(sCommand, sParam, socket);
            break;
        case command.CROSSFADE :
            handleCrossfade(sCommand, sParam, socket);
            break;
        case command.CURRENTSONG :
            handleCurrentsong(sCommand, sParam, socket);
            break;
        case command.DECODERS :
            handleDecoders(sCommand, sParam, socket);
            break;
        case command.DELETE :
            handleDelete(sCommand, sParam, socket);
            break;
        case command.DELETEID :
            handleDeleteid(sCommand, sParam, socket);
            break;
        case command.DISABLEOUTPUT :
            handleDisableoutput(sCommand, sParam, socket);
            break;
        case command.ENABLEOUTPUT :
            handleEnableoutput(sCommand, sParam, socket);
            break;
        case command.FIND :
            handleFind(sCommand, sParam, socket);
            break;
        case command.FINDADD :
            handleFindadd(sCommand, sParam, socket);
            break;
        case command.IDLE :
            handleIdle(sCommand, sParam, socket);
            break;
        case command.KILL :
            handleKill(sCommand, sParam, socket);
            break;
        case command.LIST :
            handleList(sCommand, sParam, socket);
            break;
        case command.LISTALL :
            handleListall(sCommand, sParam, socket);
            break;
        case command.LISTALLINFO :
            handleListallinfo(sCommand, sParam, socket);
            break;
        case command.LISTFILES :
            handleListfiles(sCommand, sParam, socket);
            break;
        case command.LISTMOUNTS :
            handleListmounts(sCommand, sParam, socket);
            break;
        case command.LISTPLAYLIST :
            handleListplaylist(sCommand, sParam, socket);
            break;
        case command.LISTPLAYLISTINFO :
            handleListplaylistinfo(sCommand, sParam, socket);
            break;
        case command.LISTPLAYLISTS :
            handleListplaylists(sCommand, sParam, socket);
            break;
        case command.LOAD :
            handleLoad(sCommand, sParam, socket);
            break;
        case command.LSINFO :
            handleLsinfo(sCommand, sParam, socket);
            break;
        case command.MIXRAMPDB :
            handleMixrampdb(sCommand, sParam, socket);
            break;
        case command.MIXRAMPDELAY :
            handleMixrampdelay(sCommand, sParam, socket);
            break;
        case command.MOUNT :
            handleMount(sCommand, sParam, socket);
            break;
        case command.MOVE :
            handleMove(sCommand, sParam, socket);
            break;
        case command.MOVEID :
            handleMoveid(sCommand, sParam, socket);
            break;
        case command.NEXT :
            handleNext(sCommand, sParam, socket);
            break;
        case command.NOTCOMMANDS :
            handleNotcommands(sCommand, sParam, socket);
            break;
        case command.OUTPUTS :
            handleOutputs(sCommand, sParam, socket);
            break;
        case command.PASSWORD :
            handlePassword(sCommand, sParam, socket);
            break;
        case command.PAUSE :
            handlePause(sCommand, sParam, socket);
            break;
        case command.PING :
            handlePing(sCommand, sParam, socket);
            break;
        case command.PLAY :
            handlePlay(sCommand, sParam, socket);
            break;
        case command.PLAYID :
            handlePlayid(sCommand, sParam, socket);
            break;
        case command.PLAYLIST :
            handlePlaylist(sCommand, sParam, socket);
            break;
        case command.PLAYLISTADD :
            handlePlaylistadd(sCommand, sParam, socket);
            break;
        case command.PLAYLISTCLEAR :
            handlePlaylistclear(sCommand, sParam, socket);
            break;
        case command.PLAYLISTDELETE :
            handlePlaylistdelete(sCommand, sParam, socket);
            break;
        case command.PLAYLISTFIND :
            handlePlaylistfind(sCommand, sParam, socket);
            break;
        case command.PLAYLISTID :
            handlePlaylistid(sCommand, sParam, socket);
            break;
        case command.PLAYLISTINFO :
            handlePlaylistinfo(sCommand, sParam, socket);
            break;
        case command.PLAYLISTMOVE :
            handlePlaylistmove(sCommand, sParam, socket);
            break;
        case command.PLAYLISTSEARCH :
            handlePlaylistsearch(sCommand, sParam, socket);
            break;
        case command.PLCHANGES :
            handlePlchanges(sCommand, sParam, socket);
            break;
        case command.PLCHANGESPOSID :
            handlePlchangesposid(sCommand, sParam, socket);
            break;
        case command.PREVIOUS :
            handlePrevious(sCommand, sParam, socket);
            break;
        case command.PRIO :
            handlePrio(sCommand, sParam, socket);
            break;
        case command.PRIOID :
            handlePrioid(sCommand, sParam, socket);
            break;
        case command.RANDOM :
            handleRandom(sCommand, sParam, socket);
            break;
        case command.RANGEID :
            handleRangeid(sCommand, sParam, socket);
            break;
        case command.READCOMMENTS :
            handleReadcomments(sCommand, sParam, socket);
            break;
        case command.READMESSAGES :
            handleReadmessages(sCommand, sParam, socket);
            break;
        case command.RENAME :
            handleRename(sCommand, sParam, socket);
            break;
        case command.REPEAT :
            handleRepeat(sCommand, sParam, socket);
            break;
        case command.REPLAY_GAIN_MODE :
            handleReplay_gain_mode(sCommand, sParam, socket);
            break;
        case command.REPLAY_GAIN_STATUS :
            handleReplay_gain_status(sCommand, sParam, socket);
            break;
        case command.RESCAN :
            handleRescan(sCommand, sParam, socket);
            break;
        case command.RM :
            handleRm(sCommand, sParam, socket);
            break;
        case command.SAVE :
            handleSave(sCommand, sParam, socket);
            break;
        case command.SEARCH :
            handleSearch(sCommand, sParam, socket);
            break;
        case command.SEARCHADD :
            handleSearchadd(sCommand, sParam, socket);
            break;
        case command.SEARCHADDPL :
            handleSearchaddpl(sCommand, sParam, socket);
            break;
        case command.SEEK :
            handleSeek(sCommand, sParam, socket);
            break;
        case command.SEEKCUR :
            handleSeekcur(sCommand, sParam, socket);
            break;
        case command.SEEKID :
            handleSeekid(sCommand, sParam, socket);
            break;
        case command.SENDMESSAGE :
            handleSendmessage(sCommand, sParam, socket);
            break;
        case command.SETVOL :
            handleSetvol(sCommand, sParam, socket);
            break;
        case command.SHUFFLE :
            handleShuffle(sCommand, sParam, socket);
            break;
        case command.SINGLE :
            handleSingle(sCommand, sParam, socket);
            break;
        case command.STATS :
            handleStats(sCommand, sParam, socket);
            break;
        case command.STATUS :
            handleStatus(sCommand, sParam, socket);
            break;
        case command.STOP :
            handleStop(sCommand, sParam, socket);
            break;
        case command.SUBSCRIBE :
            handleSubscribe(sCommand, sParam, socket);
            break;
        case command.SWAP :
            handleSwap(sCommand, sParam, socket);
            break;
        case command.SWAPID :
            handleSwapid(sCommand, sParam, socket);
            break;
        case command.TAGTYPES :
            handleTagtypes(sCommand, sParam, socket);
            break;
        case command.TOGGLEOUTPUT :
            handleToggleoutput(sCommand, sParam, socket);
            break;
        case command.UNMOUNT :
            handleUnmount(sCommand, sParam, socket);
            break;
        case command.UNSUBSCRIBE :
            handleUnsubscribe(sCommand, sParam, socket);
            break;
        case command.UPDATE :
            handleUpdate(sCommand, sParam, socket);
            break;
        case command.URLHANDLERS :
            handleUrlhandlers(sCommand, sParam, socket);
            break;
        case command.VOLUME :
            handleVolume(sCommand, sParam, socket);
            break;
		default:
			console.log("default");
	}
}

// ============================ COMMAND HANDLERS
// All handlers are on Alphabetical order of Commands.

// Handler for command: ADD
InterfaceMPD.prototype.handleAdd = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: ADDID
InterfaceMPD.prototype.handleAddid = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: ADDTAGID
InterfaceMPD.prototype.handleAddtagid = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: CHANNELS
InterfaceMPD.prototype.handleChannels = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: CLEAR
InterfaceMPD.prototype.handleClear = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: CLEARERROR
InterfaceMPD.prototype.handleClearerror = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: CLEARTAGID
InterfaceMPD.prototype.handleCleartagid = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: CLOSE
InterfaceMPD.prototype.handleClose = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: COMMANDS
InterfaceMPD.prototype.handleCommands = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: CONFIG
InterfaceMPD.prototype.handleConfig = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: CONSUME
InterfaceMPD.prototype.handleConsume = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: COUNT
InterfaceMPD.prototype.handleCount = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: CROSSFADE
InterfaceMPD.prototype.handleCrossfade = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: CURRENTSONG
InterfaceMPD.prototype.handleCurrentsong = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: DECODERS
InterfaceMPD.prototype.handleDecoders = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: DELETE
InterfaceMPD.prototype.handleDelete = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: DELETEID
InterfaceMPD.prototype.handleDeleteid = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: DISABLEOUTPUT
InterfaceMPD.prototype.handleDisableoutput = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: ENABLEOUTPUT
InterfaceMPD.prototype.handleEnableoutput = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: FIND
InterfaceMPD.prototype.handleFind = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: FINDADD
InterfaceMPD.prototype.handleFindadd = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: IDLE
InterfaceMPD.prototype.handleIdle = function(sCommand, sParam, client) {

    // keep client in idle list
    this.idles.push(client);
    
	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: KILL
InterfaceMPD.prototype.handleKill = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: LIST
InterfaceMPD.prototype.handleList = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: LISTALL
InterfaceMPD.prototype.handleListall = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: LISTALLINFO
InterfaceMPD.prototype.handleListallinfo = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: LISTFILES
InterfaceMPD.prototype.handleListfiles = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: LISTMOUNTS
InterfaceMPD.prototype.handleListmounts = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: LISTPLAYLIST
InterfaceMPD.prototype.handleListplaylist = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: LISTPLAYLISTINFO
InterfaceMPD.prototype.handleListplaylistinfo = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: LISTPLAYLISTS
InterfaceMPD.prototype.handleListplaylists = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: LOAD
InterfaceMPD.prototype.handleLoad = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: LSINFO
InterfaceMPD.prototype.handleLsinfo = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: MIXRAMPDB
InterfaceMPD.prototype.handleMixrampdb = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: MIXRAMPDELAY
InterfaceMPD.prototype.handleMixrampdelay = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: MOUNT
InterfaceMPD.prototype.handleMount = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: MOVE
InterfaceMPD.prototype.handleMove = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: MOVEID
InterfaceMPD.prototype.handleMoveid = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: NEXT
InterfaceMPD.prototype.handleNext = function(sCommand, sParam, client) {

    // send Next command to CommandRouter
    logStart('Client requests Volumio next' )
        .then(this.commRouter.volumioNext.bind(this.commRouter))
        .catch(console.log)
        .done(logDone);
    
	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: NOTCOMMANDS
InterfaceMPD.prototype.handleNotcommands = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: OUTPUTS
InterfaceMPD.prototype.handleOutputs = function(sCommand, sParam, client) {

    // Hardcoded, but MUST be tied to system later	
    client.write("outputid: 0\n");
    client.write("outputname: Default\n");
    client.write("outputenabled: 1\n");	                 
    client.write("OK\n");
    
	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PASSWORD
InterfaceMPD.prototype.handlePassword = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PAUSE
InterfaceMPD.prototype.handlePause = function(sCommand, sParam, client) {

    // Send pause command to CommandRouter
    logStart('Client requests Volumio pause' )
				.then(_this.commRouter.volumioPause.bind(_this.commRouter))
				.catch(console.log)
				.done(logDone);
    
	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PING
InterfaceMPD.prototype.handlePing = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PLAY
InterfaceMPD.prototype.handlePlay = function(sCommand, sParam, client) {

    // Send play command to CommandRouter
    logStart('Client requests Volumio play' )
        .then(this.commRouter.volumioPlay.bind(this.commRouter))
        .catch(console.log)
        .done(logDone);
    
	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PLAYID
InterfaceMPD.prototype.handlePlayid = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PLAYLIST
InterfaceMPD.prototype.handlePlaylist = function(sCommand, sParam, client) {

    // Fetch queue from CommandRouter
    logStart('Client requests Volumio queue')
        .then(this.commRouter.volumioGetQueue.bind(this.commRouter))
        .then(function (queue) {
            // forward queue to helper
            this.helper.setQueue(queue);
        }).then(function() {
            // fetch MPD output from helper
            client.write(_this.helper.printPlaylist());
        })
        .catch(console.log)
        .done(logDone);
    
	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PLAYLISTADD
InterfaceMPD.prototype.handlePlaylistadd = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PLAYLISTCLEAR
InterfaceMPD.prototype.handlePlaylistclear = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PLAYLISTDELETE
InterfaceMPD.prototype.handlePlaylistdelete = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PLAYLISTFIND
InterfaceMPD.prototype.handlePlaylistfind = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PLAYLISTID
InterfaceMPD.prototype.handlePlaylistid = function(sCommand, sParam, client) {

    // Temporary Disabled and HardCoded
    socket.write("ACK [50@0] {playlistid} No such song\n");
    
	// Respond with default 'OK'
	//client.write("OK\n");
}

// Handler for command: PLAYLISTINFO
InterfaceMPD.prototype.handlePlaylistinfo = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PLAYLISTMOVE
InterfaceMPD.prototype.handlePlaylistmove = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PLAYLISTSEARCH
InterfaceMPD.prototype.handlePlaylistsearch = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PLCHANGES
InterfaceMPD.prototype.handlePlchanges = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PLCHANGESPOSID
InterfaceMPD.prototype.handlePlchangesposid = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PREVIOUS
InterfaceMPD.prototype.handlePrevious = function(sCommand, sParam, client) {

    // Send previous command to CommandRouter
    logStart('Client requests Volumio previous' )
        .then(this.commRouter.volumioPrevious.bind(this.commRouter))
        .catch(console.log)
        .done(logDone);
    
	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PRIO
InterfaceMPD.prototype.handlePrio = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: PRIOID
InterfaceMPD.prototype.handlePrioid = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: RANDOM
InterfaceMPD.prototype.handleRandom = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: RANGEID
InterfaceMPD.prototype.handleRangeid = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: READCOMMENTS
InterfaceMPD.prototype.handleReadcomments = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: READMESSAGES
InterfaceMPD.prototype.handleReadmessages = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: RENAME
InterfaceMPD.prototype.handleRename = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: REPEAT
InterfaceMPD.prototype.handleRepeat = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: REPLAY_GAIN_MODE
InterfaceMPD.prototype.handleReplay_gain_mode = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: REPLAY_GAIN_STATUS
InterfaceMPD.prototype.handleReplay_gain_status = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: RESCAN
InterfaceMPD.prototype.handleRescan = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: RM
InterfaceMPD.prototype.handleRm = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: SAVE
InterfaceMPD.prototype.handleSave = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: SEARCH
InterfaceMPD.prototype.handleSearch = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: SEARCHADD
InterfaceMPD.prototype.handleSearchadd = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: SEARCHADDPL
InterfaceMPD.prototype.handleSearchaddpl = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: SEEK
InterfaceMPD.prototype.handleSeek = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: SEEKCUR
InterfaceMPD.prototype.handleSeekcur = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: SEEKID
InterfaceMPD.prototype.handleSeekid = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: SENDMESSAGE
InterfaceMPD.prototype.handleSendmessage = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: SETVOL
InterfaceMPD.prototype.handleSetvol = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: SHUFFLE
InterfaceMPD.prototype.handleShuffle = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: SINGLE
InterfaceMPD.prototype.handleSingle = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: STATS
InterfaceMPD.prototype.handleStats = function(sCommand, sParam, client) {

    // Fetch proper MPD output from helper
    logStart('Client requests Volumio stats')
        .then(client.write(this.helper.printStats()))
        .done(logDone);

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: STATUS
InterfaceMPD.prototype.handleStatus = function(sCommand, sParam, client) {
    
    // Fetch status from CommandRouter
    logStart('Client requests Volumio status')
        .then(this.commRouter.volumioGetState.bind(this.commRouter))
        // Forward state to volumioPushState function
        .then(function (state) {
            this.volumioPushState.call(this, state, client);
        })
        .catch(console.log)
        .done(logDone);
    
	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: STOP
InterfaceMPD.prototype.handleStop = function(sCommand, sParam, client) {
    
    // Call stop on CommandRouter
    logStart('Client requests Volumio stop' )
        .then(this.commRouter.volumioStop.bind(this.commRouter))
        .catch(console.log)
        .done(logDone);
    
	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: SUBSCRIBE
InterfaceMPD.prototype.handleSubscribe = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: SWAP
InterfaceMPD.prototype.handleSwap = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: SWAPID
InterfaceMPD.prototype.handleSwapid = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: TAGTYPES
InterfaceMPD.prototype.handleTagtypes = function(sCommand, sParam, client) {
    client.write(this.helper.printTagTypes());
	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: TOGGLEOUTPUT
InterfaceMPD.prototype.handleToggleoutput = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: UNMOUNT
InterfaceMPD.prototype.handleUnmount = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: UNSUBSCRIBE
InterfaceMPD.prototype.handleUnsubscribe = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: UPDATE
InterfaceMPD.prototype.handleUpdate = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: URLHANDLERS
InterfaceMPD.prototype.handleUrlhandlers = function(sCommand, sParam, client) {
    // HARDCODED, might be fetched from MDP in the future
    client.write("handler: http://\n");
    client.write("handler: mms://\n");
    client.write("handler: mmsh://\n");
    client.write("handler: mmst://\n");
    client.write("handler: mmsu://\n");
    client.write("handler: gopher://\n");
    client.write("handler: rtp://\n");
    client.write("handler: rtsp://\n");
    client.write("handler: rtmp://\n");
    client.write("handler: rtmpt://\n");
    client.write("handler: rtmps://\n");
    
	// Respond with default 'OK'
	client.write("OK\n");
}

// Handler for command: VOLUME
InterfaceMPD.prototype.handleVolume = function(sCommand, sParam, client) {

	// Respond with default 'OK'
	client.write("OK\n");
}

// COMMAND HANDLERS END


// =============== STATIC FUNCTIONS
function logDone () {

	console.log('------------------------------');
	return libQ();

}

function logStart (sCommand) {

	console.log('\n---------------------------- ' + sCommand);
	return libQ();

}
// END OF STATIC FUNCTIONS


// ================================ PUBLIC FUNCTIONS
// These methods are usually called by the CommandRouter, but 
// may be used internally as well

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