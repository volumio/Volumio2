var libMpd = require('mpd');
var libQ = require('kew');
var libFast = require('fast.js');
var libUtil = require('util');
var libFsExtra = require('fs-extra');
var libChokidar = require('chokidar');
var exec = require('child_process').exec;
var s=require('string');
var ifconfig = require('wireless-tools/ifconfig');
var ip = require('ip');
var nodetools=require('nodetools');

// Define the ControllerMpd class
module.exports = ControllerAlsa;
function ControllerAlsa(context) {
	// This fixed variable will let us refer to 'this' object at deeper scopes
	var self = this;
	self.context=context;
	self.commandRouter = self.context.coreCommand;
	self.logger=self.context.logger;

}

ControllerAlsa.prototype.onVolumioStart = function() {
	var self=this;

	var configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');

	self.config= new (require('v-conf'))();
	self.config.loadFile(configFile);

}

ControllerAlsa.prototype.getConfigParam = function(key) {
	var self=this;

	console.log("Reading value "+key+": "+ self.config.get(key));

	return self.config.get(key);
}

ControllerAlsa.prototype.setConfigParam = function(data) {
	var self=this;

	console.log("Setting value "+data.value+" to key "+data.key);
	self.config.set(data.key,data.value);
}


ControllerAlsa.prototype.getConfigurationFiles = function()
{
	var self = this;

	return ['config.json'];
}

