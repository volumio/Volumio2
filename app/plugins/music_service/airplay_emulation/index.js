'use strict';

var fs = require('fs-extra');
var exec = require('child_process').exec;
var config = new (require('v-conf'))();
var libQ = require('kew');

// Define the UpnpInterface class
module.exports = AirPlayInterface;


function AirPlayInterface(context) {
	// Save a reference to the parent commandRouter
	this.context = context;
	this.commandRouter = this.context.coreCommand;

}

AirPlayInterface.prototype.onVolumioStart = function () {
	this.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Starting Shairport Sync');
	this.commandRouter.sharedVars.registerCallback('alsa.outputdevice', this.outputDeviceCallback.bind(this));
	this.commandRouter.sharedVars.registerCallback('system.name', this.playerNameCallback.bind(this));
	this.startShairportSync();

    return libQ.resolve();
};


AirPlayInterface.prototype.onStop = function () {
};

AirPlayInterface.prototype.onRestart = function () {
};

AirPlayInterface.prototype.onInstall = function () {
};

AirPlayInterface.prototype.onUninstall = function () {
};

AirPlayInterface.prototype.getUIConfig = function () {
};

AirPlayInterface.prototype.setUIConfig = function (data) {
};

AirPlayInterface.prototype.getConf = function (varName) {
};

AirPlayInterface.prototype.setConf = function (varName, varValue) {
};

//Optional functions exposed for making development easier and more clear
AirPlayInterface.prototype.getSystemConf = function (pluginName, varName) {
};

AirPlayInterface.prototype.setSystemConf = function (pluginName, varName) {
};

AirPlayInterface.prototype.getAdditionalConf = function () {
};

AirPlayInterface.prototype.setAdditionalConf = function () {
};

AirPlayInterface.prototype.startShairportSync = function () {
	// Loading Configured output device
	var outdev = this.commandRouter.sharedVars.get('alsa.outputdevice');
	if (outdev != 'softvolume' ) {
		outdev = 'hw:'+outdev+',0';
	}
	var mixer = this.commandRouter.sharedVars.get('alsa.outputdevicemixer');
	var name = this.commandRouter.sharedVars.get('system.name');


	var fs = require('fs');

	var self = this;
	fs.readFile(__dirname + "/shairport-sync.conf.tmpl", 'utf8', function (err, data) {
		if (err) {
			return console.log(err);
		}

		var conf1 = data.replace("${name}", name);
		var conf2 = conf1.replace("${device}", outdev);
		var conf3 = conf1.replace("${mixer}", mixer);


		fs.writeFile("/etc/shairport-sync.conf", conf2, 'utf8', function (err) {
			if (err) return console.log(err);
			startAirPlay(self);
		});
	});
};

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

AirPlayInterface.prototype.outputDeviceCallback = function () {
	var self = this;

	self.context.coreCommand.pushConsoleMessage('Output device has changed, restarting Shairport Sync');
	self.startShairportSync()
}


AirPlayInterface.prototype.playerNameCallback = function () {
	var self = this;

	self.context.coreCommand.pushConsoleMessage('System name has changed, restarting Shairport Sync');
	self.startShairportSync()
}

