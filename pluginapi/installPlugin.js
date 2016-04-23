/**
 * Created by massi on 30/08/15.
 */
var io=require('socket.io-client');

var socket= io.connect('http://localhost:3000');

console.log("GET BrowseLibrary\n\n");
socket.emit('installPlugin', { uri:'http://volumio.github.io/volumio-plugins/plugins/volumio/armhf/music_service/spotify/spotify.zip'});

socket.on('installPluginStatus',function(data)
{
    console.log(data);
//console.log(JSON.parse(data));
});
