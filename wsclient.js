var io=require('socket.io-client');

var socket= io.connect('http://localhost:3000');

var event = process.argv[2];
var message = process.argv[3];


socket.emit(event, message);

