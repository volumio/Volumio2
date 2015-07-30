/**
 * Created by massi on 27/07/15.
 */
var fs=require('fs-extra');

module.exports = PluginManager;
function PluginManager (ccommand) {
    var self = this;

    self['plugins']={};
    self.config=new (require(__dirname+'/lib/config.js'))();
    self.config.loadFile(__dirname+'/plugins/plugins.json');
    self.coreCommand=ccommand;
}

PluginManager.prototype.loadPlugin=function(category,pluginName) {
    var self = this;

    if(self['plugins'][category]==undefined)
        self['plugins'][category]={};

    var pluginInstance=new (require(__dirname+'/plugins/'+category+'/'+pluginName+'/index.js'))(self.coreCommand);
    self['plugins'][category][pluginName]=pluginInstance;
}


PluginManager.prototype.loadPlugins=function()
{
    var self = this;

    var pluginsFolder=fs.readdirSync(__dirname+'/plugins');
    for(var i in pluginsFolder)
    {
        var category=pluginsFolder[i];
        var dirPath=__dirname+'/plugins/'+category;

        var stats=fs.statSync(dirPath);
        if(stats.isDirectory())
        {
            console.log('[' + Date.now() + '] Processing plugin category '+category);

            var categoryFolder=fs.readdirSync(dirPath);
            for(var j in categoryFolder)
            {
                var pluginName=categoryFolder[j];

                var configForPlugin=self.config.get(category+'.'+pluginName+'.enabled');

                var shallStartup=configForPlugin!=undefined && configForPlugin==true;
                if(shallStartup==true)
                {
                    console.log('[' + Date.now() + '] Initializing plugin '+pluginName);
                    self.loadPlugin(category,pluginName);
                }
                else
                {
                    console.log('[' + Date.now() + '] Plugin '+pluginName+' is not enabled.');

                    self.config.addConfigValue(category+'.'+pluginName+'.enabled','boolean',false);
                    self.config.addConfigValue(category+'.'+pluginName+'.status','string',"STOPPED");
                }

            }
        }

    }
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

    var array=[];
    for(var i in self['plugins'])
        array.push(i);


    return array;
}

PluginManager.prototype.getPluginNames=function(category)
{
    var self=this;

    if(self['plugins'][category]!=undefined)
    {
        var array=[];
        for(var i in self['plugins'][category])
            array.push(i);

        return array;
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

    if(self['plugins'][category]!=undefined)
        return self['plugins'][category][name];
}