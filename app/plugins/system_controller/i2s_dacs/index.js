

var libQ = require('kew');
var fs = require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var os = require('os');

// Define the ControllerSystem class
module.exports = ControllerI2s;

function ControllerI2s(context) {
	var self = this;

	// Save a reference to the parent commandRouter
	self.context = context;
	self.commandRouter = self.context.coreCommand;
    self.configManager=self.context.configManager;

    self.logger = self.context.logger;
	self.callbacks = [];
}

ControllerI2s.prototype.onVolumioStart = function () {
	var self = this;

	var configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');

	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);

    return libQ.resolve();
};

ControllerI2s.prototype.onStop = function () {
	var self = this;
	//Perform startup tasks here
};

ControllerI2s.prototype.onRestart = function () {
	var self = this;
	//Perform startup tasks here
};

ControllerI2s.prototype.onInstall = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerI2s.prototype.onUninstall = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerI2s.prototype.getUIConfig = function () {
	var self = this;

	var uiconf = fs.readJsonSync(__dirname + '/UIConfig.json');



	return uiconf;
};

ControllerI2s.prototype.setUIConfig = function (data) {
	var self = this;

	var uiconf = fs.readJsonSync(__dirname + '/UIConfig.json');

};

ControllerI2s.prototype.getConf = function (varName) {
	var self = this;

	return config.get(varName);
};

ControllerI2s.prototype.setConf = function (varName, varValue) {
	var self = this;

	var defer = libQ.defer();


};
ControllerI2s.prototype.getConfigParam = function (key) {
	return this.config.get(key);
};


ControllerI2s.prototype.getConfigurationFiles = function () {
	var self = this;

	return ['config.json'];
};

//Optional functions exposed for making development easier and more clear
ControllerI2s.prototype.getSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your installation tasks here
};

ControllerI2s.prototype.setSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your installation tasks here
};

ControllerI2s.prototype.getAdditionalConf = function (type, controller, data) {
	var self = this;
	return self.commandRouter.executeOnPlugin(type, controller, 'getConfigParam', data);
};

ControllerI2s.prototype.setAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};




ControllerI2s.prototype.registerCallback = function (callback) {
	var self = this;

	self.callbacks.push(callback);
};

ControllerI2s.prototype.deviceDetect = function() {
	var self = this;

}

ControllerI2s.prototype.i2sDetect = function () {
	var self = this;

	var i2cbus;
	exec("echo `awk '{if ($1==\"Revision\") print substr($3,length($3)-3)}' /proc/cpuinfo`", function(err, stdout, stderr) {
		var revision = stdout.slice(0, 4);
		if((!err) && (revision != '0002') && (revision != '0003')) {
			readI2S('1');
		} else {
			readI2S('0');
		}
	});

	function readI2S(i2cbus) {

	var cmd = '/usr/bin/sudo /usr/sbin/i2cdetect -y ' + i2cbus;
	exec(cmd, function(err, stdout, stderr) {
		if(err) {
			self.logger.info('Cannot read I2C interface or I2C interface not present'+err);
		} else {
			var result = [];
			var rows = stdout.split('\n');
			rows.shift();
			rows.forEach(function(row) {
				items = row.slice(0, 52).split(' ');
				items.shift();
				items.forEach(function(item) {
					if((item != '') && (item != '--')) {
						var i2cAddr = (item);
						console.log(i2cAddr);
						self.i2sMatch(i2cAddr)
					}
				});
			});
		}
	});
	}
};


ControllerI2s.prototype.getI2sOptions = function () {
	var self = this;

	var options = [];
	var dacdata = fs.readJsonSync(('/volumio/app/plugins/system_controller/i2s_dacs/dacs.json'),  'utf8', {throws: false});
	var devicename = self.getAdditionalConf('system_controller', 'system', 'device');

	for(var i = 0; i < dacdata.devices.length; i++)
	{
		if(dacdata.devices[i].name == devicename)
		{ var num = i;
			for (var i = 0; i < dacdata.devices[num].data.length; i++) {
					var valuedata = dacdata.devices[num].data[i].id
					var labeldata = dacdata.devices[num].data[i].name
				options.push({value: valuedata, label: labeldata});

			}
		}
	}


	return options;
};

ControllerI2s.prototype.getI2sStatus = function () {
	var self = this;
	var status = {enabled: false, name: null, id: null};
	var i2senabled = self.getConfigParam('i2s_enabled');
	var i2sdac = self.getConfigParam('i2s_dac');
	var i2sid = self.getConfigParam('i2s_id');

	if (i2senabled){
			status.enabled = true;
			status.name = i2sdac;
			status.id = i2sid;
	}

	return status
}

ControllerI2s.prototype.getI2SNumber = function (data) {
	var self = this;

	var dacdata = fs.readJsonSync(('/volumio/app/plugins/system_controller/i2s_dacs/dacs.json'),  'utf8', {throws: false});
	var devicename = self.getAdditionalConf('system_controller', 'system', 'device');
	var number = '';

	for(var i = 0; i < dacdata.devices.length; i++)
	{
		if(dacdata.devices[i].name == devicename)
		{ var num = i;
			for (var i = 0; i < dacdata.devices[num].data.length; i++) {
				if(dacdata.devices[num].data[i].name == data) {
					var number = dacdata.devices[num].data[i].alsanum;
				}

			}
		}
	}

	return number
}

ControllerI2s.prototype.getI2SMixer = function (data) {
	var self = this;

	var dacdata = fs.readJsonSync(('/volumio/app/plugins/system_controller/i2s_dacs/dacs.json'),  'utf8', {throws: false});
	var devicename = self.getAdditionalConf('system_controller', 'system', 'device');
	var mixer = '';

	for(var i = 0; i < dacdata.devices.length; i++)
	{
		if(dacdata.devices[i].name == devicename)
		{ var num = i;
			for (var i = 0; i < dacdata.devices[num].data.length; i++) {
				if(dacdata.devices[num].data[i].name == data) {
					if (dacdata.devices[num].data[i].mixer){
					var mixer = dacdata.devices[num].data[i].mixer;
					}
				}

			}
		}
	}

	return mixer
}

ControllerI2s.prototype.enableI2SDAC = function (data) {
	var self = this;

	var dacdata = fs.readJsonSync(('/volumio/app/plugins/system_controller/i2s_dacs/dacs.json'),  'utf8', {throws: false});
	var devicename = self.getAdditionalConf('system_controller', 'system', 'device');

	for(var i = 0; i < dacdata.devices.length; i++)
	{
		if(dacdata.devices[i].name == devicename)
		{ var num = i;
			for (var i = 0; i < dacdata.devices[num].data.length; i++) {
				if(dacdata.devices[num].data[i].name == data) {
					var overlay = dacdata.devices[num].data[i].overlay;
					var num = dacdata.devices[num].data[i].alsanum;
					self.writeI2SDAC(overlay);
					this.config.set("i2s_enabled", true);
					this.config.set("i2s_dac", data);
					this.config.set("i2s_id", overlay);
					self.commandRouter.sharedVars.set('alsa.outputdevice', num);
				}

			}
		}
	}
}

ControllerI2s.prototype.writeI2SDAC = function (data) {
	var self = this;

	var bootstring = 'initramfs volumio.initrd' + os.EOL + 'gpu_mem=16' + os.EOL + 'force_turbo=1' + os.EOL +  'dtoverlay='+data;

	fs.writeFile('/boot/config.txt', bootstring, function (err) {
		if (err) {
			self.logger.error('Cannot write config.txt file: '+error);
		}

	});

}

ControllerI2s.prototype.disableI2SDAC = function () {
	var self = this;

	this.config.set("i2s_enabled", false);

	var bootstring = 'initramfs volumio.initrd' + os.EOL + 'gpu_mem=16' + os.EOL + 'force_turbo=1' + os.EOL + 'disable_splash=1'+ os.EOL + 'dtparam=audio=on';

	fs.writeFile('/boot/config.txt', bootstring, function (err) {
		if (err) {
			self.logger.error('Cannot write config.txt file: '+error);
		}

	});

}