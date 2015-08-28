var libQ = require('kew');
var libFast = require('fast.js');
var fs=require('fs-extra');
var config= new (require('v-conf'))();

// Define the AlarmClock class
module.exports = AlarmClock;

function AlarmClock(context) {
	var self = this;

	//getting configuration
	config.loadFile(__dirname+'/config.json');

	// Save a reference to the parent commandRouter
	self.context=context;
	self.commandRouter = self.context.coreCommand;

}

AlarmClock.prototype.onVolumioStart = function() {
	var self = this;
	//Perform startup tasks here
}

AlarmClock.prototype.onStart = function() {
	var self = this;
	//Perform startup tasks here
}

AlarmClock.prototype.onStop = function() {
	var self = this;
	//Perform startup tasks here
}

AlarmClock.prototype.onRestart = function() {
	var self = this;
	//Perform startup tasks here
}

AlarmClock.prototype.onInstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

AlarmClock.prototype.onUninstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

AlarmClock.prototype.getUIConfig = function()
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

	//enable
	uiconf.sections[0].content[0].value=config.get('enabled');

	//hour
	uiconf.sections[0].content[1].value.value=config.get('hour');

	//minute
	uiconf.sections[0].content[2].value.value=config.get('minute');

	return uiconf;
}

AlarmClock.prototype.setUIConfig = function(data)
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

}

AlarmClock.prototype.getConf = function(varName)
{
	var self = this;

	return self.config.get(varName);
}

AlarmClock.prototype.setConf = function(varName, varValue)
{
	var self = this;

	self.config.set(varName,varValue);
}

//Optional functions exposed for making development easier and more clear
AlarmClock.prototype.getSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

AlarmClock.prototype.setSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

AlarmClock.prototype.getAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}

AlarmClock.prototype.setAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}


AlarmClock.prototype.saveAlarm=function(data)
{
	var self = this;

	var defer = libQ.defer();

	var enabled=data['enabled'];
	var hour=data['hour'];
	var minute=data['minute'];

	config.set('enabled', enabled);
	config.set('hour', hour);
	config.set('minute', minute);

	self.commandRouter.pushToastMessage('success',"Alarm clock", 'Your alarm clock has been set');


	defer.resolve({});
	return defer.promise;
}