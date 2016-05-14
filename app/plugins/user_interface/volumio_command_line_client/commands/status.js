var io=require('socket.io-client');

var socket= io.connect('http://localhost:3000');

socket.emit('getState', '');

socket.on('pushState',function(data)
{
    console.log(data);
    process.exit()
});