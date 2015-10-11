var io 	= require('socket.io-client');

var socketURL = 'http://192.168.10.115:3000';
var options = {
	transports: ['websocket'],
	'force new connection': true
}

var client1 = io.connect(socketURL, options);

client1.on('connect', function(data){	
	client1.on('updateReady', function(message){
		console.log(message);
		client1.disconnect();
	});

	client1.on('updateCheck-error', function(message){
		console.log(message);
		client1.disconnect();
	});

	client1.on('updateProgress', function(message){
		console.log(message);
	});

	client1.on('updateDone', function(message){
		console.log(message);
	});


	client1.emit('updateCheck', 'search-for-upgrade');
	//client1.emit('update', {value:"yes"});
})