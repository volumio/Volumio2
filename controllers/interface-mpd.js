var libNet = require('net');
var server = libNet.createServer(onConnect);

var mpd = require('mpd');
var cmd = mpd.cmd;
var q = require('q');

// When a core connects to this interface
function onConnect (connCore) {
	
	var client = mpd.connect({
		port: 6600,
		host: 'localhost',
	});
	
	client.on('ready', function() {
		  console.log("ready");
		});
	client.on('system', function(name) {
	  console.log("update", name);
	});
	client.on('system-player', function() {
		console.log();
		client.sendCommand(cmd("status", []), function(err, msg) {
	    if (err) throw err;
	    console.log(msg);
	  });
	});
	
	// When Core sends a command
	connCore.on('data', function (command) {
		// Pass the command to MPD command socket
		var comando = command.toString();
		
		switch(comando) {
        case 'status':
        	client.sendCommand(cmd("status", []), function(err, msg) {
    		    if (err) throw err;
    		    console.log(msg);
        	});
            break;
        case 'next':
        	client.sendCommand(cmd("random", [value]), function(err, msg) {
    		    if (err) throw err;
    		    console.log(msg);
//    		    connCore.send('OK\n');
        	});
//            sock.write('OK\n');
            break;
        case 'previous\n':
//            sock.write('OK\n');
            break;
        default:
//            sock.write('ACK\n');
            break;
		}
		return 'OK';
		
		
		

	});
};

module.exports.server = server;