/**
 * Created by massi on 30/08/15.
 */
var io=require('socket.io-client');

var socket= io.connect('http://localhost:3000');


socket.emit('pluginManager', { action:'enable', category:'music_service',name:'spop'});

socket.on('pushInstalledPlugins',function(data)
{
    console.log(data);
//console.log(JSON.parse(data));
});
