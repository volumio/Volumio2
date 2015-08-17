/**
 * Created by massi on 27/07/15.
 */
var fs = require('fs-extra');

module.exports = PluginManager;
function PluginManager (ccommand, server) {
    var self = this;

    self.plugins = {};
	self.pluginPath = __dirname+'/plugins/';

    self.config = new (require(__dirname + '/lib/config.js'))();
    self.config.loadFile(__dirname + '/plugins/plugins.json');
    self.coreCommand = ccommand;
	self.websocketServer = server;
}

PluginManager.prototype.loadPlugin = function(category, pluginName) {
    var self = this;

	var objConfig = JSON.parse(fs.readFileSync(__dirname + '/plugins/' + category + '/'+pluginName+'/config.json').toString());
    console.log('[' + Date.now() + '] Loading plugin \"' + objConfig.plugin_display_name + '\"...');

    if (self.plugins[objConfig.plugin_type] == undefined)
        self.plugins[objConfig.plugin_type] = {};

	var pluginInstance = null;
    if (objConfig.plugin_name === 'websocket') {
		// TODO this is a hack to get the websocket server to connect. Need a more permanent solution
		pluginInstance = new (require(__dirname + '/plugins/' + category + '/'+pluginName+'/index.js'))(self.coreCommand, self.websocketServer);
	} else {
		pluginInstance = new (require(__dirname + '/plugins/' + category + '/'+pluginName+'/index.js'))(self.coreCommand);
	}

    self.plugins[objConfig.plugin_type][objConfig.plugin_name] = pluginInstance;
}


PluginManager.prototype.loadPlugins=function()
{
    var self = this;

    var pluginsFolder=fs.readdirSync(self.pluginPath);
    for(var i in pluginsFolder)
    {
        var folder=pluginsFolder[i];
        var dirPath=__dirname+'/plugins/'+folder;

        var stats=fs.statSync(dirPath);
        if(stats.isDirectory())
        {

            var folderContents=fs.readdirSync(dirPath);
            for(var j in folderContents)
            {
                var subfolder=folderContents[j];
                var configForPlugin=self.config.get(folder+'.'+subfolder+'.enabled');

                var shallStartup=configForPlugin!=undefined && configForPlugin==true;
                if(shallStartup==true)
                {
                    self.loadPlugin(folder,subfolder);
                }/*
                else
                {
                    self.config.addConfigValue(folder+'.'+subfolder+'.enabled','boolean',false);
                    self.config.addConfigValue(folder+'.'+subfolder+'.status','string',"STOPPED");
                }*/

            }
        }

    }
}

PluginManager.prototype.isEnabled=function(category,pluginName)
{
    var self=this;
    return self.config.get(category+'.'+pluginName+'.enabled');
}


PluginManager.prototype.onVolumioStart=function(category, name)
{
    var self=this;

    var categories=self.getPluginCategories();
    for(var i in categories) {
        var category = categories[i];
        var plugins = self.getPluginNames(category);

        for (var j in plugins) {
            var name = plugins[j];
            var plugin=self.getplugin(category, name);

            plugin.onVolumioStart();
        }
    }
}

PluginManager.prototype.startPlugin=function(category, name)
{
    var self=this;

    self.config.set(category+'.'+name+'.status',"STARTED");

    var plugin=self.getPlugin(category,name);
    plugin.onStart();
}

PluginManager.prototype.stopPlugin=function(category, name)
{
    var self=this;

    self.config.set(category+'.'+name+'.status',"STOPPED");
}

PluginManager.prototype.startPlugins=function()
{
    var self=this;

    var categories=self.getPluginCategories();
    for(var i in categories)
    {
        var category=categories[i];
        var plugins=self.getPluginNames(category);

        for(var j in plugins)
        {
            var name=plugins[j];
            self.startPlugin(category,name);
        }
    }
}

PluginManager.prototype.stopPlugins=function()
{
    var self=this;

    var categories=self.getPluginCategories();
    for(var i in categories) {
        var category = categories[i];
        var plugins = self.getPluginNames(category);

        for (var j in plugins) {
            var name = plugins[j];
            self.stopPlugin(category, name);
        }
    }
}


PluginManager.prototype.getPluginCategories=function()
{
    var self=this;

	return Object.keys(self.plugins);
}

PluginManager.prototype.getPluginNames=function(category)
{
    var self=this;

    if(category in self.plugins) {
		return Object.keys(self.plugins[category]);
	} else {
		return [];
	}
}

PluginManager.prototype.onVolumioStart=function()
{
    var self=this;

    var categories=self.getPluginCategories();
    for(var i in categories)
    {
        var plugins=self.getPluginNames(categories[i]);
        for(var j in plugins)
        {
            var plugin=self.getPlugin(categories[i],plugins[j]);
            if(plugin.onVolumioStart !=undefined)
                plugin.onVolumioStart();
        }
    }

}

PluginManager.prototype.getPlugin=function(category,name)
{
    var self=this;

    if(self.plugins[category]!=undefined)
        return self.plugins[category][name];
}
