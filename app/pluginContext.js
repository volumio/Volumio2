'use strict';

var HashMap = require('hashmap');

module.exports = PluginContext;
function PluginContext(ccommand, server) {
	var self = this;

	self.coreCommand = ccommand;
	self.websocketServer = server;
	self.logger = ccommand.logger;

	self.env = new HashMap();

	//TODO: add environment variables here
}

PluginContext.prototype.getEnvVariable = function (key) {
	var self = this;

	return self.env.get(key);
};

PluginContext.prototype.setEnvVariable = function (key, value) {
	var self = this;

	return self.env.set(key, value);
};