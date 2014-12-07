var net = require('net');
var sys = require('sys');

// server settings
var mpdPort = 6601;
var mpdHost = '0.0.0.0';

// keep track of connected clients (for broadcasts)
var clients = [];

// create server
var protocolServer = net.createServer(function(socket) {
    socket.setEncoding('utf8');
    
    // add client to list
    socket.on('connected', function(socket) {
        sys.puts("New client connected: " + socket.remoteAddress +':'+ socket.remotePort);
        clients.push(socket);
    });
    
    // MPD welcome command
    socket.write("OK MPD -version-\n");
    
    // handle errors in handleError function
    socket.on('error', handleError);
    
    // on incoming message
    socket.on('data', function(data) {
        // log data (only for debugging)
        sys.puts("received: " + data);
        // cast message to string
        var message = data.toString();
    
        // read command
        if(message.startsWith('play')) {
            // play command
            sys.puts("play command received");
            sendSingleCommandToCore("play");
            socket.write("OK\n");
        } else if(message.startsWith("stop")) {
            // stop command
            sys.puts("stop command received");
            // TODO send stop to core
            socket.write("OK\n");
        } else {
            sys.puts("command not recognized: " + message);
            socket.write("ACK\n");
        }    
    });

    function handleError(err) {
      log.error("socket error:", err.stack);
      socket.destroy();
      cleanup();
    }

    function handleError(err) {
        log.error("socket error:", err.stack);
        socket.destroy();
    }
});

protocolServer.on('error', function(err) {
    if (err.code === 'EADDRINUSE') {
      sys.puts("Failed to bind MPD protocol to port " + mpdPort +
        ": Address in use.");
    } else {
      throw err;
    }
});

protocolServer.listen(mpdPort, mpdHost, function() {
    sys.puts("Abstract MPD layer listening at: " +
    mpdHost + ":" + mpdPort);
});

function  handleMessage(data){
        
}

function sendSingleCommandToCore(command) {
    // Foward the command to the Core (no editing needed)
}
    
String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
};
