'use strict';

var fs = require('fs-extra');
var config = new (require('v-conf'))();
var libQ = require('kew');
var netJson = {};
var wifiConnectPayload = {};
var wifiConnectPayloadExec = false;
var I2Sreboot = false;
var I2SName = '';

var backgroundPath = '/data/backgrounds';

// Define the volumioWizard class
module.exports = volumioWizard;

function volumioWizard (context) {
  var self = this;

  // Save a reference to the parent commandRouter
  self.context = context;
  self.commandRouter = self.context.coreCommand;
  this.configManager = this.context.configManager;

  self.logger = self.context.logger;
}

volumioWizard.prototype.getConfigurationFiles = function () {
  var self = this;

  return ['config.json'];
};

volumioWizard.prototype.onVolumioStart = function () {
  var self = this;
  // Perform startup tasks here
  var configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');

  this.config = new (require('v-conf'))();
  this.config.loadFile(configFile);

  return libQ.resolve();
};

volumioWizard.prototype.onStart = function () {
  var self = this;
  return libQ.resolve();
};

volumioWizard.prototype.onStop = function () {
  var self = this;
  // Perform startup tasks here
};

volumioWizard.prototype.onRestart = function () {
  var self = this;
  // Perform startup tasks here
};

volumioWizard.prototype.onInstall = function () {
  var self = this;
  // Perform your installation tasks here
};

volumioWizard.prototype.onUninstall = function () {
  var self = this;
  // Perform your installation tasks here
};

volumioWizard.prototype.setUIConfig = function (data) {
  var self = this;

  var uiconf = fs.readJsonSync(__dirname + '/UIConfig.json');
};

volumioWizard.prototype.getConf = function () {
  var self = this;
  var conf = [];
  try {
    var conf = JSON.parse(fs.readJsonSync(self.configFile));
  } catch (e) {}

  return conf;
};

// Optional functions exposed for making development easier and more clear
volumioWizard.prototype.getSystemConf = function (pluginName, varName) {
  var self = this;
  // Perform your installation tasks here
};

volumioWizard.prototype.setSystemConf = function (pluginName, varName) {
  var self = this;
  // Perform your installation tasks here
};

volumioWizard.prototype.getAdditionalConf = function (type, controller, data, def) {
  var self = this;
  var setting = self.commandRouter.executeOnPlugin(type, controller, 'getConfigParam', data);

  if (setting == undefined) {
    setting = def;
  }
  return setting;
};

volumioWizard.prototype.setAdditionalConf = function () {
  var self = this;
  // Perform your installation tasks here
};

volumioWizard.prototype.getConfigParam = function (key) {
  var self = this;
  return config.get(key);
};

volumioWizard.prototype.getShowWizard = function () {
  var self = this;
  var show = self.commandRouter.executeOnPlugin('system_controller', 'system', 'getShowWizard', '');

  return show;
};

volumioWizard.prototype.getWizardSteps = function () {
  var self = this;

  var stepsFolder = __dirname + '/wizard_steps';
  var steps = fs.readdirSync(stepsFolder).sort(function (a, b) { return a - b; });
  var stepsArray = [];
  netJson = {};

  for (var i in steps) {
    if (steps[i].indexOf('conf') <= -1) {
      var step = fs.readJsonSync((__dirname + '/wizard_steps/' + steps[i]), 'utf8', {throws: false});
      if (step.show) {
        stepsArray.push(step);
      }
      if (step.name === 'devicecode') {
        var isVolumioDevice = self.commandRouter.executeOnPlugin('system_controller', 'my_volumio', 'showActivationCode', '');
        if (isVolumioDevice) {
          step.show = true;
          stepsArray.push(step);
        }
      }
      if (step.name === 'advancedsettings' && (process.env.SHOW_ADVANCED_SETTINGS_MODE_SELECTOR === 'true')) {
        step.show = true;
        stepsArray.push(step);
      }
    }
  }
  return stepsArray;
};

volumioWizard.prototype.connectWirelessNetwork = function (data) {
  var self = this;
  var defer = libQ.defer();
  wifiConnectPayload = {};
  wifiConnectPayloadExec = false;

  if (data.persistentWizard === true) {
    if (data.ssid != undefined) {
      self.commandRouter.executeOnPlugin('system_controller', 'network', 'saveWirelessNetworkSettings', data);
      var translatedMessage = self.commandRouter.getI18nString('NETWORK.WIRELESS_NETWORK_CONNECTING_TO') + ' ' + data.ssid + '... ' + self.commandRouter.getI18nString('NETWORK.WIRELESS_NETWORK_RESTART_AFTER_CONNECTION');
      var connResults = {'wait': true, 'message': translatedMessage};
      defer.resolve(connResults);
    } else {
      defer.resolve('');
    }
  } else {
    var ethinfo = self.commandRouter.executeOnPlugin('system_controller', 'network', 'getWiredInfo', '');

    ethinfo.then(function (ethdata) {
      if (ethdata.connected) {
        if (data.ssid != undefined) {
          self.commandRouter.executeOnPlugin('system_controller', 'network', 'saveWirelessNetworkSettings', data);
          var translatedMessage = self.commandRouter.getI18nString('NETWORK.WIRELESS_NETWORK_CONNECTING_TO')+ ' ' + data.ssid + '... ' + self.commandRouter.getI18nString('COMMON.PLEASE_WAIT')
          var connResults = {'wait': true, 'message': 'Connecting to network ' + data.ssid + '... ' + 'Please wait'};
          defer.resolve(connResults);
        } else {
          defer.resolve('');
        }
      } else {
        wifiConnectPayload = data;
        wifiConnectPayloadExec = true;
        var message = self.commandRouter.getI18nString('NETWORK.WIRELESS_NETWORK_CONNECTION_DEFER');
        var message2 = self.commandRouter.getI18nString('NETWORK.WIRELESS_NETWORK_CONNECTION_DEFER2');
        var connResults = {'wait': false, 'result': message + ' ' + data.ssid + ' ' + message2};
        defer.resolve(connResults);
      }
    });
  }

  return defer.promise;
};

volumioWizard.prototype.reportWirelessConnection = function () {
  var self = this;
  var defer = libQ.defer();
  var netInfo = self.commandRouter.executeOnPlugin('system_controller', 'network', 'getWirelessInfo', '');

  netInfo.then(function (data) {
    if (data != undefined) {
      if (data.connected && data.ssid != undefined) {
        var message = self.commandRouter.getI18nString('NETWORK.WIRELESS_NETWORK_CONNECTION_SUCCESSFUL');
        var message2 = self.commandRouter.getI18nString('NETWORK.WIRELESS_NETWORK_CONNECTION_SUCCESSFUL_PROCEED');
        var connStatus = {'wait': false, 'result': message + ' ' + data.ssid + ', ' + message2};
      } else {
        var message = self.commandRouter.getI18nString('NETWORK.WIRELESS_NETWORK_CONNECTION_ERROR');
        var message2 = self.commandRouter.getI18nString('NETWORK.WIRELESS_NETWORK_CONNECTION_ERROR_PROCEED');
        var connStatus = {'wait': false, 'result': message + ' ' + data.ssid + ', ' + message2};
      }
      return self.commandRouter.broadcastMessage('pushWizardWirelessConnResults', connStatus);
    }
  });
};

volumioWizard.prototype.getWizardConfig = function (data) {
  var self = this;

  var defer = libQ.defer();

  var lang_code = this.commandRouter.sharedVars.get('language_code');
  var conf = __dirname + '/wizard_steps/conf/' + data.page + '.json';

  self.commandRouter.i18nJson(__dirname + '/../../../i18n/strings_' + lang_code + '.json',
      __dirname + '/../../../i18n/strings_en.json',
      conf)
      .then(function (uiconf) {
        defer.resolve(uiconf);
      })
      .fail(function () {
        defer.reject(new Error());
      });

  return defer.promise;
};

volumioWizard.prototype.setWizardAction = function (data) {
  var self = this;

  if (data.action != undefined) {
    switch (data.action) {
      case 'skip':
        self.setSkip();
        break;
      case 'reboot':
        self.setReboot(data);
        break;
      case 'close':
        self.setCloseWizard();
        break;
      default:
        break;
    }
  }
};

volumioWizard.prototype.setSkip = function () {
  var self = this;

  self.logger.info('Wizard skipped');
  self.commandRouter.executeOnPlugin('system_controller', 'system', 'setShowWizard', false);
  self.commandRouter.broadcastMessage('closeWizard', '');
};

volumioWizard.prototype.setReboot = function (data) {
  var self = this;

  I2Sreboot = true;
  if (data.dacName != undefined) {
    I2SName = data.dacName;
  }
};

volumioWizard.prototype.setCloseWizard = function () {
  var self = this;

  self.commandRouter.executeOnPlugin('system_controller', 'system', 'setShowWizard', false);
  self.logger.info('Wizard terminated Successfully');
  self.commandRouter.broadcastMessage('closeWizard', '');

  if (I2Sreboot) {
    self.logger.info('Player Reboot required after I2S DAC has been enabled in wizard');
    self.pushReboot();
  }
  if (wifiConnectPayloadExec) {
    self.logger.info('Executing Deferred Wifi Connection');
    self.commandRouter.executeOnPlugin('system_controller', 'network', 'saveWirelessNetworkSettings', wifiConnectPayload);
  }
};

volumioWizard.prototype.pushReboot = function () {
  var self = this;

  var responseData = {
    title: self.commandRouter.getI18nString('PLAYBACK_OPTIONS.I2S_DAC_ACTIVATED'),
    message: I2SName + ' ' + self.commandRouter.getI18nString('PLAYBACK_OPTIONS.I2S_DAC_ACTIVATED_MESSAGE'),
    size: 'lg',
    buttons: [
      {
        name: self.commandRouter.getI18nString('COMMON.RESTART'),
        class: 'btn btn-info',
        emit: 'reboot',
        payload: ''
      }
    ]
  };
  self.commandRouter.broadcastMessage('openModal', responseData);
};

volumioWizard.prototype.getDonationsArray = function () {
  var self = this;

  var donationsArray = {'donationAmount': 20, 'customAmount': 30, 'amounts': [10, 20, 50, 100]};

  return donationsArray;
};

volumioWizard.prototype.getDonation = function () {
  var self = this;

  var hideDonationForVolumioDevices = self.commandRouter.executeOnPlugin('system_controller', 'my_volumio', 'detectVolumioHardware', '');
  if (!hideDonationForVolumioDevices) {
    var donation = self.config.get('donation', true);
  } else {
    var donation = false;
  }

  return donation;
};

volumioWizard.prototype.getDoneMessage = function () {
  var self = this;

  var systemName = self.config.get('system_name', 'Volumio');
  var showMessage = self.config.get('show_message', true);
  var respcongratulations = self.commandRouter.getI18nString('WIZARD.CONGRATULATIONS');
  var resptitle = systemName + ' ' + self.commandRouter.getI18nString('WIZARD.DEVICE_SUCCESSFULLY_CONFIGURED');
  var isVolumioDevice = self.commandRouter.executeOnPlugin('system_controller', 'my_volumio', 'detectVolumioHardware', '');
  if (isVolumioDevice) {
    showMessage = false;
  }
  var respmessage = self.commandRouter.getI18nString('WIZARD.PLEASE_DONATE');
  if (showMessage) {
    var response = {congratulations: respcongratulations, title: resptitle, message: respmessage};
  } else {
    var response = {congratulations: respcongratulations, title: resptitle, message: ''};
  }

  return response;
};
