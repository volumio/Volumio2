/**
 * Created by massi on 30/08/15.
 */
var io=require('socket.io-client');

var socket= io.connect('http://192.168.10.115:3000');

/*console.log("GET BROWSE SOURCES\n\n");
socket.emit('getBrowseSources');

socket.on('pushBrowseSources',function(data)
{
    console.log(JSON.stringify(data));
});
*/
console.log("GET BrowseLibrary\n\n");
//socket.emit('getMultiroom',{uri:'music-library/USB/Audioslave/Out of Exile'});

var url='http://192.168.10.135:3000';
/*setTimeout(function()
{
    socket.emit('setMultiroom',{ip:'http://192.168.10.135:3000',set:'server',volume:80});

    setTimeout(function(){
        socket.emit('getMultiroom',{uri:'music-library/USB/Audioslave/Out of Exile'});
    },3000);
},3000);*/

setTimeout(function()
{
    socket.emit('setMultiroom',{ip:'http://192.168.10.135:3000',set:'server',volume:80});

    setTimeout(function(){
            socket.emit('setMultiroom',{ip:'http://192.168.10.115:3000',set:'client',volume:80});


        },3000);

},3000);

socket.on('pushMultiroom',function(data)
{
    console.log(JSON.stringify(data));
});


