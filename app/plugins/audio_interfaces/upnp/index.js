'use strict';

var fs = require('fs-extra');
var exec = require('child_process').exec;
var os = require('os');

// Define the UpnpInterface class
module.exports = UpnpInterface;


function UpnpInterface(context) {
	var self = this;
	// Save a reference to the parent commandRouter
	self.context = context;
	self.commandRouter = self.context.coreCommand;
	self.logger=self.commandRouter.logger;

}

UpnpInterface.prototype.onVolumioStart = function () {
	var self = this;

	self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Starting Upmpd Daemon');
	self.startUpmpdcli();

	var boundMethod = self.onPlayerNameChanged.bind(self);
	self.commandRouter.executeOnPlugin('system_controller', 'system', 'registerCallback', boundMethod);

};

UpnpInterface.prototype.onPlayerNameChanged = function (playerName) {
	var self = this;


	exec('/usr/bin/sudo /usr/bin/killall upmpdcli', function (error, stdout, stderr) {
		if (error) {
			self.logger.error('Cannot kill upmpdcli '+error);
		} else {
			self.startUpmpdcli();
		}
	});
};

UpnpInterface.prototype.onStart = function () {
	var self = this;

};

UpnpInterface.prototype.onStop = function () {
	var self = this;
	//Perform startup tasks here
};

UpnpInterface.prototype.onRestart = function () {
	var self = this;
	//Perform startup tasks here
};

UpnpInterface.prototype.onInstall = function () {
	var self = this;
	//Perform your installation tasks here
};

UpnpInterface.prototype.onUninstall = function () {
	var self = this;
	//Perform your installation tasks here
};

UpnpInterface.prototype.getUIConfig = function () {
	var self = this;


};

UpnpInterface.prototype.setUIConfig = function (data) {
	var self = this;
	//Perform your installation tasks here
};

UpnpInterface.prototype.getConf = function (varName) {
	var self = this;
	//Perform your installation tasks here
};

UpnpInterface.prototype.setConf = function (varName, varValue) {
	var self = this;
	//Perform your installation tasks here
};

//Optional functions exposed for making development easier and more clear
UpnpInterface.prototype.getSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your installation tasks here
};

UpnpInterface.prototype.setSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your installation tasks here
};

UpnpInterface.prototype.getAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};

UpnpInterface.prototype.setAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};

UpnpInterface.prototype.startUpmpdcli = function() {
	var self = this;

	var systemController = self.commandRouter.pluginManager.getPlugin('system_controller', 'system');
	var name = systemController.getConf('playerName');

	var upmpdcliconf = __dirname + "/upmpdcli.conf";
	var upmpdcliconftmpl = __dirname + "/upmpdcli.conf.tmpl";
	var namestring = 'friendlyname = ' + name + os.EOL;

	fs.outputFile(upmpdcliconf, namestring , function (err) {

		if (err) {
			self.logger.error('Cannot write upnp conf file: '+err);
		} else {
			fs.appendFile(upmpdcliconf, fs.readFileSync(upmpdcliconftmpl), function (err) {
				if (err){
					self.logger.error('Cannot write upnp conf file: '+err);
				}
				upmpdcliexec();
			});
		}
	})


	function upmpdcliexec() {
		exec('/usr/bin/sudo /bin/systemctl start upmpdcli.service', function (error, stdout, stderr) {
			if (error) {
				self.logger.error('Cannot start Upmpdcli: '+error);
			} else {
				self.logger.info('Upmpdcli Daemon Started');
			}
		});
	}
}
