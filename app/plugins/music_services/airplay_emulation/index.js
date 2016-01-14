var libQ = require('kew');
var libNet = require('net');
var libFast = require('fast.js');
var libLevel = require('level');
var fs=require('fs-extra');
var exec = require('child_process').exec;

// Define the UpnpInterface class
module.exports = AirPlayInterface;


function AirPlayInterface(context) {
	var self = this;
    // Save a reference to the parent commandRouter
    self.context=context;
    self.commandRouter = self.context.coreCommand;

}

AirPlayInterface.prototype.onVolumioStart = function() {
    var self = this;

    self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Starting Shairport Sync');
    self.startShairportSync();

}

AirPlayInterface.prototype.onStart = function() {
    var self = this;

}

AirPlayInterface.prototype.onStop = function() {
    var self = this;
    //Perform startup tasks here
}

AirPlayInterface.prototype.onRestart = function() {
    var self = this;
    //Perform startup tasks here
}

AirPlayInterface.prototype.onInstall = function()
{
    var self = this;
    //Perform your installation tasks here
}

AirPlayInterface.prototype.onUninstall = function()
{
    var self = this;
    //Perform your installation tasks here
}

AirPlayInterface.prototype.getUIConfig = function()
{
    var self = this;


}

AirPlayInterface.prototype.setUIConfig = function(data)
{
    var self = this;
    //Perform your installation tasks here
}

AirPlayInterface.prototype.getConf = function(varName)
{
    var self = this;
    //Perform your installation tasks here
}

AirPlayInterface.prototype.setConf = function(varName, varValue)
{
    var self = this;
    //Perform your installation tasks here
}

//Optional functions exposed for making development easier and more clear
AirPlayInterface.prototype.getSystemConf = function(pluginName,varName)
{
    var self = this;
    //Perform your installation tasks here
}

AirPlayInterface.prototype.setSystemConf = function(pluginName,varName)
{
    var self = this;
    //Perform your installation tasks here
}

AirPlayInterface.prototype.getAdditionalConf = function()
{
    var self = this;
    //Perform your installation tasks here
}

AirPlayInterface.prototype.setAdditionalConf = function()
{
    var self = this;
    //Perform your installation tasks here
}

AirPlayInterface.prototype.startShairportSync = function() {
    var self = this;

    var systemController = self.commandRouter.pluginManager.getPlugin('system_controller', 'system');
    var name = systemController.getConf('playerName');
    var fs = require('fs')
    fs.readFile("/etc/shairport-sync.conf.tmpl", 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
            }
        var conf1 = data.replace("${name}", name);
        var conf2 = conf1.replace("${device}", "hw:1,0");

        fs.writeFile("/etc/shairport-sync.conf", conf2, 'utf8', function (err) {
            if (err) return console.log(err);
            startAirPlay(self);
            });
        });
}

function startAirPlay(self) {
    exec("sudo systemctl restart airplay", function (error, stdout, stderr) {
        if (error !== null) {
            self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Shairport-sync error: ' + error);
        }
        else {
            self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Shairport-Sync Started');
        }
    });
}
