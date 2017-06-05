'use strict';
var libQ = require('kew');
module.exports = ExamplePlugin;

function ExamplePlugin(context) {
	var self = this;

}


/*
 * This method can be defined by every plugin which needs to be informed of the startup of Volumio.
 * The Core controller checks if the method is defined and executes it on startup if it exists.
 */
ExamplePlugin.prototype.onVolumioStart = function () {
	var self = this;
	//Perform startup tasks here

    return libQ.resolve();
};

ExamplePlugin.prototype.onStop = function () {
	var self = this;
	//Perform stop tasks here
};

ExamplePlugin.prototype.onRestart = function () {
	var self = this;
	//Perform restart tasks here
};

ExamplePlugin.prototype.onInstall = function () {
	var self = this;
	//Perform your installation tasks here
};

ExamplePlugin.prototype.onUninstall = function () {
	var self = this;
	//Perform your deinstallation tasks here
};

ExamplePlugin.prototype.getUIConfig = function () {
	var self = this;

	return {success: true, plugin: "example_plugin"};
};

ExamplePlugin.prototype.setUIConfig = function (data) {
	var self = this;
	//Perform your UI configuration tasks here
};

ExamplePlugin.prototype.getConf = function (varName) {
	var self = this;
	//Perform your tasks to fetch config data here
};

ExamplePlugin.prototype.setConf = function (varName, varValue) {
	var self = this;
	//Perform your tasks to set config data here
};

//Optional functions exposed for making development easier and more clear
ExamplePlugin.prototype.getSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your tasks to fetch system config data here
};

ExamplePlugin.prototype.setSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your tasks to set system config data here
};

ExamplePlugin.prototype.getAdditionalConf = function () {
	var self = this;
	//Perform your tasks to fetch additional config data here
};

ExamplePlugin.prototype.setAdditionalConf = function () {
	var self = this;
	//Perform your tasks to set additional config data here
};
