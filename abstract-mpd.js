var sys = require('sys');
var net = require('net');
var sockets = [];
 
var svr = net.createServer(function(sock) {
    sys.puts('Connected: ' + sock.remoteAddress + ':' + sock.remotePort); 
    sock.write('Hello ' + sock.remoteAddress + ':' + sock.remotePort + '\n');
    sockets.push(sock);
 
    sock.on('data', function(data) {  // client writes message
        if (data == 'exit\n') {
            sys.puts('exit command received: ' + sock.remoteAddress + ':' + sock.remotePort + '\n');
            sock.destroy();
            var idx = sockets.indexOf(sock);
            if (idx != -1) {
                delete sockets[idx];
            }
            return;
        }
        switch(data) {
            case "play" :
                sock.write('OK');
                break;
            case 'stop':
                sock.write('OK');
                break;
            case 'next':
                sock.write('OK');
                break;
            case 'previous':
                sock.write('OK');
                break;
            default:
                sock.write('ACK');
                break;
        }
    });
 
    sock.on('end', function() { // client disconnects
        sys.puts('Disconnected: ' + sock.remoteAddress + ':' + sock.remotePort + '\n');
        var idx = sockets.indexOf(sock);
        if (idx != -1) {
            delete sockets[idx];
        }
    });
});
 
var svraddr = '0.0.0.0';
var svrport = 6601;
 
svr.listen(svrport, svraddr);
sys.puts('Server Created at ' + svraddr + ':' + svrport + '\n');
