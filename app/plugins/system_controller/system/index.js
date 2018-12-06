'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var config = new (require('v-conf'))();
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var crypto = require('crypto');
var calltrials = 0;
var additionalSVInfo;

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
    var showLanguageSelector = self.getAdditionalConf('miscellanea', 'appearance', 'language_on_system_page', false);
    var device = self.config.get('device', '');
    var showDiskInstaller = self.config.get('show_disk_installer', true);
	var HDMIEnabled = self.config.get('hdmi_enabled', false);
	self.commandRouter.i18nJson(__dirname+'/../../../i18n/strings_'+lang_code+'.json',
		__dirname+'/../../../i18n/strings_en.json',
		__dirname + '/UIConfig.json')
		.then(function(uiconf)
		{
    self.configManager.setUIConfigParam(uiconf,'sections[0].content[0].value',self.config.get('playerName'));
    self.configManager.setUIConfigParam(uiconf,'sections[0].content[1].value',self.config.get('startupSound'));
    self.configManager.setUIConfigParam(uiconf,'sections[1].content[0].value', HDMIEnabled);


	if (device != undefined && device.length > 0 && (device === 'Tinkerboard' || device === 'x86') && showDiskInstaller) {
		var disks = self.getDisks();
        if (disks != undefined) {
            disks.then(function (result) {
				if (result.available.length > 0) {
                    uiconf.sections[4].hidden = false;
					var disklist = result.available;
                    for (var i in disklist) {
                        var device = disklist[i];
                        var label = self.commandRouter.getI18nString('SYSTEM.INSTALL_TO_DISK') + ' ' + device.name;
                        var description = self.commandRouter.getI18nString('SYSTEM.INSTALL_TO_DISK_DESC') + ': ' + device.name + ' ' + self.commandRouter.getI18nString('SYSTEM.INSTALL_TO_DISK_SIZE') + ': ' + device.size;
                        var title = self.commandRouter.getI18nString('SYSTEM.INSTALL_TO_DISK_DESC') + ' ' + device.name;
                        var message = self.commandRouter.getI18nString('SYSTEM.INSTALL_TO_DISK_MESSAGE') + ' ' + device.name + ' ' + device.size + '. ' + self.commandRouter.getI18nString('SYSTEM.INSTALL_TO_DISK_MESSAGE_WARNING');
						var onClick = {"type":"emit", "message":"installToDisk", "data":{"from": result.current, "target":device.device}, "askForConfirm": {"title": title, "message": message}}
						var item = {"id": "install_to_disk"+device.device, "element":"button", "label": label, "description": description, "onClick" : onClick};
                        uiconf.sections[4].content.push(item);
                    }
				}
            })
                .fail(function () {
                });
        }

	}


    if (showLanguageSelector) {
        self.commandRouter.i18nJson(__dirname+'/../../../i18n/strings_'+lang_code+'.json',
            __dirname+'/../../../i18n/strings_en.json',
            __dirname + '/language_selector.json')
            .then(function(languageSelector)
            {
        	var languagesdata = fs.readJsonSync(('/volumio/app/plugins/miscellanea/appearance/languages.json'),  'utf8', {throws: false});
        	var language = self.commandRouter.executeOnPlugin('miscellanea', 'appearance', 'getConfigParam', 'language');
        	var language_code = self.commandRouter.executeOnPlugin('miscellanea', 'appearance', 'getConfigParam', 'language_code');
        	uiconf.sections.unshift(languageSelector);

        	self.configManager.setUIConfigParam(uiconf, 'sections[0].content[0].value', {
            value: language_code,
            label: language
        	});

        	for (var n = 0; n < languagesdata.languages.length; n++){
				self.configManager.pushUIConfigParam(uiconf, 'sections[0].content[0].options', {
                value: languagesdata.languages[n].code,
                label: languagesdata.languages[n].name
				});
        	}
                defer.resolve(uiconf);
            })
    } else {
        defer.resolve(uiconf);
	}


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

    if (data['startup_sound'] != undefined) {
        self.config.set('startupSound', data['startup_sound']);
    }

    var oldPlayerName = self.config.get('playerName');
    var player_name = data['player_name'];
    if (player_name !== oldPlayerName) {
        var hostname = data['player_name'].split(" ").join("-");
        self.config.set('playerName', player_name);
        self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('SYSTEM.SYSTEM_CONFIGURATION_UPDATE'), self.commandRouter.getI18nString('SYSTEM.SYSTEM_CONFIGURATION_UPDATE_SUCCESS'));
        self.setHostname(player_name);
        self.commandRouter.sharedVars.set('system.name', player_name);
        defer.resolve({});

        for (var i in self.callbacks) {
            var callback = self.callbacks[i];

            callback.call(callback, player_name);
        }
	} else {
        defer.resolve({});
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
					exec("/usr/bin/sudo /bin/hostname "+ newhostname, {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
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
						exec("/usr/bin/sudo /bin/chmod -R 777 /etc/avahi/services/", {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
							if (error !== null) {
								console.log('Cannot set permissions for /etc/avahi/services/: ' + error);

							} else {
								self.logger.info('Permissions for /etc/avahi/services/volumio.service')
								fs.writeFile('/etc/avahi/services/volumio.service', avahiconf, function (err) {
									if (err) {
										console.log(err);
									} else {
										self.logger.info('Avahi name changed to '+ newhostname);
									}
								});
							}

						});
						setTimeout(function () {
							// Restarting AVAHI results in system crashing
							//self.restartAvahi();
						}, 10000)
					}
				});
			});
		}

	});

};

ControllerSystem.prototype.restartAvahi = function () {
    var self = this;

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

	if (additionalSVInfo) {
        releaseinfo.additionalSVInfo = additionalSVInfo;
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

    var info = self.getSystemVersion();
    info.then(function(infos)
    {
		if (infos != undefined && infos.hardware != undefined && infos.hardware === 'x86') {
			device = 'x86';
            defer.resolve(device);
            self.deviceCheck(device);
		} else {
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

ControllerSystem.prototype.getDisks = function () {
	var self = this;
	var defer = libQ.defer();
	var availablearray = [];

	var currentdiskRaw = execSync('/bin/mount | head -n 1 | cut -d " " -f 1', { uid: 1000, gid: 1000, encoding: 'utf8'});
	var currentdisk = currentdiskRaw.replace(/[0-9]/g, '').replace('/dev/', '').replace(/\n/,'');


	var disksraw = execSync('/bin/lsblk -P -o KNAME,SIZE,MODEL -d', { uid: 1000, gid: 1000, encoding: 'utf8'});
	var disks = disksraw.split("\n");


    if (currentdisk === 'mmcblkp') {
        currentdiskRaw = execSync('/bin/mount | head -n 1 | cut -d " " -f 1 | cut -d "/" -f 3 | cut -d "p" -f 1', { uid: 1000, gid: 1000, encoding: 'utf8'});
		currentdisk = currentdiskRaw.replace(/\n/,'');
    }

	for (var i = 0; i < disks.length; i++) {

		if ((disks[i].indexOf(currentdisk) >= 0) || (disks[i].indexOf('loop') >= 0) || (disks[i].indexOf('rpmb') >= 0) || (disks[i].indexOf('boot') >= 0)) {

		} else {
			var disksarray = disks[i].split(' ');

			var diskinfo = {'device': '', 'name': '', 'size': ''};
			var count = 0;
			for (var a = 0; a < disksarray.length; a++) {
				count++
				if (disksarray[a].indexOf('KNAME') >= 0) {
					diskinfo.device = disksarray[a].replace('KNAME=', '').replace(/"/g, '');
				}
				if (disksarray[a].indexOf('SIZE') >= 0) {
					diskinfo.size = disksarray[a].replace('SIZE=', '').replace(/"/g, '');
				}
				if (disksarray[a].indexOf('MODEL') >= 0) {
					diskinfo.name = disksarray[a].replace('MODEL=', '').replace(/"/g, '');
				}
				if (diskinfo.device.indexOf('mmcblk') >= 0) {
				   diskinfo.name = 'eMMC/SD';
				}

				if (count === 3) {
					if ( diskinfo.device && diskinfo.size) {
						availablearray.push(diskinfo);
						diskinfo = {'device': '', 'name': '', 'size': ''};
					}
					count = 0;
				}

			}
		}
	}
	var final = {'current': currentdisk, 'available': availablearray};
	defer.resolve(final);
	//console.log('BBBBBBBBBBBBBBBBBBBBBBBBBBB'+JSON.stringify(final))

	return defer.promise;
}

ControllerSystem.prototype.installToDisk = function () {
	var self = this;
	var defer = libQ.defer();
	var copymessage = self.commandRouter.getI18nString('SYSTEM.COPYING_TO_DISK_MESSAGE');
	var modaltitle = self.commandRouter.getI18nString('SYSTEM.INSTALLING_TO_DISK');

	self.startInstall()
		.then(self.pushMessage.bind(self, 'installPluginStatus', {
			'progress': 5,
			'message': copymessage,
			'title' : modaltitle
		}))
		.then(self.ddToDisk.bind(self))
		.then(function (e) {
			currentMessage = 'Unpacking plugin';
			advancedlog = advancedlog + "<br>" + currentMessage;
			self.pushMessage('installPluginStatus', {'progress': 40, 'message': currentMessage, 'title' : modaltitle, 'advancedLog': advancedlog});
			return e;
		})



	return defer.promise;
}


ControllerSystem.prototype.startInstall = function () {
	var self = this;
	var defer=libQ.defer();
	var time = 0;
	var currentMessage = self.commandRouter.getI18nString('SYSTEM.INSTALLING_TO_DISK_MESSAGE');
	var modaltitle = self.commandRouter.getI18nString('SYSTEM.INSTALLING_TO_DISK');

	self.pushMessage('volumioInstallStatus', {'progress': 1, 'message': currentMessage, 'title' : modaltitle})
	setTimeout(function () {
		defer.resolve();
	}, 5000)


	return defer.promise;
}

ControllerSystem.prototype.pushMessage = function (emit,payload) {
	var self = this;
	var defer=libQ.defer();

	self.coreCommand.broadcastMessage(emit,payload);

	defer.resolve();
	return defer.promise;
}

ControllerSystem.prototype.getAdditionalConf = function (type, controller, data, def) {
    var self = this;
    var setting = self.commandRouter.executeOnPlugin(type, controller, 'getConfigParam', data);

    if (setting == undefined) {
        setting = def;
    }
    return setting
};

ControllerSystem.prototype.getShowWizard = function () {
    var self = this;

    var show = self.config.get('show_wizard', false);

    return  show
};

ControllerSystem.prototype.setShowWizard = function (data) {
    var self = this;

    self.config.set('show_wizard', data);
};

ControllerSystem.prototype.installToDisk = function (data) {
    var self = this;

    var ddsize = '';
    var error = false;
    if (data.from != undefined) {
    	var source = '/dev/' + data.from;
	}

	if (data.target != undefined) {
    	var target = '/dev/' + data.target;
	}
    self.notifyInstallToDiskStatus({'progress': 0, 'status':'started'});
    var ddsizeRaw = execSync("/bin/lsblk -b | grep -w " + data.from + " | awk '{print $4}' | head -n1", { uid: 1000, gid: 1000, encoding: 'utf8'});
    ddsize = Math.ceil(ddsizeRaw/1024/1024);
    var ddsizeRawDest = execSync("/bin/lsblk -b | grep -w " + data.target + " | awk '{print $4}' | head -n1", { uid: 1000, gid: 1000, encoding: 'utf8'});

    if (Number(ddsizeRaw) > Number(ddsizeRawDest)) {
        error = true;
        var sizeError = self.commandRouter.getI18nString('SYSTEM.INSTALLING_TO_DISK_ERROR_TARGET_SIZE');
        self.notifyInstallToDiskStatus({'progress':0, 'status':'error', 'error': sizeError});
    } else {
        try {
            var copy = exec('/usr/bin/sudo /usr/bin/dcfldd if=' + source +' of=' + target +' bs=1M status=on sizeprobe=if statusinterval=10 >> /tmp/install_progress 2>&1',  {uid: 1000, gid: 1000, encoding: 'utf8'});
        } catch(e) {
            error = true;
            self.notifyInstallToDiskStatus({'progress':0, 'status':'error', 'error': 'Cannot install on new Disk'});
        }




        var copyProgress = exec('tail -f /tmp/install_progress');


        copyProgress.stdout.on('data', function(data) {
            if (data.indexOf('%') >= 0) {
                var progressRaw = data.split('(')[1].split('Mb)')[0];
                var progress = Math.ceil((100*progressRaw)/ddsize);
                if (progress <= 100) {
                    if (progress >= 95) {
                        progress = 95;
                    }
                    self.notifyInstallToDiskStatus({'progress':progress, 'status':'progress'});
                }
            }
        });

        copy.on('close', function(code) {
            if (code === 0) {
                self.logger.info('Successfully cloned system');

                try {
                    fs.unlinkSync('/tmp/boot');
                    fs.unlinkSync('/tmp/imgpart');
                } catch(e) {}
                //TODO: remove resize sentinel once initrd for arm devices have been aligned with x86
                try {
                    if (target === '/dev/mmcblk0' || target === '/dev/mmcblk1') {
                        target = target + 'p';
                    }
                    execSync('mkdir /tmp/boot', { uid: 1000, gid: 1000, encoding: 'utf8'});
                    execSync('/usr/bin/sudo /bin/mount ' + target + '1 /tmp/boot -o rw,uid=1000,gid=1000', { uid: 1000, gid: 1000, encoding: 'utf8'});
                    execSync('/bin/touch /tmp/boot/resize-volumio-datapart', { uid: 1000, gid: 1000, encoding: 'utf8'});
                    execSync('/bin/sync', { uid: 1000, gid: 1000, encoding: 'utf8'});
                    execSync('/usr/bin/sudo /bin/umount ' + target + '1', { uid: 1000, gid: 1000, encoding: 'utf8'});
                    execSync('rm -rf /tmp/boot', { uid: 1000, gid: 1000, encoding: 'utf8'});
                    self.logger.info('Successfully prepared system for resize');
                } catch (e) {
                    self.logger.error('Cannot prepare system for resize');
                    error = true;
                    self.notifyInstallToDiskStatus({'progress':0, 'status':'error', 'error': 'Cannot prepare system for resize'});
                }

                if (!error) {
                    self.notifyInstallToDiskStatus({'progress':100, 'status':'done'});
                }
            } else {
                self.notifyInstallToDiskStatus({'progress':0, 'status':'error'});
            }
        });
	}





};

ControllerSystem.prototype.notifyInstallToDiskStatus = function (data) {
	var self = this;
	var progress = data.progress;
	var status = data.status;
	var title = self.commandRouter.getI18nString('SYSTEM.INSTALLING_TO_DISK');
	var message = self.commandRouter.getI18nString('SYSTEM.INSTALLING_TO_DISK_MESSAGE');
	var emit = '';

    var responseData = {
        progress : true,
        progressNumber : progress,
        title: title,
        message: message,
        size: 'lg',
        buttons: [
            {
                name: self.commandRouter.getI18nString('COMMON.GOT_IT'),
                class: 'btn btn-info ng-scope',
                emit:'',
                payload:''
            }
        ]
    }

    if (status === 'started') {
    	emit = 'openModal';
    } else if (status === 'progress') {
    	emit = 'modalProgress';
    } else if (status === 'done') {
    	emit = 'modalDone';
        responseData.title = self.commandRouter.getI18nString('SYSTEM.INSTALLING_TO_DISK_SUCCESS_TITLE');
        responseData.message = self.commandRouter.getI18nString('SYSTEM.INSTALLING_TO_DISK_SUCCESS_MESSAGE');
        var restartButton = {
                name: self.commandRouter.getI18nString('COMMON.RESTART'),
                class: 'btn btn-warning ng-scope',
                emit:'reboot',
                payload:''
            };
        responseData.buttons.push(restartButton);
    } else if (status === 'error') {
        emit = 'modalDone';
        responseData.message = self.commandRouter.getI18nString('SYSTEM.INSTALLING_TO_DISK_ERROR_MESSAGE') + ': ' + data.error;
	}
    self.commandRouter.broadcastMessage(emit, responseData);
};

ControllerSystem.prototype.saveHDMISettings = function (data) {
    var self = this;

	var currentConf = self.config.get('hdmi_enabled', false);
	if (currentConf |=  data['hdmi_enabled'])  {
        self.config.set('hdmi_enabled', data['hdmi_enabled']);

        var action = 'enable';
        var immediate = 'start'
        if (!data['hdmi_enabled']) {
            action = 'disable';
            immediate = 'stop';
        }

        exec('/usr/bin/sudo /bin/systemctl '+immediate+' volumio-kiosk.service && /usr/bin/sudo /bin/systemctl '+action+' volumio-kiosk.service',{uid:1000,gid:1000}, function (error, stdout, stderr) {
            if (error !== null) {
                console.log(error);
                self.logger.info('Cannot '+action+' volumio-kiosk service: ' + error);
            } else {
                self.logger.info(action+ ' volumio-kiosk service success');
                self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('SYSTEM.HDMI_UI'), self.commandRouter.getI18nString('SYSTEM.SYSTEM_CONFIGURATION_UPDATE_SUCCESS'));
            }
        });
	}
}

ControllerSystem.prototype.versionChangeDetect = function () {
    var self = this;

    var info = self.getSystemVersion();
    info.then(function(infos)
    {
        if (infos != undefined && infos.systemversion != undefined) {
        	var systemVersion = self.config.get('system_version', 'none');
        	if (systemVersion !== infos.systemversion) {
        		self.config.set('system_version', infos.systemversion);
        		self.logger.info('Version has changed, forcing UI Reload');
        		return self.commandRouter.reloadUi();
			}
        }
    });
};

ControllerSystem.prototype.getMainDiskUsage = function () {
    var self = this;
    var defer = libQ.defer();
    var unity = ' MB';
    var mainDiskUsageObj = {'size':'','used':'','free':'','usedPercentage':'','freePercentage':''};

    exec("/bin/df -h -m | grep overlay", {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
        if (error !== null) {
            defer.reject({'error':error})
        } else {
        	try {
                var mainDiskArray = stdout.toString().split(' ').filter(item => item.trim() !== '');
                mainDiskUsageObj.size = mainDiskArray[1] + unity;
                mainDiskUsageObj.used = mainDiskArray[2] + unity;
                mainDiskUsageObj.free = mainDiskArray[3] + unity;
                mainDiskUsageObj.usedPercentage = parseInt(mainDiskArray[4].replace('%', ''));
                mainDiskUsageObj.freePercentage = 100 - mainDiskUsageObj.usedPercentage;
                defer.resolve(mainDiskUsageObj);
			} catch(e) {
        		self.logger.error('Error in parsing main disk data: ' + e);
                defer.reject({'error':error})
			}
        }
    });
    return defer.promise
};

ControllerSystem.prototype.setAdditionalSVInfo = function (data) {
    var self = this;
	self.logger.info('Setting Additional System Software info: ' + data);
    additionalSVInfo = data;
};
