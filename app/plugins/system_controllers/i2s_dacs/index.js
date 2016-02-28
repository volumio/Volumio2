

var libQ = require('kew');
var fs = require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;

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

	//getting configuration
	var configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');
	config.loadFile(configFile);
	self.i2sDetect();


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

ControllerI2s.prototype.getAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerI2s.prototype.setAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};




ControllerI2s.prototype.registerCallback = function (callback) {
	var self = this;

	self.callbacks.push(callback);
};

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

ControllerI2s.prototype.i2sMatch = function (i2cAddr) {
	var self = this;

}