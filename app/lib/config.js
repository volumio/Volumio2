/**
 * Created by massi on 27/07/15.
 */
var fs=require('fs-extra');


module.exports=Config;

function Config()
{
    var self=this;

    self.autosave=true;
    self.autosaveDelay=1000;
    self.saved=true;
    self.data={};
}

Config.prototype.loadFile=function(file)
{
    var self=this;

    self.filePath=file;

    try
    {
        self.data=fs.readJsonSync(file);
    }
    catch(ex)
    {
        self.data={};
        console.log('[' + Date.now() + '] Error reading configuration. Defaulting to empty conifguration');
    }

}

Config.prototype.findProp=function(key)
{
    var self=this;
    var splitted=key.split('.');
    var currentProp=self.data;

    while (splitted.length > 0) {
        var k = splitted.shift();

        if(currentProp && currentProp[k]!=undefined)
            currentProp=currentProp[k];
        else
        {
            currentProp=null;
            break;
        }
    }

    return currentProp;
}

Config.prototype.get=function(key)
{
    var self=this;
    var prop=self.findProp(key);

    if(prop!=undefined)
        return prop.value;
}

Config.prototype.set=function(key,value)
{
    var self=this;
    var prop=self.findProp(key);

    if(prop!=undefined)
    {
        prop.value=value;
        self.scheduleSave();
    }

}

Config.prototype.scheduleSave=function()
{
    var self=this;

    if(self.filePath!=undefined)
    {
        self.saved=false;

        setTimeout(function()
        {
            if(self.saved==false)
            {
                self.saved=true;
                fs.writeJsonSync(self.filePath,self.data);
            }

        },self.autosaveDelay);
    }

}

Config.prototype.addConfigValue=function(key,type,value)
{
    var self=this;

    var splitted=key.split('.');
    var currentProp=self.data;

    while (splitted.length > 0) {
        var k = splitted.shift();

        if(currentProp && currentProp[k]!=undefined)
            currentProp=currentProp[k];
        else
        {
            currentProp[k]={};
            currentProp=currentProp[k];
        }
    }

    var prop=self.findProp(key);
    prop['type']=type;
    prop['value']=value;

    self.scheduleSave();
}

Config.prototype.print=function()
{
    var self=this;

    console.log(JSON.stringify(self.data));
}