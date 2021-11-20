/**
 * Created by massi on 30/08/15.
 */
var io = require('socket.io-client');

var socket = io.connect('http://localhost:3000');

socket.emit('getUiConfig', { 'page': 'music_service/spop' });

socket.on('pushUiConfig', function (data) {
  console.log(data);
// console.log(JSON.parse(data));
});
