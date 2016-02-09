'use strict';

var fs = require('fs-extra');
var spawn = require('child_process').spawn;

// Define the UpnpInterface class
module.exports = UpnpInterface;


function UpnpInterface(context) {
	var self = this;
	// Save a reference to the parent commandRouter
	self.context = context;
	self.commandRouter = self.context.coreCommand;

}

UpnpInterface.prototype.onVolumioStart = function () {
	var self = this;

	self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Starting Upmpd Daemon');
	self.startUpmpdcli();

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

UpnpInterface.prototype.startUpmpdcli = function () {
	var self = this;

	var systemController = self.commandRouter.pluginManager.getPlugin('system_controller', 'system');
	var name = systemController.getConf('playerName');

	var process = spawn('upmpdcli', ["-c", __dirname + "/upmpdcli.conf", "-f", name]);

	/*
	 process.stderr.on('data', function (data) {
	 self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Upmpcli error: ' + data);
	 });
	 */
	process.on('close', function (code) {
		self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Upmpcli ended with code ' + code);
	});
};
