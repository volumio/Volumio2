'use strict';

var HashMap = require('hashmap');

module.exports = PluginContext;
function PluginContext(ccommand, server, configManager) {

	this.coreCommand = ccommand;
	this.websocketServer = server;
	this.configManager = configManager;
	this.logger = ccommand.logger;
	this.env = new HashMap();

	//TODO: add environment variables here
}

PluginContext.prototype.getEnvVariable = function (key) {
	return this.env.get(key);
};

PluginContext.prototype.setEnvVariable = function (key, value) {
	return this.env.set(key, value);
};