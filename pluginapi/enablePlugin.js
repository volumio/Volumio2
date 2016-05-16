/**
 * Created by massi on 30/08/15.
 */
var io=require('socket.io-client');

var socket= io.connect('http://localhost:3000');


socket.emit('setBackgrounds',{name:'Morning',path:'morning.jpg'});

socket.on('pushBackgrounds',function(data)
{
    console.log(data);
//console.log(JSON.parse(data));
});
