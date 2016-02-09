'use strict';

var libQ = require('kew');
var fs=require('fs-extra');
var config= new (require('v-conf'))();
var schedule = require('node-schedule');
var moment = require('moment');

// Define the AlarmClock class
module.exports = AlarmClock;

function AlarmClock(context) {
	var self = this;

	// Save a reference to the parent commandRouter
	self.context=context;
	self.commandRouter = self.context.coreCommand;

	self.logger=self.context.logger;
}

AlarmClock.prototype.getConfigurationFiles = function()
{
	var self = this;

	return ['config.json'];
};

AlarmClock.prototype.onVolumioStart = function() {
	var self = this;
	//Perform startup tasks here
	var configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');
	config.loadFile(configFile);
};

AlarmClock.prototype.onStart = function() {
	var self = this;
	//Perform startup tasks here
};

AlarmClock.prototype.onStop = function() {
	var self = this;
	//Perform startup tasks here
};

AlarmClock.prototype.onRestart = function() {
	var self = this;
	//Perform startup tasks here
};

AlarmClock.prototype.onInstall = function()
{
	var self = this;
	//Perform your installation tasks here
};

AlarmClock.prototype.onUninstall = function()
{
	var self = this;
	//Perform your installation tasks here
};

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
};

AlarmClock.prototype.setUIConfig = function(data)
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

};

AlarmClock.prototype.getConf = function(varName)
{
	var self = this;

	return self.config.get(varName);
};

AlarmClock.prototype.setConf = function(varName, varValue)
{
	var self = this;

	self.config.set(varName,varValue);
};

//Optional functions exposed for making development easier and more clear
AlarmClock.prototype.getSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
};

AlarmClock.prototype.setSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
};

AlarmClock.prototype.getAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
};

AlarmClock.prototype.setAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
};


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
};

AlarmClock.prototype.getSleep = function()
{
	var self = this;
	var defer = libQ.defer();


	defer.resolve({
		enabled:config.get('sleep_enabled'),
		time:config.get('sleep_hour')+':'+config.get('sleep_minute')
	});
	return defer.promise;
};

AlarmClock.prototype.setSleep = function(data)
{
	var self = this;
	var defer = libQ.defer();

	var splitted=data.time.split(':');
  var sleephour = moment().hour()+parseFloat(splitted[0]);
	var sleepminute = moment().minute()+parseFloat(splitted[1]);
	config.set('sleep_enabled',data.enabled);
	config.set('sleep_hour',splitted[0]);
	config.set('sleep_minute',splitted[1]);

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'SetSleep: ' + splitted[0] + ' hours ' + splitted[1] + ' minutes');
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'SetSleep at  ' + sleephour + ':' + sleepminute);

	if(self.haltSchedule!=undefined)
	{
		self.haltSchedule.cancel();
		delete self.haltSchedule;
	}

	if(data.enabled)
	{
		var date = new Date(moment().year(), moment().month(), moment().date(), sleephour, sleepminute, 0);
		self.haltSchedule=schedule.scheduleJob(date, function(){
			config.set('sleep_enabled',false);

			self.haltSchedule.cancel();
			delete self.haltSchedule;

			console.log("System is shutting down....");
			setTimeout(function()
			{
				self.commandRouter.shutdown();
			},5000);
		});

		self.commandRouter.pushToastMessage('success',"Sleep mode", 'System will turn off at '+sleephour+':'+sleepminute );
	}

	defer.resolve({});
	return defer.promise;
};
