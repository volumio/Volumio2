// connection variables
var sys = require('sys');
var net = require('net');

// keep a list of connected clients
var clients = [];

// connection
var svr = net.createServer(function(sock) {
    // New client connected
    sys.puts('Connected: ' + sock.remoteAddress + ':' + sock.remotePort); 
    sock.write('OK MPD version\n');
    
    // Add to connected client-list
    clients.push(sock);
 
    sock.on('message', function(data) {  // client writes message
        // if message is 'exit', remove client from list
        if (data == 'exit\n') {
            sys.puts('exit command received: ' + sock.remoteAddress + ':' + sock.remotePort + '\n');
            sock.destroy();
            var idx = sockets.indexOf(sock);
            if (idx != -1) {
                delete clients[idx];
            }
            return;
        }
        
        // print message
        sys.puts(data);
        
        // handle message
        switch(data) {
            case 'play\n' :
                sock.write('OK\n');
                break;
            case 'stop\n':
                sock.write('OK\n');
                break;
            case 'next\n':
                sock.write('OK\n');
                break;
            case 'previous\n':
                sock.write('OK\n');
                break;
            default:
                sock.write('ACK\n');
                break;
        }
    });
 
    sock.on('end', function() { // client disconnects
        // remove client form list
        sys.puts('Disconnected: ' + sock.remoteAddress + ':' + sock.remotePort + '\n');
        var idx = sockets.indexOf(sock);
        if (idx != -1) {
            delete clients[idx];
        }
    });
});

// server address/port (0.0.0.0 for outside connections) 
var svraddr = '0.0.0.0';
// MPD listen port
var svrport = 6601;
 
// start listening 
svr.listen(svrport, svraddr);
sys.puts('Server Created at ' + svraddr + ':' + svrport + '\n');
