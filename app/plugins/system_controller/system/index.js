'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var config = new (require('v-conf'))();
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var crypto = require('crypto');
var calltrials = 0;

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

	var uuid = this.config.get('uuid');
	if (uuid == undefined) {
		console.log("No id defined. Creating one");
		var uuid = require('node-uuid');
		self.config.addConfigValue('uuid', 'string', uuid.v4());
	}

    this.commandRouter.sharedVars.addConfigValue('system.uuid', 'string', uuid);
	this.commandRouter.sharedVars.addConfigValue('system.name', 'string', self.config.get('playerName'));

	self.deviceDetect();
	self.callHome();

    return libQ.resolve();
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
	var defer = libQ.defer();

	var lang_code = self.commandRouter.sharedVars.get('language_code');

	self.commandRouter.i18nJson(__dirname+'/../../../i18n/strings_'+lang_code+'.json',
		__dirname+'/../../../i18n/strings_en.json',
		__dirname + '/UIConfig.json')
		.then(function(uiconf)
		{
    self.configManager.setUIConfigParam(uiconf,'sections[0].content[0].value',self.config.get('playerName').capitalize());
    self.configManager.setUIConfigParam(uiconf,'sections[0].content[1].value',self.config.get('startupSound'));

			defer.resolve(uiconf);
		})
		.fail(function()
		{
			defer.reject(new Error());
		})

	return defer.promise
};


ControllerSystem.prototype.capitalize = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
}

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

    var player_name = data['player_name'];
    var hostname = data['player_name'].split(" ").join("-");
    var startup_sound = data['startup_sound'];

    self.config.set('playerName', player_name);
    self.config.set('startupSound', startup_sound);

	self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('SYSTEM.SYSTEM_CONFIGURATION_UPDATE'), self.commandRouter.getI18nString('SYSTEM.SYSTEM_CONFIGURATION_UPDATE_SUCCESS'));
	self.setHostname(player_name);
	self.commandRouter.sharedVars.set('system.name', player_name);
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

	self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('SYSTEM.SYSTEM_CONFIGURATION_UPDATE'), self.commandRouter.getI18nString('SYSTEM.SYSTEM_CONFIGURATION_UPDATE_SUCCESS'));

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
	var newhostname = hostname.toLowerCase().replace(/ /g,'-');

	fs.writeFile('/etc/hostname', newhostname, function (err) {
		if (err) {
			console.log(err);
			self.commandRouter.pushToastMessage('alert', self.commandRouter.getI18nString('SYSTEM.SYSTEM_NAME'), self.commandRouter.getI18nString('SYSTEM.SYSTEM_NAME_ERROR'));
		}
		else {
			exec("/usr/bin/sudo /bin/chmod 777 /etc/hosts", {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
				if (error !== null) {
					console.log('Cannot set permissions for /etc/hosts: ' + error);

				} else {
					self.logger.info('Permissions for /etc/hosts set')
					exec("/usr/bin/sudo /bin/hostname "+hostname, {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
						if (error !== null) {
							console.log('Cannot set new hostname: ' + error);

						} else {
							self.logger.info('New hostname set')
						}
					});
				}


				fs.writeFile('/etc/hosts', '127.0.0.1       localhost ' + newhostname, function (err) {
					if (err) {
						console.log(err);
					}
					else {
						self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('SYSTEM.SYSTEM_NAME'), self.commandRouter.getI18nString('SYSTEM.SYSTEM_NAME_NOW') + ' ' + hostname);
						self.logger.info('Hostname now is ' + newhostname);
						var avahiconf = '<?xml version="1.0" standalone="no"?><service-group><name replace-wildcards="yes">'+ hostname +'</name><service><type>_http._tcp</type><port>80</port></service></service-group>';
						exec("/usr/bin/sudo /bin/chmod 777 /etc/avahi/services/volumio.service", {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
							if (error !== null) {
								console.log('Cannot set permissions for /etc/hosts: ' + error);

							} else {
								self.logger.info('Permissions for /etc/avahi/services/volumio.service')
								fs.writeFile('/etc/avahi/services/volumio.service', avahiconf, function (err) {
									if (err) {
										console.log(err);
									} else {
										self.logger.info('Avahi name changed to '+ hostname);
										/*
										setTimeout(function () {
											exec("/usr/bin/sudo /bin/systemctl restart avahi-daemon.service", {
												uid: 1000,
												gid: 1000
											}, function (error, stdout, stderr) {
												if (error !== null) {
													console.log(error);
													self.commandRouter.pushToastMessage('alert', self.commandRouter.getI18nString('SYSTEM.SYSTEM_NAME'), self.commandRouter.getI18nString('SYSTEM.SYSTEM_NAME_ERROR'));
												} else {
													self.logger.info('Avahi Daemon Restarted')
												}
											});
										}, 3000)
										 */
									}
								});
							}

						});






						setTimeout(function () {
							exec("/usr/bin/sudo /bin/systemctl restart avahi-daemon.service", {
								uid: 1000,
								gid: 1000
							}, function (error, stdout, stderr) {
								if (error !== null) {
									console.log(error);
									self.commandRouter.pushToastMessage('alert', self.commandRouter.getI18nString('SYSTEM.SYSTEM_NAME'), self.commandRouter.getI18nString('SYSTEM.SYSTEM_NAME_ERROR'));
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
		'builddate': null,
		'variant': null,
		'hardware':null
	};
	//console.log(file);
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
		if (file[l].match(/VOLUMIO_VARIANT/i)) {
			str = file[l].split('=');
			releaseinfo.variant = str[1].replace(/\"/gi, "");
		}
		if (file[l].match(/VOLUMIO_HARDWARE/i)) {
			str = file[l].split('=');
			releaseinfo.hardware = str[1].replace(/\"/gi, "");
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


ControllerSystem.prototype.sendBugReport = function (message) {
	var self = this;

	if (message == undefined || message.text == undefined || message.text.length < 1 ) {
		message.text = 'No info available';
	}
	fs.appendFileSync('/tmp/logfields', 'Description="' + message.text + '"\r\n');
	// Must single-quote the message or the shell may interpret it and crash.
	// single-quotes already within the message need to be escaped.
	// The resulting string always starts and ends with single quotes.
	var description = '';
	var pieces = message.text.split("'");
	var n = pieces.length;
	for (var i=0; i<n; i++) {
		description = description + "'" + pieces[i] + "'";
		if (i < (n-1)) description = description + "\\'";
	}

	exec("/usr/local/bin/node /volumio/logsubmit.js " + description, {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
		if (error !== null) {
			self.logger.info('Cannot send bug report: ' + error);
		} else {
			self.logger.info('Log sent successfully, reply: '+stdout);
			//if (stdout != undefined && stdout.status != undefined && stdout.status == 'OK' && stdout.link != undefined ) {
				return self.commandRouter.broadcastMessage('pushSendBugReport', stdout);
			//}




		}
	});

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

ControllerSystem.prototype.factoryReset = function () {
    var self = this;

    fs.writeFile('/boot/factory_reset', ' ', function (err) {
        if (err) {
            self.logger.info('Cannot Initiate factory reset');
        } else {
            self.logger.info('Created Factory Reset file, rebooting');
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
			self.logger.info('Cannot read proc/cpuinfo: ' + error);
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


ControllerSystem.prototype.callHome = function () {
	var self = this;


	try {
		var macaddr = fs.readFileSync('/sys/class/net/eth0/address', "utf8");
		var anonid = macaddr.toString().replace(':','');

	} catch (e) {
		console.log(e)
		var anonid = self.config.get('uuid');
	}
	var md5 = crypto.createHash('md5').update(anonid).digest("hex");
	var info = self.getSystemVersion();
	info.then(function(infos)
	{
		if ((infos.variant) && (infos.systemversion) && (infos.hardware) && (md5)) {
		console.log('Volumio Calling Home');
		exec('/usr/bin/curl -X POST --data-binary "device='+ infos.hardware + '&variante=' + infos.variant + '&version=' + infos.systemversion + '&uuid=' + md5 +'" http://updates.volumio.org:7070/downloader-v1/track-device',
			function (error, stdout, stderr) {

				if (error !== null) {
					if (calltrials < 3) {
					setTimeout(function () {
						self.logger.info('Cannot call home: '+error+ ' retrying in 5 seconds, trial '+calltrials);
						calltrials++
						self.callHome();
					}, 10000);
					}
				}
				else self.logger.info('Volumio called home');

			});
	} else {
			self.logger.info('Cannot retrieve data for calling home');
	}
	});
};


ControllerSystem.prototype.enableSSH = function (data) {
    var self = this;

    var action = 'enable';
    var immediate = 'start'
    if (data == 'false') {
        action = 'disable';
        immediate = 'stop';
    }

    exec('/usr/bin/sudo /bin/systemctl '+immediate+' ssh.service && /usr/bin/sudo /bin/systemctl '+action+' ssh.service',{uid:1000,gid:1000}, function (error, stdout, stderr) {
        if (error !== null) {
            console.log(error);
            self.logger.info('Cannot '+action+' SSH service: ' + error);
        } else {
            self.logger.info(action+ ' SSH service success');
        }
    });
}

ControllerSystem.prototype.checkPassword = function (data) {
	var self = this;
	var defer = libQ.defer();

	var currentpass = self.config.get('system_password', 'volumio');

	if (data.password === currentpass) {
		defer.resolve(true);
	} else {
		defer.resolve(false)
	}


	return defer.promise;
}

