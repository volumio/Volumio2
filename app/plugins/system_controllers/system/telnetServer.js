var exec = require('child_process').exec;
Tail = require('tail').Tail;
tail = new Tail("/tmp/logtail");
var telnet = require('telnet')
var self = this;


exec("/usr/bin/sudo /bin/journalctl -f > /tmp/logtail", {uid:1000, gid:1000},function(error, stdout, stderr) {
    if (error) {
        console.log('Cannot tail to file: '+error)
    } else {

    }
});

telnet.createServer(function (client) {
    var self = this;

    // make unicode characters work properly
    client.do.transmit_binary()

    // make the client emit 'window size' events
    client.do.window_size()

    // listen for the window size events from the client
    client.on('window size', function (e) {
        if (e.command === 'sb') {
            console.log('telnet window resized to %d x %d', e.width, e.height)
        }
    })

    client.write("Welcome to Debug Telnet Interface \n");

    // listen for the actual data from the client
    client.on('data', function (b) {
        client.write(b)
    })

    tail.on("line", function(data) {
        client.write(data+"\n");
    });

    tail.on("error", function(error) {
        console.log('ERROR: ', error);
    });

}).listen(3023)
