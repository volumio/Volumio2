'use strict';

var fs = require('fs-extra');
var HashMap = require('hashmap');
var libFast = require('fast.js');
var S = require('string');
var vconf=require('v-conf');
var libQ=require('kew');
var DecompressZip = require('decompress-zip');
var http = require('http');
var execSync = require('child_process').execSync;
var Tail = require('tail').Tail;
var compareVersions = require('compare-versions');

var arch = '';
var variant = '';
var device = '';

module.exports = PluginManager;
function PluginManager(ccommand, server) {
	var self = this;

	self.plugins = new HashMap();

	fs.ensureDir('/data/plugins/', function (err) {
		if (err) {
			self.logger.info('ERROR: Cannot create /data/plugins directory');
		}
	})

	self.pluginPath = [__dirname + '/plugins/', '/data/plugins/'];

	self.config = new (require('v-conf'))();

	var pluginsDataFile = '/data/configuration/plugins.json';
	if (!fs.existsSync(pluginsDataFile)) {
		ccommand.logger.info("File /data/configuration/plugins.json does not exist. Copying from Volumio");
		fs.copySync(__dirname + '/plugins/plugins.json', pluginsDataFile);
	}

	self.config.loadFile(pluginsDataFile);

	self.coreCommand = ccommand;
	self.websocketServer = server;
	self.logger = ccommand.logger;

	self.configManager=new(require(__dirname+'/configManager.js'))(self.logger);

	self.configurationFolder = '/data/configuration/';

	var archraw = execSync('/usr/bin/dpkg --print-architecture', { encoding: 'utf8' });
	arch = archraw.replace(/(\r\n|\n|\r)/gm,"")

	var file = fs.readFileSync('/etc/os-release').toString().split('\n');
	for (var l in file) {
		if (file[l].match(/VOLUMIO_VARIANT/i)) {
			var str = file[l].split('=');
			variant = str[1].replace(/\"/gi, "");
		}
		if (file[l].match(/VOLUMIO_HARDWARE/i)) {
			var str = file[l].split('=');
			var device = str[1].replace(/\"/gi, "");
		}
	}
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
			else
			{
				var requiredConfigParametersFile=folder+'/requiredConf.json';
				if (fs.existsSync(requiredConfigParametersFile)) {
					self.logger.info("Applying required configuration parameters for plugin "+package_json.name);
					self.checkRequiredConfigurationParameters(requiredConfigParametersFile,destConfigurationFile);
				}

			}
		}

	}
};

PluginManager.prototype.loadPlugin = function (folder) {
	var self = this;
	var defer=libQ.defer();

	var package_json = self.getPackageJson(folder);

	var category = package_json.volumio_info.plugin_type;
	var name = package_json.name;

	var key = category + '.' + name;
	var configForPlugin = self.config.get(key + '.enabled');

	var shallStartup = configForPlugin != undefined && configForPlugin == true;
	if (shallStartup == true) {
		self.logger.info('Loading plugin \"' + name + '\"...');

		var pluginInstance = null;
		var context=new (require(__dirname+'/pluginContext.js'))(self.coreCommand, self.websocketServer,self.configManager);
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

	defer.resolve();
	return defer.promise;
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
						if(package_json!==undefined)
						{
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

	try {
		return fs.readJsonSync(folder + '/package.json');
	}
	catch(ex)
	{

	}

};


PluginManager.prototype.isEnabled = function (category, pluginName) {
	var self = this;
	return self.config.get(category + '.' + pluginName + '.enabled');
};

PluginManager.prototype.startPlugin = function (category, name) {
	var self = this;
	var defer=libQ.defer();

	var plugin = self.getPlugin(category, name);

	if(plugin!==undefined)
	{
		if(plugin.onStart!==undefined)
		{
		    console.log("PLUGIN START: "+name);
			var deferStart=plugin.onStart();
			deferStart.then(function(){
				self.config.set(category + '.' + name + '.status', "STARTED");
				defer.resolve();
			});
		}
		else
		{
			self.config.set(category + '.' + name + '.status', "STARTED");
			defer.resolve();
		}

	} else defer.resolve();

	return defer.promise;
};

PluginManager.prototype.stopPlugin = function (category, name) {
	var self = this;
	var defer=libQ.defer();

	self.logger.info("Stopping plugin "+name);
	var plugin = self.getPlugin(category, name);
	if(plugin!==undefined)
	{
		var deferStart=plugin.onStop();
			defer.resolve();
	} else defer.resolve();


	return defer.promise;
};

PluginManager.prototype.startPlugins = function () {
	var self = this;

	self.logger.info("___________ START PLUGINS ___________");
	self.plugins.forEach(function (value,key) {
		self.startPlugin(value.category,value.name);

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
		if (libFast.indexOf(categories, metadata.category) == -1)
			categories.push(metadata.category);
	}

	return categories;
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

/**
 * returns an array of plugin's names, given their category
 * @param category
 * @returns {Array}
 */
PluginManager.prototype.getAllPlugNames = function (category) {
	var self = this;

	var plugFile = fs.readJsonSync(('/data/configuration/plugins.json'), 'utf-8', {throws: false});
	var plugins = [];
	for (var i in plugFile){
		if (i == category){
			for (var j in plugFile[i]){
				plugins.push(j);
			}
		}
	}
	return plugins;
}

/**
 * Returns an array of plugins with status, sorted by category
 * @returns {Array}
 */
PluginManager.prototype.getPluginsMatrix = function () {
	var self = this;

	//plugins = [{"cat": "", "plugs": []}]
	var plugins = [];
	var catNames = self.getPluginCategories();
	for (var i = 0; i < catNames.length; i++){
		var cName = catNames[i];
		var plugNames = self.getAllPlugNames(catNames[i]);
		//catPlugin = [{"plug": "", "enabled": ""}]
		var catPlugin = [];
		for (var j = 0; j < plugNames.length; j++){
			var name = plugNames[j];
			var enabled = self.isEnabled(catNames[i], plugNames[j]);
			catPlugin.push({name, enabled});
		}
		plugins.push({cName, catPlugin});
	}
	return plugins;
}

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

	//loading config file
	var configJson = new (vconf)();
	configJson.loadFile(configFile);

	//loading required configuration parameters
	var requireConfig = fs.readJsonSync(requiredFile);

	for(var key in requireConfig)
	{
		configJson.set(key,requireConfig[key]);
	}

	configJson.save();
};

PluginManager.prototype.installPlugin = function (url) {
	var self=this;
	var defer=libQ.defer();
	var modaltitle= 'Installing Plugin';
	var advancedlog = '';


	var currentMessage = "Downloading plugin at "+url;
	self.logger.info(currentMessage);
	advancedlog = currentMessage;

	self.pushMessage('installPluginStatus',{'progress': 10, 'message': 'Downloading plugin','title' : modaltitle, 'advancedLog': advancedlog});


	exec("/usr/bin/wget -O /tmp/downloaded_plugin.zip "+url, function (error, stdout, stderr) {

		if (error !== null) {
			currentMessage = "Cannot download file "+url+ ' - ' + error;
			self.logger.info(currentMessage);
			advancedlog = advancedlog + "<br>" + currentMessage;
			defer.reject(new Error(error));
		}
		else {
			currentMessage = "END DOWNLOAD: "+url;
			advancedlog = advancedlog + "<br>" + currentMessage;
			self.logger.info(currentMessage);
			currentMessage = 'Creating folder on disk';
			advancedlog = advancedlog + "<br>" + currentMessage;

			var pluginFolder = '/tmp/downloaded_plugin';


			self.createFolder(pluginFolder)
				.then(self.pushMessage.bind(self, 'installPluginStatus', {
					'progress': 30,
					'message': currentMessage,
					'title' : modaltitle,
					'advancedLog': advancedlog
				}))
				.then(self.unzipPackage.bind(self))
				.then(function (e) {
					currentMessage = 'Unpacking plugin';
					advancedlog = advancedlog + "<br>" + currentMessage;
					self.pushMessage('installPluginStatus', {'progress': 40, 'message': currentMessage, 'title' : modaltitle, 'advancedLog': advancedlog});
					return e;
				})
				.then(self.checkPluginDoesntExist.bind(self))
				.then(function (e) {
					currentMessage = 'Checking for duplicate plugin';
					advancedlog = advancedlog + "<br>" + currentMessage;
					self.pushMessage('installPluginStatus', {'progress': 50, 'message': currentMessage, 'title' : modaltitle, 'advancedLog': advancedlog});
					return e;
				})
				.then(self.renameFolder.bind(self))
				.then(function (e) {
					currentMessage = 'Copying Plugin into location';
					advancedlog = advancedlog + "<br>" + currentMessage;
					self.pushMessage('installPluginStatus', {'progress': 60, 'message': currentMessage, 'title' : modaltitle, 'advancedLog': advancedlog});
					return e;
				})
				.then(self.moveToCategory.bind(self))
				.then(function (e) {
					currentMessage = 'Installing dependencies';
					advancedlog = advancedlog + "<br>" + currentMessage;
					self.pushMessage('installPluginStatus', {'progress': 70, 'message': currentMessage, 'title' : modaltitle, 'advancedLog': advancedlog});
					var logfile = '/tmp/installog';

					fs.ensureFile(logfile, function (err) {
						var tail = new Tail(logfile);

						tail.on("line", function(data) {
							if (data == 'plugininstallend') {
								console.log('Plugin install end detected on script');
								tail.unwatch();
							} else {
								self.logger.info(data);
								advancedlog = advancedlog + "<br>" + data;
								self.pushMessage('installPluginStatus', {'progress': 70, 'message': currentMessage, 'title' : modaltitle, 'advancedLog': advancedlog});
							}
						});
					});
					return e;
				})
				.then(self.executeInstallationScript.bind(self))
				.then(function (e) {
					currentMessage = 'Adding plugin to registry';
					advancedlog = advancedlog + "<br>" + currentMessage;
					self.pushMessage('installPluginStatus', {'progress': 90, 'message': currentMessage, 'title' : modaltitle, 'advancedLog': advancedlog});
					return e;
				})
				.then(self.addPluginToConfig.bind(self))
				.then(function (folder) {
					currentMessage = 'Plugin Successfully Installed';
					advancedlog = advancedlog + "<br>" + currentMessage;

					var package_json = self.getPackageJson(folder);
					var name = package_json.name;
					var category = package_json.volumio_info.plugin_type;

					self.pushMessage('installPluginStatus', {'progress': 100, 'message': currentMessage, 'title' : modaltitle+' Completed', 'advancedLog': advancedlog, 'buttons':[{'name':'Close','class': 'btn btn-warning'}]});
					return folder;
				})
				.then(function () {
					self.logger.info("Done installing plugin.");
					defer.resolve();
					self.tempCleanup();
				})
				.fail(function (e) {
					currentMessage = 'The following error occurred when installing the plugin: ' + e;
					advancedlog = advancedlog + "<br>" + currentMessage;
					self.pushMessage('installPluginStatus', {
						'progress': 0,
						'message': 'The following error occurred when installing the plugin: ' + e,
						'title' : modaltitle+' Error',
						'buttons':[{'name':'Close','class': 'btn btn-warning'}],
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
	var self=this;
	var defer=libQ.defer();
	var modaltitle= 'Updating plugin';
	var advancedlog = '';
	var url = data.url;
	var category = data.category;
	var name = data.name;
	console.log(data);
	var currentMessage = 'Downloading from'+url;
	self.logger.info(currentMessage);
	advancedlog = currentMessage;

	self.pushMessage('installPluginStatus',{'progress': 10, 'message': 'Downloading Update','title' : modaltitle, 'advancedLog': advancedlog});


	exec("/usr/bin/wget -O /tmp/downloaded_plugin.zip "+url, function (error, stdout, stderr) {

		if (error !== null) {
			currentMessage = "Cannot download file "+url+ ' - ' + error;
			self.logger.info(currentMessage);
			advancedlog = advancedlog + "<br>" + currentMessage;
			defer.reject(new Error(error));
		}
		else {
			currentMessage = "END DOWNLOAD: "+url;
			advancedlog = advancedlog + "<br>" + currentMessage;
			self.logger.info(currentMessage);
			currentMessage = 'Creating folder on disk';
			advancedlog = advancedlog + "<br>" + currentMessage;

			var pluginFolder = '/tmp/downloaded_plugin';

			self.stopPlugin(category,name)
				.then(function(e)
				{
					self.pushMessage('installPluginStatus',{'progress': 20, 'message': 'Plugin stopped', 'title' : modaltitle});
					return e;
				})
				.then(self.pushMessage.bind(self, 'installPluginStatus', {
					'progress': 30,
					'message': currentMessage,
					'title' : modaltitle,
					'advancedLog': advancedlog
				}))
				.then(self.unzipPackage.bind(self))
				.then(function (e) {
					currentMessage = 'Unpacking plugin';
					advancedlog = advancedlog + "<br>" + currentMessage;
					self.pushMessage('installPluginStatus', {'progress': 40, 'message': currentMessage, 'title' : modaltitle, 'advancedLog': advancedlog});
					return e;
				})
				.then(self.renameFolder.bind(self))
				.then(function (e) {
					currentMessage = 'Updating Plugin Files';
					advancedlog = advancedlog + "<br>" + currentMessage;
					self.pushMessage('installPluginStatus', {'progress': 60, 'message': currentMessage, 'title' : modaltitle, 'advancedLog': advancedlog});
					return e;
				})
				.then(self.moveToCategory.bind(self))
				.then(function (e) {
					currentMessage = 'Installing dependencies';
					advancedlog = advancedlog + "<br>" + currentMessage;
					self.pushMessage('installPluginStatus', {'progress': 70, 'message': currentMessage, 'title' : modaltitle, 'advancedLog': advancedlog});
					var logfile = '/tmp/installog';

					fs.ensureFile(logfile, function (err) {
						var tail = new Tail(logfile);

						tail.on("line", function(data) {
							if (data == 'plugininstallend') {
								console.log('Plugin install end detected on script');
								tail.unwatch();
							} else {
								self.logger.info(data);
								advancedlog = advancedlog + "<br>" + data;
								self.pushMessage('installPluginStatus', {'progress': 70, 'message': currentMessage, 'title' : modaltitle, 'advancedLog': advancedlog});
							}
						});
					});
					return e;
				})
				.then(self.executeInstallationScript.bind(self))
				.then(function (e) {
					currentMessage = 'Adding plugin to registry';
					advancedlog = advancedlog + "<br>" + currentMessage;
					self.pushMessage('installPluginStatus', {'progress': 90, 'message': currentMessage, 'title' : modaltitle, 'advancedLog': advancedlog});
					return e;
				})
				.then(function (folder) {
					currentMessage = 'Plugin Successfully Installed';
					advancedlog = advancedlog + "<br>" + currentMessage;

					var package_json = self.getPackageJson(folder);
					var name = package_json.name;
					var category = package_json.volumio_info.plugin_type;

					self.pushMessage('installPluginStatus', {'progress': 100, 'message': currentMessage, 'title' : modaltitle+' Completed', 'advancedLog': advancedlog, 'buttons':[{'name':'Close','class': 'btn btn-warning'}]});
					return folder;
				})
				.then(function () {
					self.logger.info("Done installing plugin.");
					defer.resolve();
					self.tempCleanup();
					self.enablePlugin(category,name);
				})
				.fail(function (e) {
					currentMessage = 'The following error occurred when installing the plugin: ' + e;
					advancedlog = advancedlog + "<br>" + currentMessage;
					self.pushMessage('installPluginStatus', {
						'progress': 0,
						'message': 'The following error occurred when installing the plugin: ' + e,
						'title' : modaltitle+' Error',
						'buttons':[{'name':'Close','class': 'btn btn-warning'}],
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
	var self=this;

	var defer=libQ.defer();

	var installedplugins = self.getInstalledPlugins();
	defer.resolve();

	self.pushMessage('pushInstalledPlugins',installedplugins)

	return defer.promise;
}

PluginManager.prototype.rmDir = function (folder) {
	var self=this;

	var defer=libQ.defer();
	fs.remove('/tmp/downloaded_plugin', function (err) {
		if (err) defere.reject(new Error("Cannot delete folder "+folder));

		self.logger.info("Folder "+folder+" removed");
		defer.resolve(folder);
	});

	return defer.promise;
}


PluginManager.prototype.tempCleanup = function () {
	var self=this;

	self.rmDir('/tmp/downloaded_plugin');
	self.rmDir('/tmp/downloaded_plugin.zip');
}

PluginManager.prototype.createFolder = function (folder) {
	var self=this;
	var defer=libQ.defer();

	fs.mkdirs(folder, function (err) {
		if (err) defer.reject(new Error());
		else
		{
			defer.resolve(folder);
		}
	});

	return defer.promise;
}

PluginManager.prototype.unzipPackage = function () {
	var self=this;
	var defer=libQ.defer();

	var extractFolder='/tmp/downloadedPlugin';
	var unzipper = new DecompressZip('/tmp/downloaded_plugin.zip')

	unzipper.on('error', function (err) {
		console.log("ERROR: "+err);
		defer.reject(new Error());
	});

	unzipper.on('extract', function (log) {
		defer.resolve(extractFolder);
	});

	unzipper.extract({
		path: extractFolder
	});

	return defer.promise;
}


PluginManager.prototype.renameFolder = function (folder) {
	var self=this;
	var defer=libQ.defer();

	self.logger.info("Rename folder");

	var package_json = self.getPackageJson(folder);
	var name = package_json.name;

	var newFolderName=self.pluginPath[1]+'/'+name;

	fs.move(folder,newFolderName ,function (err) {
		if (err) defer.reject(new Error());
		else
		{
			defer.resolve(newFolderName);
		}
	});

	return defer.promise;
}

PluginManager.prototype.moveToCategory = function (folder) {
	var self=this;
	var defer=libQ.defer();

	self.logger.info("Move to category");

	var package_json = self.getPackageJson(folder);
	var name = package_json.name;
	var category = package_json.volumio_info.plugin_type;

	var newFolderName=self.pluginPath[1]+'/'+category+'/'+name;

	fs.remove(newFolderName,function()
	{
		fs.move(folder,newFolderName ,function (err) {
			if (err) defer.reject(new Error(err));
			else
			{
				defer.resolve(newFolderName);
			}
		});
	});


	return defer.promise;
}

PluginManager.prototype.addPluginToConfig = function (folder) {
	var self=this;
	var defer=libQ.defer();

	self.logger.info("Adding reference to registry");

	var package_json = self.getPackageJson(folder);

	var name = package_json.name;
	var category = package_json.volumio_info.plugin_type;

	var key=category+"."+name;
	self.config.addConfigValue(key+'.enabled','boolean',false);
	self.config.addConfigValue(key+'.status','string','STOPPED');

	defer.resolve(folder);
	return defer.promise;
}

PluginManager.prototype.executeInstallationScript = function (folder) {
	var self=this;
	var defer=libQ.defer();

	self.logger.info("Checking if install.sh is present");
	var installScript=folder+'/install.sh';
	fs.stat(installScript,function(err,stat){
		if(err)
		{
			self.logger.info("Check return the error "+err);
			defer.reject(new Error());
		}
		else {
			self.logger.info("Executing install.sh");
			exec('echo volumio | sudo -S sh ' + installScript+' > /tmp/installog', {uid:1000, gid:1000, maxBuffer: 2024000},function(error, stdout, stderr) {
				if (error!==undefined && error!==null) {
					console.log(stdout);
					console.log(stderr);
					self.logger.info("Install script return the error "+error);
					defer.reject(new Error());
				} else {
					self.logger.info("Install script completed");
					defer.resolve(folder);
				}
			});

		}
	});
	return defer.promise;
}


PluginManager.prototype.rollbackInstall = function (folder) {
	var self=this;
	var defer=libQ.defer();

	self.logger.info('An error occurred installing the plugin. Rolling back config');


	self.pluginFolderCleanup();
	self.tempCleanup();

	return defer.promise;
}


//This method uses synchronous methods only in order to block the whole volumio and don't let it access plugins methods
//this in order to avoid "multithreading" issues. Returning a promise just iin case the method would be used in a promise chain
PluginManager.prototype.pluginFolderCleanup = function () {
	var self=this;
	self.logger.info("Plugin folders cleanup");
	//scanning folders for non installed plugins
	for(var i in self.pluginPath)
	{
		self.logger.info("Scanning into folder "+self.pluginPath[i]);
		var categories=fs.readdirSync(self.pluginPath[i]);

		for(var j in categories)
		{
			var catFile=self.pluginPath[i]+'/'+categories[j];
			self.logger.info("Scanning category "+categories[j]);

			if(fs.statSync(catFile).isDirectory())
			{
				var plugins=fs.readdirSync(catFile);

				for( var k in plugins)
				{
					var pluginName=plugins[k];
					var pluginFile=catFile+'/'+pluginName;

					if(fs.statSync(pluginFile).isDirectory())
					{
						if(self.config.has(categories[j]+'.'+pluginName))
						{
							self.logger.debug("Plugin "+pluginName+" found. Leaving it untouched.");
						}
						else {
							self.logger.info("Plugin "+pluginName+" found in folder but missing in configuration. Removing folder.");
							fs.removeSync(self.pluginPath[i]+'/'+categories[j]+'/'+pluginName);
						}
					}
					else
					{
						self.logger.info("Removing "+pluginFile);
						fs.removeSync(pluginFile);
					}

				}


				if(plugins.length==0)
				{
					fs.removeSync(catFile);
				}
			}
			else
			{
				if(categories[j]!=='plugins.json')
				{
					self.logger.info("Removing "+catFile);
					fs.removeSync(catFile);
				}

			}


		}
	}

	self.logger.info("Plugin folders cleanup completed");
}


PluginManager.prototype.unInstallPlugin = function (category,name) {
	var self=this;
	var defer=libQ.defer();

	var key=category+'.'+name;
	console.log(key);
	var modaltitle= 'Uninstalling Plugin '+name;
	if(self.config.has(key))
	{
		self.logger.info("Uninstalling plugin "+name);
		self.stopPlugin(category,name)
			.then(function(e)
			{
				self.pushMessage('installPluginStatus',{'progress': 30, 'message': 'Plugin stopped', 'title' : modaltitle});
				return e;
			}).
			then(self.disablePlugin.bind(self,category,name))
			.then(function(e)
			{
				self.pushMessage('installPluginStatus',{'progress': 60, 'message': 'Plugin disabled', 'title' : modaltitle});
				return e;
			}).
			then(self.removePluginFromConfiguration.bind(self,category,name))
			.then(function(e)
			{
				self.pushMessage('installPluginStatus',{'progress': 90, 'message': 'Plugin removed from registry', 'title' : modaltitle});
				return e;
			}).
			then(self.pluginFolderCleanup.bind(self))
			.then(function(e)
			{
				self.pushMessage('installPluginStatus',{'progress': 100, 'message': 'Plugin uninstalled', 'title' : modaltitle, 'buttons':[{'name':'Close','class': 'btn btn-warning'}]});
				return e;
			}).
			then(function(e){
				defer.resolve();
			})
			.fail(function(e){
				self.pushMessage('installPluginStatus',{'progress': 100, 'message': 'An error occurred uninstalling the plugin. Details: '+e, 'title' : modaltitle+' Error', 'buttons':[{'name':'Close','class': 'btn btn-warning'}]});
				defer.reject(new Error());
			});
	}
	else defer.reject(new Error("Plugin doesn't exist"));

	return defer.promise;
};

PluginManager.prototype.disablePlugin = function (category,name) {
	var self = this;
	var defer=libQ.defer();

	self.logger.info("Disabling plugin "+name);

	var key = category + '.' + name;
	self.config.set(key + '.enabled',false);

	defer.resolve();
	return defer.promise;
}


PluginManager.prototype.enablePlugin = function (category,name) {
	var self = this;
	var defer=libQ.defer();

	self.logger.info("Enabling plugin "+name);

	var key = category + '.' + name;
	self.config.set(key + '.enabled',true);

	defer.resolve();
	return defer.promise;
}

PluginManager.prototype.removePluginFromConfiguration = function (category,name) {
	var self = this;
	var defer=libQ.defer();

	self.logger.info("Removing plugin "+name+" from configuration");

	var key = category + '.' + name;
	self.config.delete(key);

	self.plugins.remove(key);

	defer.resolve();
	return defer.promise;
}


PluginManager.prototype.modifyPluginStatus = function (category,name,status) {
	var self = this;
	var defer=libQ.defer();

	var key = category + '.' + name;
	var isEnabled=self.config.get(key+'.enabled');

	if(isEnabled==false)
		defere.reject(new Error());
	else
	{
		self.logger.info("Changing plugin "+name+" status to "+status);

		var keyStatus=key+'.status';

		var currentStatus=self.config.get(keyStatus);
		if(currentStatus==='STARTED')
		{
			if(status==='START')
			{
				defer.resolve();
			}
			else if(status==='STOP')
			{
				self.stopPlugin(category,name).
				then(function()
				{
					defer.resolve();
				}).
				fail(function()
				{
					defer.reject(new Error());
				});
			}
		}
		else if(currentStatus==='STOPPED')
		{
			if(status==='START')
			{
				self.startPlugin(category,name).
				then(function()
				{
					defer.resolve();
				}).
				fail(function()
				{
					defer.reject(new Error());
				});
			}
			else if(status==='STOP')
			{
				defer.resolve();
			}
		}
	}

	return defer.promise;
}

/*
 { , buttons[{name:nome bottone, emit:emit, payload:payload emit},{name:nome2, emit:emit2,payload:payload2}]}


 */
PluginManager.prototype.pushMessage = function (emit,payload) {
	var self = this;
	var defer=libQ.defer();

	self.coreCommand.broadcastMessage(emit,payload);

	defer.resolve();
	return defer.promise;
}

PluginManager.prototype.checkPluginDoesntExist = function (folder) {
	var self=this;
	var defer=libQ.defer();

	self.logger.info("Checking if plugin already exists");

	var package_json = self.getPackageJson(folder);
	var name = package_json.name;
	var category = package_json.volumio_info.plugin_type;

	var key=category+'.'+name;

	if(self.config.has(key))
		defer.reject(new Error('Plugin '+name+" already exists"));
	else defer.resolve(folder);

	return defer.promise;
}

PluginManager.prototype.getInstalledPlugins = function () {
	var self=this;
	var defer=libQ.defer();

	var response=[];

	for (var i=1;i<this.pluginPath.length;i++) {
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

						//loading plugin package.json
						var pluginFolder = groupfolder + '/' + subfolder;

						var package_json = self.getPackageJson(pluginFolder);
						if(package_json!==undefined)
						{
							var name = package_json.name;
							var category = package_json.volumio_info.plugin_type;
							var key=category+'.'+name;
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
								prettyName:prettyName,
								name:name,
								category:category,
								version:version,
								icon:icon,
								enabled:self.config.get(key+'.enabled'),
								active:self.config.get(key+'.status')==='STARTED'
							});
						}

					}
				}

			}
		}

	}
	defer.resolve(response);

	return defer.promise;
}

PluginManager.prototype.getAvailablePlugins = function () {
	var self=this;
	var defer=libQ.defer();
	var response=libQ.defer();

	var myplugins = [];
	var response=[];

	var url = 'http://plugins.volumio.org/plugins/'+variant+'/'+arch+'/plugins.json';
	var installed = self.getInstalledPlugins();

	if (installed != undefined) {
		installed.then(function (installedPlugins) {
			for (var e = 0; e <  installedPlugins.length; e++) {
				var pluginpretty = {"prettyName":installedPlugins[e].prettyName,"version":installedPlugins[e].version};
				myplugins.push(pluginpretty);
			}
		});
	}

	http.get(url, function(res){
		var body = '';
		if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
			//self.logger.info("Following Redirect to: " + res.headers.location);
			http.get(res.headers.location, function(res){
				res.on('data', function(chunk){
					body += chunk;
				});

				res.on('end', function(){

					try {
						var response = JSON.parse(body);
						pushAvailablePlugins(response);
					} catch (e) {
						self.logger.info("Error Parsing Plugins JSON");
					}
				});
			}).on('error', function(e){
				self.logger.info("Cannot download Available plugins list: "+e);
			});
		} else
		{
			res.on('data', function (chunk) {
				body += chunk;
			});

			res.on('end', function () {
				try {
					var response = JSON.parse(body);
					pushAvailablePlugins(response);
				} catch (e) {
					self.logger.info("Error Parsing Plugins JSON");
				}
			});
		}
	}).on('error', function(e){
		self.logger.info("Cannot download Available plugins list: "+e);
	});

	function pushAvailablePlugins(response) {
		for(var i = 0; i < response.categories.length; i++) {
			var plugins = response.categories[i].plugins;
			for(var a = 0; a <  plugins.length; a++) {
				var availableName = plugins[a].prettyName;
				var availableVersion = plugins[a].version;
				for(var c = 0; c <  myplugins.length; c++) {
					if(myplugins[c].prettyName === availableName) {
						plugins[a].installed = true;
						var v = compareVersions(availableVersion, myplugins[c].version);
						if (v === 1) {
							plugins[a].updateAvailable = true
						}
					} else {
						plugins[a].installed = false;
					}
				}
			}

		}
		defer.resolve(response);
	}

	return defer.promise;
}

PluginManager.prototype.getPluginDetails = function (data) {
	var self = this;
	var defer = libQ.defer();
	var responseData ='';

	var response = [];
	var url = 'http://plugins.volumio.org/plugins/' + variant + '/' + arch + '/plugins.json';

	var pluginCategory= data.category;
	var pluginName = data.name;


	http.get(url, function (res) {
		var body = '';
		if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
			self.logger.info("Following Redirect to: " + res.headers.location);
			http.get(res.headers.location, function (res) {
				res.on('data', function (chunk) {
					body += chunk;
				});

				res.on('end', function () {
					try {
						var response = JSON.parse(body);
						searchDetails(response);
					} catch (e) {
						self.logger.info("Error Parsing Plugins JSON");
					}
				});
			}).on('error', function (e) {
				self.logger.info("Cannot download Available plugins list: " + e);
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
					self.logger.info("Error Parsing Plugins JSON");
				}
			});
		}
	}).on('error', function (e) {
		self.logger.info("Cannot download Available plugins list: " + e);
	});

	function searchDetails(response) {
		var self = this;
		for(var i = 0; i < response.categories.length; i++) {
			var category = response.categories[i];
			var categoryName = response.categories[i].name;
			if (categoryName == data.category) {
				for(var c = 0; c < category.plugins.length; c++) {
					var plugin = category.plugins[c];
					var name = category.plugins[c].name;
					var prettyname = category.plugins[c].prettyName;
					if (name == pluginName){
						var details = 'No Details available for plugin '+ prettyname + '.';
						if (plugin.details){
							var details = plugin.details;
						}
						pushDetails(details, prettyname);
					}
				}
			}
		}
	}

	function pushDetails(details, prettyname) {

		var responseData = {
			title: prettyname + ' Plugin',
			message: details,
			size: 'lg',
			buttons: [
				{
					name: 'Close',
					class: 'btn btn-warning'
				}
			]
		}
		defer.resolve(responseData);


	}

	return defer.promise;
}


PluginManager.prototype.enableAndStartPlugin = function (category,name) {
	var self=this;
	var defer=libQ.defer();

	self.enablePlugin(category,name)
		.then(function(e)
		{
			var folder=self.findPluginFolder(category,name);
			self.loadPlugin(folder);
			return libQ.resolve();
		})
		.then(self.startPlugin.bind(self,category,name))
		.then(function(e)
		{
			self.logger.info("Done.");
			defer.resolve('ok');
		})
		.fail(function(e)
		{
			self.logger.info("Error: "+e);
			defer.reject(new Error());
		});

	return defer.promise;
}

PluginManager.prototype.disableAndStopPlugin = function (category,name) {
	var self=this;
	var defer=libQ.defer();

	self.stopPlugin(category,name)
		.then(self.disablePlugin.bind(self,category,name))
		.then(function(e)
		{
			var key = category + '.' + name;
			self.plugins.remove(key);

			self.logger.info("Done.");
			defer.resolve('ok');
		})
		.fail(function(e)
		{
			self.logger.info("Error: "+e);
			defer.reject(new Error());
		});

	return defer.promise;
}



PluginManager.prototype.findPluginFolder = function (category,name) {
	var self=this;
	for (var ppaths in self.pluginPath) {
		var folder = self.pluginPath[ppaths];

		var pathToCheck=folder+'/'+category+'/'+name;
		if (fs.existsSync(pathToCheck))
			return pathToCheck;
	}
}


PluginManager.prototype.getPrettyName = function (package_json) {
	if(package_json.volumio_info !== undefined &&
		package_json.volumio_info.prettyName!==undefined)
		return package_json.volumio_info.prettName;
	else return package_json.name;
}


PluginManager.prototype.checkIndex = function () {
	var self=this;
	var coreConf=new (vconf)();

	coreConf.loadFile(__dirname+'/plugins/plugins.json');

	// checking that all key exist
	var categories=coreConf.getKeys();
	for(var i in categories)
	{
		var category=categories[i];

		var plugins=coreConf.getKeys(category);
		for(var k in plugins)
		{
			var plugin=plugins[k];
			var key=category+'.'+plugin;

			if(self.config.has(key)===false)
			{
				self.logger.info("Found new core plugin "+category+"/"+plugin+". Adding it");

				self.config.addConfigValue(key+'.enabled','boolean',true);
				self.config.addConfigValue(key+'.status','string','STOPPED');

			}

		}
	}

	categories=self.config.getKeys();
	for(var i in categories) {
		var category = categories[i];

		var plugins = self.config.getKeys(category);
		for (var k in plugins) {
			var plugin = plugins[k];
			var key = category + '.' + plugin;

			var plugin_exists = false;
			for (var d in self.pluginPath) {
				var package_json = self.getPackageJson(self.pluginPath[d] + category + '/' + plugin);
				plugin_exists = plugin_exists | (package_json !== undefined);
			}

			if (plugin_exists == false) {
				self.logger.info("Configured plugin " + category + "/" + plugin + " cannot be loaded. Removing from configuration");
				self.config.delete(key+'.enabled');
				self.config.delete(key+'.status');
				self.config.delete(key);
			}
		}
	}


}





