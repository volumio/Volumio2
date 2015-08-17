var libQ = require('kew');
var libFast = require('fast.js');
var fs=require('fs-extra');
var config=new (require(__dirname+'/../../lib/config.js'))();
var foundVolumioInstances=new (require(__dirname+'/../../lib/config.js'))();
var mdns=require('mdns');

// Define the ControllerVolumioDiscovery class
module.exports = ControllerVolumioDiscovery;

function ControllerVolumioDiscovery(commandRouter) {
	var self = this;

	//getting configuration
	config.loadFile(__dirname+'/config.json');

	// Save a reference to the parent commandRouter
	self.commandRouter = commandRouter;
}

ControllerVolumioDiscovery.prototype.onVolumioStart = function() {
	var self = this;

	var systemController=self.commandRouter.getController('system');
	var name=systemController.getConf('playerName');
	var uuid=systemController.getConf('uuid');;
	var serviceName=config.get('service');
	var servicePort=config.get('port');

	var txt_record={
		volumioName: name,
		UUID:uuid
	};

	var ad = mdns.createAdvertisement(mdns.tcp(serviceName), servicePort,{txtRecord: txt_record});
	ad.start();


	var sequence = [
		mdns.rst.DNSServiceResolve()
		, mdns.rst.getaddrinfo({families: [4] })
	];
	var browser = mdns.createBrowser(mdns.tcp(serviceName),{resolverSequence: sequence});

	browser.on('serviceUp', function(service) {
		if(foundVolumioInstances.findProp(service.txtRecord.volumioName)==null)
		{
			console.log("mDNS: Found device "+service.txtRecord.volumioName);
			foundVolumioInstances.addConfigValue(service.txtRecord.volumioName+'.UUID',"string",service.txtRecord.UUID);
			foundVolumioInstances.addConfigValue(service.txtRecord.volumioName+'.addresses',"array",service.addresses);
			foundVolumioInstances.addConfigValue(service.txtRecord.volumioName+'.port',"string",service.port);

			foundVolumioInstances.addConfigValue(service.txtRecord.volumioName+'.osname',"string",service.name);

			var toAdvertise=self.getDevices();
			self.commandRouter.pushMultiroomDevices(toAdvertise);
		}
	});
	browser.on('serviceDown', function(service) {
		var keys=foundVolumioInstances.getKeys();

		for(var i in keys)
		{
			var key=keys[i];
			var osname=foundVolumioInstances.get(key+'.osname');

			if(osname==service.name)
				foundVolumioInstances.delete(key);
		}

		var toAdvertise=self.getDevices();
		self.commandRouter.pushMultiroomDevices(toAdvertise);

	});
	browser.start();
}

ControllerVolumioDiscovery.prototype.getDevices=function()
{
	var self=this;

	var response={
		misc: {debug: true},
		list: []};

	var keys=foundVolumioInstances.getKeys();

	for(var i in keys)
	{
		var key=keys[i];

		var osname=foundVolumioInstances.get(key+'.osname');
		var port=foundVolumioInstances.get(key+'.port');
		var uuid=foundVolumioInstances.get(key+'.UUID');


		var addresses=foundVolumioInstances.get(key+'.addresses');

		for(var j in addresses)
		{
			var address=addresses[j];
			var device={
				id:uuid,
				host:'http://'+address+":"+port,
				name:key,
				state: {
					status: 'play',
					volume: 90,
					mute: false,
					artist: 'Franz ferdinand',
					track: 'No you Girls'
				}
			};


			response.list.push(device);
		}

	}

	return response;

}

ControllerVolumioDiscovery.prototype.onStop = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerVolumioDiscovery.prototype.onRestart = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerVolumioDiscovery.prototype.onInstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerVolumioDiscovery.prototype.onUninstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerVolumioDiscovery.prototype.getUIConfig = function()
{
	var self = this;

	/*var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

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
	uiconf.sections[1].content[1].value=config.get('wlanpass');*/

	return uiconf;
}

ControllerVolumioDiscovery.prototype.setUIConfig = function(data)
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

}

ControllerVolumioDiscovery.prototype.getConf = function(varName)
{
	var self = this;

	return self.config.get(varName);
}

ControllerVolumioDiscovery.prototype.setConf = function(varName, varValue)
{
	var self = this;

	self.config.set(varName,varValue);
}

//Optional functions exposed for making development easier and more clear
ControllerVolumioDiscovery.prototype.getSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerVolumioDiscovery.prototype.setSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerVolumioDiscovery.prototype.getAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerVolumioDiscovery.prototype.setAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}


