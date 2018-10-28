'use strict';

const fs = require('fs-extra');
const path = require('path');
const HashMap = require('hashmap');
const libQ = require('kew');
const libFast = require('fast.js');
const vconf = require('v-conf');

module.exports = MyVolumioPluginManager;

function MyVolumioPluginManager (ccommand, server) {
  var self = this;

  self.myVolumioPlugins = new HashMap();
  self.coreCommand = ccommand;
  self.logger = ccommand.logger;

  self.configManager = new (require(path.join(__dirname + '/configManager.js')))(self.logger);
}

MyVolumioPluginManager.prototype.startPlugins = function () {
  this.logger.info('-------------------------------------------');
  this.logger.info('-----    MyVolumio plugins startup     ----');
  this.logger.info('-------------------------------------------');

  this.loadMyVolumioPlugins();
  this.startMyVolumioPlugins();
};

MyVolumioPluginManager.prototype.getPackageJson = function (folder) {
  try {
    return fs.readJsonSync(folder + '/package.json');
  } catch (ex) {
    // XXX Do something here
  }
};

MyVolumioPluginManager.prototype.initializeConfiguration = function (packageJson, pluginInstance, folder) {
  var self = this;

  if (pluginInstance.getConfigurationFiles !== undefined) {
    var configFolder = self.configurationFolder + packageJson.volumio_info.plugin_type + '/' + packageJson.name + '/';

    var configurationFiles = pluginInstance.getConfigurationFiles();
    for (var i in configurationFiles) {
      var configurationFile = configurationFiles[i];

      var destConfigurationFile = configFolder + configurationFile;
      if (!fs.existsSync(destConfigurationFile)) {
        fs.copySync(folder + '/' + configurationFile, destConfigurationFile);
      } else {
        var requiredConfigParametersFile = folder + '/requiredConf.json';
        if (fs.existsSync(requiredConfigParametersFile)) {
          self.logger.info('Applying required configuration parameters for plugin ' + packageJson.name);
          self.checkRequiredConfigurationParameters(requiredConfigParametersFile, destConfigurationFile);
        }
      }
    }
  }
};

MyVolumioPluginManager.prototype.checkRequiredConfigurationParameters = function (requiredFile, configFile) {
  // loading config file
  var configJson = new (vconf)();
  configJson.loadFile(configFile);

  // loading required configuration parameters
  var requireConfig = fs.readJsonSync(requiredFile);

  for (var key in requireConfig) {
    configJson.set(key, requireConfig[key]);
  }

  configJson.save();
};

MyVolumioPluginManager.prototype.getPlugin = function (category, name) {
  var self = this;
  if (self.myVolumioPlugins.get(category + '.' + name)) {
    return self.myVolumioPlugins.get(category + '.' + name).instance;
  }
};

MyVolumioPluginManager.prototype.getPluginCategories = function () {
  var self = this;
  var categories = [];

  let values = self.myVolumioPlugins.values();
  for (var i in values) {
    var metadata = values[i];
    if (libFast.indexOf(categories, metadata.category) === -1) { categories.push(metadata.category); }
  }

  return categories;
};

MyVolumioPluginManager.prototype.getPluginNames = function (category) {
  var self = this;
  var names = [];

  let values = self.myVolumioPlugins.values();
  for (var i in values) {
    var metadata = values[i];
    if (metadata.category === category) { names.push(metadata.name); }
  }

  return names;
};

MyVolumioPluginManager.prototype.loadMyVolumioPlugins = function () {
  var self = this;
  var deferLoadList = [];
  var priorityArray = new HashMap();

  var myVolumioPaths = ['/myvolumio/plugins', '/data/myvolumio/plugins'];

  for (var ppaths in myVolumioPaths) {
    var folder = myVolumioPaths[ppaths];
    self.logger.info('Loading plugins from folder ' + folder);

    if (fs.existsSync(folder)) {
      var pluginsFolder = fs.readdirSync(folder);
      for (var i in pluginsFolder) {
        var groupfolder = folder + '/' + pluginsFolder[i];

        var stats = fs.statSync(groupfolder);
        if (stats.isDirectory()) {
          var folderContents = fs.readdirSync(groupfolder);
          for (var j in folderContents) {
            var subfolder = folderContents[j];

            // loading plugin package.json
            var pluginFolder = groupfolder + '/' + subfolder;

            var packageJson = self.getPackageJson(pluginFolder);
            if (packageJson !== undefined) {
              var bootPriority = packageJson.volumio_info.bootPriority;
              if (bootPriority === undefined) { bootPriority = 100; }

              var pluginArray = priorityArray.get(bootPriority);
              if (pluginArray === undefined) { pluginArray = []; }

              pluginArray.push(pluginFolder);
              priorityArray.set(bootPriority, pluginArray);
              if (packageJson.volumio_info.is_my_music_plugin) {
                self.addMyMusicPlugin(packageJson);
              }
            }
          }
        }
      }
    }
  }

  /*
    each plugin's onVolumioStart() is launched by priority order.
    Note: there is no resolution strategy: each plugin completes
    at it's own pace, and in whatever order.
    Should completion order matter, a new promise strategy should be
    implemented below (chain by boot-priority order, or else...)
    */
  priorityArray.forEach(function (pluginArray) {
    if (pluginArray !== undefined) {
      pluginArray.forEach(function (folder) {
        deferLoadList.push(self.loadMyVolumioPlugin(folder));
      });
    }
  });

  return libQ.all(deferLoadList);
};

MyVolumioPluginManager.prototype.loadMyVolumioPlugin = function (folder) {
  var self = this;
  var defer = libQ.defer();
  var packageJson = self.getPackageJson(folder);

  var category = packageJson.volumio_info.plugin_type;
  var name = packageJson.name;
  var key = category + '.' + name;

  self.logger.info('Loading plugin "' + name + '"...');

  var pluginInstance = null;
  var context = new (require(path.join(__dirname, '/pluginContext.js')))(self.coreCommand, self.websocketServer, self.configManager);
  context.setEnvVariable('category', category);
  context.setEnvVariable('name', name);

  try {
    pluginInstance = new (require(folder + '/' + packageJson.main))(context);
    self.initializeConfiguration(packageJson, pluginInstance, folder);
  } catch (e) {
    self.logger.error('!!!! WARNING !!!!');
    self.logger.error('The plugin ' + category + '/' + name + ' failed to load, setting it to stopped. Error: ' + e);
    self.logger.error('!!!! WARNING !!!!');
    self.coreCommand.pushToastMessage('error', name + ' Plugin', self.coreCommand.getI18nString('PLUGINS.PLUGIN_START_ERROR'));
    self.config.set(category + '.' + name + '.status', 'STOPPED');
  }

  var pluginData = {
    name: name,
    category: category,
    folder: folder,
    instance: pluginInstance
  };

  if (pluginInstance && pluginInstance.onVolumioStart !== undefined) {
    var myPromise = pluginInstance.onVolumioStart();

    if (Object.prototype.toString.call(myPromise) !== Object.prototype.toString.call(libQ.resolve())) {
      // Handle non-compliant onVolumioStart(): push an error message and disable plugin
      // self.coreCommand.pushToastMessage('error',name + " Plugin","This plugin has failing init routine. Please install updated version, or contact plugin developper");
      self.logger.error('ATTENTION!!!: Plugin ' + name + ' does not return adequate promise from onVolumioStart: please update!');
      myPromise = libQ.resolve(); // passing a fake promise to avoid crashes in new promise management
    }

    self.myVolumioPlugins.set(key, pluginData); // set in any case, so it can be started/stopped

    defer.resolve();
  } else {
    self.myVolumioPlugins.set(key, pluginData);
    defer.resolve();
  }

  return defer;
};

MyVolumioPluginManager.prototype.startMyVolumioPlugins = function () {
  var self = this;
  var deferStartList = [];

  /*
    each plugin's onStart() is launched following plugins.json order.
    Note: there is no resolution strategy: each plugin completes
    at it's own pace, and in whatever order.
    Should completion order matter, a new promise strategy should be
    implemented below (chain by start order, or else...)
    */

  self.myVolumioPlugins.forEach(function (value, key) {
    deferStartList.push(self.startMyVolumioPlugin(value.category, value.name));
  });

  return libQ.all(deferStartList);
};

MyVolumioPluginManager.prototype.startMyVolumioPlugin = function (category, name) {
  var self = this;
  var defer = libQ.defer();

  var plugin = self.getPlugin(category, name);

  if (plugin) {
    if (plugin.onStart !== undefined) {
      var myPromise = plugin.onStart();
      // self.config.set(category + '.' + name + '.status', "STARTED");

      if (Object.prototype.toString.call(myPromise) !== Object.prototype.toString.call(libQ.resolve())) {
        // Handle non-compliant onStart(): push an error message and disable plugin
        // self.coreCommand.pushToastMessage('error',name + " Plugin","This plugin has failing start routine. Please install updated version, or contact plugin developper");
        self.logger.error('Plugin ' + name + ' does not return adequate promise from onStart: please update!');
        myPromise = libQ.resolve(); // passing a fake promise to avoid crashes in new promise management
      }

      defer.resolve();
      return myPromise;
    } else {
      // self.config.set(category + '.' + name + '.status', "STARTED");
      defer.resolve();
    }
  } else defer.resolve();

  return defer.promise;
};

MyVolumioPluginManager.prototype.startMyVolumioPlugins = function () {
  var self = this;
  var deferStartList = [];

  this.myVolumioPlugins.forEach(function (value, key) {
    deferStartList.push(self.startMyVolumioPlugin(value.category, value.name));
  });

  return libQ.all(deferStartList);
};

MyVolumioPluginManager.prototype.stopMyVolumioPlugins = function () {
  var self = this;
  var deferStopList = [];

  self.myVolumioPlugins.forEach(function (value, key) {
    deferStopList.push(self.stopMyVolumioPlugin(value.category, value.name));
  });

  return libQ.all(deferStopList);
};
