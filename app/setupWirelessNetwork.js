/**
 * Created by massi on 30/08/15.
 */
var io=require('socket.io-client');

var socket= io.connect('http://192.168.10.102:3000');

var data={
    ssid:process.argv[2],
    encryption:process.argv[4],
    password:process.argv[3]
};

socket.emit('saveWirelessNetworkSettings',data);


