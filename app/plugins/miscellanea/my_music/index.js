'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var config = new (require('v-conf'))();

// Define the ControllerMyMusic class
module.exports = ControllerMyMusic;

function ControllerMyMusic (context) {
  var self = this;

  // Save a reference to the parent commandRouter
  self.context = context;
  self.commandRouter = self.context.coreCommand;
  self.logger = self.commandRouter.logger;
  self.configManager = self.context.configManager;
}

ControllerMyMusic.prototype.getConfigurationFiles = function () {
  var self = this;

  return ['config.json'];
};

ControllerMyMusic.prototype.onVolumioStart = function () {
  var self = this;

  var configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');
  config.loadFile(configFile);

  return libQ.resolve();
};

ControllerMyMusic.prototype.onStart = function () {
  var self = this;

  return libQ.resolve();
};

ControllerMyMusic.prototype.onStop = function () {
  var self = this;
  // Perform startup tasks here
};

ControllerMyMusic.prototype.onRestart = function () {
  var self = this;
  // Perform startup tasks here
};

ControllerMyMusic.prototype.getUIConfig = function () {
  var self = this;

  var self = this;
  var lang_code = self.commandRouter.sharedVars.get('language_code');

  var defer = libQ.defer();

  var streamingConf = self.getStreamingConf();
  streamingConf.then(function (sconf) {
    self.commandRouter.i18nJson(__dirname + '/../../../i18n/strings_' + lang_code + '.json',
      __dirname + '/../../../i18n/strings_en.json',
      __dirname + '/UIConfig.json')
      .then(function (uiconf) {
        var enableweb = self.getAdditionalConf('miscellanea', 'albumart', 'enableweb', true);
        self.configManager.setUIConfigParam(uiconf, 'sections[3].content[0].value', enableweb);
        self.configManager.setUIConfigParam(uiconf, 'sections[3].content[0].value.label', self.getLabelForSelect(self.configManager.getValue(uiconf, 'sections[3].content[0].options'), enableweb));

        var websize = self.getAdditionalConf('miscellanea', 'albumart', 'defaultwebsize', 'large');
        self.configManager.setUIConfigParam(uiconf, 'sections[3].content[1].value.value', websize);
        self.configManager.setUIConfigParam(uiconf, 'sections[3].content[1].value.label', self.getLabelForSelect(self.configManager.getValue(uiconf, 'sections[3].content[1].options'), websize));

        var metadataimage = self.getAdditionalConf('miscellanea', 'albumart', 'metadataimage', false);
        self.configManager.setUIConfigParam(uiconf, 'sections[3].content[2].value', metadataimage);
        self.configManager.setUIConfigParam(uiconf, 'sections[3].content[2].value.label', self.getLabelForSelect(self.configManager.getValue(uiconf, 'sections[3].content[2].options'), metadataimage));

        var tracknumbersConf = self.getAdditionalConf('music_service', 'mpd', 'tracknumbers', false);
        self.configManager.setUIConfigParam(uiconf, 'sections[4].content[0].value', tracknumbersConf);

        var compilationConf = self.getAdditionalConf('music_service', 'mpd', 'compilation', 'Various,various,Various Artists,various artists,VA,va');
        self.configManager.setUIConfigParam(uiconf, 'sections[4].content[1].value', compilationConf);

        var artistsortConf = self.getAdditionalConf('music_service', 'mpd', 'artistsort', true);
        if (artistsortConf) {
          self.configManager.setUIConfigParam(uiconf, 'sections[4].content[2].value.value', true);
          self.configManager.setUIConfigParam(uiconf, 'sections[4].content[2].value.label', 'albumartist');
        } else {
          self.configManager.setUIConfigParam(uiconf, 'sections[4].content[2].value.value', false);
          self.configManager.setUIConfigParam(uiconf, 'sections[4].content[2].value.label', 'artist');
        }

        var ffmpeg = self.getAdditionalConf('music_service', 'mpd', 'ffmpegenable', false);
        self.configManager.setUIConfigParam(uiconf, 'sections[4].content[3].value', ffmpeg);

        if (sconf) {
          var insertInto = 2;
                	for (var i in sconf.sections) {
                		var streamingSection = sconf.sections[i];
            uiconf.sections.splice(insertInto, 0, streamingSection);
            insertInto++;
          }
        }

        defer.resolve(uiconf);
      })
      .fail(function () {
        defer.reject(new Error());
      });
  });

  return defer.promise;
};

ControllerMyMusic.prototype.getStreamingConf = function () {
  var self = this;
  var defer = libQ.defer();

  var streamingPlugin = self.context.coreCommand.pluginManager.getPlugin('music_service', 'streaming_services');
  if (streamingPlugin) {
    var streamingConf = self.commandRouter.getUIConfigOnPlugin('music_service', 'streaming_services', '');
    streamingConf.then(function (conf) {
      defer.resolve(conf);
    })
      .fail(function () {
        defer.resolve(false);
      });
  } else {
    defer.resolve(false);
  }

  return defer.promise;
};

ControllerMyMusic.prototype.setUIConfig = function (data) {
  var self = this;

  var uiconf = fs.readJsonSync(__dirname + '/UIConfig.json');
};

ControllerMyMusic.prototype.getConf = function (varName) {
  var self = this;

  return self.config.get(varName);
};

ControllerMyMusic.prototype.setConf = function (varName, varValue) {
  var self = this;

  self.config.set(varName, varValue);
};

ControllerMyMusic.prototype.getConfigurationFiles = function () {
  var self = this;

  return ['config.json'];
};

ControllerMyMusic.prototype.scanDatabase = function () {
  var self = this;

  exec('/usr/bin/mpc update', function (error, stdout, stderr) {
    if (error !== null) {
      self.commandRouter.pushToastMessage('error', self.commandRouter.getI18nString('COMMON.MY_MUSIC'), self.commandRouter.getI18nString('COMMON.SCAN_DB_ERROR') + error);
      self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Database scan error: ' + error);
    } else {
      self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Database update started');
      self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('COMMON.MY_MUSIC'), self.commandRouter.getI18nString('COMMON.SCAN_DB'));
    }
  });
};

ControllerMyMusic.prototype.getAdditionalConf = function (type, controller, data, def) {
  var self = this;
  var setting = self.commandRouter.executeOnPlugin(type, controller, 'getConfigParam', data);

  if (setting == undefined) {
    setting = def;
  }
  return setting;
};

ControllerMyMusic.prototype.getLabelForSelect = function (options, key) {
  var self = this;
  var n = options.length;
  for (var i = 0; i < n; i++) {
    if (options[i].value == key) { return options[i].label; }
  }

  return 'Error';
};
