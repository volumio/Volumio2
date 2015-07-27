/**
 * Created by massi on 27/07/15.
 */
var fs=require('fs-extra');


module.exports=Config;

function Config()
{
    var self=this;

    self.fileName="";
}

Config.prototype.loadFile=function(file)
{
    var self=this;

    self.fileName=file;
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
    return prop.value;
}

Config.prototype.set=function(key,value)
{
    var self=this;
    var prop=self.findProp(key);
    prop.value=value;
}