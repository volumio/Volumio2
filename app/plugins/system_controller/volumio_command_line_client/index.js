'use strict';

var fs = require('fs-extra');
var exec = require('child_process').exec;
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

  return self.buildVolumeFiles();
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

  var getVolumeDefer = libQ.nfcall(fs.readFile, path.join(__dirname, 'getvolume.sh.template'))
    .fail(function (e) { return null; });
  var setVolumeDefer = libQ.nfcall(fs.readFile, path.join(__dirname, 'setvolume.sh.template'))
    .fail(function (e) { return null; });

  return getVolumeDefer.then(function(getVolumeTemplate) {
    return setVolumeDefer.then(function(setVolumeTemplate) {
      if (getVolumeTemplate && getVolumeTemplate.length && setVolumeTemplate && setVolumeTemplate.length) {
        return libQ.all(
          libQ.nfcall(fs.writeFile, '/tmp/setvolume', setVolumeTemplate, 'utf8'),
          libQ.nfcall(fs.writeFile, '/tmp/getvolume', getVolumeTemplate, 'utf8')
        )
        .fail(function() {})
        .then(function() {
          return libQ.all(
            libQ.nfcall(exec, '/bin/chmod a+x /tmp/getvolume', {uid: 1000, gid: 1000}),
            libQ.nfcall(exec, '/bin/chmod a+x /tmp/setvolume', {uid: 1000, gid: 1000})
          );
        });
      } else {
        return libQ.all(
          self.writeVolumeFiles('/tmp/setvolume'),
          self.writeVolumeFiles('/tmp/getvolume', getCommand)
        );
      }
    }); 
  });
};

CommandLineClient.prototype.writeVolumeFiles = function (path, content) {
  var self = this;

  var toWrite = '#!/bin/bash\n';
  if (path == '/tmp/setvolume') {
    toWrite += 'echo $1\n';
    toWrite += 'volume=$1\n';
    toWrite += 'if [ "$volume" = "0" ]; then\n';
    toWrite += 'volume="1"\n';
    toWrite += 'fi\n';
    toWrite += '/usr/local/bin/volumio volume $volume\n';
    toWrite += 'echo $volume\n';
  } else {
    toWrite += content + '\n';
    toWrite += 'if [ "$volume" = "0" ]; then\n';
    toWrite += 'echo "1"\n';
    toWrite += 'else\n';
    toWrite += 'echo $volume\n';
    toWrite += 'fi\n';
  }
  
  return libQ.nfcall(fs.writeFile, path, toWrite, 'utf8')
    .then(function(x) {
      return libQ.nfcall(exec, '/bin/chmod a+x ' + path, {uid: 1000, gid: 1000});
    })
    .fail(function (e) {
      console.log(e);
    });
};

CommandLineClient.prototype.pushState = function (state) {
  var self = this;
};
