var libQ = require('kew');
var libNet = require('net');
var libFast = require('fast.js');
var fs=require('fs-extra');
var config=new (require(__dirname+'/../../lib/config.js'))();


// Define the ControllerSystem class
module.exports = ControllerSystem;

function ControllerSystem(commandRouter) {
	var self = this;

	//getting configuration
	config.loadFile(__dirname+'/config.json');

	var uuid=config.get('uuid');
	if(uuid==undefined)
	{
		console.log("No id defined. Creating one");
		var uuid = require('node-uuid');
		config.addConfigValue('uuid','string',uuid.v4());
	}

	// Save a reference to the parent commandRouter
	self.commandRouter = commandRouter;
}

ControllerSystem.prototype.onVolumioStart = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerSystem.prototype.onStart = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerSystem.prototype.onStop = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerSystem.prototype.onRestart = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerSystem.prototype.onInstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerSystem.prototype.onUninstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerSystem.prototype.getUIConfig = function()
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

	return uiconf;
}

ControllerSystem.prototype.setUIConfig = function(data)
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

}

ControllerSystem.prototype.getConf = function(varName)
{
	var self = this;

	return config.get(varName);
}

ControllerSystem.prototype.setConf = function(varName, varValue)
{
	var self = this;

	config.set(varName,varValue);
}

//Optional functions exposed for making development easier and more clear
ControllerSystem.prototype.getSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerSystem.prototype.setSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerSystem.prototype.getAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerSystem.prototype.setAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}


ControllerSystem.prototype.saveGeneralSettings = function(data)
{
	var self = this;

	var player_name=self.getData(data,'player_name');
	var startup_sound=self.getData(data,'startup_sound');

	if(player_name==null || startup_sound==null)
	{
		//return an error
	}
	else
	{
		config.set('player_name',player_name);
		config.set('startup_sound',startup_sound);
	}
}

ControllerSystem.prototype.saveSoundQuality = function(data)
{
	var self = this;

	var kernel_profile=self.getData(data,'kernel_profile');

	if(kernel_profile==null)
	{
		//return an error
	}
	else
	{
		config.set('kernel_profile',kernel_profile);
	}
}

ControllerSystem.prototype.systemUpdate = function(data)
{
	var self = this;


	console.log("Performing system update");
}


ControllerSystem.prototype.getData = function(data,key)
{
	var self = this;

	for(var i in data)
	{
		var ithdata=data[i];

		if(ithdata[key]!=undefined)
		return ithdata[key];
	}

	return null;
}
