'use strict';

var libQ = require('kew');
var fs=require('fs-extra');
var schedule = require('node-schedule');
var moment = require('moment');
var config= new (require('v-conf'))();

// Define the AlarmClock class
module.exports = AlarmClock;

function AlarmClock(context) {
	var self = this;

	// Save a reference to the parent commandRouter
	self.context=context;
	self.commandRouter = self.context.coreCommand;

	self.logger=self.context.logger;
	self.jobs = [];
	self.sleep = {
		sleep_enabled: false,
		sleep_hour: 7,
		sleep_minute: 0
	};
}

AlarmClock.prototype.getConfigurationFiles = function()
{
	var self = this;

	return ['config.json'];
};

AlarmClock.prototype.onVolumioStart = function() {
	var self = this;
	//Perform startup tasks here
	self.configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');
	config.loadFile(self.configFile);
	self.applyConf(self.getConf());

    return libQ.resolve();
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

AlarmClock.prototype.getConf = function()
{
	var self = this;
	var conf = [];
	try {
		var conf = JSON.parse(fs.readJsonSync(self.configFile));
	} catch (e) {}

	return  conf;
};

AlarmClock.prototype.fireAlarm = function(alarm) {
	var self = this;
	self.commandRouter.playPlaylist(alarm.playlist);

}

AlarmClock.prototype.clearJobs = function () {
	var self = this;
	for (var i in self.jobs) {
		var job = self.jobs[i];
		self.logger.info("Alarm: Cancelling " + job.name);
		job.cancel();
	}
	self.jobs = [];
}

AlarmClock.prototype.applyConf = function(conf) {
	var self = this;
	for (var i in conf) {
		var item = conf[i];
		var d = new Date(item.time);
		var n = d.getHours();

		var schedule = require('node-schedule');
		var rule = new schedule.RecurrenceRule();
		rule.minute = d.getMinutes();
		rule.hour = d.getHours();
        
		var func = self.fireAlarm.bind(self);
		var j = schedule.scheduleJob(rule, function(){
		  func(item);
		});
		self.logger.info("Alarm: Scheduling " + j.name + " at " +rule.hour + ":" + rule.minute) ;
		self.jobs.push(j);
	}
}

AlarmClock.prototype.setConf = function(conf)
{
	var self = this;
	self.clearJobs();
	self.applyConf(conf);
	for (var i in conf) {
		var item = conf[i];
		item.id = i;
	}
	fs.writeJsonSync(self.configFile,JSON.stringify(conf));
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

AlarmClock.prototype.getAlarms=function()
{
	var self = this;

	var defer = libQ.defer();
	var alarms;

	try {
		alarms = self.getConf();
	} catch (e) {

	}
	if (alarms == undefined) {
		alarms = [];
	}
//TODO GET ALARM
	defer.resolve(alarms);
	return defer.promise;
};

AlarmClock.prototype.saveAlarm=function(data)
{
	var self = this;

	var defer = libQ.defer();

	self.setConf(data);
	self.commandRouter.pushToastMessage('success',self.commandRouter.getI18nString('ALARM.ALARM_CLOCK_TITLE'), self.commandRouter.getI18nString('ALARM.ALARM_CLOCK_SAVE'));


	defer.resolve({});
	return defer.promise;
};

AlarmClock.prototype.getSleep = function()
{
	var self = this;
	var defer = libQ.defer();
	var sleepTask = self.getSleepConf();
	var sleep_hour = sleepTask.sleep_hour;
	var sleep_minute = sleepTask.sleep_minute;
	if (sleepTask.sleep_action){
	var sleep_action = sleepTask.sleep_action;
		if (sleepTask.sleep_action == "stop") {
			var sleep_actionText = 'Stop Music';
		} else if (sleepTask.sleep_action == "poweroff"){
			var sleep_actionText = 'Power Off';
		}
	} else {
		var sleep_action = "stop"
		var sleep_actionText = 'Stop Music';
	}
	var when = new Date(sleepTask.sleep_requestedat);
	var now = moment(new Date());

	var thisMoment = moment(when);
	thisMoment.add(sleep_hour,"h");
	thisMoment.add(sleep_minute,"m");
	var diff = moment.duration(thisMoment.diff(now));

	sleep_hour =  diff.get("hours");
	sleep_minute = diff.get("minutes");

	defer.resolve({
		enabled:sleepTask.sleep_enabled,
		time:sleep_hour+':'+sleep_minute,
		action: {val: sleep_action, text: sleep_actionText}
	});
	return defer.promise;
};

AlarmClock.prototype.setSleepConf = function (conf) {
	var self = this;
	self.sleep = conf;
}

AlarmClock.prototype.getSleepConf = function () {	

	var self = this;
	return self.sleep;
}

AlarmClock.prototype.setSleep = function(data)
{
	var self = this;
	var defer = libQ.defer();

	var splitted=data.time.split(':');

	var thisMoment = moment();

	var addedHours = parseFloat(splitted[0]);
	var addedMinutes = parseFloat(splitted[1]);

	thisMoment.add(parseFloat(splitted[0]),"h");
	thisMoment.add(parseFloat(splitted[1]),"m");

  	var sleephour = thisMoment.hour()
	var sleepminute = thisMoment.minute()
	var sleepTask = {
		sleep_enabled: data.enabled,
		sleep_hour: splitted[0],
		sleep_minute: splitted[1],
		sleep_requestedat: new Date().toISOString(),
		sleep_action: data.action
	};
	self.setSleepConf(sleepTask);

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'SetSleep: ' + splitted[0] + ' hours ' + splitted[1] + ' minutes');


	if(self.haltSchedule!=undefined)
	{
		self.haltSchedule.cancel();
		delete self.haltSchedule;
	}

	if(data.enabled)
	{
		var actionText
		var date = new Date(thisMoment.year(), thisMoment.month(), thisMoment.date(), sleephour, sleepminute, 0);
		self.commandRouter.pushConsoleMessage("Set Sleep at " + date);
		self.haltSchedule=schedule.scheduleJob(date, function(){
//			config.set('sleep_enabled',false);

			self.haltSchedule.cancel();
			delete self.haltSchedule;

			console.log("System is shutting down....");
			setTimeout(function()
			{
				if (data.action == 'stop'){
					self.commandRouter.volumioStop();
				} else {
				self.commandRouter.shutdown();
				}
			},5000);
		});
		// if (sleepminute >= 60 ) {
		// 	sleephour += 1;
		// 	sleepminute -= 60;
		// }
		// if (sleephour > 23) {
		// 	sleephour = 0;
		// }
		if (sleephour < 10) {
			sleephour = "0" + sleephour;
		}
		if (sleepminute < 10) {
			sleepminute = "0" + sleepminute;
		}
		if (data.action == 'stop'){
			actionText = self.commandRouter.getI18nString('ALARM.STOP_MUSIC');
		} else {
			actionText = self.commandRouter.getI18nString('ALARM.TURN_OFF');
		}
		if (addedHours == 0)  {
			self.commandRouter.pushToastMessage('success',self.commandRouter.getI18nString('ALARM.SLEEP_MODE_TITLE'), self.commandRouter.getI18nString('ALARM.SLEEP_MODE_SYSTEM_WILL')
                + ' ' + actionText + ' ' +
                self.commandRouter.getI18nString('ALARM.SLEEP_MODE_IN') + ' ' +
                + addedMinutes + ' ' +
                self.commandRouter.getI18nString('ALARM.SLEEP_MODE_MINUTE'));
		} else {
			self.commandRouter.pushToastMessage('success',self.commandRouter.getI18nString('ALARM.SLEEP_MODE_TITLE'),
                self.commandRouter.getI18nString('ALARM.SLEEP_MODE_SYSTEM_WILL') + ' ' +
                + actionText + ' ' +
                self.commandRouter.getI18nString('ALARM.SLEEP_MODE_IN') + ' ' +
                + addedHours + ' ' +
                self.commandRouter.getI18nString('ALARM.SLEEP_MODE_HOUR')
                + addedMinutes + ' ' +
                self.commandRouter.getI18nString('ALARM.SLEEP_MODE_MINUTE'));
		}
	}

	defer.resolve({});
	return defer.promise;
};
