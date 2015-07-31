var libQ = require('kew');
var libNet = require('net');
var libFast = require('fast.js');
var fs=require('fs-extra');
var exec = require('child_process').exec;
var Wireless = require('./lib/index.js');
var fs=require('fs-extra');
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
	var eStatic=config['ethstatic'].value;

	// Save a reference to the parent commandRouter
	self.commandRouter = commandRouter;
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


var wireless = new Wireless({
	iface: iface,
	updateFrequency: 20,
	vanishThreshold: 7,
});

ControllerNetwork.prototype.scanWirelessNetworks = function(defer)
{
	var self = this;
	wireless.enable(function(error) {
		if (error) {
			console.log("[ FAILURE] Unable to enable wireless card. Quitting...");
			defer.reject(new Error("[ FAILURE] Unable to enable wireless card. Quitting..."));
			return;
		}
		console.log("[PROGRESS] Starting wireless scan...");

		wireless.start();
	});

	wireless.on('appear', function(network) {
		var quality = Math.floor(network.quality / 100 * 100);


		if (network.strength >= 65)
			signalStrength = 5;
		else if (network.strength >= 50)
			signalStrength = 4;
		else if (network.strength >= 40)
			signalStrength = 3;
		else if (network.strength >= 30)
			signalStrength = 2;
		else if (network.strength >= 20)
			signalStrength = 1;
		var ssid = network.ssid || undefined;

		var encryption_type = 'Open';
		if (network.encryption_wep) {
			encryption_type = 'WEP';
		} else if (network.encryption_wpa && network.encryption_wpa2) {
			encryption_type = 'WPA&WPA2';
		} else if (network.encryption_wpa) {
			encryption_type = 'WPA';
		} else if (network.encryption_wpa2) {
			encryption_type = 'WPA2';
		}


		if (ssid != undefined) {
			var self = this;
			var result = JSON.stringify({
				networs_ssid: ssid,
				signal: signalStrength,
				encryption: encryption_type
			});




		wireless.disable(function () {
			wireless.stop(
				print(result));

		});
		}
	});

	var deferDone=false;
	function print(networkarray) {
		if(deferDone==false)
		{
			defer.resolve(networkarray);
			deferDone=true;
		}
		self.pushWirelessNetworks(networkarray);

	}



}

ControllerNetwork.prototype.pushWirelessNetworks = function(scanresult) {
	var self = this;

	return self.commandRouter.volumiopushwirelessnetworks(scanresult);
}

ControllerNetwork.prototype.wirelessScan = function(scanresult) {
	var self = this;

	var defer = libQ.defer();
	self.scanWirelessNetworks(defer);
	return defer.promise;
}

