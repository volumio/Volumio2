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
        return self.forceToType(prop.type,prop.value);
}

Config.prototype.set=function(key,value)
{
    var self=this;
    var prop=self.findProp(key);

    if(prop!=undefined)
    {
        prop.value=self.forceToType(prop.type,value);
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
    self.assertSupportedType(type);
    prop['type']=type;


    prop['value']=self.forceToType(type,value);

    self.scheduleSave();
}

Config.prototype.assertSupportedType=function(type)
{
    if(type != 'string' && type!='boolean' && type!='number' && type!='array')
    {
        throw Error('Type '+type+' is not supported');
    }
}

Config.prototype.forceToType=function(type,value)
{
    if(type=='string')
    {
        return ''+value;
    }
    else if(type=='boolean')
    {
        return Boolean(value);
    }
    else if(type=='number')
    {
        var i = Number(value);
        if(Number.isNaN(i))
            throw  Error('The value '+value+' is not a number');
        else return i;
    }
    else return value;

}

Config.prototype.print=function()
{
    var self=this;

    console.log(JSON.stringify(self.data));
}

//Only works with root key. TODO: fix
Config.prototype.delete=function(key)
{
    var self=this;

    delete self.data[key];
}

Config.prototype.getKeys=function()
{
    var self=this;

    return Object.keys(self.data);
}