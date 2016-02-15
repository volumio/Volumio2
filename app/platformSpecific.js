'use strict';

var exec = require('child_process').exec;

module.exports = PlatformSpecific;
function PlatformSpecific(coreCommand) {
	var self = this;

	self.coreCommand = coreCommand;
}

PlatformSpecific.prototype.shutdown = function () {
	var self = this;
	exec("sudo /sbin/halt", function (error, stdout, stderr) {
		if (error !== null) {
			self.coreCommand.pushConsoleMessage(error);
		} else self.coreCommand.pushConsoleMessage('Shutting Down');
	});
};

PlatformSpecific.prototype.reboot = function () {
	var self = this;
	exec("sudo /sbin/reboot", function (error, stdout, stderr) {
		if (error !== null) {
			self.coreCommand.pushConsoleMessage(error);
		} else self.coreCommand.pushConsoleMessage('Rebooting');
	});
};

PlatformSpecific.prototype.networkRestart = function () {
	var self = this;
	exec("sudo /bin/systemctl restart networking.service", function (error, stdout, stderr) {
		if (error !== null) {
			self.coreCommand.pushToastMessage('error',"Network restart",'Error while restarting network: '+error);
		} else
			self.coreCommand.pushToastMessage('success',"Network restart",'Network successfully restarted');
			// Restart Upmpdcli
		setTimeout(function () {
			self.coreCommand.executeOnPlugin('audio_interface', 'upnp', 'onRestart', '');
		}, 10000);
	});
};


PlatformSpecific.prototype.startupSound = function () {
	var self = this;
	var outdev = self.coreCommand.sharedVars.get('alsa.outputdevice');
	var hwdev = 'hw:' + outdev + ',0';
	exec('/usr/bin/aplay --device=plug'+hwdev+' /volumio/app/startup.wav', function (error, stdout, stderr) {
		if (error !== null) {
			console.log(error);
		}
	});
}