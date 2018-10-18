'use strict';

var fs = require('fs-extra');
var HashMap = require('hashmap');
var libFast = require('fast.js');
var S = require('string');
var vconf = require('v-conf');
var libQ = require('kew');
var http = require('http');
var execSync = require('child_process').execSync;
var Tail = require('tail').Tail;
var compareVersions = require('compare-versions');

var arch = '';
var variant = '';
var device = '';

module.exports = PluginManager;

function PluginManager (ccommand, server) {
  var self = this;

  self.corePlugins = new HashMap();
  self.myMusicPlugins = [];

  fs.ensureDir('/data/plugins/', function (err) {
    if (err) {
      self.logger.info('ERROR: Cannot create /data/plugins directory');
    }
  });

  self.pluginPath = [__dirname + '/plugins/', '/data/plugins/'];

  self.config = new (require('v-conf'))();

  var pluginsDataFile = '/data/configuration/plugins.json';
  if (!fs.existsSync(pluginsDataFile)) {
    ccommand.logger.info('File /data/configuration/plugins.json does not exist. Copying from Volumio');
    fs.copySync(__dirname + '/plugins/plugins.json', pluginsDataFile);
  }

  self.config.loadFile(pluginsDataFile);

  self.coreCommand = ccommand;
  self.websocketServer = server;
  self.logger = ccommand.logger;

  self.configManager = new (require(__dirname + '/configManager.js'))(self.logger);

  self.configurationFolder = '/data/configuration/';

  var archraw = execSync('/usr/bin/dpkg --print-architecture', { encoding: 'utf8' });
  arch = archraw.replace(/(\r\n|\n|\r)/gm, '');

  var file = fs.readFileSync('/etc/os-release').toString().split('\n');
  for (var l in file) {
    if (file[l].match(/VOLUMIO_VARIANT/i)) {
      var str = file[l].split('=');
      variant = str[1].replace(/\"/gi, '');
      // TEMPORARY UNTIL MYVOLUMIO GETS MERGED
      if (variant === 'myvolumio') {
        variant = 'volumio';
      }
      process.env.WARNING_ON_PLUGIN_INSTALL = false;
      if (variant !== 'volumio') {
        process.env.WARNING_ON_PLUGIN_INSTALL = true;
      }
    }
    if (file[l].match(/VOLUMIO_HARDWARE/i)) {
      var str = file[l].split('=');
      var device = str[1].replace(/\"/gi, '');
    }
  }

  var myVolumioPMPath = '/myvolumio/app/myvolumio-pluginmanager';
  if (fs.existsSync(myVolumioPMPath)) {
    	this.logger.info('MYVOLUMIO Environment detected');
    self.myVolumioPluginManager = new (require(myVolumioPMPath))(self.coreCommand, self.websocketServer, self.configManager, self.config);
  }
}

PluginManager.prototype.startPlugins = function () {
  this.logger.info('-------------------------------------------');
  this.logger.info('-----      Core plugins startup        ----');
  this.logger.info('-------------------------------------------');

  this.loadCorePlugins();
  this.startCorePlugins();

  if (this.myVolumioPluginManager !== undefined) {
    this.myVolumioPluginManager.startPlugins();
  }
};

PluginManager.prototype.initializeConfiguration = function (package_json, pluginInstance, folder) {
  var self = this;

  if (pluginInstance.getConfigurationFiles != undefined) {
    var configFolder = self.configurationFolder + package_json.volumio_info.plugin_type + '/' + package_json.name + '/';

    var configurationFiles = pluginInstance.getConfigurationFiles();
    for (var i in configurationFiles) {
      var configurationFile = configurationFiles[i];

      var destConfigurationFile = configFolder + configurationFile;
      if (self.checkConfigFileEmpty(destConfigurationFile)) {
        try {
          fs.copySync(folder + '/' + configurationFile, destConfigurationFile);
        } catch (e) {
          self.logger.error('Could not copy default configuration to ' + destConfigurationFile);
        }
      } else {
        var requiredConfigParametersFile = folder + '/requiredConf.json';
        if (fs.existsSync(requiredConfigParametersFile)) {
          self.logger.info('Applying required configuration parameters for plugin ' + package_json.name);
          self.checkRequiredConfigurationParameters(requiredConfigParametersFile, destConfigurationFile);
        }
      }
    }
  }
};

PluginManager.prototype.loadCorePlugin = function (folder) {
  var self = this;
  var defer = libQ.defer();

  var package_json = self.getPackageJson(folder);

  var category = package_json.volumio_info.plugin_type;
  var name = package_json.name;

  var key = category + '.' + name;
  var configForPlugin = self.config.get(key + '.enabled');

  var shallStartup = configForPlugin != undefined && configForPlugin == true;
  if (shallStartup == true) {
    self.logger.info('Loading plugin \"' + name + '\"...');

    var pluginInstance = null;
    var context = new (require(__dirname + '/pluginContext.js'))(self.coreCommand, self.websocketServer, self.configManager);
    context.setEnvVariable('category', category);
    context.setEnvVariable('name', name);

    try {
      pluginInstance = new (require(folder + '/' + package_json.main))(context);
      self.initializeConfiguration(package_json, pluginInstance, folder);
    } catch (e) {
      self.logger.error('!!!! WARNING !!!!');
      self.logger.error('The plugin ' + category + '/' + name + ' failed to load, setting it to stopped. Error: ' + e);
      self.logger.error('Stack trace: ' + e.stack);
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

      if (Object.prototype.toString.call(myPromise) != Object.prototype.toString.call(libQ.resolve())) {
        // Handle non-compliant onVolumioStart(): push an error message and disable plugin
        // self.coreCommand.pushToastMessage('error',name + " Plugin","This plugin has failing init routine. Please install updated version, or contact plugin developper");
        self.logger.error('ATTENTION!!!: Plugin ' + name + ' does not return adequate promise from onVolumioStart: please update!');
        myPromise = libQ.resolve(); // passing a fake promise to avoid crashes in new promise management
      }

      self.corePlugins.set(key, pluginData); // set in any case, so it can be started/stopped

      defer.resolve();
      return myPromise;
    } else {
      self.corePlugins.set(key, pluginData);
      defer.resolve();
    }
  } else {
	 	self.logger.info('Plugin ' + name + ' is not enabled');
    defer.resolve();
  }

  return defer.promise;
};

PluginManager.prototype.loadCorePlugins = function () {
  var self = this;
  var defer_loadList = [];
  var priority_array = new HashMap();

  for (var ppaths in self.pluginPath) {
    var folder = self.pluginPath[ppaths];
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

            var package_json = self.getPackageJson(pluginFolder);
            if (package_json !== undefined) {
              var boot_priority = package_json.volumio_info.boot_priority;
              if (boot_priority == undefined) { boot_priority = 100; }

              var plugin_array = priority_array.get(boot_priority);
              if (plugin_array == undefined) { plugin_array = []; }

              plugin_array.push(pluginFolder);
              priority_array.set(boot_priority, plugin_array);

              if (package_json.volumio_info.is_my_music_plugin) {
                self.addMyMusicPlugin(package_json);
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
  priority_array.forEach(function (plugin_array) {
    if (plugin_array != undefined) {
      plugin_array.forEach(function (folder) {
        defer_loadList.push(self.loadCorePlugin(folder));
      });
    }
  });

  return libQ.all(defer_loadList);
};

PluginManager.prototype.getPackageJson = function (folder) {
  var self = this;

  try {
    return fs.readJsonSync(folder + '/package.json');
  } catch (ex) {

  }
};

PluginManager.prototype.isEnabled = function (category, pluginName) {
  var self = this;

  return self.config.get(category + '.' + pluginName + '.enabled');
};

PluginManager.prototype.startCorePlugin = function (category, name) {
  var self = this;
  var defer = libQ.defer();

  var plugin = self.getPlugin(category, name);

  if (plugin) {
    if (plugin.onStart !== undefined) {
		    var myPromise = plugin.onStart();
      self.config.set(category + '.' + name + '.status', 'STARTED');

      if (Object.prototype.toString.call(myPromise) != Object.prototype.toString.call(libQ.resolve())) {
        // Handle non-compliant onStart(): push an error message and disable plugin
        self.coreCommand.pushToastMessage('error', name + ' Plugin', self.coreCommand.getI18nString('PLUGINS.PLUGIN_START_ERROR'));
        self.logger.error('Plugin ' + name + ' does not return adequate promise from onStart: please update!');
        myPromise = libQ.resolve(); // passing a fake promise to avoid crashes in new promise management
      }

      defer.resolve();
      return myPromise;
    } else {
      self.config.set(category + '.' + name + '.status', 'STARTED');
      defer.resolve();
    }
  } else defer.resolve();

  return defer.promise;
};

PluginManager.prototype.startPlugin = function (category, name) {
  var self = this;
  var defer = libQ.defer();

  var plugin = self.getPlugin(category, name);

  if (plugin) {
    if (plugin.onStart !== undefined) {
      self.logger.info('PLUGIN START: ' + name);
      var myPromise = plugin.onStart();
      self.config.set(category + '.' + name + '.status', 'STARTED');

      if (Object.prototype.toString.call(myPromise) != Object.prototype.toString.call(libQ.resolve())) {
        // Handle non-compliant onStart(): push an error message and disable plugin
        self.coreCommand.pushToastMessage('error', name + ' Plugin', self.coreCommand.getI18nString('PLUGINS.PLUGIN_START_ERROR'));
        self.logger.error('Plugin ' + name + ' does not return adequate promise from onStart: please update!');
        myPromise = libQ.resolve(); // passing a fake promise to avoid crashes in new promise management
      }

      defer.resolve();
      return myPromise;
    } else {
      self.config.set(category + '.' + name + '.status', 'STARTED');
      defer.resolve();
    }
  } else defer.resolve();

  return defer.promise;
};

PluginManager.prototype.stopPlugin = function (category, name) {
  var self = this;
  var defer = libQ.defer();

  var plugin = self.getPlugin(category, name);

  if (plugin) {
    if (plugin.onStop !== undefined) {
      var myPromise = plugin.onStop();
      self.config.set(category + '.' + name + '.status', 'STOPPED');

      if (Object.prototype.toString.call(myPromise) != Object.prototype.toString.call(libQ.resolve())) {
        // Handle non-compliant onStop(): push an error message and disable plugin
        // self.coreCommand.pushToastMessage('error' , name + ' Plugin', self.coreCommand.getI18nString('PLUGINS.PLUGIN_START_ERROR'));
        self.logger.error('Plugin ' + name + ' does not return adequate promise from onStop: please update!');
        myPromise = libQ.resolve(); // passing a fake promise to avoid crashes in new promise management
      }

      defer.resolve();
      return myPromise;
    } else {
      self.config.set(category + '.' + name + '.status', 'STOPPED');
      defer.resolve();
    }
  } else defer.resolve();

  return defer.promise;
};

PluginManager.prototype.startCorePlugins = function () {
  var self = this;
  var defer_startList = [];

  self.logger.info('___________ START PLUGINS ___________');

  /*
    each plugin's onStart() is launched following plugins.json order.
	Note: there is no resolution strategy: each plugin completes
	at it's own pace, and in whatever order.
	Should completion order matter, a new promise strategy should be
	implemented below (chain by start order, or else...)
*/

  self.corePlugins.forEach(function (value, key) {
    defer_startList.push(self.startCorePlugin(value.category, value.name));
  });

  return libQ.all(defer_startList);
};

PluginManager.prototype.stopPlugins = function () {
  var self = this;
  var defer_stopList = [];

  self.logger.info('___________ STOP PLUGINS ___________');

  /*
    each plugin's onStop() is launched following plugins.json order.
	Note: there is no resolution strategy: each plugin completes
	at it's own pace, and in whatever order.
	Should completion order matter, a new promise strategy should be
	implemented below (chain by start order, or else...)
*/

  self.corePlugins.forEach(function (value, key) {
    defer_stopList.push(self.stopPlugin(value.category, value.name));
  });

  return libQ.all(defer_stopList);
};

PluginManager.prototype.getPluginCategories = function () {
  var self = this;

  var categories = [];

  var values = self.corePlugins.values();
  for (var i in values) {
    var metadata = values[i];
    if (libFast.indexOf(categories, metadata.category) == -1) { categories.push(metadata.category); }
  }
  if (self.myVolumioPluginManager !== undefined) {
    let myVolumioCategories = self.myVolumioPluginManager.getPluginCategories();
    categories.concat(myVolumioCategories);
  }

  return categories;
};

PluginManager.prototype.getPluginNames = function (category) {
  var self = this;

  var names = [];

  var values = self.corePlugins.values();
  for (var i in values) {
    var metadata = values[i];
    if (metadata.category == category) { names.push(metadata.name); }
  }

  if (self.myVolumioPluginManager !== undefined) {
    let myVolumioNames = self.myVolumioPluginManager.getPluginNames();
    names.concat(myVolumioNames);
  }

  return names;
};

/**
 * returns an array of plugin's names, given their category
 * @param category
 * @returns {Array}
 */
PluginManager.prototype.getAllPlugNames = function (category) {
  var self = this;

  var plugFile = fs.readJsonSync(('/data/configuration/plugins.json'), 'utf-8', {throws: false});
  var plugins = [];
  for (var i in plugFile) {
    if (i == category) {
      for (var j in plugFile[i]) {
        plugins.push(j);
      }
    }
  }
  return plugins;
};

/**
 * Returns an array of plugins with status, sorted by category
 * @returns {Array}
 */
PluginManager.prototype.getPluginsMatrix = function () {
  var self = this;

  // plugins = [{"cat": "", "plugs": []}]
  var plugins = [];
  var catNames = self.getPluginCategories();
  for (var i = 0; i < catNames.length; i++) {
    var cName = catNames[i];
    var plugNames = self.getAllPlugNames(catNames[i]);
    // catPlugin = [{"plug": "", "enabled": ""}]
    var catPlugin = [];
    for (var j = 0; j < plugNames.length; j++) {
      var name = plugNames[j];
      var enabled = self.isEnabled(catNames[i], plugNames[j]);
      catPlugin.push({name, enabled});
    }
    plugins.push({cName, catPlugin});
  }
  return plugins;
};

PluginManager.prototype.onVolumioShutdown = function () {
  var self = this;
  var defer_onShutdownList = [];

  self.logger.info('___________ PLUGINS: Run Shutdown Tasks ___________');

  /*
	each plugin's onVolumioShutdown() is launched following plugins.json order.
	Note: there is no resolution strategy: each plugin completes
	at it's own pace, and in whatever order.
	Should completion order matter, a new promise strategy should be
	implemented below (chain by start order, or else...)
*/

  self.corePlugins.forEach(function (value, key) {
    if (self.isEnabled(value.category, value.name)) {
      var plugin_defer = self.onVolumioShutdownPlugin(value.category, value.name);
      defer_onShutdownList.push(plugin_defer);
    }
  });

  return libQ.all(defer_onShutdownList);
};

PluginManager.prototype.onVolumioShutdownPlugin = function (category, name) {
  var self = this;
  var defer = libQ.defer();

  var plugin = self.getPlugin(category, name);

  if (plugin) {
    if (plugin.onVolumioShutdown !== undefined) {
      self.logger.info('PLUGIN onShutdown : ' + name);
      var myPromise = plugin.onVolumioShutdown();

      if (Object.prototype.toString.call(myPromise) != Object.prototype.toString.call(libQ.resolve())) {
        // Handle non-compliant onVolumioShutdown(): push an error message
        // self.coreCommand.pushToastMessage('error' , name + ' Plugin', self.coreCommand.getI18nString('PLUGINS.PLUGIN_START_ERROR'));
        self.logger.error('Plugin ' + name + ' does not return adequate promise from onVolumioShutdown: please update!');
        myPromise = libQ.resolve(); // passing a fake promise to avoid crashes in new promise management
      }

      return myPromise;
    }
  }

  return defer.resolve();
};

PluginManager.prototype.onVolumioReboot = function () {
  var self = this;
  var defer_onRebootList = [];
  self.logger.info('___________ PLUGINS: Run onVolumioReboot Tasks ___________');
  /*
	each plugin's onVolumioReboot() is launched following plugins.json order.
	Note: there is no resolution strategy: each plugin completes
	at it's own pace, and in whatever order.
	Should completion order matter, a new promise strategy should be
	implemented below (chain by start order, or else...)
*/

  self.corePlugins.forEach(function (value, key) {
    if (self.isEnabled(value.category, value.name)) {
      var plugin_defer = self.onVolumioRebootPlugin(value.category, value.name);
      defer_onRebootList.push(plugin_defer);
    }
  });

  return libQ.all(defer_onRebootList);
};

PluginManager.prototype.onVolumioRebootPlugin = function (category, name) {
  var self = this;
  var defer = libQ.defer();
  var plugin = self.getPlugin(category, name);

  if (plugin) {
    if (plugin.onVolumioReboot !== undefined) {
      self.logger.info('PLUGIN onReboot : ' + name);
      var myPromise = plugin.onVolumioReboot();
      if (Object.prototype.toString.call(myPromise) != Object.prototype.toString.call(libQ.resolve())) {
        // Handle non-compliant onVolumioReboot(): push an error message
        // self.coreCommand.pushToastMessage('error' , name + ' Plugin', self.coreCommand.getI18nString('PLUGINS.PLUGIN_START_ERROR'));
        self.logger.error('Plugin ' + name + ' does not return adequate promise from onVolumioReboot: please update!');
        myPromise = libQ.resolve(); // passing a fake promise to avoid crashes in new promise management
      }

      return myPromise;
    }
  }
  return defer.resolve();
};

PluginManager.prototype.getPlugin = function (category, name) {
  var self = this;
  if (self.corePlugins.get(category + '.' + name)) {
    return self.corePlugins.get(category + '.' + name).instance;
  } else if (self.myVolumioPluginManager !== undefined) {
    return self.myVolumioPluginManager.getPlugin(category, name);
  } else {
    self.logger.error('Could not retrieve plugin ' + category + ' ' + name);
  }
};

/**
 * Returns path for a specific configuration file for a plugin (identified by its context)
 * @param context
 * @param fileName
 * @returns {string}
 */
PluginManager.prototype.getConfigurationFile = function (context, fileName) {
  var self = this;
  return S(self.configurationFolder).ensureRight('/').s +
		S(context.getEnvVariable('category')).ensureRight('/').s +
		S(context.getEnvVariable('name')).ensureRight('/').s +
		fileName;
};

PluginManager.prototype.checkRequiredConfigurationParameters = function (requiredFile, configFile) {
  var self = this;

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

PluginManager.prototype.installPlugin = function (url) {
  var self = this;
  var defer = libQ.defer();
  var modaltitle = self.coreCommand.getI18nString('PLUGINS.INSTALLING_PLUGIN');
  var advancedlog = '';
  var ended = false;
  var downloadCommand;

  var currentMessage = 'Downloading plugin at ' + url;

  var droppedFile = url.replace('http://127.0.0.1:3000/plugin-serve/', '');
  self.logger.info(currentMessage);
  advancedlog = currentMessage;

  if (droppedFile == url) {
    downloadCommand = "/usr/bin/wget -O /tmp/downloaded_plugin.zip '" + url + "'";
  } else {
    downloadCommand = '/bin/mv /tmp/plugins/' + droppedFile + ' /tmp/downloaded_plugin.zip';
  }

  self.pushMessage('installPluginStatus', {'progress': 10, 'message': self.coreCommand.getI18nString('PLUGINS.DOWNLOADING_PLUGIN'), 'title': modaltitle, 'advancedLog': advancedlog});

  exec(downloadCommand, function (error, stdout, stderr) {
    if (error !== null) {
      currentMessage = 'Cannot download file ' + url + ' - ' + error;
      self.logger.info(currentMessage);
      advancedlog = advancedlog + '<br>' + currentMessage;
      defer.reject(new Error(error));
    } else {
      currentMessage = 'END DOWNLOAD: ' + url;
      self.rmDir('/tmp/plugins');
      advancedlog = advancedlog + '<br>' + currentMessage;
      self.logger.info(currentMessage);
      currentMessage = self.coreCommand.getI18nString('PLUGINS.CREATING_INSTALL_LOCATION');
      advancedlog = advancedlog + '<br>' + currentMessage;

      var pluginFolder = '/data/temp/downloaded_plugin';

      self.createFolder(pluginFolder)
        .then(self.pushMessage.bind(self, 'installPluginStatus', {
          'progress': 30,
          'message': currentMessage,
          'title': modaltitle,
          'advancedLog': advancedlog
        }))
        .then(self.unzipPackage.bind(self))
        .then(function (e) {
          currentMessage = self.coreCommand.getI18nString('PLUGINS.UNPACKING_PLUGIN');
          advancedlog = advancedlog + '<br>' + currentMessage;
          self.pushMessage('installPluginStatus', {'progress': 40, 'message': currentMessage, 'title': modaltitle, 'advancedLog': advancedlog});
          return e;
        })
        .then(self.checkPluginDoesntExist.bind(self))
        .then(function (e) {
          currentMessage = self.coreCommand.getI18nString('PLUGINS.CHECKING_DUPLICATE_PLUGIN');
          advancedlog = advancedlog + '<br>' + currentMessage;
          self.pushMessage('installPluginStatus', {'progress': 50, 'message': currentMessage, 'title': modaltitle, 'advancedLog': advancedlog});
          return e;
        })
        .then(self.renameFolder.bind(self))
        .then(function (e) {
          currentMessage = self.coreCommand.getI18nString('PLUGINS.COPYING_PLUGIN_TO_LOCATION');
          advancedlog = advancedlog + '<br>' + currentMessage;
          self.pushMessage('installPluginStatus', {'progress': 60, 'message': currentMessage, 'title': modaltitle, 'advancedLog': advancedlog});
          return e;
        })
        .then(self.moveToCategory.bind(self))
        .then(function (e) {
          currentMessage = self.coreCommand.getI18nString('PLUGINS.INSTALLING_NECESSARY_UTILITIES');
          advancedlog = advancedlog + '<br>' + currentMessage;
          self.pushMessage('installPluginStatus', {'progress': 70, 'message': currentMessage, 'title': modaltitle, 'advancedLog': advancedlog});
          var logfile = '/tmp/installog';

          fs.ensureFile(logfile, function (err) {
            var tail = new Tail(logfile);

            tail.on('line', function (data) {
              if (data == 'plugininstallend') {
                console.log('Plugin install end detected on script');
                ended = true;
                tail.unwatch();
                ended = true;
              } else {
                self.logger.info(data);
                if (ended === false) {
                  advancedlog = advancedlog + '<br>' + data;
                  self.pushMessage('installPluginStatus', {'progress': 70, 'message': currentMessage, 'title': modaltitle, 'advancedLog': advancedlog});
                }
              }
            });
          });
          return e;
        })
        .then(self.executeInstallationScript.bind(self))
        .then(function (e) {
          currentMessage = self.coreCommand.getI18nString('PLUGINS.FINALIZING_INSTALLATION');
          advancedlog = advancedlog + '<br>' + currentMessage;
          self.pushMessage('installPluginStatus', {'progress': 90, 'message': currentMessage, 'title': modaltitle, 'advancedLog': advancedlog});
          return e;
        })
        .then(self.addPluginToConfig.bind(self))
        .then(function (folder) {
          advancedlog = advancedlog + '<br>' + currentMessage;
          var package_json = self.getPackageJson(folder);
          var category = package_json.volumio_info.plugin_type;
          var name = package_json.name;
          if (package_json.volumio_info && package_json.volumio_info.prettyName) {
            var name = package_json.volumio_info.prettyName;
          }
          currentMessage = name + ' ' + self.coreCommand.getI18nString('PLUGINS.SUCCESSFULLY_INSTALLED') + ', ' + self.coreCommand.getI18nString('PLUGINS.ENABLE_PLUGIN_NOW_QUESTION');
          var enablePayload = {'name': package_json.name, 'category': category, 'action': 'enable'};
          var buttons = [{'name': self.coreCommand.getI18nString('COMMON.CLOSE'), 'class': 'btn btn-warning'}, {'name': self.coreCommand.getI18nString('PLUGINS.ENABLE_PLUGIN'), 'class': 'btn btn-info', 'emit': 'pluginManager', 'payload': enablePayload}];
          self.pushMessage('installPluginStatus', {'progress': 100, 'message': currentMessage, 'title': self.coreCommand.getI18nString('PLUGINS.SUCCESSFULLY_INSTALLED'), 'advancedLog': advancedlog, 'buttons': buttons});
          return folder;
        })
        .then(function () {
          self.logger.info('Done installing plugin.');
          defer.resolve();
          self.tempCleanup();
        })
        .fail(function (e) {
          currentMessage = self.coreCommand.getI18nString('PLUGINS.PLUGIN_INSTALL_ERROR_OCCURRED') + ' ' + e;
          advancedlog = advancedlog + '<br>' + currentMessage;
          self.pushMessage('installPluginStatus', {
            'progress': 0,
            'message': currentMessage,
            'title': modaltitle + ' ' + self.coreCommand.getI18nString('COMMON.ERROR'),
            'buttons': [{'name': self.coreCommand.getI18nString('COMMON.CLOSE'), 'class': 'btn btn-warning'}],
            'advancedLog': advancedlog
          });

          defer.reject(new Error());
          self.rollbackInstall();
        });
    }
  });

  return defer.promise;
};

PluginManager.prototype.updatePlugin = function (data) {
  var self = this;
  var defer = libQ.defer();
  var modaltitle = self.coreCommand.getI18nString('PLUGINS.UPDATING_PLUGIN');
  var advancedlog = '';
  var url = data.url;
  var category = data.category;
  var name = data.name;
  var downloadCommand;

  var currentMessage = 'Downloading plugin at ' + url;
  var droppedFile = url.replace('http://127.0.0.1:3000/plugin-serve/', '');
  self.logger.info(currentMessage);
  advancedlog = currentMessage;

  if (droppedFile == url) {
    downloadCommand = "/usr/bin/wget -O /tmp/downloaded_plugin.zip '" + url + "'";
  } else {
    downloadCommand = '/bin/mv /tmp/plugins/' + droppedFile + ' /tmp/downloaded_plugin.zip';
  }

  self.pushMessage('installPluginStatus', {'progress': 10, 'message': self.coreCommand.getI18nString('PLUGINS.DOWNLOADING_PLUGIN'), 'title': modaltitle, 'advancedLog': advancedlog});

  exec(downloadCommand, function (error, stdout, stderr) {
    if (error !== null) {
      currentMessage = 'Cannot download file ' + url + ' - ' + error;
      self.logger.info(currentMessage);
      advancedlog = advancedlog + '<br>' + currentMessage;
      defer.reject(new Error(error));
    } else {
      currentMessage = 'END DOWNLOAD: ' + url;
      advancedlog = advancedlog + '<br>' + currentMessage;
      self.logger.info(currentMessage);
      currentMessage = self.coreCommand.getI18nString('PLUGINS.CREATING_INSTALL_LOCATION');
      advancedlog = advancedlog + '<br>' + currentMessage;

      var pluginFolder = '/data/temp/downloaded_plugin';
      self.createFolder(pluginFolder);

      self.stopPlugin(category, name)
        .then(function (e) {
          self.pushMessage('installPluginStatus', {'progress': 20, 'message': self.coreCommand.getI18nString('PLUGINS.PLUGIN_STOPPED'), 'title': modaltitle});
          return e;
        })
        .then(self.pushMessage.bind(self, 'installPluginStatus', {
          'progress': 30,
          'message': currentMessage,
          'title': modaltitle,
          'advancedLog': advancedlog
        }))
        .then(self.unzipPackage.bind(self))
        .then(function (e) {
          currentMessage = self.coreCommand.getI18nString('PLUGINS.UNPACKING_PLUGIN');
          advancedlog = advancedlog + '<br>' + currentMessage;
          self.pushMessage('installPluginStatus', {'progress': 40, 'message': currentMessage, 'title': modaltitle, 'advancedLog': advancedlog});
          return e;
        })
        .then(self.renameFolder.bind(self))
        .then(function (e) {
          currentMessage = self.coreCommand.getI18nString('PLUGINS.UPDATING_PLUGIN_FILES');
          advancedlog = advancedlog + '<br>' + currentMessage;
          self.pushMessage('installPluginStatus', {'progress': 60, 'message': currentMessage, 'title': modaltitle, 'advancedLog': advancedlog});
          return e;
        })
        .then(self.moveToCategory.bind(self))
        .then(function (e) {
          currentMessage = self.coreCommand.getI18nString('PLUGINS.INSTALLING_NECESSARY_UTILITIES');
          advancedlog = advancedlog + '<br>' + currentMessage;
          self.pushMessage('installPluginStatus', {'progress': 70, 'message': currentMessage, 'title': modaltitle, 'advancedLog': advancedlog});
          var logfile = '/tmp/installog';

          fs.ensureFile(logfile, function (err) {
            var tail = new Tail(logfile);

            tail.on('line', function (data) {
              if (data == 'plugininstallend') {
                console.log('Plugin install end detected on script');
                tail.unwatch();
              } else {
                self.logger.info(data);
                advancedlog = advancedlog + '<br>' + data;
                self.pushMessage('installPluginStatus', {'progress': 70, 'message': currentMessage, 'title': modaltitle, 'advancedLog': advancedlog});
              }
            });
          });
          return e;
        })
        .then(self.executeInstallationScript.bind(self))
        .then(function (e) {
          currentMessage = self.coreCommand.getI18nString('PLUGINS.FINALIZING_INSTALLATION');
          advancedlog = advancedlog + '<br>' + currentMessage;
          self.pushMessage('installPluginStatus', {'progress': 90, 'message': currentMessage, 'title': modaltitle, 'advancedLog': advancedlog});
          return e;
        })
        .then(function (folder) {
          currentMessage = self.coreCommand.getI18nString('PLUGINS.SUCCESSFULLY_UPDATED_PLUGIN');
          advancedlog = advancedlog + '<br>' + currentMessage;

          var package_json = self.getPackageJson(folder);
          var name = package_json.name;
          var category = package_json.volumio_info.plugin_type;

          self.pushMessage('installPluginStatus', {'progress': 100, 'message': currentMessage, 'title': self.coreCommand.getI18nString('PLUGINS.PLUGIN_UPDATE_COMPLETED'), 'advancedLog': advancedlog, 'buttons': [{'name': self.coreCommand.getI18nString('COMMON.CLOSE'), 'class': 'btn btn-warning'}]});
          return folder;
        })
        .then(function () {
          self.logger.info('Done installing plugin.');
          defer.resolve();
          self.tempCleanup();
          self.enablePlugin(category, name);
        })
        .fail(function (e) {
          currentMessage = self.coreCommand.getI18nString('PLUGINS.PLUGIN_UPDATE_ERROR_OCCURRED') + ' ' + e;
          advancedlog = advancedlog + '<br>' + currentMessage;
          self.pushMessage('installPluginStatus', {
            'progress': 0,
            'message': currentMessage,
            'title': self.coreCommand.getI18nString('PLUGINS.PLUGIN_UPDATE_FAILED'),
            'buttons': [{'name': self.coreCommand.getI18nString('COMMON.CLOSE'), 'class': 'btn btn-warning'}],
            'advancedLog': advancedlog
          });

          defer.reject(new Error());
          self.rollbackInstall();
        });
    }
  });

  return defer.promise;
};

PluginManager.prototype.notifyInstalledPlugins = function () {
  var self = this;

  var defer = libQ.defer();

  var installedplugins = self.getInstalledPlugins();
  defer.resolve();

  self.pushMessage('pushInstalledPlugins', installedplugins);

  return defer.promise;
};

PluginManager.prototype.rmDir = function (folder) {
  var self = this;

  var defer = libQ.defer();
  fs.remove(folder, function (err) {
    if (err) defer.reject(new Error('Cannot delete folder ' + folder));

    self.logger.info('Folder ' + folder + ' removed');
    defer.resolve(folder);
  });

  return defer.promise;
};

PluginManager.prototype.tempCleanup = function () {
  var self = this;

  self.rmDir('/data/temp');
  self.rmDir('/tmp/plugins');
  self.rmDir('/tmp/downloaded_plugin.zip');
};

PluginManager.prototype.createFolder = function (folder) {
  var self = this;
  var defer = libQ.defer();

  fs.mkdirs(folder, function (err) {
    if (err) defer.reject(new Error('Error creating folder: ' + err));
    else {
      defer.resolve(folder);
    }
  });

  return defer.promise;
};

PluginManager.prototype.unzipPackage = function () {
  var self = this;
  var defer = libQ.defer();
  var extractFolder = '/data/temp/downloaded_plugin';

  try {
    fs.ensureDirSync(extractFolder);
  } catch (e) {

  }

  exec('/usr/bin/miniunzip -o /tmp/downloaded_plugin.zip -d ' + extractFolder, {maxBuffer: 816000}, function (error) {
    if (error !== null) {
      defer.reject(new Error('Error unzipping plugin: ' + error));
    } else {
      defer.resolve(extractFolder);
    }

    self.rmDir('/tmp/downloaded_plugin.zip');
  });

  return defer.promise;
};

PluginManager.prototype.renameFolder = function (folder) {
  var self = this;
  var defer = libQ.defer();

  self.logger.info('Rename folder');

  var package_json = self.getPackageJson(folder);
  var name = package_json.name;

  var newFolderName = self.pluginPath[1] + name;

  exec('/bin/mv ' + folder + ' ' + newFolderName, function (error, stdout, stderr) {
    if (error !== null) {
      self.logger.error('Error renaming plugin folder: ' + error);
      defer.reject(error);
    } else {
      defer.resolve(newFolderName);
    }
  });

  return defer.promise;
};

PluginManager.prototype.moveToCategory = function (folder) {
  var self = this;
  var defer = libQ.defer();

  self.logger.info('Move to category');

  var package_json = self.getPackageJson(folder);
  var name = package_json.name;
  var category = package_json.volumio_info.plugin_type;

  var newFolderName = self.pluginPath[1] + category;

  fs.remove(newFolderName + '/' + name, function () {
    self.createFolder(newFolderName)
      .then(exec('/bin/mv ' + folder + ' ' + newFolderName, function (error, stdout, stderr) {
        if (error !== null) {
          self.logger.error('Error moving plugin folder: ' + error);
          defer.reject(error);
        } else {
          execSync('/bin/sync', { uid: 1000, gid: 1000, encoding: 'utf8' });
          defer.resolve(newFolderName + '/' + name);
        }
      }));
  });

  return defer.promise;
};

PluginManager.prototype.addPluginToConfig = function (folder) {
  var self = this;
  var defer = libQ.defer();

  self.logger.info('Adding reference to registry');

  var package_json = self.getPackageJson(folder);

  var name = package_json.name;
  var category = package_json.volumio_info.plugin_type;

  var key = category + '.' + name;
  self.config.addConfigValue(key + '.enabled', 'boolean', false);
  self.config.addConfigValue(key + '.status', 'string', 'STOPPED');

  defer.resolve(folder);
  return defer.promise;
};

PluginManager.prototype.executeInstallationScript = function (folder) {
  var self = this;
  var defer = libQ.defer();

  self.logger.info('Checking if install.sh is present');
  var installScript = folder + '/install.sh';
  fs.stat(installScript, function (err, stat) {
    if (err) {
      self.logger.info('Check return the error ' + err);
      defer.reject(new Error());
    } else {
      self.logger.info('Executing install.sh');
      if (!fs.accessSync(installScript, fs.constants.X_OK)) {
        self.logger.warn('Plugin script is not executable');
        execSync(`chmod +x ${installScript}`);
      }
      exec('echo volumio | sudo -S ' + installScript + ' > /tmp/installog', {uid: 1000, gid: 1000, maxBuffer: 2024000}, function (error, stdout, stderr) {
        if (error !== undefined && error !== null) {
          self.logger.info('Install script return the error ' + error);
          defer.reject(new Error());
        } else {
          self.logger.info('Install script completed');
          defer.resolve(folder);
        }
      });
    }
  });
  return defer.promise;
};

PluginManager.prototype.executeUninstallationScript = function (category, name) {
  var self = this;
  var defer = libQ.defer();

  self.logger.info('Checking if uninstall.sh is present');
  var installScript = '/data/plugins/' + category + '/' + name + '/uninstall.sh';
  fs.stat(installScript, function (err, stat) {
    if (err) {
      self.logger.info('Check return the error ' + err);
      defer.reject(new Error());
    } else {
      self.logger.info('Executing uninstall.sh');
      if (!fs.accessSync(installScript, fs.constants.X_OK)) {
        self.logger.warn('Plugin script is not executable');
        execSync(`chmod +x ${installScript}`);
      }
      exec('echo volumio | sudo -S ' + installScript + ' > /tmp/installog', {uid: 1000, gid: 1000, maxBuffer: 2024000}, function (error, stdout, stderr) {
        if (error !== undefined && error !== null) {
          self.logger.info('Uninstall script return the error ' + error);
          defer.reject(new Error());
        } else {
          self.logger.info('Uninstall script completed');
          defer.resolve('');
        }
      });
    }
  });
  return defer.promise;
};

PluginManager.prototype.rollbackInstall = function (folder) {
  var self = this;
  var defer = libQ.defer();

  self.logger.info('An error occurred installing the plugin. Rolling back config');

  self.pluginFolderCleanup();
  self.tempCleanup();

  return defer.promise;
};

// This method uses synchronous methods only in order to block the whole volumio and don't let it access plugins methods
// this in order to avoid "multithreading" issues. Returning a promise just in case the method would be used in a promise chain
PluginManager.prototype.pluginFolderCleanup = function (cleanup) {
  var self = this;
  var defer = libQ.defer();

  self.logger.info('Plugin folders cleanup');
  // scanning folders for non installed plugins
  for (var i in self.pluginPath) {
    self.logger.info('Scanning into folder ' + self.pluginPath[i]);
    var categories = fs.readdirSync(self.pluginPath[i]);

    for (var j in categories) {
      var catFile = self.pluginPath[i] + '/' + categories[j];
      self.logger.info('Scanning category ' + categories[j]);

      if (fs.statSync(catFile).isDirectory()) {
        var plugins = fs.readdirSync(catFile);

        for (var k in plugins) {
          var pluginName = plugins[k];
          var pluginFile = catFile + '/' + pluginName;

          if (fs.statSync(pluginFile).isDirectory()) {
            if (self.config.has(categories[j] + '.' + pluginName)) {
              self.logger.debug('Plugin ' + pluginName + ' found. Leaving it untouched.');
            } else {
              // Removed because it caused plugins deletion on new plugins addition
              // self.logger.info("Plugin "+pluginName+" found in folder but missing in configuration. Not Starting it.");
              // fs.removeSync(self.pluginPath[i]+'/'+categories[j]+'/'+pluginName);
              if (cleanup !== undefined && cleanup === true) {
                // If we uninstall the plugin, cleanup the directory
                self.logger.info('Cleaning folder for ' + pluginName);
                fs.removeSync(self.pluginPath[i] + '/' + categories[j] + '/' + pluginName);
              }
            }
          } else {
            self.logger.info('Removing ' + pluginFile);
            fs.removeSync(pluginFile);
          }
        }

        if (plugins.length == 0) {
          fs.removeSync(catFile);
        }
      } else {
        if (categories[j] !== 'plugins.json') {
          self.logger.info('Removing ' + catFile);
          fs.removeSync(catFile);
        }
      }
    }
  }

  self.logger.info('Plugin folders cleanup completed');
  defer.resolve();
  return defer.promise;
};

PluginManager.prototype.unInstallPlugin = function (category, name) {
  var self = this;
  var defer = libQ.defer();

  var key = category + '.' + name;
  var modaltitle = self.coreCommand.getI18nString('PLUGINS.UNINSTALLING_PLUGIN') + ' ' + name;
  if (self.config.has(key)) {
    self.logger.info('Uninstalling plugin ' + name);
    self.stopPlugin(category, name)
      .then(function (e) {
        self.pushMessage('installPluginStatus', {'progress': 30, 'message': self.coreCommand.getI18nString('PLUGINS.PLUGIN_STOPPED'), 'title': modaltitle});
        return e;
      })
      .then(self.disablePlugin.bind(self, category, name))
      .then(function (e) {
        self.pushMessage('installPluginStatus', {'progress': 60, 'message': self.coreCommand.getI18nString('PLUGINS.PLUGIN_DISABLED'), 'title': modaltitle});
        return e;
      })
      .then(self.executeUninstallationScript.bind(self, category, name))
      .then(function (e) {
        self.pushMessage('installPluginStatus', {'progress': 70, 'message': self.coreCommand.getI18nString('PLUGINS.REMOVING_NECESSARY_UTILITIES'), 'title': modaltitle});
        return e;
      })
      .then(self.removePluginFromConfiguration.bind(self, category, name))
      .then(function (e) {
        self.pushMessage('installPluginStatus', {'progress': 90, 'message': self.coreCommand.getI18nString('PLUGINS.FINALIZING_UNINSTALL'), 'title': modaltitle});
        return e;
      })
      .then(self.pluginFolderCleanup.bind(self, true))
      .then(function (e) {
        self.pushMessage('installPluginStatus', {'progress': 100, 'message': self.coreCommand.getI18nString('PLUGINS.PLUGIN_UNINSTALLED'), 'title': modaltitle, 'buttons': [{'name': self.coreCommand.getI18nString('COMMON.CLOSE'), 'class': 'btn btn-warning'}]});
        return e;
      })
      .then(function (e) {
        defer.resolve();
      })
      .fail(function (e) {
        self.pushMessage('installPluginStatus', {'progress': 100, 'message': self.coreCommand.getI18nString('PLUGINS.PLUGIN_UNINSTALL_ERROR_OCCURRED') + ': ' + e, 'title': self.coreCommand.getI18nString('PLUGINS.PLUGIN_UNINSTALL_FAILED'), 'buttons': [{'name': self.coreCommand.getI18nString('COMMON.CLOSE'), 'class': 'btn btn-warning'}]});
        defer.reject(new Error());
      });
  } else defer.reject(new Error("Plugin doesn't exist"));

  return defer.promise;
};

PluginManager.prototype.disablePlugin = function (category, name) {
  var self = this;
  var defer = libQ.defer();

  self.logger.info('Disabling plugin ' + name);

  var key = category + '.' + name;
  self.config.set(key + '.enabled', false);

  defer.resolve();
  return defer.promise;
};

PluginManager.prototype.enablePlugin = function (category, name) {
  var self = this;
  var defer = libQ.defer();

  self.logger.info('Enabling plugin ' + name);

  var key = category + '.' + name;
  self.config.set(key + '.enabled', true);

  defer.resolve();
  return defer.promise;
};

PluginManager.prototype.removePluginFromConfiguration = function (category, name) {
  var self = this;
  var defer = libQ.defer();

  self.logger.info('Removing plugin ' + name + ' from configuration');

  var key = category + '.' + name;
  self.config.delete(key);

  self.corePlugins.remove(key);

  try {
    execSync('/bin/rm -rf /data/configuration/' + category + '/' + name, { uid: 1000, gid: 1000, encoding: 'utf8' });
    execSync('/bin/sync', { uid: 1000, gid: 1000, encoding: 'utf8' });
    self.logger.info('Successfully removed ' + name + ' configuration files');
  } catch (e) {
    self.logger.error('Cannot remove ' + name + ' configuration files');
  }

  defer.resolve();
  return defer.promise;
};

PluginManager.prototype.modifyPluginStatus = function (category, name, status) {
  var self = this;
  var defer = libQ.defer();

  var key = category + '.' + name;
  var isEnabled = self.config.get(key + '.enabled');

  if (isEnabled == false) { defer.reject(new Error()); } else {
    self.logger.info('Changing plugin ' + name + ' status to ' + status);

    var keyStatus = key + '.status';

    var currentStatus = self.config.get(keyStatus);
    if (currentStatus === 'STARTED') {
      if (status === 'START') {
        defer.resolve();
      } else if (status === 'STOP') {
        self.stopPlugin(category, name)
          .then(function () {
            defer.resolve();
          })
          .fail(function () {
            defer.reject(new Error());
          });
      }
    } else if (currentStatus === 'STOPPED') {
      if (status === 'START') {
        self.startPlugin(category, name)
          .then(function () {
            defer.resolve();
          })
          .fail(function () {
            defer.reject(new Error());
          });
      } else if (status === 'STOP') {
        defer.resolve();
      }
    }
  }

  return defer.promise;
};

/*
 { , buttons[{name:nome bottone, emit:emit, payload:payload emit},{name:nome2, emit:emit2,payload:payload2}]}
 */
PluginManager.prototype.pushMessage = function (emit, payload) {
  var self = this;
  var defer = libQ.defer();

  self.coreCommand.broadcastMessage(emit, payload);

  defer.resolve();
  return defer.promise;
};

PluginManager.prototype.checkPluginDoesntExist = function (folder) {
  var self = this;
  var defer = libQ.defer();

  self.logger.info('Checking if plugin already exists');

  var package_json = self.getPackageJson(folder);
  var name = package_json.name;
  var category = package_json.volumio_info.plugin_type;

  var key = category + '.' + name;

  if (self.config.has(key)) { defer.reject(new Error('Plugin ' + name + ' already exists')); } else defer.resolve(folder);

  return defer.promise;
};

PluginManager.prototype.getInstalledPlugins = function () {
  var self = this;
  var defer = libQ.defer();

  var response = [];

  for (var i = 1; i < this.pluginPath.length; i++) {
    var folder = self.pluginPath[i];

    if (fs.existsSync(folder)) {
      var pluginsFolder = fs.readdirSync(folder);

      for (var k in pluginsFolder) {
        var groupfolder = folder + '/' + pluginsFolder[k];

        var stats = fs.statSync(groupfolder);
        if (stats.isDirectory()) {
          var folderContents = fs.readdirSync(groupfolder);
          for (var j in folderContents) {
            var subfolder = folderContents[j];

            // loading plugin package.json
            var pluginFolder = groupfolder + '/' + subfolder;

            var package_json = self.getPackageJson(pluginFolder);
            if (package_json !== undefined) {
              var name = package_json.name;
              var category = package_json.volumio_info.plugin_type;
              var key = category + '.' + name;
              var version = package_json.version;
              var icon = 'fa fa-cube';
              if (package_json.volumio_info.icon) {
                icon = package_json.volumio_info.icon;
              }
              if (package_json.volumio_info.prettyName) {
                var prettyName = package_json.volumio_info.prettyName;
              } else {
                var prettyName = name;
              }

              response.push({
                prettyName: prettyName,
                name: name,
                category: category,
                version: version,
                icon: icon,
                enabled: self.config.get(key + '.enabled'),
                active: self.config.get(key + '.status') === 'STARTED'
              });
            }
          }
        }
      }
    }
  }
  defer.resolve(response);

  return defer.promise;
};

PluginManager.prototype.getAvailablePlugins = function () {
  var self = this;
  var defer = libQ.defer();
  var response = libQ.defer();

  var myplugins = [];
  var response = [];

  var url = 'http://plugins.volumio.org/plugins/' + variant + '/' + arch + '/plugins.json';
  var installed = self.getInstalledPlugins();

  if (installed != undefined) {
    installed.then(function (installedPlugins) {
      for (var e = 0; e < installedPlugins.length; e++) {
        var pluginpretty = {'prettyName': installedPlugins[e].prettyName, 'version': installedPlugins[e].version, 'category': installedPlugins[e].category};
        myplugins.push(pluginpretty);
      }
    });
  }

  http.get(url, function (res) {
    var body = '';
    if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
      // self.logger.info("Following Redirect to: " + res.headers.location);
      http.get(res.headers.location, function (res) {
        res.on('data', function (chunk) {
          body += chunk;
        });

        res.on('end', function () {
          try {
            var response = JSON.parse(body);
            pushAvailablePlugins(response);
          } catch (e) {
            self.logger.info('Error Parsing Plugins JSON');
          }
        });
      }).on('error', function (e) {
        self.logger.info('Cannot download Available plugins list: ' + e);
      });
    } else {
      res.on('data', function (chunk) {
        body += chunk;
      });

      res.on('end', function () {
        try {
          var response = JSON.parse(body);
          pushAvailablePlugins(response);
        } catch (e) {
          self.logger.info('Error Parsing Plugins JSON');
        }
      });
    }
  }).on('error', function (e) {
    self.logger.info('Cannot download Available plugins list: ' + e);
  });

  function pushAvailablePlugins (response) {
    for (var i = 0; i < response.categories.length; i++) {
      var plugins = response.categories[i].plugins;
      for (var a = 0; a < plugins.length; a++) {
        var availableName = plugins[a].prettyName;
        var availableVersion = plugins[a].version;
        var availableCategory = plugins[a].category;
        var thisPlugin = plugins[a];
        thisPlugin.installed = false;
        for (var c = 0; c < myplugins.length; c++) {
          if (myplugins[c].prettyName === availableName) {
            thisPlugin.installed = true;
            thisPlugin.category = myplugins[c].category;
            thisPlugin.version = myplugins[c].version;
            var v = compareVersions(availableVersion, myplugins[c].version);
            if (v === 1) {
              thisPlugin.updateAvailable = true;
            }
          }
        }
      }
    }
    defer.resolve(response);
  }

  return defer.promise;
};

PluginManager.prototype.getPluginDetails = function (data) {
  var self = this;
  var defer = libQ.defer();
  var responseData = '';

  var response = [];
  var url = 'http://plugins.volumio.org/plugins/' + variant + '/' + arch + '/plugins.json';

  var pluginCategory = data.category;
  var pluginName = data.name;

  http.get(url, function (res) {
    var body = '';
    if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
      self.logger.info('Following Redirect to: ' + res.headers.location);
      http.get(res.headers.location, function (res) {
        res.on('data', function (chunk) {
          body += chunk;
        });

        res.on('end', function () {
          try {
            var response = JSON.parse(body);
            searchDetails(response);
          } catch (e) {
            self.logger.info('Error Parsing Plugins JSON');
          }
        });
      }).on('error', function (e) {
        self.logger.info('Cannot download Available plugins list: ' + e);
      });
    } else {
      res.on('data', function (chunk) {
        body += chunk;
      });

      res.on('end', function () {
        try {
          var response = JSON.parse(body);
          searchDetails(response);
        } catch (e) {
          self.logger.info('Error Parsing Plugins JSON');
        }
      });
    }
  }).on('error', function (e) {
    self.logger.info('Cannot download Available plugins list: ' + e);
  });

  function searchDetails (response) {
    var self = this;
    for (var i = 0; i < response.categories.length; i++) {
      var category = response.categories[i];
      var categoryName = response.categories[i].name;
      if (categoryName == data.category) {
        for (var c = 0; c < category.plugins.length; c++) {
          var plugin = category.plugins[c];
          var name = category.plugins[c].name;
          var prettyname = category.plugins[c].prettyName;
          if (name == pluginName) {
            var details = 'No Details available for plugin ' + prettyname + '.';
            if (plugin.details) {
              var details = plugin.details;
            }
            pushDetails(details, prettyname);
          }
        }
      }
    }
  }

  function pushDetails (details, prettyname) {
    var responseData = {
      title: prettyname + ' Plugin',
      message: details,
      size: 'lg',
      buttons: [
        {
          name: self.coreCommand.getI18nString('COMMON.CLOSE'),
          class: 'btn btn-warning'
        }
      ]
    };
    defer.resolve(responseData);
  }

  return defer.promise;
};

PluginManager.prototype.enableAndStartPlugin = function (category, name) {
  var self = this;
  var defer = libQ.defer();

  self.enablePlugin(category, name)
    .then(function (e) {
      var folder = self.findPluginFolder(category, name);
      return self.loadCorePlugin(folder);
    })
    .then(self.startPlugin.bind(this, category, name))
    .then(function (e) {
      self.logger.info('Done.');
      defer.resolve('ok');
    })
    .fail(function (e) {
      self.logger.info('Error: ' + e);
      defer.reject(new Error());
    });

  return defer.promise;
};

PluginManager.prototype.disableAndStopPlugin = function (category, name) {
  var self = this;
  var defer = libQ.defer();

  self.stopPlugin(category, name)
    .then(self.disablePlugin.bind(self, category, name))
    .then(function (e) {
      var key = category + '.' + name;
      self.corePlugins.remove(key);

      self.logger.info('Done.');
      defer.resolve('ok');
    })
    .fail(function (e) {
      self.logger.info('Error: ' + e);
      defer.reject(new Error());
    });

  return defer.promise;
};

PluginManager.prototype.findPluginFolder = function (category, name) {
  var self = this;
  for (var ppaths in self.pluginPath) {
    var folder = self.pluginPath[ppaths];

    var pathToCheck = folder + '/' + category + '/' + name;
    if (fs.existsSync(pathToCheck)) { return pathToCheck; }
  }
};

PluginManager.prototype.getPrettyName = function (package_json) {
  if (package_json.volumio_info !== undefined &&
		package_json.volumio_info.prettyName !== undefined) { return package_json.volumio_info.prettName; } else return package_json.name;
};

PluginManager.prototype.checkIndex = function () {
  var self = this;
  var coreConf = new (vconf)();
  var defer = libQ.defer();

  coreConf.loadFile(__dirname + '/plugins/plugins.json');
  self.fullPluginPath = self.pluginPath.concat(['/myvolumio/plugins/']);

  // checking that all key exist
  var categories = coreConf.getKeys();
  for (var i in categories) {
    var category = categories[i];

    var plugins = coreConf.getKeys(category);
    for (var k in plugins) {
      var plugin = plugins[k];
      var key = category + '.' + plugin;

      if (self.config.has(key) === false) {
        self.logger.info('Found new core plugin ' + category + '/' + plugin + '. Adding it');

        self.config.addConfigValue(key + '.enabled', 'boolean', coreConf.get(key + '.enabled'));
        self.config.addConfigValue(key + '.status', 'string', 'STOPPED');
      }
    }
  }

  categories = self.config.getKeys();
  for (var i in categories) {
    var category = categories[i];

    var plugins = self.config.getKeys(category);
    for (var k in plugins) {
      var plugin = plugins[k];
      var key = category + '.' + plugin;

      var plugin_exists = false;
      for (var d in self.fullPluginPath) {
        var package_json = self.getPackageJson(self.fullPluginPath[d] + category + '/' + plugin);
        plugin_exists = plugin_exists | (package_json !== undefined);
      }

      if (plugin_exists == false) {
        self.logger.info('Configured plugin ' + category + '/' + plugin + ' cannot be loaded. Removing from configuration');
        self.config.delete(key + '.enabled');
        self.config.delete(key + '.status');
        self.config.delete(key);
      }
    }
  }

  return defer.promise;
};

PluginManager.prototype.addMyMusicPlugin = function (pluginInfo) {
  var self = this;

  try {
    self.logger.info('Adding plugin ' + pluginInfo.name + ' to MyMusic Plugins');
    var plugin = {
        	'prettyName': pluginInfo.volumio_info.prettyName,
        	'name': pluginInfo.name,
      'category': pluginInfo.volumio_info.plugin_type,
      'hasConfiguration': pluginInfo.volumio_info.has_configuration,
      'isMyVolumioPlugin': pluginInfo.volumio_info.is_myvolumio_plugin
    };
    self.myMusicPlugins.push(plugin);
  } catch (e) {
    	self.logger.error('Cannot add ' + pluginInfo.name + ' to MyMusic Plugins, error: ' + e);
  }
};

PluginManager.prototype.getMyMusicPlugins = function () {
  var self = this;
  var defer = libQ.defer();

  for (var i in self.myMusicPlugins) {
    	var plugin = self.myMusicPlugins[i];
    plugin.active = false;
    plugin.enabled = self.config.get(plugin.category + '.' + plugin.name + '.enabled');
    if (self.config.get(plugin.category + '.' + plugin.name + '.status') === 'STARTED') {
      plugin.active = true;
    }

    // TODO FIX
    if (plugin.isMyVolumioPlugin) {
      plugin.active = false;
      plugin.enabled = this.myVolumioPluginManager.config.get(plugin.category + '.' + plugin.name + '.enabled');
      if (this.myVolumioPluginManager.config.get(plugin.category + '.' + plugin.name + '.status') === 'STARTED') {
        plugin.active = true;
      }
      if (plugin.enabled === undefined) {
        plugin.enabled = plugin.active;
      }
    }
  }

  defer.resolve(self.myMusicPlugins);
  return defer.promise;
};

PluginManager.prototype.enableDisableMyMusicPlugin = function (data) {
  var self = this;
  var defer = libQ.defer();

  if (data.enabled) {
    self.logger.info('Enabling MyMusic plugin ' + data.name);
    if (data.isMyVolumioPlugin) {
      var enable = this.myVolumioPluginManager.enableAndStartPlugin(data.category, data.name);
    } else {
      var enable = self.enableAndStartPlugin(data.category, data.name);
    }
    enable.then(function (result) {
      var plugins = self.getMyMusicPlugins();
      plugins.then(function (list) {
        defer.resolve(list);
        var title = self.coreCommand.getI18nString('COMMON.ENABLED');
        self.coreCommand.pushToastMessage('success', title, data.prettyName);
      });
    })
      .fail(function (e) {
        self.logger.error('Could not Enable MyMusic Plugin: ' + e);
        var plugins = self.getMyMusicPlugins();
        plugins.then(function (list) {
          defer.resolve(list);
        });
      });
  } else {
    self.logger.info('Disabling MyMusic plugin ' + data.name);
    if (data.isMyVolumioPlugin) {
      var disable = this.myVolumioPluginManager.disableAndStopPlugin(data.category, data.name);
    } else {
      var disable = self.disableAndStopPlugin(data.category, data.name);
    }
    disable.then(function (result) {
      var plugins = self.getMyMusicPlugins();
      plugins.then(function (list) {
        defer.resolve(list);
        var title = self.coreCommand.getI18nString('COMMON.DISABLED');
        self.coreCommand.pushToastMessage('success', title, data.prettyName);
      });
    })
      .fail(function (e) {

      });
  }
  return defer.promise;
};

PluginManager.prototype.checkConfigFileEmpty = function (destConfigurationFile) {
  var self = this;

  if (!fs.existsSync(destConfigurationFile)) {
    	return true;
  } else {
    	try {
      if (fs.readFileSync(destConfigurationFile).toString().length) {
            	return false;
      } else {
            	return true;
      }
    } catch (e) {
    		return true;
    }
  }
};
