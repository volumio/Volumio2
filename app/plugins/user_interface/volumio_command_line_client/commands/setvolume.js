var io=require('socket.io-client');
var socket= io.connect('http://localhost:3000');
var volume = Number(process.argv.slice(2));

socket.emit('volume', volume);

socket.on('pushState',function(data)
{
    console.log('Volume is now: '+data.volume);
    process.exit()
});