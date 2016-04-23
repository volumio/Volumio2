'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;

// Define the ControllerSystem class
module.exports = ControllerSystem;

function ControllerSystem(context) {
	var self = this;


	// Save a reference to the parent commandRouter
	self.context = context;
	self.commandRouter = self.context.coreCommand;
    self.configManager=self.context.configManager;

    self.logger = self.context.logger;
	self.callbacks = [];
}

ControllerSystem.prototype.onVolumioStart = function () {
	var self = this;

	//getting configuration
	var configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');

	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);
	
	var uuid = config.get('uuid');
	if (uuid == undefined) {
		console.log("No id defined. Creating one");
		var uuid = require('node-uuid');
		self.config.addConfigValue('uuid', 'string', uuid.v4());
	}




	this.commandRouter.sharedVars.addConfigValue('system.name', 'string', self.config.get('playerName'));

	self.deviceDetect();
	self.checkTestSystem();
};

ControllerSystem.prototype.onStop = function () {
	var self = this;
	//Perform startup tasks here
};

ControllerSystem.prototype.onRestart = function () {
	var self = this;
	//Perform startup tasks here
};

ControllerSystem.prototype.onInstall = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerSystem.prototype.onUninstall = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerSystem.prototype.getUIConfig = function () {
	var self = this;

	var uiconf = fs.readJsonSync(__dirname + '/UIConfig.json');

    self.configManager.setUIConfigParam(uiconf,'sections[0].content[0].value',self.config.get('playerName'));
    self.configManager.setUIConfigParam(uiconf,'sections[0].content[1].value',self.config.get('startupSound'));

	return uiconf;
};

ControllerSystem.prototype.setUIConfig = function (data) {
	var self = this;

	var uiconf = fs.readJsonSync(__dirname + '/UIConfig.json');

};

ControllerSystem.prototype.getConf = function (varName) {
	var self = this;

	return self.config.get(varName);
};

ControllerSystem.prototype.setConf = function (varName, varValue) {
	var self = this;

	var defer = libQ.defer();

	self.config.set(varName, varValue);
	if (varName = 'player_name') {
		var player_name = varValue;

		for (var i in self.callbacks) {
			var callback = self.callbacks[i];

			callback.call(callback, player_name);
		}
		return defer.promise;
	}
};


ControllerSystem.prototype.getConfigurationFiles = function () {
	var self = this;

	return ['config.json'];
};

//Optional functions exposed for making development easier and more clear
ControllerSystem.prototype.getSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your installation tasks here
};

ControllerSystem.prototype.setSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your installation tasks here
};

ControllerSystem.prototype.getAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerSystem.prototype.setAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerSystem.prototype.getConfigParam = function (key) {
	return this.config.get(key);
};

ControllerSystem.prototype.saveGeneralSettings = function (data) {
	var self = this;

	var defer = libQ.defer();

	var player_name = data['player_name'].split(" ").join("-");
	var startup_sound = data['startup_sound'];

	self.config.set('playerName', player_name);
	self.config.set('startupSound', startup_sound);

	self.commandRouter.pushToastMessage('success', "Configuration update", 'The configuration has been successfully updated');
	self.setHostname(player_name);
	defer.resolve({});


	for (var i in self.callbacks) {
		var callback = self.callbacks[i];

		callback.call(callback, player_name);
	}
	return defer.promise;
};

ControllerSystem.prototype.saveSoundQuality = function (data) {
	var self = this;

	var defer = libQ.defer();

	var kernel_profile_value = data['kernel_profile'].value;
	var kernel_profile_label = data['kernel_profile'].label;

	self.config.set('kernelSettingValue', kernel_profile_value);
	self.config.set('kernelSettingLabel', kernel_profile_label);


	self.commandRouter.pushToastMessage('success', "Configuration update", 'The configuration has been successfully updated');

	defer.resolve({});
	return defer.promise;
};

ControllerSystem.prototype.systemUpdate = function (data) {
	var self = this;

	self.commandRouter.pushToastMessage('success', "System update", 'No newer versions found, your system is up to date.');

	var defer = libQ.defer();
	defer.resolve({});
	return defer.promise;
};


ControllerSystem.prototype.getData = function (data, key) {
	var self = this;

	for (var i in data) {
		var ithdata = data[i];

		if (ithdata[key] != undefined)
			return ithdata[key];
	}

	return null;
};

ControllerSystem.prototype.setHostname = function (hostname) {
	var self = this;
	var newhostname = hostname.toLowerCase();

	fs.writeFile('/etc/hostname', newhostname, function (err) {
		if (err) {
			console.log(err);
			self.commandRouter.pushToastMessage('alert', "System Name", 'Cannot Change System Name');
		}
		else {
			exec("/usr/bin/sudo /bin/chmod 777 /etc/hosts", {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
				if (error !== null) {
					console.log('Canot set permissions for /etc/hosts: ' + error);

				} else {
					self.logger.info('Permissions for /etc/hosts set')
				}

				fs.writeFile('/etc/hosts', '127.0.0.1       localhost ' + newhostname, function (err) {
					if (err) {
						console.log(err);
					}
					else {
						self.commandRouter.pushToastMessage('success', "System Name Changed", 'System name is now ' + newhostname);
						self.logger.info('Hostname now is ' + newhostname);
						setTimeout(function () {
							exec("/usr/bin/sudo /bin/systemctl restart avahi-daemon.service", {
								uid: 1000,
								gid: 1000
							}, function (error, stdout, stderr) {
								if (error !== null) {
									console.log(error);
									self.commandRouter.pushToastMessage('alert', "System Name", 'Cannot Change System Name');
								} else {
									self.logger.info('Avahi Daemon Restarted')
								}
							});
						}, 3000)
					}
				});
			});
		}

	});

};


ControllerSystem.prototype.registerCallback = function (callback) {
	var self = this;

	self.callbacks.push(callback);
};

ControllerSystem.prototype.getSystemVersion = function () {
	var self = this;
	var defer = libQ.defer();
	var file = fs.readFileSync('/etc/os-release').toString().split('\n');
	var releaseinfo = {
		'systemversion': null,
		'builddate': null
	};
	console.log(file);
	var nLines = file.length;
	var str;
	for (var l = 0; l < nLines; l++) {
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
};

ControllerSystem.prototype.setTestSystem = function (data) {
	var self = this;

	if (data == 'true') {
		fs.writeFile('/data/test', ' ', function (err) {
			if (err) {
				self.logger.info('Cannot set as test device:' + err)
			}
			self.logger.info('Device is now in test mode')
		});
	} else if (data == 'false') {
		fs.exists('/data/test', function (exists) {
			exec('rm /data/test', function (error, stdout, stderr) {
				if (error !== null) {
					console.log(error);
					self.logger.info('Cannot delete test file: ' + error);
				} else {
					self.logger.info('Test File deleted');
				}
			});
		});

	}
};

ControllerSystem.prototype.checkTestSystem = function () {
	var self = this;

	fs.exists('/data/test', function (exists) {
		self.logger.info('------------ TEST ENVIRONMENT DETECTED ---------------');
		self.StartDebugConsole();
	});

}


ControllerSystem.prototype.sendBugReport = function (message) {
	for (var key in message) {
		console.log("BUG: " + key + " - " + message[key]);
		fs.appendFileSync('/tmp/logfields', key + '="' + message[key] + '"\r\n');
	}
	exec('sudo systemctl start logondemand');
};

ControllerSystem.prototype.deleteUserData = function () {
	var self = this;

	fs.writeFile('/boot/user_data', ' ', function (err) {
		if (err) {
			self.logger.info('Cannot User Data delete file');
		} else {
			self.logger.info('Created User Data delete file, rebooting');
			self.commandRouter.reboot();
		}

	});
};


ControllerSystem.prototype.deviceDetect = function (data) {
	var self = this;
	var defer = libQ.defer();
	var device = '';

	exec("cat /proc/cpuinfo | grep Hardware", {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
		if (error !== null) {
			self.logger.info('Canot read proc/cpuinfo: ' + error);
		} else {
			var hardwareLine = stdout.split(":");
			var cpuidparam = hardwareLine[1].replace(/\s/g, '');
			var deviceslist = fs.readJsonSync(('/volumio/app/plugins/system_controller/system/devices.json'),  'utf8', {throws: false});
			//self.logger.info('CPU ID ::'+cpuidparam+'::');
			for(var i = 0; i < deviceslist.devices.length; i++)
			{
				if(deviceslist.devices[i].cpuid == cpuidparam)
				{
					defer.resolve(deviceslist.devices[i].name);
					device = deviceslist.devices[i].name;
					self.deviceCheck(device);
				}
			}

		}
	});

	return defer.promise;
};

ControllerSystem.prototype.deviceCheck = function (data) {
	var self = this;

	var device = config.get('device');

	if (device == undefined) {
		self.logger.info ('Setting Device type: ' + data)
		self.config.set('device', data);
	} else if (device != data) {
		self.logger.info ('Device has changed, setting Device type: ' + data)
		self.config.set('device', data);
	}
}

ControllerSystem.prototype.StartDebugConsole = function () {
	var self = this;
		// Starts a debug telnet interface on port 2023 
		fs.writeFile('/tmp/logtail', ' ', function (err) {
			if (err) {
				self.logger.info('Cannot write logtail file' + err)
			}

			exec('/usr/local/bin/node '+__dirname+'/telnetServer.js ',
				function (error, stdout, stderr) {

					if (error !== null) {
						self.logger.info('Cannot Start Telnet Log Server: '+error);
					}
					else self.logger.info('Telnet Log Server Started');

				});

		});


};

