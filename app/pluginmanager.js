'use strict';

var fs = require('fs-extra');
var HashMap = require('hashmap');
var libFast = require('fast.js');
var S = require('string');

module.exports = PluginManager;
function PluginManager(ccommand, server) {
	var self = this;

	self.plugins = new HashMap();
	self.pluginPath = [__dirname + '/plugins/', '/data/plugins/'];

	self.config = new (require('v-conf'))();

	var pluginsDataFile = '/data/configuration/plugins.json';
	if (!fs.existsSync(pluginsDataFile)) {
		fs.copySync(__dirname + '/plugins/plugins.json', pluginsDataFile);
	}
	self.config.loadFile(pluginsDataFile);

	self.coreCommand = ccommand;
	self.websocketServer = server;
	self.logger = ccommand.logger;


	self.configurationFolder = '/data/configuration/';
}

PluginManager.prototype.initializeConfiguration = function (package_json, pluginInstance, folder) {
	var self = this;

	if (pluginInstance.getConfigurationFiles != undefined) {
		var configFolder = self.configurationFolder + package_json.volumio_info.plugin_type + "/" + package_json.name + '/';

		var configurationFiles = pluginInstance.getConfigurationFiles();
		for (var i in configurationFiles) {
			var configurationFile = configurationFiles[i];

			var destConfigurationFile = configFolder + configurationFile;
			if (!fs.existsSync(destConfigurationFile)) {
				fs.copySync(folder + '/' + configurationFile, destConfigurationFile);
			}
		}

	}
};

PluginManager.prototype.loadPlugin = function (folder) {
	var self = this;

	var package_json = self.getPackageJson(folder);

	var category = package_json.volumio_info.plugin_type;
	var name = package_json.name;

	var key = category + '.' + name;
	var configForPlugin = self.config.get(key + '.enabled');

	var shallStartup = configForPlugin != undefined && configForPlugin == true;
	if (shallStartup == true) {
		self.logger.info('Loading plugin \"' + name + '\"...');

		var pluginInstance = null;
		var context = new (require(__dirname + '/pluginContext.js'))(self.coreCommand, self.websocketServer);
		context.setEnvVariable('category', category);
		context.setEnvVariable('name', name);

		pluginInstance = new (require(folder + '/' + package_json.main))(context);

		self.initializeConfiguration(package_json, pluginInstance, folder);


		if (pluginInstance.onVolumioStart != undefined)
			pluginInstance.onVolumioStart();

		var pluginData = {
			name: name,
			category: category,
			folder: folder,
			instance: pluginInstance
		};

		self.plugins.set(key, pluginData);
	}
	else self.logger.info("Plugin " + name + " is not enabled");

};


PluginManager.prototype.loadPlugins = function () {
	var self = this;

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

						//loading plugin package.json
						var pluginFolder = groupfolder + '/' + subfolder;

						var package_json = self.getPackageJson(pluginFolder);

						var boot_priority = package_json.volumio_info.boot_priority;
						if (boot_priority == undefined)
							boot_priority = 100;

						var plugin_array = priority_array.get(boot_priority);
						if (plugin_array == undefined)
							plugin_array = [];

						plugin_array.push(pluginFolder);
						priority_array.set(boot_priority, plugin_array);
					}
				}

			}
		}

	}

	for (i = 1; i < 101; i++) {
		var plugin_array = priority_array.get(i);
		if (plugin_array != undefined) {
			for (var j in plugin_array) {
				var folder = plugin_array[j];
				self.loadPlugin(folder);
			}
		}

	}
};

PluginManager.prototype.getPackageJson = function (folder) {
	var self = this;

	return fs.readJsonSync(folder + '/package.json');
};


PluginManager.prototype.isEnabled = function (category, pluginName) {
	var self = this;
	return self.config.get(category + '.' + pluginName + '.enabled');
};

PluginManager.prototype.startPlugin = function (category, name) {
	var self = this;

	self.config.set(category + '.' + name + '.status', "STARTED");

	var plugin = self.getPlugin(category, name);
	plugin.onStart();
};

PluginManager.prototype.stopPlugin = function (category, name) {
	var self = this;

	self.config.set(category + '.' + name + '.status', "STOPPED");
	var plugin = self.getPlugin(category, name);
	plugin.onStop();
};

PluginManager.prototype.startPlugins = function () {
	var self = this;

	self.plugins.forEach(function (value, key) {

		self.config.set(key + '.status', "STARTED");

		var plugin = value.instance;
		plugin.onStart();
	});
};

PluginManager.prototype.stopPlugins = function () {
	var self = this;

	self.plugins.forEach(function (value, key) {
		self.config.set(key + '.status', "STOPPED");

		var plugin = value.instance;
		plugin.onStop();
	});
};

PluginManager.prototype.getPluginCategories = function () {
	var self = this;

	var categories = [];

	var values = self.plugins.values();
	for (var i in values) {
		var metadata = values[i];
		console.log(metadata.category);
		if (libFast.indexOf(categories, metadata.category) == -1)
			categories.push(metadata.category);
	}

	console.log(categories);

	return names;
};

PluginManager.prototype.getPluginNames = function (category) {
	var self = this;

	var names = [];

	var values = self.plugins.values();
	for (var i in values) {
		var metadata = values[i];
		if (metadata.category == category)
			names.push(metadata.name);
	}

	return names;
};

PluginManager.prototype.onVolumioStart = function () {
	var self = this;

	self.plugins.forEach(function (value, key) {
		var plugin = value.instance;

		if (plugin.onVolumioStart != undefined)
			plugin.onVolumioStart();
	});
};

PluginManager.prototype.getPlugin = function (category, name) {
	var self = this;
	if (self.plugins.get(category + '.' + name)) {
		return self.plugins.get(category + '.' + name).instance;
	} else {
		self.logger.error("Plugin " + name + " is not loaded. Unable to get an instance");
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
