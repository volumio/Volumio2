var libQ = require('kew');
var libNet = require('net');
var libFast = require('fast.js');
var fs=require('fs-extra');
var config= new (require('v-conf'))();
var exec = require('child_process').exec;

// Define the ControllerSystem class
module.exports = ControllerSystem;

function ControllerSystem(context) {
	var self = this;

	// Save a reference to the parent commandRouter
	self.context=context;
	self.commandRouter = self.context.coreCommand;

	self.logger=self.context.logger;
	self.callbacks=[];
}

ControllerSystem.prototype.onVolumioStart = function() {
	var self = this;

	//getting configuration
	var configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');
	config.loadFile(configFile);

	var uuid=config.get('uuid');
	if(uuid==undefined)
	{
		console.log("No id defined. Creating one");
		var uuid = require('node-uuid');
		config.addConfigValue('uuid','string',uuid.v4());
	}
}

ControllerSystem.prototype.onStop = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerSystem.prototype.onRestart = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerSystem.prototype.onInstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerSystem.prototype.onUninstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerSystem.prototype.getUIConfig = function()
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

	uiconf.sections[0].content[0].value=config.get('playerName');
	uiconf.sections[0].content[1].value=config.get('startupSound');
	uiconf.sections[1].content[0].value.value=config.get('kernelSettingValue');
	uiconf.sections[1].content[0].value.label=config.get('kernelSettingLabel');

	return uiconf;
}

ControllerSystem.prototype.setUIConfig = function(data)
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

}

ControllerSystem.prototype.getConf = function(varName)
{
	var self = this;

	return config.get(varName);
}

ControllerSystem.prototype.setConf = function(varName, varValue)
{
	var self = this;

	config.set(varName,varValue);
}


ControllerSystem.prototype.getConfigurationFiles = function()
{
	var self = this;

	return ['config.json'];
}

//Optional functions exposed for making development easier and more clear
ControllerSystem.prototype.getSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerSystem.prototype.setSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerSystem.prototype.getAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerSystem.prototype.setAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}


ControllerSystem.prototype.saveGeneralSettings = function(data)
{
	var self = this;

	var defer = libQ.defer();

	var player_name=data['player_name'];
	var startup_sound=data['startup_sound'];

	config.set('playerName',player_name);
	config.set('startupSound',startup_sound);

	self.commandRouter.pushToastMessage('success',"Configuration update",'The configuration has been successfully updated');
	self.setHostname(player_name);
	defer.resolve({});


	for(var i in self.callbacks)
	{
		var callback=self.callbacks[i];

		callback.call(callback,player_name);
	}
	return defer.promise;
}

ControllerSystem.prototype.saveSoundQuality = function(data)
{
	var self = this;

	var defer = libQ.defer();

	var kernel_profile_value=data['kernel_profile'].value;
	var kernel_profile_label=data['kernel_profile'].label;

	config.set('kernelSettingValue',kernel_profile_value);
	config.set('kernelSettingLabel',kernel_profile_label);


	self.commandRouter.pushToastMessage('success',"Configuration update",'The configuration has been successfully updated');

	defer.resolve({});
	return defer.promise;
}

ControllerSystem.prototype.systemUpdate = function(data)
{
	var self = this;

	self.commandRouter.pushToastMessage('success',"System update",'No newer versions found, your system is up to date.');

	var defer = libQ.defer();
	defer.resolve({});
	return defer.promise;
}


ControllerSystem.prototype.getData = function(data,key)
{
	var self = this;

	for(var i in data)
	{
		var ithdata=data[i];

		if(ithdata[key]!=undefined)
		return ithdata[key];
	}

	return null;
}
ControllerSystem.prototype.setHostname = function(hostname) {
	var self=this;
	var newhostname = hostname.toLowerCase();

	exec("/usr/bin/sudo /usr/bin/hostnamectl set-hostname " + newhostname,{uid:1000,gid:1000}, function (error, stdout, stderr) {
		if (error !== null) {
			console.log(error);
			self.commandRouter.pushToastMessage('alert',"System Name",'Cannot Change System Name');
		}
		else {
			fs.writeFile('/etc/hosts', '127.0.0.1       localhost ' + newhostname, function (err) {
				if (err) {
					throw err;
				}
				else {
							self.commandRouter.pushToastMessage('success',"System Name Changed",'System name is now ' + newhostname);
							console.log('Hostname now is ' + newhostname);
							exec("/usr/bin/sudo /bin/systemctl restart avahi-daemon.service",{uid:1000,gid:1000}, function (error, stdout, stderr) {
								if (error !== null) {
									console.log(error);
									self.commandRouter.pushToastMessage('alert',"System Name",'Cannot Change System Name');
								} else {
									console.log('avahi restarted')
								}
								});
					}
					});
				}
			});
		}


ControllerSystem.prototype.registerCallback = function(callback)
{
	var self = this;

	self.callbacks.push(callback);
}

ControllerSystem.prototype.getSystemVersion = function() {
	var self = this;
	var defer=libQ.defer();
	var file = fs.readFileSync('/etc/os-release').toString().split('\n');
	var releaseinfo = {
        'systemversion': null,
        'builddate': null
    }
    console.log(file);
    for (var l in file) {
        if (file[l].match(/VOLUMIO_VERSION/i)) {
            str = file[l].split('=');
            releaseinfo.systemversion = str[1].replace(/\"/gi, "");
        }
        if (file[l].match(/VOLUMIO_BUILD_DATE/i)) {
            str = file[l].split('=');
            releaseinfo.builddate = str[1].replace(/\"/gi, "");
        }
    }
	defer.resolve(releaseinfo);


	return defer.promise;
}
