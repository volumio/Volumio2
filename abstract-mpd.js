var net = require('net');
var sys = require('sys');
var MpdProtocol = require('./abstract-mpd-protocol');

var mpdPort = 6601;
var mpdHost = '0.0.0.0';

var clients = [];

var protocolServer = net.createServer(function(socket) {
    socket.setEncoding('utf8');
    clients.push(socket);
    socket.write("OK MPD -version-\n");
    
    socket.on('error', handleError);

    function handleError(err) {
      log.error("socket error:", err.stack);
      socket.destroy();
      cleanup();
    }

    function handleError(err) {
        log.error("socket error:", err.stack);
        socket.destroy();
        cleanup();
    }

    function cleanup() {
        protocol.close();
    }    


    socket.on('data', function(message) {
        sys.puts("received: " + message);
        var data = message.toString();

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
    
String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
};
