'use strict';

var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var dbUpdateNotified = false;

module.exports = PlatformSpecific;
function PlatformSpecific (coreCommand) {
  var self = this;

  self.coreCommand = coreCommand;
}

PlatformSpecific.prototype.shutdown = function () {
  var self = this;
  execSync('/bin/sync', { uid: 1000, gid: 1000});
  exec('/usr/bin/sudo systemctl poweroff', function (error, stdout, stderr) {
    if (error) {
      self.coreCommand.pushConsoleMessage(error);
    }
    self.coreCommand.pushConsoleMessage('Shutting Down');
    // Fallback in case above method does not work
    setTimeout(function () {
      execSync('/usr/bin/sudo /sbin/shutdown -h now', { uid: 1000, gid: 1000});
    }, 3000);
  });
};

PlatformSpecific.prototype.reboot = function () {
  var self = this;
  execSync('/bin/sync', { uid: 1000, gid: 1000});
  exec('/usr/bin/sudo systemctl reboot', function (error, stdout, stderr) {
    if (error) {
      self.coreCommand.pushConsoleMessage(error);
    }
    self.coreCommand.pushConsoleMessage('Rebooting');
    // Fallback in case above method does not work
    setTimeout(function () {
      execSync('/usr/bin/sudo /sbin/reboot', { uid: 1000, gid: 1000});
    }, 3000);
  });
};

PlatformSpecific.prototype.networkRestart = function () {
  var self = this;
  exec('/usr/bin/sudo /bin/ip addr flush dev eth0 && /usr/bin/sudo /sbin/ifconfig eth0 down && /usr/bin/sudo /sbin/ifconfig eth0 up', function (error, stdout, stderr) {
    if (error !== null) {
      self.coreCommand.pushToastMessage('error', self.coreCommand.getI18nString('NETWORK.NETWORK_RESTART_TITLE'),
        self.coreCommand.getI18nString('NETWORK.NETWORK_RESTART_ERROR') + error);
    } else {
      self.coreCommand.pushToastMessage('success', self.coreCommand.getI18nString('NETWORK.NETWORK_RESTART_TITLE'),
        self.coreCommand.getI18nString('NETWORK.NETWORK_RESTART_SUCCESS'));
    }
    // Restart Upmpdcli
    setTimeout(function () {
      self.coreCommand.executeOnPlugin('audio_interface', 'upnp', 'onRestart', '');
      self.coreCommand.executeOnPlugin('system_controller', 'network', 'onNetworkingRestart', '');
    }, 10000);
  });
};

PlatformSpecific.prototype.wirelessRestart = function () {
  var self = this;
  exec('sudo /bin/systemctl restart wireless.service', function (error, stdout, stderr) {
    if (error !== null) {
      self.coreCommand.pushToastMessage('error', self.coreCommand.getI18nString('NETWORK.WIRELESS_RESTART_TITLE'),
        self.coreCommand.getI18nString('NETWORK.WIRELESS_RESTART_ERROR') + error);
    } else {
      self.coreCommand.pushToastMessage('success', self.coreCommand.getI18nString('NETWORK.WIRELESS_RESTART_TITLE'),
        self.coreCommand.getI18nString('NETWORK.WIRELESS_RESTART_SUCCESS'));
      setTimeout(function () {
        self.coreCommand.executeOnPlugin('miscellanea', 'wizard', 'reportWirelessConnection', '');
      }, 5000);
      // Restart Upmpdcli
      setTimeout(function () {
        self.coreCommand.executeOnPlugin('audio_interface', 'upnp', 'onRestart', '');
        self.coreCommand.executeOnPlugin('system_controller', 'network', 'onNetworkingRestart', '');
      }, 10000);
    }
  });
};

PlatformSpecific.prototype.startupSound = function () {
  var self = this;
  var outdev = self.coreCommand.sharedVars.get('alsa.outputdevice');
  var startupSound = self.coreCommand.executeOnPlugin('system_controller', 'system', 'getConfigParam', 'startupSound');

  if (startupSound) {
    var hwdev = null;
    if (process.env.MODULAR_ALSA_PIPELINE === 'true') {
      hwdev = '-D ' + outdev;
    } else {
      if (outdev === 'softvolume') {
        hwdev = '-D softvolume';
      } else {
        hwdev = '--device=plughw:' + outdev + ',0';
      }
    }
    try {
      execSync('/usr/bin/aplay ' + hwdev + ' /volumio/app/startup.wav');
    } catch (e) {
    		console.log('Cannot play startup sound');
    }
  }
  self.coreCommand.closeModals();
  setTimeout(function () {
    self.coreCommand.executeOnPlugin('audio_interface', 'alsa_controller', 'checkAudioDeviceAvailable', '');
    self.coreCommand.executeOnPlugin('system_controller', 'system', 'versionChangeDetect', '');
  }, 1000);
};

PlatformSpecific.prototype.fileUpdate = function (data) {
  var self = this;
  self.coreCommand.pushConsoleMessage('Command Router : Notfying DB Update' + data);

  if (data === true && !dbUpdateNotified) {
    dbUpdateNotified = true;
    var responseData = {
      title: self.coreCommand.getI18nString('COMMON.SCAN_DB'),
      message: self.coreCommand.getI18nString('COMMON.UPDATING_MUSIC_DB_WAIT_MESSAGE'),
      size: 'lg',
      buttons: [
        {
          name: self.coreCommand.getI18nString('COMMON.GOT_IT'),
          class: 'btn btn-info ng-scope',
          emit: 'closeModals',
          payload: ''
        }
      ]
    };
    self.coreCommand.broadcastMessage('openModal', responseData);
  } else {
    self.coreCommand.closeModals();
  }

  return self.coreCommand.broadcastMessage('dbUpdate', {'status': data});
};

PlatformSpecific.prototype.usbAudioAttach = function () {
  var self = this;

  return self.coreCommand.executeOnPlugin('audio_interface', 'alsa_controller', 'usbAudioAttach', '');
};

PlatformSpecific.prototype.usbAudioDetach = function () {
  var self = this;

  return self.coreCommand.executeOnPlugin('audio_interface', 'alsa_controller', 'usbAudioDetach', '');
};
