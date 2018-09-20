'use strict';

var fs = require('fs-extra');
var exec = require('child_process').exec;
var os = require('os');
var ifconfig = require('/volumio/app/plugins/system_controller/network/lib/ifconfig.js');
var ip = require('ip');
var libQ = require('kew');
var net = require('net');
var mpdPort = 6599;
var mpdAddress = '0.0.0.0';
var server;
// Define the UpnpInterface class
module.exports = UpnpInterface;

function UpnpInterface (context) {
  var self = this;
  // Save a reference to the parent commandRouter
  self.context = context;
  self.commandRouter = self.context.coreCommand;
  self.logger = self.commandRouter.logger;
}

UpnpInterface.prototype.onVolumioStart = function () {
  var self = this;

  self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Starting Upmpd Daemon');
  self.startUpmpdcli();

  var boundMethod = self.onPlayerNameChanged.bind(self);
  self.commandRouter.executeOnPlugin('system_controller', 'system', 'registerCallback', boundMethod);

  var localport = 6599;
  var remoteport = 6600;
  var remoteaddr = '127.0.0.1';

  self.server = net.createServer(function (socket) {
    socket.setEncoding('utf8');

    socket.on('data', function (msg) {
      var message = msg.toString();
      // console.log('Upnp client: '+message );
      if (message.indexOf('addid') !== -1) {
        self.logger.info('Starting UPNP Playback');
        self.prepareUpnpPlayback();

        setTimeout(function () {
          serviceSocket.write(msg);
        }, 500);
      } else if (message.indexOf('clear') !== -1) {
        self.clearQueue();
        setTimeout(function () {
          serviceSocket.write(msg);
        }, 300);
      } else {
        try {
          serviceSocket.write(msg);
        } catch (e) {
          console.log('Upnp client error: ' + e);
        }
      }
    });
    socket.on('error', function (error) {
      console.log('Upnp client error: ' + error);
    });

    var serviceSocket = new net.Socket();
    serviceSocket.connect(parseInt(remoteport), remoteaddr, function () {
    });
    serviceSocket.on('data', function (data) {
      socket.write(data);
    });

    serviceSocket.on('error', function (error) {
      self.logger.error('Upnp client error: ' + error);
    });
  });
  self.server.listen(localport);
  return libQ.resolve();
};

UpnpInterface.prototype.onPlayerNameChanged = function (playerName) {
  var self = this;

  self.onRestart();
};

UpnpInterface.prototype.getCurrentIP = function () {
  var self = this;

  var defer = libQ.defer();
  var ipaddr = '';

  ifconfig.status('wlan0', function (err, status) {
    if (status != undefined) {
      if (status.ipv4_address != undefined) {
        ipaddr = status.ipv4_address;
        defer.resolve(ipaddr);
      } else {
        ipaddr = ip.address();
        defer.resolve(ipaddr);
      }
    }
  });
  return defer.promise;
};

UpnpInterface.prototype.onStop = function () {
  var self = this;
  var defer = libQ.defer();

  exec('/usr/bin/sudo /bin/systemctl stop upmpdcli.service', function (error, stdout, stderr) {
    if (error) {
      self.logger.error('Cannot kill upmpdcli ' + error);
      defer.reject('');
    } else {
      self.server.close(function () {
        self.server.unref();
        defer.resolve('');
      });
    }
  });

  return defer.promise;
};

UpnpInterface.prototype.onRestart = function () {
  var self = this;

  exec('/usr/bin/sudo /usr/bin/killall upmpdcli', function (error, stdout, stderr) {
    if (error) {
      self.logger.error('Cannot kill upmpdcli ' + error);
    } self.startUpmpdcli();
  });
};

UpnpInterface.prototype.onInstall = function () {
  var self = this;
  // Perform your installation tasks here
};

UpnpInterface.prototype.onUninstall = function () {
  var self = this;
  // Perform your installation tasks here
};

UpnpInterface.prototype.getUIConfig = function () {
  var self = this;
};

UpnpInterface.prototype.setUIConfig = function (data) {
  var self = this;
  // Perform your installation tasks here
};

UpnpInterface.prototype.getConf = function (varName) {
  var self = this;
  // Perform your installation tasks here
};

UpnpInterface.prototype.setConf = function (varName, varValue) {
  var self = this;
  // Perform your installation tasks here
};

// Optional functions exposed for making development easier and more clear
UpnpInterface.prototype.getSystemConf = function (pluginName, varName) {
  var self = this;
  // Perform your installation tasks here
};

UpnpInterface.prototype.setSystemConf = function (pluginName, varName) {
  var self = this;
  // Perform your installation tasks here
};

UpnpInterface.prototype.getAdditionalConf = function () {
  var self = this;
  // Perform your installation tasks here
};

UpnpInterface.prototype.setAdditionalConf = function () {
  var self = this;
  // Perform your installation tasks here
};

UpnpInterface.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

UpnpInterface.prototype.startUpmpdcli = function () {
  var self = this;

  setTimeout(function () {
    var systemController = self.commandRouter.pluginManager.getPlugin('system_controller', 'system');
    var nameraw = systemController.getConf('playerName');
    var name = nameraw.charAt(0).toUpperCase() + nameraw.slice(1);

    var upmpdcliconf = '/tmp/upmpdcli.conf';
    var upmpdcliconftmpl = __dirname + '/upmpdcli.conf.tmpl';
    var namestring = 'friendlyname = ' + name.replace(/-/g, ' ') + os.EOL + 'ohproductroom = ' + name.replace(/-/g, ' ') + os.EOL;
    var ipaddress = self.getCurrentIP();
    ipaddress.then(function (ipaddresspromise) {
      fs.readFile(__dirname + '/presentation.html.tmpl', 'utf8', function (err, data) {
        if (err) {
          return self.logger.log('Error writing Upnp presentation file: ' + err);
        }
        var conf1 = data.replace('{IP-ADDRESS}', ipaddresspromise);

        fs.writeFile('/tmp/presentation.html', conf1, 'utf8', function (err) {
          if (err) {
            self.logger.log('Error writing Upnp presentation file: ' + err);
          }
        });
      });
    });

    fs.outputFile(upmpdcliconf, namestring, function (err) {
      if (err) {
        self.logger.error('Cannot write upnp conf file: ' + err);
      } else {
        fs.appendFile(upmpdcliconf, fs.readFileSync(upmpdcliconftmpl), function (err) {
          if (err) {
            self.logger.error('Cannot write upnp conf file: ' + err);
          }
          upmpdcliexec();
        });
      }
    });

    function upmpdcliexec () {
      exec('/usr/bin/sudo /bin/systemctl start upmpdcli.service', function (error, stdout, stderr) {
        if (error) {
          self.logger.error('Cannot start Upmpdcli: ' + error);
        } else {
          self.logger.info('Upmpdcli Daemon Started');
        }
      });
    }
  }, 10000);
};

UpnpInterface.prototype.prepareUpnpPlayback = function () {
  var self = this;

  self.logger.info('Preparing playback through UPNP');

  // self.commandRouter.volumioStop();
  this.commandRouter.stateMachine.unSetVolatile();
  if (this.commandRouter.stateMachine.isConsume) {
    self.logger.info('Consume mode');
  }
  self.commandRouter.volumioStop();
  this.commandRouter.stateMachine.setConsumeUpdateService('mpd', false, true);
};

UpnpInterface.prototype.startUpnpPlayback = function () {
  var self = this;

  self.logger.info('Starting playback through UPNP');

  // self.commandRouter.stateMachine.setConsumeUpdateService('mpd');
};

UpnpInterface.prototype.stopUpnpPlayback = function () {
  var self = this;

  self.logger.info('Stopping playback through UPNP');
  if (this.commandRouter.stateMachine.isConsume) {
    self.logger.info('Stopping service currently in playback since Volumio is in Consume mode');
    self.commandRouter.volumioStop();
  }
  this.commandRouter.stateMachine.setConsumeUpdateService(undefined);
};

UpnpInterface.prototype.clearQueue = function () {
  var self = this;

  self.logger.info('Clearing queue after UPNP request');
  this.commandRouter.stateMachine.clearQueue();
};
