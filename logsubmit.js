var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var fs = require('fs');

var commandArray = [
	"cat /proc/version",
	"cat /etc/os-release",
    "ifconfig",
    "iwconfig",
	"aplay -l",
    "ps -ef",
    "sudo journalctl -p 7"
];

var logFile = "/tmp/logondemand";

// Let's start fresh!
execSync("date >" + logFile);

if (process.argv.slice(2)) {
    var args = process.argv.slice(2);
} else {
    var args = ['Unknown'];
}

try {
    var args = process.argv.slice(2);
    //If description is supplied, add it
    execSync("echo " + args[0] +  " >>" + logFile);
} catch (e) {
    console.log(error)
}

execSync("cat /tmp/logfields >> " + logFile);

for (var itemN in commandArray) {
    var item = commandArray[itemN];
    var itemWithoutput = item + " >>" + logFile + " 2>&1"
    execSync(itemWithoutput);
}

// remove sensitive information
commandArray = [
    "sed -i -r -e 's/([Pp]assword:  *)([^ ]*)(.*)$/\1<elided> \3/'",
    "sed -i -r -e 's/([Ss]potify  *.*token is )(.*)$/\1<elided>/'",
    "sed -i -r -e 's/(--[Pp]assword[ ][ ]*)([^ ]*)/\1<elided>/'",
    "sed -i -r -e 's/(wlan[0-9]: WPS: UUID [^:]*: ).*$/\1<elided>/'"
];
for (var itemN in commandArray) {
	var item = commandArray[itemN];
	var cmd  = item + " " + logFile;
	try {
		execSync(cmd);
	} catch(e) {
		console.log(error);
	}
}

var variant = getSystemVersion();

var command = '/usr/bin/curl -X POST -H "Content-Type: multipart/form-data" -F "logFile=@'+logFile+'" -F "desc='+args[0]+'" -F "variant='+variant+'" "http://logs.volumio.org:7171/logs/v1"';

exec(command , {uid: 1000, gid: 1000, encoding: 'utf8'}, function (error, stdout, stderr) {
    if (error !== null) {
        console.log('Canot send bug report: ' + error);
    } else {
        console.log(stdout)
    }
    execSync("rm " + logFile);
    execSync("rm /tmp/logfields");
});


function randomIntInc (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

function getSystemVersion () {
    var self = this;
    var file = fs.readFileSync('/etc/os-release').toString().split('\n');

    var nLines = file.length;
    var str;
    for (var l = 0; l < nLines; l++) {

        if (file[l].match(/VOLUMIO_VARIANT/i)) {
            str = file[l].split('=');
            var variant = str[1].replace(/\"/gi, "");
            return variant;
        }
    }
};
