'use strict';

var libQ = require('kew');
var libFast = require('fast.js');
var fs=require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;


// Define the ControllerUPNPBrowser class
module.exports = ControllerUPNPBrowser;
function ControllerUPNPBrowser(context) {
	// This fixed variable will let us refer to 'this' object at deeper scopes
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;

}



ControllerUPNPBrowser.prototype.onVolumioStart = function()
{
	var self = this;
	var configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);



}

ControllerUPNPBrowser.prototype.getConfigurationFiles = function()
{
	return ['config.json'];
}

ControllerUPNPBrowser.prototype.addToBrowseSources = function () {
	var data = {name: 'UPNP', uri: 'upnp',plugin_type:'music_service',plugin_name:'upnp_browser'};
	this.commandRouter.volumioAddToBrowseSources(data);
};

// Plugin methods -----------------------------------------------------------------------------

ControllerUPNPBrowser.prototype.startDjMount = function() {
	var self = this;

	var defer=libQ.defer();

	exec("/usr/bin/sudo /bin/systemctl start djmount.service", {uid:1000,gid:1000}, function (error, stdout, stderr) {
		if (error !== null) {
			self.commandRouter.pushConsoleMessage('The following error occurred while starting DJMOUNT: ' + error);
			defer.reject();
		}
		else {
			self.commandRouter.pushConsoleMessage('Djmount Daemon Started');
			defer.resolve();
		}
	});

	return defer.promise;
};



ControllerUPNPBrowser.prototype.onStop = function() {
	var self = this;

	self.logger.info("Killing DJMOUNT daemon");
	exec("/usr/bin/sudo /usr/bin/killall djmount", function (error, stdout, stderr) {
		if(error){
			self.logger.info('Cannot kill djmount Daemon')
		}
	});

	return libQ.resolve();
};

ControllerUPNPBrowser.prototype.onStart = function() {
	var self = this;

	var defer=libQ.defer();

	self.startDjMount()

	return defer.promise;
};

ControllerUPNPBrowser.prototype.handleBrowseUri = function (curUri) {
	var self = this;



	return response;
};


// Controller functions

ControllerUPNPBrowser.prototype.stop = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerUPNPBrowser::stop');

	return self.sendSpopCommand('stop', []);
};

ControllerUPNPBrowser.prototype.onRestart = function() {
	var self = this;
	//
};






ControllerUPNPBrowser.prototype.getConf = function(varName) {
	var self = this;
	//Perform your installation tasks here
};


ControllerUPNPBrowser.prototype.clearAddPlayTrack = function(track) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerUPNPBrowser::clearAddPlayTrack');


};


ControllerUPNPBrowser.prototype.stop = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerUPNPBrowser::stop');


};


ControllerUPNPBrowser.prototype.pause = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerUPNPBrowser::pause');

};


ControllerUPNPBrowser.prototype.resume = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerUPNPBrowser::resume');

};


ControllerUPNPBrowser.prototype.getTracklist = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerUPNPBrowser::getTracklist');

	return self.tracklistReady
		.then(function() {
			return self.tracklist;
		});
};


ControllerUPNPBrowser.prototype.getState = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerUPNPBrowser::getState');


};


ControllerUPNPBrowser.prototype.pushState = function(state) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerUPNPBrowser::pushState');

	return self.commandRouter.servicePushState(state, self.servicename);
};

// Pass the error if we don't want to handle it
ControllerUPNPBrowser.prototype.pushError = function(sReason) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerUPNPBrowser::pushError(' + sReason + ')');

	// Return a resolved empty promise to represent completion
	return libQ.resolve();
};
