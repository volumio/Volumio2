var io=require('socket.io-client');

var socket= io.connect('http://localhost:3000');

var event = process.argv[2];
var message = process.argv[3];

console.log("EVENT: "+event);
console.log("MESSAGE: "+message);
socket.emit(event, message);

