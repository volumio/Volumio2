var io=require('socket.io-client');
var socket= io.connect('http://localhost:3000');
var command = process.argv.slice(2);

socket.emit(command, '');

socket.on('pushState',function(data)
{
    console.log(data);
    process.exit()
});