var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var fs = require('fs');

var commandArray = [
  'cat /proc/version',
  'cat /etc/os-release',
  'ifconfig',
  'sudo iwconfig',
  'aplay -l',
  'ps -ef',
  'df -h',
  'mount',
  'netstat -natp',
  'cat /var/log/mpd.log',
  'cat /data/configuration/plugins.json',
  'cat /etc/mpd.conf',
  'volumio endpointstest',
  'sudo journalctl -p 7'
];

// Up to two arguments may be given:
// - a description, which is inserted in the output file
// - an optional flag indicating the log should be saved locally, not uploaded
var args = process.argv.slice(2);
var description;
if (args[0] === undefined) {
  description = 'Unknown';
} else {
  description = '';
  // This will always yield a string that starts and ends with single quotes.
  var pieces = args[0].split("'");
  var n = pieces.length;
  for (var i = 0; i < n; i++) {
    description = description + "'" + pieces[i] + "'";
    if (i < (n - 1)) description = description + "\\'";
  }
}

var submit = 'yes';
if (args.length > 1) {
  submit = 'no';
}

var logFile = '/tmp/logondemand';
var storedLogFile = '/var/tmp/logondemand';

// Let's start fresh!
execSync('date >' + logFile);

try {
  // If description is supplied, add it
  fs.appendFileSync(logFile, 'Description="' + description + '"\n');
} catch (e) {
  console.log(e);
}

for (var itemN in commandArray) {
  var item = commandArray[itemN];
  var itemWithoutput = item + ' >>' + logFile + ' 2>&1';
  try {
    fs.appendFileSync(logFile, '\n# ' + item + ' ---------------' + '\n');
  } catch (e) {
    console.log(e);
  }
  try {
    execSync(itemWithoutput);
  } catch (e) {
    // A command has failed
  }
}

// remove sensitive information
commandArray = [
  "sed -i -r -e 's/([Pp]assword:  *)([^ ]*)(.*)$/\\1<elided> \\3/'",
  "sed -i -r -e 's/([Ss]potify  *.*token is )(.*)$/\\1<elided>/'",
  "sed -i -r -e 's/(--[Pp]assword[ ][ ]*)([^ ]*)/\\1<elided>/'",
  "sed -i -r -e 's/(wlan[0-9]: WPS: UUID [^:]*: ).*$/\\1<elided>/'",
  "sed -i -r -e 's/(mount .*username=)([^,]*,)(.*)$/\\1<elided>,\\3/'",
  "sed -i -r -e 's/(mount .*password=)([^,]*,)(.*)$/\\1<elided>,\\3/'"
];
for (var itemN in commandArray) { // eslint-disable-line
  var item = commandArray[itemN]; // eslint-disable-line
  var cmd = item + ' ' + logFile;
  try {
    execSync(cmd);
  } catch (e) {
    console.log(e);
  }
}

var variant = getSystemVersion();

// Use single quotes to avoid the shell expanding any characters in the form data
// description is a special case, see above
var command = "/usr/bin/curl -X POST -H 'Content-Type: multipart/form-data'" +
            " -F 'logFile=@" + logFile + "'" +
            ' -F desc=' + description +
            " -F 'variant=" + variant + "'" +
            " 'http://logs.volumio.org:7171/logs/v1'";

if (submit === 'yes') {
  exec(command, {uid: 1000, gid: 1000, encoding: 'utf8'}, function (error, stdout, stderr) {
    if (error !== null) {
      console.log('Cannot send bug report: ' + error);
      console.log('Saving as: ' + storedLogFile);
      execSync('mv -f ' + logFile + ' ' + storedLogFile);
    } else {
      console.log(stdout);
      execSync('rm ' + logFile);
    }
  });
} else {
  console.log('Saving as: ' + storedLogFile);
  execSync('mv -f ' + logFile + ' ' + storedLogFile);
}

function getSystemVersion () {
  var file = fs.readFileSync('/etc/os-release').toString().split('\n');

  var nLines = file.length;
  var str;
  for (var l = 0; l < nLines; l++) {
    if (file[l].match(/VOLUMIO_VARIANT/i)) {
      str = file[l].split('=');
      var variant = str[1].replace(/\"/gi, ''); // eslint-disable-line
      return variant;
    }
  }
}
