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
    clients.push(socket);
    
    // MPD welcome command
    socket.write("OK MPD -version-\n");
    
    // handle errors in handleError function
    socket.on('error', handleError);
    
    

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

// on incoming message
protocolServer.on('data', function(message) {
        // log data (only for debugging)
        sys.puts("received: " + message);
        // cast message to string
        var data = message.toString();

        // read command
        if(data.startsWith('play')) {
            sys.puts("play command received");
            socket.write("OK\n");
        } else if(data.startsWith("stop")) {
            sys.puts("stop command received");
            socket.write("OK\n");
        } else {
            sys.puts("command not recognized: " + data);
            socket.write("ACK\n");
        }        
    });

protocolServer.listen(mpdPort, mpdHost, function() {
    sys.puts("Abstract MPD layer listening at: " +
    mpdHost + ":" + mpdPort);
});
    
String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
};
