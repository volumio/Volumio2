'use strict';

var net = require('net');
var libQ = require('kew');
var libFast = require('fast.js');
var okay_response = 'OK\n';

// MPD info
var mpdPort = 6500;
var mpdAddress = '0.0.0.0';

// TODO check if we can move this to the helper and make it GLOBAL?
const command = { // List of all MPD commands
	ADD: 'add',
	ADDID: 'addid',
	ADDTAGID: 'addtagid',
	CHANNELS: 'channels',
	CLEAR: 'clear',
	CLEARERROR: 'clearerror',
	CLEARTAGID: 'cleartagid',
	CLOSE: 'close',
	COMMANDS: 'commands',
	CONFIG: 'config',
	CONSUME: 'consume',
	COUNT: 'count',
	CROSSFADE: 'crossfade',
	CURRENTSONG: 'currentsong',
	DECODERS: 'decoders',
	DELETE: 'delete',
	DELETEID: 'deleteid',
	DISABLEOUTPUT: 'disableoutput',
	ENABLEOUTPUT: 'enableoutput',
	FIND: 'find',
	FINDADD: 'findadd',
	IDLE: 'idle',
	KILL: 'kill',
	LIST: 'list',
	LISTALL: 'listall',
	LISTALLINFO: 'listallinfo',
	LISTFILES: 'listfiles',
	LISTMOUNTS: 'listmounts',
	LISTPLAYLIST: 'listplaylist',
	LISTPLAYLISTINFO: 'listplaylistinfo',
	LISTPLAYLISTS: 'listplaylists',
	LOAD: 'load',
	LSINFO: 'lsinfo',
	MIXRAMPDB: 'mixrampdb',
	MIXRAMPDELAY: 'mixrampdelay',
	MOUNT: 'mount',
	MOVE: 'move',
	MOVEID: 'moveid',
	NEXT: 'next',
	NOIDLE: 'noidle',
	NOTCOMMANDS: 'notcommands',
	OUTPUTS: 'outputs',
	PASSWORD: 'password',
	PAUSE: 'pause',
	PING: 'ping',
	PLAY: 'play',
	PLAYID: 'playid',
	PLAYLIST: 'playlist',
	PLAYLISTADD: 'playlistadd',
	PLAYLISTCLEAR: 'playlistclear',
	PLAYLISTDELETE: 'playlistdelete',
	PLAYLISTFIND: 'playlistfind',
	PLAYLISTID: 'playlistid',
	PLAYLISTINFO: 'playlistinfo',
	PLAYLISTMOVE: 'playlistmove',
	PLAYLISTSEARCH: 'playlistsearch',
	PLCHANGES: 'plchanges',
	PLCHANGEPOSID: 'plchangesposid',
	PREVIOUS: 'previous',
	PRIO: 'prio',
	PRIOID: 'prioid',
	RANDOM: 'random',
	RANGEID: 'rangeid',
	READCOMMENTS: 'readcomments',
	READMESSAGES: 'readmessages',
	RENAME: 'rename',
	REPEAT: 'repeat',
	REPLAY_GAIN_MODE: 'replay_gain_mode',
	REPLAY_GAIN_STATUS: 'replay_gain_status',
	RESCAN: 'rescan',
	REMOVE: 'rm',
	SAVE: 'save',
	SEARCH: 'search',
	SEARCHADD: 'searchadd',
	SEARCHADDPL: 'searchaddpl',
	SEEK: 'seek',
	SEEKCUR: 'seekcur',
	SEEKID: 'seekid',
	SENDMESSAGE: 'sendmessage',
	SETVOL: 'setvol',
	SHUFFLE: 'shuffle',
	SINGLE: 'single',
	STATS: 'stats',
	STATUS: 'status',
	STICKER: 'sticker',
	STOP: 'stop',
	SUBSCRIBE: 'subscribe',
	SWAP: 'swap',
	SWAPID: 'swapid',
	TAGTYPES: 'tagtypes',
	TOGGLEOUTPUT: 'toggleoutput',
	UNMOUNT: 'unmount',
	UNSUBSCRIBE: 'unsubscribe',
	UPDATE: 'update',
	URLHANDLERS: 'urlhandlers',
	VOLUME: 'volume'
};

// Define the InterfaceMPD class
module.exports = InterfaceMPD;
function InterfaceMPD( context) {
	var self = this;

	self.context=context;
	self.commRouter = self.context.coreCommand;

	// helpers
	self.helper = require('./helper.js');
	self.idles = [];
	self.loadCommandHandlers();

	// create server
	var protocolServer = net.createServer(function(client) {
		// set Encoding (TODO check if this is necessary)
		client.setEncoding('utf8');

		// MPD welcome command
		client.write('OK MPD 0.19.0\n'); // TODO not hardcoded?

		// Incoming message (maybe a command?)
		var buffer = ''; // Buffer since we may not receive whole lines
		var lineIndex = 0;	// Store the index of '\n' (<- end of line sign)
		client.on('data', function(data) {
			// add new incoming data to our buffer
			buffer += data.toString();
			// check if we have a complete line
			while(true)
			{
				lineIndex = buffer.indexOf('\n');

				if (lineIndex === -1) {
					return; // our buffer has received no full line yet
				}

				var results;
				// while we still have a complete line in our buffer (os.EOL == end of line (\r\n))
				while (results = buffer.split(/\r?\n/)) {
					// get 1 line from our buffer to process
					var message = results[0];
					// Handle message elsewhere (keep it clean)
					self.handleMessage(message, client);
					buffer = buffer.substring(lineIndex + 1); // Cuts off the processed line
					break;
				}
			}
		});
	}).listen(mpdPort, mpdAddress); // start server

	// On server error
	protocolServer.on('error', function(err) {
		if (err.code === 'EADDRINUSE') {
			// address is in use
			self.commRouter.pushConsoleMessage('Failed to bind MPD protocol to port ' + mpdPort +
				': Address in use.');
		} else {
			throw err;
		}
	});
}

// ================================ INTERNAL FUNCTIONS

// Incoming message handler
InterfaceMPD.prototype.handleMessage = function(message, socket) {
	var self = this;

	// some vars to help extract command/parameters from line
	var nSpaceLocation = 0;
	var sCommand = '';
	var sParam = '';

	// check if there is a space
	nSpaceLocation = message.indexOf(' ');
	if (nSpaceLocation === -1) {
		// no space, only 1 command
		sCommand = message.substring(/\r?\n/);
	} else {
		// a space, before space command, rest parameter
		sCommand = message.substring(0, nSpaceLocation);
		sParam = message.substring(nSpaceLocation + 1, message.length);
	}

	// self.commRouter.pushConsoleMessage('Incoming command: ' + sCommand + '\nParam: '+sParam);
	if(sCommand == 'command_list_begin'){
		okay_response = '';
	}
	else if(sCommand == 'command_list_ok_begin'){
		okay_response = 'list_OK\n';
		socket.write(okay_response);
	}
	else if(sCommand == 'command_list_end'){
		okay_response = 'OK\n';
		socket.write(okay_response);
	}
	else {
		var handler = self.commandHandlers[sCommand];
		if (handler)
			handler.call(self, sCommand, sParam, socket);
		else
			self.commRouter.pushConsoleMessage('default');
	}
};

InterfaceMPD.prototype.logDone = function(timeStart) {
	var self = this;
	self.commRouter.pushConsoleMessage('[' + Date.now() + '] ' + '------------------------------ ' + (Date.now() - timeStart) + 'ms');
	return libQ.resolve();
};

InterfaceMPD.prototype.logStart = function(sCommand) {
	var self = this;
	self.commRouter.pushConsoleMessage('\n' + '[' + Date.now() + '] ' + '---------------------------- ' + sCommand);
	return libQ.resolve();
};

// ============================ COMMAND HANDLERS
// All handlers are on Alphabetical order of Commands.

// Handler for command: ADD
InterfaceMPD.prototype.handleAdd = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: ADDID
InterfaceMPD.prototype.handleAddid = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: ADDTAGID
InterfaceMPD.prototype.handleAddtagid = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: CHANNELS
InterfaceMPD.prototype.handleChannels = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: CLEAR
InterfaceMPD.prototype.handleClear = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: CLEARERROR
InterfaceMPD.prototype.handleClearerror = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: CLEARTAGID
InterfaceMPD.prototype.handleCleartagid = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: CLOSE
InterfaceMPD.prototype.handleClose = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: COMMANDS
InterfaceMPD.prototype.handleCommands = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: CONFIG
InterfaceMPD.prototype.handleConfig = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: CONSUME
InterfaceMPD.prototype.handleConsume = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: COUNT
InterfaceMPD.prototype.handleCount = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: CROSSFADE
InterfaceMPD.prototype.handleCrossfade = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: CURRENTSONG
InterfaceMPD.prototype.handleCurrentsong = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: DECODERS
InterfaceMPD.prototype.handleDecoders = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: DELETE
InterfaceMPD.prototype.handleDelete = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: DELETEID
InterfaceMPD.prototype.handleDeleteid = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: DISABLEOUTPUT
InterfaceMPD.prototype.handleDisableoutput = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: ENABLEOUTPUT
InterfaceMPD.prototype.handleEnableoutput = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: FIND
InterfaceMPD.prototype.handleFind = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: FINDADD
InterfaceMPD.prototype.handleFindadd = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: IDLE
InterfaceMPD.prototype.handleIdle = function(sCommand, sParam, client) {
	var self = this;

	// keep client in idle list
	self.idles.push(client);

	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: KILL
InterfaceMPD.prototype.handleKill = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: LIST
InterfaceMPD.prototype.handleList = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: LISTALL
InterfaceMPD.prototype.handleListall = function(sCommand, sParam, client) {
	var self = this;
	var timeStart = Date.now();

	self.logStart('Client requests Volumio library by title')
	.then(libFast.bind(self.commRouter.volumioGetLibraryByTitle, self.commRouter))
	.then(function(library) {
		self.pushLibrary.call(self, library, client);
	})
	.fail(libFast.bind(self.commRouter.pushConsoleMessage, self.commRouter))
	.done(function() {
		// Respond with default 'OK'
		client.write(okay_response);
		return self.logDone(timeStart);
	});
};

// Handler for command: LISTALLINFO
InterfaceMPD.prototype.handleListallinfo = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: LISTFILES
InterfaceMPD.prototype.handleListfiles = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: LISTMOUNTS
InterfaceMPD.prototype.handleListmounts = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: LISTPLAYLIST
InterfaceMPD.prototype.handleListplaylist = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: LISTPLAYLISTINFO
InterfaceMPD.prototype.handleListplaylistinfo = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: LISTPLAYLISTS
InterfaceMPD.prototype.handleListplaylists = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: LOAD
InterfaceMPD.prototype.handleLoad = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: LSINFO
InterfaceMPD.prototype.handleLsinfo = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: MIXRAMPDB
InterfaceMPD.prototype.handleMixrampdb = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: MIXRAMPDELAY
InterfaceMPD.prototype.handleMixrampdelay = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: MOUNT
InterfaceMPD.prototype.handleMount = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: MOVE
InterfaceMPD.prototype.handleMove = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: MOVEID
InterfaceMPD.prototype.handleMoveid = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: NEXT
InterfaceMPD.prototype.handleNext = function(sCommand, sParam, client) {
	var self = this;
	var timeStart = Date.now();
	// send Next command to CommandRouter
	self.logStart('Client requests Volumio next' )
	.then(libFast.bind(self.commRouter.volumioNext, self.commRouter))
	.fail(libFast.bind(self.commRouter.pushConsoleMessage, self.commRouter))
	.done(function() {
		return self.logDone(timeStart);
	});

	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: NOTCOMMANDS
InterfaceMPD.prototype.handleNotcommands = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: OUTPUTS
InterfaceMPD.prototype.handleOutputs = function(sCommand, sParam, client) {
	// Hardcoded, but MUST be tied to system later
	client.write('outputid: 0\n');
	client.write('outputname: Default\n');
	client.write('outputenabled: 1\n');
	client.write(okay_response);

	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PASSWORD
InterfaceMPD.prototype.handlePassword = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PAUSE
InterfaceMPD.prototype.handlePause = function(sCommand, sParam, client) {
	var self = this;
	var timeStart = Date.now();

	// Send pause command to CommandRouter
	self.logStart('Client requests Volumio pause' )
	.then(libFast.bind(self.commRouter.volumioPause, self.commRouter))
	.fail(libFast.bind(self.commRouter.pushConsoleMessage, self.commRouter))
	.done(function() {
		return self.logDone(timeStart);
	});

	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PING
InterfaceMPD.prototype.handlePing = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PLAY
InterfaceMPD.prototype.handlePlay = function(sCommand, sParam, client) {
	var self = this;
	var timeStart = Date.now();

	// Send play command to CommandRouter
	self.logStart('Client requests Volumio play')
	.then(libFast.bind(self.commRouter.volumioGetState, self.commRouter))
	// Forward state to pushState function
	.then(function(state) {
		if(state.status == 'play')
			self.commRouter.volumioPause.call(self.commRouter);
		else
			self.commRouter.volumioPlay.call(self.commRouter);
	})
	.fail(libFast.bind(self.commRouter.pushConsoleMessage, self.commRouter))
	.done(function() {
		return self.logDone(timeStart);
	});

	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PLAYID
InterfaceMPD.prototype.handlePlayid = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PLAYLIST
InterfaceMPD.prototype.handlePlaylist = function(sCommand, sParam, client) {
	var self = this;
	var timeStart = Date.now();

	// Fetch queue from CommandRouter
	self.logStart('Client requests Volumio queue')
	.then(libFast.bind(self.commRouter.volumioGetQueue, self.commRouter))
	.then(function(queue) {
		// forward queue to helper
		self.helper.setQueue(queue);
	}).then(function() {
		// fetch MPD output from helper
		client.write(self.helper.printPlaylist());
	})
	.fail(libFast.bind(self.commRouter.pushConsoleMessage, self.commRouter))
	.done(function() {
		return self.logDone(timeStart);
	});

	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PLAYLISTADD
InterfaceMPD.prototype.handlePlaylistadd = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PLAYLISTCLEAR
InterfaceMPD.prototype.handlePlaylistclear = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PLAYLISTDELETE
InterfaceMPD.prototype.handlePlaylistdelete = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PLAYLISTFIND
InterfaceMPD.prototype.handlePlaylistfind = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PLAYLISTID
InterfaceMPD.prototype.handlePlaylistid = function(sCommand, sParam, client) {
	// Temporary Disabled and HardCoded
	client.write('ACK [50@0] {playlistid} No such song\n');

	// Respond with default 'OK'
	// client.write(okay_response);
};

// Handler for command: PLAYLISTINFO
InterfaceMPD.prototype.handlePlaylistinfo = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PLAYLISTMOVE
InterfaceMPD.prototype.handlePlaylistmove = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PLAYLISTSEARCH
InterfaceMPD.prototype.handlePlaylistsearch = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PLCHANGES
InterfaceMPD.prototype.handlePlchanges = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PLCHANGESPOSID
InterfaceMPD.prototype.handlePlchangesposid = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PREVIOUS
InterfaceMPD.prototype.handlePrevious = function(sCommand, sParam, client) {
	var self = this;
	var timeStart = Date.now();

	// Send previous command to CommandRouter
	self.logStart('Client requests Volumio previous' )
	.then(libFast.bind(self.commRouter.volumioPrevious, self.commRouter))
	.fail(libFast.bind(self.commRouter.pushConsoleMessage, self.commRouter))
	.done(function() {
		return self.logDone(timeStart);
	});

	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PRIO
InterfaceMPD.prototype.handlePrio = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: PRIOID
InterfaceMPD.prototype.handlePrioid = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: RANDOM
InterfaceMPD.prototype.handleRandom = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: RANGEID
InterfaceMPD.prototype.handleRangeid = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: READCOMMENTS
InterfaceMPD.prototype.handleReadcomments = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: READMESSAGES
InterfaceMPD.prototype.handleReadmessages = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: RENAME
InterfaceMPD.prototype.handleRename = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: REPEAT
InterfaceMPD.prototype.handleRepeat = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: REPLAY_GAIN_MODE
InterfaceMPD.prototype.handleReplay_gain_mode = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: REPLAY_GAIN_STATUS
InterfaceMPD.prototype.handleReplay_gain_status = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: RESCAN
InterfaceMPD.prototype.handleRescan = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: RM
InterfaceMPD.prototype.handleRm = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: SAVE
InterfaceMPD.prototype.handleSave = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: SEARCH
InterfaceMPD.prototype.handleSearch = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: SEARCHADD
InterfaceMPD.prototype.handleSearchadd = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: SEARCHADDPL
InterfaceMPD.prototype.handleSearchaddpl = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: SEEK
InterfaceMPD.prototype.handleSeek = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: SEEKCUR
InterfaceMPD.prototype.handleSeekcur = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: SEEKID
InterfaceMPD.prototype.handleSeekid = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: SENDMESSAGE
InterfaceMPD.prototype.handleSendmessage = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: SETVOL
InterfaceMPD.prototype.handleSetvol = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: SHUFFLE
InterfaceMPD.prototype.handleShuffle = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: SINGLE
InterfaceMPD.prototype.handleSingle = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: STATS
InterfaceMPD.prototype.handleStats = function(sCommand, sParam, client) {
	var self = this;
	var timeStart = Date.now();

	// Fetch proper MPD output from helper
	self.logStart('Client requests Volumio stats')
	.then(client.write(self.helper.printStats()))
	.done(function() {
		return self.logDone(timeStart);
	});

	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: STATUS
InterfaceMPD.prototype.handleStatus = function(sCommand, sParam, client) {
	var self = this;
	var timeStart = Date.now();

	// Fetch status from CommandRouter
	self.logStart('Client requests Volumio status')
	.then(libFast.bind(self.commRouter.volumioGetState, self.commRouter))
	// Forward state to pushState function
	.then(function(state) {
		self.pushState.call(self, state, client);
	})
	.fail(libFast.bind(self.commRouter.pushConsoleMessage, self.commRouter))
	.done(function() {
		return self.logDone(timeStart);
	});

	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: STOP
InterfaceMPD.prototype.handleStop = function(sCommand, sParam, client) {
	var self = this;
	var timeStart = Date.now();

	// Call stop on CommandRouter
	self.logStart('Client requests Volumio stop' )
	.then(libFast.bind(self.commRouter.volumioStop, self.commRouter))
	.fail(libFast.bind(self.commRouter.pushConsoleMessage, self.commRouter))
	.done(function() {
		return self.logDone(timeStart);
	});

	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: SUBSCRIBE
InterfaceMPD.prototype.handleSubscribe = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: SWAP
InterfaceMPD.prototype.handleSwap = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: SWAPID
InterfaceMPD.prototype.handleSwapid = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: TAGTYPES
InterfaceMPD.prototype.handleTagtypes = function(sCommand, sParam, client) {
	var self = this;

	client.write(self.helper.printTagTypes());
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: TOGGLEOUTPUT
InterfaceMPD.prototype.handleToggleoutput = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: UNMOUNT
InterfaceMPD.prototype.handleUnmount = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: UNSUBSCRIBE
InterfaceMPD.prototype.handleUnsubscribe = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: UPDATE
InterfaceMPD.prototype.handleUpdate = function(sCommand, sParam, client) {
	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: URLHANDLERS
InterfaceMPD.prototype.handleUrlhandlers = function(sCommand, sParam, client) {
	// HARDCODED, might be fetched from MDP in the future
	client.write('handler: http://\n');
	client.write('handler: mms://\n');
	client.write('handler: mmsh://\n');
	client.write('handler: mmst://\n');
	client.write('handler: mmsu://\n');
	client.write('handler: gopher://\n');
	client.write('handler: rtp://\n');
	client.write('handler: rtsp://\n');
	client.write('handler: rtmp://\n');
	client.write('handler: rtmpt://\n');
	client.write('handler: rtmps://\n');

	// Respond with default 'OK'
	client.write(okay_response);
};

// Handler for command: VOLUME (volume is incremental, implement 'setvol' for absolute volume)
InterfaceMPD.prototype.handleVolume = function(sCommand, sParam, client) {
	var self = this;
	var timeStart = Date.now();

	var vol = parseInt(sParam.substring(1, sParam.length-1));

	self.logStart('Client requests Volume ' + vol)
	.then(libFast.bind(self.commRouter.volumioGetState, self.commRouter))
	.then(function (state) {
		return self.commRouter.volumiosetvolume.call(self.commRouter, state.volume + vol);
	})
	.fail(libFast.bind(self.commRouter.pushConsoleMessage, self.commRouter))
	.done(function () {
		return self.logDone(timeStart);
	});
	client.write(okay_response);
};

// COMMAND HANDLERS END


// =============== STATIC FUNCTIONS
// END OF STATIC FUNCTIONS


// ================================ PUBLIC FUNCTIONS
// These methods are usually called by the CommandRouter, but
// may be used internally as well

// Receive console messages from commandRouter and broadcast to all connected clients
InterfaceMPD.prototype.printConsoleMessage = function(message) {
	// MPD clients dont need to receive console messages

	// Return a resolved empty promise to represent completion
	return libQ.resolve();
};

// Receive music library updates from commandRouter and broadcast to all connected clients
InterfaceMPD.prototype.pushLibrary = function(library, client) {
	var self = this;
	self.commRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'InterfaceMPD::pushLibrary');

	// If a specific client is given, push to just that client
	if (client) {
		client.write(self.helper.printLibrary(library));

	// Else push to all connected clients
	} else {
		self.idles.forEach(function(c) {
			c.write('changed: database');
		});
	}
};

// Receive player queue updates from commandRouter and broadcast to all connected clients
InterfaceMPD.prototype.pushQueue = function(queue) {
	var self = this;
	self.commRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'InterfaceMPD::pushQueue');

	// pass queue to the helper
	self.helper.setQueue(queue);

	// broadcast playlist changed to all idlers
	self.idles.forEach(function(client) {
		client.write('changed: playlist\n');
	});

	// TODO q-stuff
};

// Receive player state updates from commandRouter and broadcast to all connected clients
InterfaceMPD.prototype.pushState = function(state, socket) {
	var self = this;
	self.commRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'InterfaceMPD::pushState');

	// if requested by client, respond
	if (socket) {
		socket.write(self.helper.printStatus(state));
		// else broadcast to all idlers
	} else {
		// pass state to the helper
		self.helper.setStatus(state);

		// broadcast state changed to all idlers
		self.idles.forEach(function(client) {
			client.write('changed: player\n');
		});
	}
	// TODO q-stuff
};
// END OF PUBLIC FUNCTIONS

InterfaceMPD.prototype.loadCommandHandlers = function() {
	var self = this;
	self.commandHandlers = {};
	self.commandHandlers[command.ADD] = self.handleAdd;
	self.commandHandlers[command.ADDID] = self.handleAddid;
	self.commandHandlers[command.ADDTAGID] = self.handleAddtagid;
	self.commandHandlers[command.CHANNELS] = self.handleChannels;
	self.commandHandlers[command.CLEAR] = self.handleClear;
	self.commandHandlers[command.CLEARERROR] = self.handleClearerror;
	self.commandHandlers[command.CLEARTAGID] = self.handleCleartagid;
	self.commandHandlers[command.CLOSE] = self.handleClose;
	self.commandHandlers[command.COMMANDS] = self.handleCommands;
	self.commandHandlers[command.CONFIG] = self.handleConfig;
	self.commandHandlers[command.CONSUME] = self.handleConsume;
	self.commandHandlers[command.COUNT] = self.handleCount;
	self.commandHandlers[command.CROSSFADE] = self.handleCrossfade;
	self.commandHandlers[command.CURRENTSONG] = self.handleCurrentsong;
	self.commandHandlers[command.DECODERS] = self.handleDecoders;
	self.commandHandlers[command.DELETE] = self.handleDelete;
	self.commandHandlers[command.DELETEID] = self.handleDeleteid;
	self.commandHandlers[command.DISABLEOUTPUT] = self.handleDisableoutput;
	self.commandHandlers[command.ENABLEOUTPUT] = self.handleEnableoutput;
	self.commandHandlers[command.FIND] = self.handleFind;
	self.commandHandlers[command.FINDADD] = self.handleFindadd;
	self.commandHandlers[command.IDLE] = self.handleIdle;
	self.commandHandlers[command.KILL] = self.handleKill;
	self.commandHandlers[command.LIST] = self.handleList;
	self.commandHandlers[command.LISTALL] = self.handleListall;
	self.commandHandlers[command.LISTALLINFO] = self.handleListallinfo;
	self.commandHandlers[command.LISTFILES] = self.handleListfiles;
	self.commandHandlers[command.LISTMOUNTS] = self.handleListmounts;
	self.commandHandlers[command.LISTPLAYLIST] = self.handleListplaylist;
	self.commandHandlers[command.LISTPLAYLISTINFO] = self.handleListplaylistinfo;
	self.commandHandlers[command.LISTPLAYLISTS] = self.handleListplaylists;
	self.commandHandlers[command.LOAD] = self.handleLoad;
	self.commandHandlers[command.LSINFO] = self.handleLsinfo;
	self.commandHandlers[command.MIXRAMPDB] = self.handleMixrampdb;
	self.commandHandlers[command.MIXRAMPDELAY] = self.handleMixrampdelay;
	self.commandHandlers[command.MOUNT] = self.handleMount;
	self.commandHandlers[command.MOVE] = self.handleMove;
	self.commandHandlers[command.MOVEID] = self.handleMoveid;
	self.commandHandlers[command.NEXT] = self.handleNext;
	self.commandHandlers[command.NOTCOMMANDS] = self.handleNotcommands;
	self.commandHandlers[command.OUTPUTS] = self.handleOutputs;
	self.commandHandlers[command.PASSWORD] = self.handlePassword;
	self.commandHandlers[command.PAUSE] = self.handlePause;
	self.commandHandlers[command.PING] = self.handlePing;
	self.commandHandlers[command.PLAY] = self.handlePlay;
	self.commandHandlers[command.PLAYID] = self.handlePlayid;
	self.commandHandlers[command.PLAYLIST] = self.handlePlaylist;
	self.commandHandlers[command.PLAYLISTADD] = self.handlePlaylistadd;
	self.commandHandlers[command.PLAYLISTCLEAR] = self.handlePlaylistclear;
	self.commandHandlers[command.PLAYLISTDELETE] = self.handlePlaylistdelete;
	self.commandHandlers[command.PLAYLISTFIND] = self.handlePlaylistfind;
	self.commandHandlers[command.PLAYLISTID] = self.handlePlaylistid;
	self.commandHandlers[command.PLAYLISTINFO] = self.handlePlaylistinfo;
	self.commandHandlers[command.PLAYLISTMOVE] = self.handlePlaylistmove;
	self.commandHandlers[command.PLAYLISTSEARCH] = self.handlePlaylistsearch;
	self.commandHandlers[command.PLCHANGES] = self.handlePlchanges;
	self.commandHandlers[command.PLCHANGEPOSID] = self.handlePlchangesposid;
	self.commandHandlers[command.PREVIOUS] = self.handlePrevious;
	self.commandHandlers[command.PRIO] = self.handlePrio;
	self.commandHandlers[command.PRIOID] = self.handlePrioid;
	self.commandHandlers[command.RANDOM] = self.handleRandom;
	self.commandHandlers[command.RANGEID] = self.handleRangeid;
	self.commandHandlers[command.READCOMMENTS] = self.handleReadcomments;
	self.commandHandlers[command.READMESSAGES] = self.handleReadmessages;
	self.commandHandlers[command.RENAME] = self.handleRename;
	self.commandHandlers[command.REPEAT] = self.handleRepeat;
	self.commandHandlers[command.REPLAY_GAIN_MODE] = self.handleReplay_gain_mode;
	self.commandHandlers[command.REPLAY_GAIN_STATUS] = self.handleReplay_gain_status;
	self.commandHandlers[command.RESCAN] = self.handleRescan;
	self.commandHandlers[command.REMOVE] = self.handleRm;
	self.commandHandlers[command.SAVE] = self.handleSave;
	self.commandHandlers[command.SEARCH] = self.handleSearch;
	self.commandHandlers[command.SEARCHADD] = self.handleSearchadd;
	self.commandHandlers[command.SEARCHADDPL] = self.handleSearchaddpl;
	self.commandHandlers[command.SEEK] = self.handleSeek;
	self.commandHandlers[command.SEEKCUR] = self.handleSeekcur;
	self.commandHandlers[command.SEEKID] = self.handleSeekid;
	self.commandHandlers[command.SENDMESSAGE] = self.handleSendmessage;
	self.commandHandlers[command.SETVOL] = self.handleSetvol;
	self.commandHandlers[command.SHUFFLE] = self.handleShuffle;
	self.commandHandlers[command.SINGLE] = self.handleSingle;
	self.commandHandlers[command.STATS] = self.handleStats;
	self.commandHandlers[command.STATUS] = self.handleStatus;
	self.commandHandlers[command.STOP] = self.handleStop;
	self.commandHandlers[command.SUBSCRIBE] = self.handleSubscribe;
	self.commandHandlers[command.SWAP] = self.handleSwap;
	self.commandHandlers[command.SWAPID] = self.handleSwapid;
	self.commandHandlers[command.TAGTYPES] = self.handleTagtypes;
	self.commandHandlers[command.TOGGLEOUTPUT] = self.handleToggleoutput;
	self.commandHandlers[command.UNMOUNT] = self.handleUnmount;
	self.commandHandlers[command.UNSUBSCRIBE] = self.handleUnsubscribe;
	self.commandHandlers[command.UPDATE] = self.handleUpdate;
	self.commandHandlers[command.URLHANDLERS] = self.handleUrlhandlers;
	self.commandHandlers[command.VOLUME] = self.handleVolume;
};
