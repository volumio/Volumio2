/**
 * Created by massi on 30/08/15.
 */
var io = require('socket.io-client');

var socket = io.connect('http://localhost:3000');

console.log('GET BrowseLibrary\n\n');
socket.emit('getAvailablePlugins', '');

socket.on('pushAvailablePlugins', function (data) {
  console.log(data.categories);
  console.log(data.categories[0].plugins[0]);
// console.log(JSON.parse(data));
});
