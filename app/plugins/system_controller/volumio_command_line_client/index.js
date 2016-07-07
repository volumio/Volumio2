'use strict';


var fs = require('fs-extra');
var execSync = require('child_process').execSync;
var libQ = require('kew');


// Define the CommandLineClient class
module.exports = CommandLineClient;
function CommandLineClient(context) {
	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;
}

CommandLineClient.prototype.onVolumioStart = function () {
	var self = this;

	this.commandRouter.sharedVars.registerCallback('alsa.outputdevicemixer', this.outputDeviceCallback.bind(this));

	self.buildVolumeFiles();

	return libQ.resolve();
};



CommandLineClient.prototype.outputDeviceCallback = function (value) {
	var self = this;
	self.buildVolumeFiles();
};

CommandLineClient.prototype.getConfigParam = function (key) {
	return this.config.get(key);
};

CommandLineClient.prototype.setConfigParam = function (data) {
	this.config.set(data.key, data.value);
};


CommandLineClient.prototype.getConfigurationFiles = function () {
	return ['config.json'];
};

CommandLineClient.prototype.getAdditionalConf = function (type, controller, data) {
	var self = this;
	return self.commandRouter.executeOnPlugin(type, controller, 'getConfigParam', data);
};

CommandLineClient.prototype.buildVolumeFiles = function () {
	var self = this;

	var  device = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'outputdevice');
	var mixerdev = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'mixer');
	var mixer = '"'+mixerdev+'"';
	var volumecurve = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'volumecurvemode');

	if (volumecurve == 'logarithmic'){
		var setcommand = '/usr/bin/amixer -M set -c ' + device + ' ' + mixer + ' $1 %';
		var getcommand = "/usr/bin/amixer -M get -c " + device + " " + mixer + " | awk '$0~/%/{print $4}' | tr -d '[]%'";
	} else {
		var setcommand = '/usr/bin/amixer set -c ' + device + ' ' + mixer + ' $1 %';
		var getcommand = "/usr/bin/amixer get -c " + device + " " + mixer + " | awk '$0~/%/{print $4}' | tr -d '[]%'";
	}
	self.writeVolumeFiles('/tmp/setvolume', setcommand)
	self.writeVolumeFiles('/tmp/getvolume', getcommand)
};

CommandLineClient.prototype.writeVolumeFiles = function (path , content) {
   var self = this;

	try {
		var ws = fs.createWriteStream(path);
		ws.cork();
		ws.write('#!/bin/sh\n')
		ws.write(content+'\n');
		if(path == '/tmp/setvolume') {
			ws.write('echo $1');
		}
		ws.uncork();
		ws.end();
		execSync('/bin/chmod a+x ' + path, {uid: 1000, gid: 1000})
	} catch (e) {
		console.log(e)
	}


};

CommandLineClient.prototype.pushState = function (state) {
	var self = this;


};
