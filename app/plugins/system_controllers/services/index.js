var libQ = require('kew');
var libFast = require('fast.js');
var fs=require('fs-extra');


// Define the ControllerServices class
module.exports = ControllerServices;

function ControllerServices(commandRouter) {
	var self = this;

	// Save a reference to the parent commandRouter
	self.commandRouter = commandRouter;
}

ControllerServices.prototype.onVolumioStart = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerServices.prototype.onStart = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerServices.prototype.onStop = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerServices.prototype.onRestart = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerServices.prototype.onInstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerServices.prototype.onUninstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerServices.prototype.getUIConfig = function()
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

	var plugins=self.commandRouter.pluginManager.getPluginNames('music_services');

	for(var i in plugins)
	{
		var pluginName=plugins[i];
		if(self.commandRouter.pluginManager.isEnabled('music_services',pluginName)==true)
		{
			var plugin=self.commandRouter.pluginManager.getPlugin('music_services',pluginName);

			uiconf.sections.push(plugin.getUIConfig());

		}

	}

	console.log(JSON.stringify(uiconf));
	return uiconf;
}

ControllerServices.prototype.setUIConfig = function(data)
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

}

ControllerServices.prototype.getConf = function(varName)
{
	var self = this;

	return self.config.get(varName);
}

ControllerServices.prototype.setConf = function(varName, varValue)
{
	var self = this;

	self.config.set(varName,varValue);
}

//Optional functions exposed for making development easier and more clear
ControllerServices.prototype.getSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerServices.prototype.setSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerServices.prototype.getAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerServices.prototype.setAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}
