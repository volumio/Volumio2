'use strict';

var fs = require('fs-extra');
var HashMap = require('hashmap');
var libFast = require('fast.js');
var S = require('string');
var download = require('file-download')
var vconf=require('v-conf');
var libQ=require('kew');
var DecompressZip = require('decompress-zip');

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

    self.configManager=new(require(__dirname+'/configManager.js'))(self.logger);

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
        self.logger.info("Error loading package.json in "+folder + '/package.json');
    }

};


PluginManager.prototype.isEnabled = function (category, pluginName) {
	var self = this;
	return self.config.get(category + '.' + pluginName + '.enabled');
};

PluginManager.prototype.startPlugin = function (category, name) {
	var self = this;
    var defer=libQ.defer();

    self.config.set(category + '.' + name + '.status', "STARTED");

	var plugin = self.getPlugin(category, name);
    if(plugin!==undefined)
        pluginplugin.onStart();

    defer.resolve();
    return defer.promise;
};

PluginManager.prototype.stopPlugin = function (category, name) {
	var self = this;
    var defer=libQ.defer();

	self.config.set(category + '.' + name + '.status', "STOPPED");
	var plugin = self.getPlugin(category, name);
	if(plugin!==undefined)
        plugin.onStop();

    defer.resolve();
    return defer.promise;
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

PluginManager.prototype.installPlugin = function (uri) {
    var self=this;
    var defer=libQ.defer();

    self.logger.info("Downloading plugin at "+uri);

    var options = {
        directory: '/tmp',  //skipping path at entry 0 since it is a system folder
        filename: "downloaded_plugin.zip"
    }

    download(uri, options, function(err){
        if (err) defer.reject(new Error());
        else {
            var pluginFolder='/tmp/downloaded_plugin';


            self.createFolder(pluginFolder)
                .then(self.unzipPackage.bind(self))
                .then(self.renameFolder.bind(self))
                .then(self.moveToCategory.bind(self))
                .then(self.executeInstallationScript.bind(self))
                .then(self.addPluginToConfig.bind(self))
                .then(function()
                {
                    self.logger.info("Done installing plugin.");
                    defer.resolve();

                    self.tempCleanup();
                })
                .fail(function(e)
                {
                    defer.reject(new Error());
                    self.rollbackInstall();
                });
        }
    })
    
    return defer.promise;
};

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

    fs.move(folder,newFolderName ,function (err) {
        if (err) defer.reject(new Error());
        else
        {
            defer.resolve(newFolderName);
        }
    });

    return defer.promise;
}

PluginManager.prototype.addPluginToConfig = function (folder) {
    var self=this;
    var defer=libQ.defer();

    self.logger.info("Adding reference to registry");

    var package_json = self.getPackageJson(folder);

    self.logger.info(JSON.stringify(package_json));
    var name = package_json.name;
    var category = package_json.volumio_info.plugin_type;

    var key=category+"."+name;
    self.config.addConfigValue(key+'.enabled','boolean',false);
    self.config.addConfigValue(key+'.status','string','STOPPED');

    defer.resolve();
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
                exec(installScript, {uid:1000, gid:1000},function(error, stdout, stderr) {
                    if (error!==undefined && error!==null) {
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


PluginManager.prototype.unInstallPlugin = function (data) {
    var self=this;
    var defer=libQ.defer();

    var key=data.category+'.'+data.plugin;
    if(self.config.has(key))
    {
       self.logger.info("Uninstalling plugin "+data.plugin);
       self.stopPlugin(data.category,data.plugin).
            then(self.disablePlugin.bind(self,data.category,data.plugin)).
            then(self.removePluginFromConfiguration.bind(self,data.category,data.plugin)).
            then(self.pluginFolderCleanup.bind(self))
            then(function(e){
                defer.resolve(data);
             })
           .fail(function(e){
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

    self.logger.info("Disabling plugin "+name);

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


