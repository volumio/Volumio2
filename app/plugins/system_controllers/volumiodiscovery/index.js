var libQ = require('kew');
var libFast = require('fast.js');
var fs=require('fs-extra');
var config=new (require(__dirname+'/../../../lib/config.js'))();
var foundVolumioInstances=new (require(__dirname+'/../../../lib/config.js'))();
var mdns=require('mdns');

// Define the ControllerVolumioDiscovery class
module.exports = ControllerVolumioDiscovery;

function ControllerVolumioDiscovery(context) {
	var self = this;

	//getting configuration
	config.loadFile(__dirname+'/config.json');

	// Save a reference to the parent commandRouter
	self.context=context;
	self.commandRouter = self.context.coreCommand;
}

ControllerVolumioDiscovery.prototype.onVolumioStart = function() {
	var self = this;

	self.startMDNSBrowse();
	setTimeout(function()
	{
		self.browser.stop();

		var systemController=self.commandRouter.pluginManager.getPlugin('system_controller','system');
		var name=systemController.getConf('playerName');
		var uuid=systemController.getConf('uuid');
		var serviceName=config.get('service');
		var servicePort=config.get('port');

		console.log("Checking volumio instances");

		console.log();
		var newName=self.getNewName(name,0);

		if(newName!=name)
		{
			console.log("Changing instance name to "+newName);
			systemController.setConf('playerName',newName);
			name=newName;
		}

		var txt_record={
			volumioName: name,
			UUID:uuid
		};

		console.log("Started advertising...");
		var ad = mdns.createAdvertisement(mdns.tcp(serviceName), servicePort,{name:name,txtRecord: txt_record});
		ad.start();

		self.startMDNSBrowse();
	},5000);

}

ControllerVolumioDiscovery.prototype.getNewName=function(curName,i)
{
	var self=this;
	var keys=foundVolumioInstances.getKeys();
	var collides=false;

	var nameToCheck;
	if(i==0)
		nameToCheck=curName;
	else nameToCheck=curName+i;

	console.log('Checking name '+nameToCheck);
	for(var i in keys)
	{
		var key=keys[i];
		if(nameToCheck==key)
			collides=true;
	}

	i++;
	if(collides==true)
		return self.getNewName(curName,i);
	else return nameToCheck;
}


ControllerVolumioDiscovery.prototype.startMDNSBrowse=function()
{
	var self=this;
	console.log("Browsing for Volumio instances");


	var serviceName=config.get('service');
	var servicePort=config.get('port');

	//if(self.browser==undefined)
	{
		console.log("Creating browser");

		var sequence = [
			mdns.rst.DNSServiceResolve()
			, mdns.rst.getaddrinfo({families: [4] })
		];
		self.browser = mdns.createBrowser(mdns.tcp(serviceName),{resolverSequence: sequence});

	}

	self.browser.on('serviceUp', function(service) {

		//console.log(service);
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
	self.browser.on('serviceDown', function(service) {
		//console.log(service);
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
	self.browser.start();
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


