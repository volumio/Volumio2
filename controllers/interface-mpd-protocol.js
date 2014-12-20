// This file holds all the variables the MPD is using for keeping track 
// of play status/playlist/database stuff that is set by the core
// Uses getters/setters for updating for now


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
    uptime          : 0,
    playtime        : 0,
    artists         : 0,
    albums          : 0,
    songs           : 0,
    db_playtime     : 0,
    db_update       : 0
}

var status = { // default format, fill with real data
    volume          : 0,
    repeat          : 0,
    random          : 0,
    single          : 0,
    consume         : 0,
    playlist        : 0,
    playlistlength  : 8,
    mixrampdb       : 0.0,
    state           : 'pause',
    song            : 0,
    songid          : 0,
    time            : '0:0',
    elapsed         : 0.000,
    bitrate         : 0,
    audio           : '00000:00:0',
    nextsong        : 0,
    nextsongid      : 0
}

var playlistFile = { // TODO needs more attributes
    "file"          : '',
    "Last-Modified" : '',
    "Date"          : 0,
    "Time"          : 0,
    "Pos"           : 0,
    "Id"            : 0,
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

// setter for play status
function setPlayStatus(status) {
    // check for acceptable input
    if(status == 'pause' || status == 'play' || status == 'stop')
        this.status.state = status;
}

// getter for status
function getStatus() {
    return status;
}

// getter for stats
function getStats() {
    return stats;
}

// getter for playlistID
function getPlaylistID() {
    return getPlaylistID;
}

module.exports.printCommandList = printCommandList();
module.exports.setPlayStatus = setPlayStatus;
module.exports.getStatus = getStatus;
module.exports.getStats = getStats;
module.exports.getPlaylistID = getPlaylistID;
