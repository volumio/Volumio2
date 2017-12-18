#!/bin/node
var io=require('socket.io-client');

var socket= io.connect('http://localhost:3000');

socket.emit('addPlay', {'service':process.argv[2],'title':process.argv[2],'uri':process.argv[3]});

socket.on('pushState',function(data)
{
    console.log(data);
    process.exit()
});

