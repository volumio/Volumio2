var libQ = require('kew');
var libNet = require('net');
var libFast = require('fast.js');
var fs=require('fs-extra');
var exec = require('child_process').exec;
Wireless = require('wireless');
var fs = require('fs');
var connected = false;
var iface = 'wlan0';

var wireless = new Wireless({
	iface: iface,
	updateFrequency: 13,
	vanishThreshold: 7,
});

// Define the ControllerNetwork class
module.exports = ControllerNetwork;

function ControllerNetwork(commandRouter) {
	var self = this;
	//getting configuration
	var config=fs.readJsonSync(__dirname+'/config.json');

}

ControllerNetwork.prototype.onVolumioStart = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerNetwork.prototype.onStart = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerNetwork.prototype.onStop = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerNetwork.prototype.onRestart = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerNetwork.prototype.onInstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetwork.prototype.onUninstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetwork.prototype.getUIConfig = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetwork.prototype.setUIConfig = function(data)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetwork.prototype.getConf = function(varName)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetwork.prototype.setConf = function(varName, varValue)
{
	var self = this;
	//Perform your installation tasks here
}

//Optional functions exposed for making development easier and more clear
ControllerNetwork.prototype.getSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetwork.prototype.setSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetwork.prototype.getAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetwork.prototype.setAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetwork.prototype.scanWirelessNetworks = function()
{

}



