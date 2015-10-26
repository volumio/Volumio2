var libQ = require('kew');
var libNet = require('net');
var libFast = require('fast.js');
var fs=require('fs-extra');
var exec = require('child_process').exec;
var Wireless = require('./lib/index.js');
var iwconfig = require('./lib/iwconfig.js');
var iwlist = require('./lib/iwlist.js');
var config= new (require('v-conf'))();

var connected = false;
var iface = 'wlan0';

var wireless = new Wireless({
	iface: iface,
	updateFrequency: 13,
	vanishThreshold: 7,
});

// Define the ControllerNetwork class
module.exports = ControllerNetwork;

function ControllerNetwork(context) {
	var self = this;

	// Save a reference to the parent commandRouter
	self.context=context;
	self.commandRouter = self.context.coreCommand;

}

ControllerNetwork.prototype.onVolumioStart = function() {
	var self = this;
	//Perform startup tasks here

	//getting configuration
	var configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');
	config.loadFile(configFile);
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

ControllerNetwork.prototype.getConfigurationFiles = function()
{
	var self = this;

	return ['config.json'];
}

ControllerNetwork.prototype.getUIConfig = function()
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

	//dhcp
	uiconf.sections[0].content[0].value=config.get('dhcp');

	//static ip
	uiconf.sections[0].content[1].value=config.get('ethip');

	//static netmask
	uiconf.sections[0].content[2].value=config.get('ethnetmask');

	//static gateway
	uiconf.sections[0].content[3].value=config.get('ethgateway');

	//WLan ssid
	uiconf.sections[1].content[0].value=config.get('wlanssid');

	//
	uiconf.sections[1].content[1].value=config.get('wlanpass');

	return uiconf;
}

ControllerNetwork.prototype.setUIConfig = function(data)
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

}

ControllerNetwork.prototype.getConf = function(varName)
{
	var self = this;

	return self.config.get(varName);
}

ControllerNetwork.prototype.setConf = function(varName, varValue)
{
	var self = this;

	self.config.set(varName,varValue);
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


ControllerNetwork.prototype.getWirelessNetworks = function(defer)
{
	var self = this;
	var networksarray = [];

	var defer=libQ.defer();
	iwlist.scan('wlan0', function(err, networks) {
		var self = this;
		self.networksarray = networks;
		defer.resolve(self.networksarray);
	});
	return defer.promise;
}


ControllerNetwork.prototype.saveWiredNet=function(data)
{
	var self = this;

	var defer = libQ.defer();

	var dhcp=data['dhcp'];
	var static_ip=data['static_ip'];
	var static_netmask=data['static_netmask'];
	var static_gateway=data['static_gateway'];

	//	fs.copySync(__dirname + '/config.json', __dirname + '/config.json.orig');

	config.set('dhcp', dhcp);
	config.set('ethip', static_ip);
	config.set('ethnetmask', static_netmask);
	config.set('ethgateway', static_gateway);

	self.rebuildNetworkConfig();
	self.commandRouter.pushToastMessage('success',"Configuration update", 'The configuration has been successfully updated');


	defer.resolve({});
	return defer.promise;
}


ControllerNetwork.prototype.saveWirelessNet=function(data)
{
	var self = this;

	var defer = libQ.defer();

	var network_ssid=data['network_ssid'];
	var network_pass=data['network_pass'];

	config.set('wlanssid',network_ssid);
	config.set('wlanpass',network_pass);

	self.rebuildNetworkConfig();
	self.commandRouter.pushToastMessage('success',"Configuration update",'The configuration has been successfully updated');

	defer.resolve({});
	return defer.promise;
}

ControllerNetwork.prototype.getData = function(data,key)
{
	var self = this;

	for(var i in data)
	{
		var ithdata=data[i];

		if(ithdata[key]!=undefined)
			return ithdata[key];
	}

	return null;
}

ControllerNetwork.prototype.rebuildNetworkConfig = function()
{
	var self=this;

	try{
		var ws=fs.createOutputStream('/etc/network/interfaces');

		ws.cork();
		ws.write('auto lo\n');
		ws.write('iface lo inet loopback\n');
		ws.write('\n');

		ws.write('auto eth0\n');
		if(config.get('dhcp')==true || config.get('dhcp')=='true')
		{
			ws.write('iface eth0 inet dhcp\n');
		}
		else
		{
			ws.write('iface eth0 inet static\n');

			ws.write('address '+config.get('ethip')+'\n');
			ws.write('netmask '+config.get('ethnetmask')+'\n');
			ws.write('gateway '+config.get('ethgateway')+'\n');
		}

		ws.write('\n');

		ws.write('auto wlan0\n');
		ws.write('iface wlan0 inet dhcp\n');
		ws.write('wireless-power off\n');
		ws.write('wpa-ssid '+config.get('wlanssid')+'\n');
		ws.write('wpa-psk '+config.get('wlanpass')+'\n');

		ws.uncork();
		ws.end();

		console.log("Restarting networking layer");
		exec('sudo /bin/systemctl restart networking.service',
			function (error, stdout, stderr) {

				if (error !== null) {
					self.commandRouter.pushToastMessage('error',"Network restart",'Error while restarting network: '+error);
				}
				else self.commandRouter.pushToastMessage('success',"Network restart",'Network successfully restarted');

			});
	}
	catch(err)
	{
		self.commandRouter.pushToastMessage('error',"Network setup",'Error while setting network: '+err);
	}

}
