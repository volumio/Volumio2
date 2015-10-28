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

	/*var name=config.get('NasMounts.Flac.name');
	var ip=config.get('NasMounts.Flac.ip');
	var fstype=config.get('NasMounts.Flac.fstype');

	uiconf.sections[0].content[0].value=name;
	uiconf.sections[0].content[1].value=ip;
	uiconf.sections[0].content[2].value.value=fstype;
	uiconf.sections[0].content[2].label.value=fstype;

	var user=config.get('NasMounts.Flac.user');
	if(user!=undefined)
		uiconf.sections[0].content[3].value=user;

	var password=config.get('NasMounts.Flac.password');
	if(password!=undefined)
		uiconf.sections[0].content[4].value=password;

	var options=config.get('NasMounts.Flac.options');
	if(options!=undefined)
		uiconf.sections[0].content[5].value=options;*/

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


ControllerNetworkfs.prototype.getConfigurationFiles = function()
{
	var self = this;

	return ['config.json'];
}

ControllerNetworkfs.prototype.saveShare = function(data)
{
	var self = this;

	var defer = libQ.defer();

	var name=data['Flac.name'];
	var ip=data['Flac.ip'];
	var fstype=data['Flac.fstype'].value;
	var username=data['Flac.username'];
	var password=data['Flac.password'];
	var options=data['Flac.options'];

	if(username==undefined) usenamer='';
	if(password==undefined) password='';
	if(options==undefined) options='';

	config.addConfigValue('NasMounts.Flac.name','string',name);
	config.addConfigValue('NasMounts.Flac.ip','string',ip);
	config.addConfigValue('NasMounts.Flac.fstype','string',fstype);
	config.addConfigValue('NasMounts.Flac.user','string',username);
	config.addConfigValue('NasMounts.Flac.password','string',password);
	config.addConfigValue('NasMounts.Flac.options','string',options);

	self.initShares();

	self.commandRouter.pushToastMessage('success',"Configuration update",'The configuration has been successfully updated');
	setTimeout(function () {
		self.scanDatabase();
		//Wait for share to be mounted before scanning
	}, 2000)
	defer.resolve({});
	return defer.promise;
}

ControllerNetworkfs.prototype.scanDatabase = function() {
	var self = this;

	exec("/usr/bin/mpc update", function (error, stdout, stderr) {
		if (error !== null) {
			self.commandRouter.pushToastMessage('warning',"My Music",'Error scanning Database: ' +error);
			self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Database scan error: ' + error);
		}
		else {
			self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Database update started');
			self.commandRouter.pushToastMessage('success',"My Music",'Adding new Music to Database');
		}
	});
}

ControllerNetworkfs.prototype.listShares = function() {
	var mounts=config.getKeys();


}