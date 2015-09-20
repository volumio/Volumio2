var libQ = require('kew');
var libNet = require('net');
var libFast = require('fast.js');
var fs=require('fs-extra');
var exec = require('child_process').exec;
var Wireless = require('./lib/index.js');
var fs=require('fs-extra');
var config= new (require('v-conf'))();
var mountutil = require('linux-mountutils');




// Define the ControllerNetworkfs class
module.exports = ControllerNetworkfs;

function ControllerNetworkfs(context) {
	var self = this;

	// Save a reference to the parent commandRouter
	self.context=context;
	self.commandRouter = self.context.coreCommand;

}

ControllerNetworkfs.prototype.getConfigurationFiles = function()
{
	var self = this;

	return ['config.json'];
}

ControllerNetworkfs.prototype.onVolumioStart = function() {
	var self = this;

	var configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');
	config.loadFile(configFile);

	self.initShares();
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



ControllerNetworkfs.prototype.initShares = function () {
	var self = this;

	var keys = config.getKeys('NasMounts');
	for(var i in keys) {
		var key=keys[i];
		self.mountShare(key);
	}
}

ControllerNetworkfs.prototype.mountShare = function (shareid) {
	var self= this;

	var sharename= config.get('NasMounts.'+shareid+'.name');
	var pointer= '//' + config.get('NasMounts.'+shareid+'.ip') + '/' + config.get('NasMounts.'+shareid+'.name');
	var mountpoint= '/mnt/NAS/'+config.get('NasMounts.'+shareid+'.name');

	//Password-protected mount
	if (( typeof config.get('NasMounts.'+shareid+'.user') !== 'undefined' && config.get('NasMounts.'+shareid+'.user') ) || ( typeof config.get('NasMounts.'+shareid+'.password') !== 'undefined' && config.get('NasMounts.'+shareid+'.password') ))
	{
		var credentials='username='+config.get('NasMounts.'+shareid+'.user')+','+ 'password='+config.get('NasMounts.'+shareid+'.password');
		mountutil.mount(pointer,mountpoint, { "createDir": true,"fstype": "cifs","fsopts":credentials + ",dir_mode=0777,file_mode=0666"}, function(result) {
			if (result.error) {
				// Something went wrong!
				self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Error Mounting Share'+ sharename +  ': '+result.error);
			} else {
				self.context.coreCommand.pushConsoleMessage('[' + Date.now() + ']'+ sharename + ' Share Mounted Successfully');
				self.context.coreCommand.pushToastMessage('success',"Music Library",+ sharename + ' Successfully added ');
			}
		});
	} else
	//Access as guest (no password)
	{
		mountutil.mount(pointer,mountpoint, { "createDir": true,"fstype": "cifs","fsopts":"guest,dir_mode=0777,file_mode=0666" }, function(result) {
			if (result.error) {
				// Something went wrong!
				self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Error Mounting Share'+ sharename +  ': '+result.error);
			} else {
				self.context.coreCommand.pushConsoleMessage('[' + Date.now() + ']'+ sharename + 'Share Mounted Successfully');
				self.context.coreCommand.pushToastMessage('success',"Music Library", sharename + 'Successfully added ');
			}
		});
	}

}
