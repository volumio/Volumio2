var io=require('socket.io-client');
var socket= io.connect('http://localhost:3000');
var i = 0;
var interval = 60;
var results = [];
var bursts = 4;
var increasing = true;


socket.on('pushState', function (data) {
    var volume = data.volume;
    var endTime = Date.now();
    for (var a in results) {
        if (results[a].N === volume) {
            var latency = endTime - results[a].start;
            console.log(results[a].N + ' ' + latency + ' ' + '  '+ '='.repeat(results[a].N))
        }
    }
});


    setInterval(function(){
        if (increasing) {
            if (i <= 100) {
                var startTime = Date.now();
                var item = {'N':i, 'start': startTime, latency:''};
                results.push(item);
                socket.emit('volume', i);
                i++
            } else {
                increasingg = false;
                results = [];
            }
        } else {
            if (i => 0) {
                var startTime = Date.now();
                var item = {'N':i, 'start': startTime, latency:''};
                results.push(item);
                socket.emit('volume', i);
                i--
            } else {
                increasingg = true;
                results = [];
            }
        }


    },interval)
