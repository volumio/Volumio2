#!/usr/local/bin/node
var io = require('socket.io-client');

var socket = io.connect('http://localhost:3000');

var data = {
  'endpoint': 'audio_interface/upnp',
  'method': 'stopUpnpPlayback',
  'data': {}
};

socket.emit('callMethod', data);
setTimeout(function () {
  process.exit();
}, 2000);
