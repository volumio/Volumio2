/**
 * Created by Michelangelo on 19/11/2015.
 * Modified by André beginning 2016
 */
var exec = require('child_process');

var logglyKey = process.env.logglyKey;
var logglyUrl = "https://logs-01.loggly.com/bulk/" + logglyKey + "/tag/file_upload";

var commandArray = [
    "ifconfig",
    "iwconfig",
    "ps -ef",
    "sudo journalctl -p 7",
    "sudo journalctl -u airplay -p 7"
    ];

var logFile = "/tmp/logondemand";

// Let's start fresh!
exec.execSync("date >" + logFile);

try {
    var args = process.argv.slice(2);
    //If description is supplied, add it
    exec.execSync("echo " + args[0] +  " >>" + logFile);
} catch (e) {}

exec.execSync("cat /tmp/logfields >> " + logFile);

for (var itemN in commandArray) {
    var item = commandArray[itemN];
    var itemWithoutput = item + " >>" + logFile + " 2>&1"
    console.log(item);
    exec.execSync(itemWithoutput);
}

var command = "/bin/bash /volumio/axiom/s3.sh " + logFile;
console.log(command);
exec.execSync(command);
exec.execSync("rm " + logFile);
exec.execSync("rm /tmp/logfields");


function randomIntInc (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}
