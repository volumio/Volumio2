/**
 * Created by massi on 30/08/15.
 */
var io=require('socket.io-client');

var socket= io.connect('http://localhost:3000');

console.log("GET BrowseLibrary\n\n");
//socket.emit('installPlugin', { url:'http://127.0.0.1:3000/plugin-serve/spotify.zip'});
socket.emit('installPlugin', { sourcefile:'/tmp/somefilewedownloaded.zip' } );

socket.on('installPluginStatus',function(data)
{
    console.log(data);
//console.log(JSON.parse(data));
});
