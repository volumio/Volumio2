'use strict';

var fs = require('fs-extra');
var execSync = require('child_process').execSync;
var libQ = require('kew');
var os = require('os');
var path = require('path');

// Define the CommandLineClient class
module.exports = CommandLineClient;
function CommandLineClient (context) {
  this.context = context;
  this.commandRouter = this.context.coreCommand;
  this.logger = this.context.logger;
  this.configManager = this.context.configManager;
}

CommandLineClient.prototype.onVolumioStart = function () {
  var self = this;

  self.buildVolumeFiles();

  return libQ.resolve();
};

CommandLineClient.prototype.getConfigParam = function (key) {
  return this.config.get(key);
};

CommandLineClient.prototype.setConfigParam = function (data) {
  this.config.set(data.key, data.value);
};

CommandLineClient.prototype.getConfigurationFiles = function () {
  return ['config.json'];
};

CommandLineClient.prototype.getAdditionalConf = function (type, controller, data) {
  var self = this;
  return self.commandRouter.executeOnPlugin(type, controller, 'getConfigParam', data);
};

CommandLineClient.prototype.buildVolumeFiles = function () {
  var self = this;

  var getCommand = 'volume=`/bin/cat /tmp/volume`';
  try {
    var getVolumeTemplate = fs.readFileSync(path.join(__dirname, 'getvolume.sh.template'));
    var setVolumeTemplate = fs.readFileSync(path.join(__dirname, 'setvolume.sh.template'));
  } catch (e) {}
  if (getVolumeTemplate && getVolumeTemplate.length && setVolumeTemplate && setVolumeTemplate.length) {
    try {
      fs.writeFileSync('/tmp/setvolume', setVolumeTemplate, 'utf8');
      fs.writeFileSync('/tmp/getvolume', getVolumeTemplate, 'utf8');
      execSync('/bin/chmod a+x /tmp/getvolume', {uid: 1000, gid: 1000});
      execSync('/bin/chmod a+x /tmp/setvolume', {uid: 1000, gid: 1000});
    } catch (e) {
      console.log('Could not write template files');
    }
  } else {
    self.writeVolumeFiles('/tmp/setvolume');
    self.writeVolumeFiles('/tmp/getvolume', getCommand);
  }
};

CommandLineClient.prototype.writeVolumeFiles = function (path, content) {
  var self = this;

  try {
    var ws = fs.createWriteStream(path);
    ws.cork();
    ws.write('#!/bin/bash\n');
    if (path == '/tmp/setvolume') {
      ws.write('echo $1\n');
      ws.write('volume=$1\n');
      ws.write('if [ "$volume" = "0" ]; then\n');
      ws.write('volume="1"\n');
      ws.write('fi\n');
      ws.write('/usr/local/bin/volumio volume $volume\n');
      ws.write('echo $volume\n');
    } else {
      ws.write(content + '\n');
      ws.write('if [ "$volume" = "0" ]; then\n');
      ws.write('echo "1"\n');
      ws.write('else\n');
      ws.write('echo $volume\n');
      ws.write('fi\n');
    }
    ws.uncork();
    ws.end();
    execSync('/bin/chmod a+x ' + path, {uid: 1000, gid: 1000});
  } catch (e) {
    console.log(e);
  }
};

CommandLineClient.prototype.pushState = function (state) {
  var self = this;
};
