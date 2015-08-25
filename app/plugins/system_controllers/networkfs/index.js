var libQ = require('kew');
var libNet = require('net');
var libFast = require('fast.js');
var fs=require('fs-extra');
var exec = require('child_process').exec;
var Wireless = require('./lib/index.js');
var fs=require('fs-extra');
var config=new (require(__dirname+'/../../../lib/config.js'))();
var mountutil = require('linux-mountutils');




// Define the ControllerNetworkfs class
module.exports = ControllerNetworkfs;

function ControllerNetworkfs(context) {
	var self = this;

	//getting configuration
	config.loadFile(__dirname+'/config.json');

	// Save a reference to the parent commandRouter
	self.context=context;
	self.commandRouter = self.context.coreCommand;

}

ControllerNetworkfs.prototype.onVolumioStart = function() {
	var self = this;




}

ControllerNetworkfs.prototype.onStart = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerNetworkfs.prototype.onStop = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerNetworkfs.prototype.onRestart = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerNetworkfs.prototype.onInstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetworkfs.prototype.onUninstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetworkfs.prototype.getUIConfig = function()
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');



	return uiconf;
}

ControllerNetworkfs.prototype.setUIConfig = function(data)
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

}

ControllerNetworkfs.prototype.getConf = function(varName)
{
	var self = this;

	return self.config.get(varName);
}

ControllerNetworkfs.prototype.setConf = function(varName, varValue)
{
	var self = this;

	self.config.set(varName,varValue);
}

//Optional functions exposed for making development easier and more clear
ControllerNetworkfs.prototype.getSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetworkfs.prototype.setSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetworkfs.prototype.getAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetworkfs.prototype.setAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}



ControllerNetworkfs.prototype.mountShare = function (share) {

	var Name = 'Name';
	var IP = 'IP';
	var FsType = 'cifs';
	var Username = '';
	var Password = '';
	mountutil.mount("//192.168.1.142/Flac","/mnt/NAS/", { "createDir": true,"fstype": "cifs","fsopts":"guest" }, function(result) {
		if (result.error) {
			// Something went wrong!
			self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Error Mounting Share: '+result.error);
		} else {
			self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Share Mounted Successfully');
			self.context.coreCommand.pushToastMessage('success',"Music Library", 'Successfully added ');
		}
	});

}