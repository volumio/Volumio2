'use strict';

var exec = require('child_process').exec;

var dbUpdateState = false;

module.exports = PlatformSpecific;
function PlatformSpecific(coreCommand) {
	var self = this;

	self.coreCommand = coreCommand;
}

PlatformSpecific.prototype.shutdown = function () {
	var self = this;
	exec("sudo /sbin/shutdown -h now", function (error, stdout, stderr) {
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
			self.coreCommand.pushToastMessage('error',self.coreCommand.getI18nString('network_restart_title'),
                self.coreCommand.getI18nString('network_restart_error')+error);
		} else
			self.coreCommand.pushToastMessage('success',self.coreCommand.getI18nString('network_restart_title'),
                self.coreCommand.getI18nString('network_restart_success'));
		// Restart Upmpdcli
		setTimeout(function () {
			self.coreCommand.executeOnPlugin('audio_interface', 'upnp', 'onRestart', '');
		}, 10000);
	});
};

PlatformSpecific.prototype.wirelessRestart = function () {
	var self = this;
	exec("sudo /bin/systemctl restart wireless.service", function (error, stdout, stderr) {
		if (error !== null) {
			self.coreCommand.pushToastMessage('error',self.coreCommand.getI18nString('wireless_restart_title'),
                self.coreCommand.getI18nString('wireless_restart_error')+error);
		} else
			self.coreCommand.pushToastMessage('success',self.coreCommand.getI18nString('wireless_restart_title'),
                self.coreCommand.getI18nString('wireless_restart_error'))
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

PlatformSpecific.prototype.fileUpdate = function (data) {
	var self = this;
	self.coreCommand.pushConsoleMessage('Command Router : Notfying DB Update'+data);

	return self.coreCommand.broadcastMessage('dbUpdate', {'status':data});

}
