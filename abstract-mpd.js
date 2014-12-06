var net = require('net');

net.createServer(function(socket) {
    
    socket.on('data', function(data) {
        socket.write(data);
    });
    
}).listen(6601);

console.log("MPD Abstraction layer listening on port 6601....");
