var moment = require('moment');
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var logFile = "/tmp/crashdump";
var fs = require('fs');

var now = moment().format('YYYY-MM-DD HH:mm');
var sinceTime = moment().subtract(1, 'minutes').format('YYYY-MM-DD HH:mm');
var minuteDump = execSync('/usr/bin/sudo /bin/journalctl --since="' + sinceTime +'" > /tmp/crashdump', {uid: 1000, gid: 1000});

var command = "/usr/bin/curl -X POST -H 'Content-Type: multipart/form-data'"
    + " -F 'logFile=@" + logFile + "'"
    + " -F 'desc=" + now +"'"
    + " 'http://logs.volumio.org:7171/reports/v1'";

exec(command , {uid: 1000, gid: 1000, encoding: 'utf8'}, function (error, stdout, stderr) {
    if (error !== null) {
        console.log('Cannot send Crash Dump report: ' + error);
    } else {
        console.log('CRASH DUMP SENT: ' + stdout)
    }
});