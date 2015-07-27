/**
 * Created by massi on 27/07/15.
 */
var fs=require('fs-extra');


module.exports=Config;

function Config()
{
    var self=this;
}

Config.prototype.loadFile=function(file)
{
    var self=this;

    self.data=fs.readJsonSync(file);
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
        prop.value=value;
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

}