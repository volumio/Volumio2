/**
 * Created by massi on 27/07/15.
 */

module.exports = PluginManager;
function PluginManager (server) {
    var self = this;

    self['plugins']={};
    self.config=new (require(__dirname+'/lib/config.js'))();
}

PluginManager.prototype.loadPlugin=function(category,pluginName) {
    var self = this;

    if(self['plugins'][category]==undefined)
        self['plugins'][category]={};

    var pluginInstance=new (require(__dirname+'/plugins/'+category+'/'+pluginName+'/index.js'))(self);
    self['plugins'][category][pluginName]=pluginInstance;
}


CoreCommandRouter.prototype.loadPlugins=function()
{
    var self = this;

    var pluginsFolder=fs.readdirSync(__dirname+'/plugins');
    for(var i in pluginsFolder)
    {
        var category=pluginsFolder[i];
        console.log('Processing plugin category '+category);

        var categoryFolder=fs.readdirSync(__dirname+'/plugins/'+category);
        for(var j in categoryFolder)
        {
            var pluginName=categoryFolder[j];

            var configForPlugin=config.get(category+'.'+pluginName+'.enabled');

            var shallStartup=configForPlugin!=undefined && configForPlugin==true;
            if(shallStartup==true)
            {
                console.log('Initializing plugin '+pluginName);
                self.loadPlugin(category,pluginName);
            }
            else
            {
                //Adding, just in case no one does
                config.assConfigValue(category+'.'+pluginName+'.enabled','boolen',false);
            }

        }
    }
}

CoreCommandRouter.prototype.getPluginCategories=function()
{
    var array=[];
    for(var i in self['plugins'])
        array.push(self['plugins'][i]);

    return array;
}

CoreCommandRouter.prototype.getPluginNames=function(category)
{
    if(self['plugins'][category]!=undefined)
    {
        var array=[];
        for(var i in self['plugins'][category])
            array.push(self['plugins'][category][i]);

        return array;
    }
}

CoreCommandRouter.prototype.onVolumioStart=function()
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

CoreCommandRouter.prototype.getPlugin=function(category,name)
{
    if(self['plugins'][category]!=undefined)
        return self['plugins'][category][name];
}