'use strict';

var io = require('socket.io-client');

var socket = io.connect('http://localhost:3000');

var data = {
	ssid: process.argv[2],
	encryption: process.argv[4],
	password: process.argv[3]
};

socket.emit('saveWirelessNetworkSettings', data);


