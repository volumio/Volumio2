'use strict';

var fs=require('fs-extra');
var config= new (require('v-conf'))();
var foundVolumioInstances= new (require('v-conf'))();
var mdns=require('mdns');
var HashMap = require('hashmap');
var io=require('socket.io-client');

// Define the ControllerVolumioDiscovery class

var registeredUUIDs = [];

module.exports = ControllerVolumioDiscovery;

function ControllerVolumioDiscovery(context) {
	var self = this;

	self.remoteConnections=new HashMap();

	// Save a reference to the parent commandRouter
	self.context=context;
	self.logger=self.context.logger;
	self.commandRouter = self.context.coreCommand;

	self.callbacks=[];
}


ControllerVolumioDiscovery.prototype.getConfigurationFiles = function()
{
	var self = this;

	return ['config.json'];
};

ControllerVolumioDiscovery.prototype.onVolumioStart = function() {
	var self = this;

	var configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');
	config.loadFile(configFile);

	self.startAdvertisement();
	self.startMDNSBrowse();
};

ControllerVolumioDiscovery.prototype.getNewName=function(curName,i)
{
	var self=this;
	var keys=foundVolumioInstances.getKeys();
	var collides=false;

	var nameToCheck;
	if(i==0)
		nameToCheck=curName;
	else nameToCheck=curName+i;

	self.context.coreCommand.pushConsoleMessage(keys);
	for(var k in keys)
	{
		var key=keys[k];
		var ithName=foundVolumioInstances.get(key+'.name');

		self.context.coreCommand.pushConsoleMessage('Checking name '+ithName+' against '+nameToCheck);
		if(ithName==nameToCheck)
			collides=true;
	}

	var newi=parseInt(i+1);
	if(collides==true)
		return self.getNewName(curName,newi);
	else return nameToCheck;
};

ControllerVolumioDiscovery.prototype.startAdvertisement=function()
{
	var self = this;

	try {
		var systemController = self.commandRouter.pluginManager.getPlugin('system_controller', 'system');
		var name = systemController.getConf('playerName');
		var uuid = systemController.getConf('uuid');
		var serviceName = config.get('service');
		var servicePort = config.get('port');

		var txt_record = {
			volumioName: name,
			UUID: uuid
		};

		self.context.coreCommand.pushConsoleMessage("Started advertising...");

		self.ad = mdns.createAdvertisement(mdns.tcp(serviceName), servicePort, {txtRecord: txt_record}, function (error, service) {
			if (service.name != name) {
				self.context.coreCommand.pushConsoleMessage('Changing my name to ' + service.name);
				systemController.setConf('playerName', service.name);

				self.ad.stop();
				txt_record.volumioName = service.name;
				setTimeout(
					function () {
						mdns.createAdvertisement(mdns.tcp(serviceName), servicePort, {txtRecord: txt_record}, function (error, service) {
							console.log(error);
						});


					},
					5000
				);

			}

		});
		self.ad.on('error', function(error)
		{
			self.context.coreCommand.pushConsoleMessage('mDNS Advertisement raised the following error ' + error);
			self.startAdvertisement();
		});
		self.ad.start();
	}
	catch(ecc)
	{
		//console.log(ecc);
		self.startAdvertisement();
	}
};

ControllerVolumioDiscovery.prototype.startMDNSBrowse=function()
{
	var self=this;

	try
	{

		var serviceName=config.get('service');
		var servicePort=config.get('port');

		var sequence = [
			mdns.rst.DNSServiceResolve()
			, mdns.rst.getaddrinfo({families: [4] })
		];
		self.browser = mdns.createBrowser(mdns.tcp(serviceName),{resolverSequence: sequence});

		self.browser.on('error',function(error){
			self.context.coreCommand.pushConsoleMessage('mDNS Browse raised the following error ' + error);
			self.startMDNSBrowse();
		});
		self.browser.on('serviceUp', function(service) {
			console.log("AVAPI: WE GOT  "+ service.txtRecord.UUID);
			if (registeredUUIDs.indexOf(service.txtRecord.UUID) > -1) {
				console.log("AVAPI: this is already registered,  " + service.txtRecord.UUID);
				foundVolumioInstances.delete(service.txtRecord.UUID+'.name');
				self.remoteConnections.remove(service.txtRecord.UUID+'.name');
			} else {
				registeredUUIDs.push(service.txtRecord.UUID);
				console.log("AVAPI: adding " + service.txtRecord.UUID);
			}

			//console.log(service);
			self.context.coreCommand.pushConsoleMessage('mDNS: Found device '+service.txtRecord.volumioName);
			foundVolumioInstances.addConfigValue(service.txtRecord.UUID+'.name',"string",service.txtRecord.volumioName);
			foundVolumioInstances.addConfigValue(service.txtRecord.UUID+'.addresses',"array",service.addresses);
			foundVolumioInstances.addConfigValue(service.txtRecord.UUID+'.port',"string",service.port);
			foundVolumioInstances.addConfigValue(service.txtRecord.UUID+'.status',"string",'stop');
			foundVolumioInstances.addConfigValue(service.txtRecord.UUID+'.volume',"number",0);
			foundVolumioInstances.addConfigValue(service.txtRecord.UUID+'.mute',"boolean",false);
			foundVolumioInstances.addConfigValue(service.txtRecord.UUID+'.artist',"string",'');
			foundVolumioInstances.addConfigValue(service.txtRecord.UUID+'.track',"string",'');
			foundVolumioInstances.addConfigValue(service.txtRecord.UUID+'.albumart',"string",'');

			self.connectToRemoteVolumio(service.txtRecord.UUID,service.addresses[0]);

			var toAdvertise=self.getDevices();
			self.commandRouter.pushMultiroomDevices(toAdvertise);

			for(var i in self.callbacks)
			{
				var c=self.callbacks[i];

				var callback= c.bind(c.this);
				callback(toAdvertise);
			}
		});
		self.browser.on('serviceDown', function(service) {
			self.context.coreCommand.pushConsoleMessage('mDNS: A device disapperared from network');

			var keys=foundVolumioInstances.getKeys();

			for(var i in keys)
			{
				var key=keys[i];
				var uuidindex = registeredUUIDs.indexOf(key);
				if (uuidindex !== -1) {
				    registeredUUIDs.splice(uuidindex, 1);
				}

				var osname=foundVolumioInstances.get(key+'.name');
				if(osname==service.name)
				{
					self.context.coreCommand.pushConsoleMessage('mDNS: Device '+service.name+' disapperared from network');
					foundVolumioInstances.delete(key);

					self.remoteConnections.remove(key);
				}
			}

			var toAdvertise=self.getDevices();
			self.commandRouter.pushMultiroomDevices(toAdvertise);

			for(var i in self.callbacks)
			{
				var callback=self.callbacks[i];

				callback.call(callback,toAdvertise);
			}
		});
		self.browser.start();
	}
	catch(error)
	{
		self.startMDNSBrowse();
	}
};


ControllerVolumioDiscovery.prototype.connectToRemoteVolumio = function(uuid,ip) {
	var self=this;

	var systemController = self.commandRouter.pluginManager.getPlugin('system_controller', 'system');
	var myuuid = systemController.getConf('uuid');

	if((!self.remoteConnections.has(uuid))&&(myuuid!=uuid))
	{
		var socket= io.connect('http://'+ip+':3000');
		socket.on('connect',function()
		{
			socket.on('pushState',function(data)
			{
				foundVolumioInstances.set(uuid+'.status',data.status);
				foundVolumioInstances.set(uuid+'.volume',data.volume);
				foundVolumioInstances.set(uuid+'.mute',data.mute);
				foundVolumioInstances.set(uuid+'.artist',data.artist);
				foundVolumioInstances.set(uuid+'.track',data.title);
				foundVolumioInstances.set(uuid+'.albumart',data.albumart);
				var toAdvertise=self.getDevices();
				self.commandRouter.pushMultiroomDevices(toAdvertise);
			});
		});

		self.remoteConnections.set(uuid,socket);
	}

};

String.prototype.capitalize = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

ControllerVolumioDiscovery.prototype.saveDeviceInfo=function(data)
{
	var self=this;
	//console.log("AV: Got saveDeviceInfo: " + JSON.stringify(data,null,4));
	if (data.volume == undefined) data.volume = 0;
	if (data.status == undefined) data.status = '';
	if (data.artist == undefined) data.artist = '';
	if (data.title == undefined) data.title = '';
	if (data.albumart == undefined) data.albumart = '';

	var uuid = data.uuid;

	if (uuid == undefined) {
		var systemController = self.commandRouter.pluginManager.getPlugin('system_controller', 'system');
		uuid = systemController.getConf('uuid');
		//console.log("Using self UUID");
	}
	foundVolumioInstances.set(uuid+'.status',data.status);
	foundVolumioInstances.set(uuid+'.volume',data.volume > -1 ? data.volume : 0);
	foundVolumioInstances.set(uuid+'.mute',data.mute);
	foundVolumioInstances.set(uuid+'.artist',data.artist);
	foundVolumioInstances.set(uuid+'.track',data.title);
	foundVolumioInstances.set(uuid+'.albumart',data.albumart);


};


ControllerVolumioDiscovery.prototype.getDevices=function()
{
	var self=this;
	var systemController = self.commandRouter.pluginManager.getPlugin('system_controller', 'system');
	var myuuid = systemController.getConf('uuid');

	var response={
		misc: {debug: true},
		list: []};

	var keys=foundVolumioInstances.getKeys();

	for(var i in keys)
	{
		var key=keys[i];

		var osname=foundVolumioInstances.get(key+'.name');
		var port=foundVolumioInstances.get(key+'.port');
		var status=foundVolumioInstances.get(key+'.status');
		var volume=foundVolumioInstances.get(key+'.volume');
		var mute=foundVolumioInstances.get(key+'.mute');
		var artist=foundVolumioInstances.get(key+'.artist');
		var track=foundVolumioInstances.get(key+'.track');
		var albumart=foundVolumioInstances.get(key+'.albumart');

		var isSelf=key==myuuid;

		var addresses=foundVolumioInstances.get(key+'.addresses');

		for(var j in addresses)
		{
			var address=addresses[j];
			var device={
				id:key,
				host:'http://'+address,
				name:osname.capitalize(),
				isSelf:isSelf,
				state: {
					status: status,
					volume: volume,
					mute: mute,
					artist: artist,
					track: track,
					albumart:'http://'+address+albumart
				}
			};


			response.list.push(device);
		}

	}
	return response;

};

ControllerVolumioDiscovery.prototype.onStop = function() {
	var self = this;
	//Perform startup tasks here
};

ControllerVolumioDiscovery.prototype.onRestart = function() {
	var self = this;
	//Perform startup tasks here
};

ControllerVolumioDiscovery.prototype.onInstall = function()
{
	var self = this;
	//Perform your installation tasks here
};

ControllerVolumioDiscovery.prototype.onUninstall = function()
{
	var self = this;
	//Perform your installation tasks here
};

ControllerVolumioDiscovery.prototype.getUIConfig = function()
{
	var self = this;


	return uiconf;
};

ControllerVolumioDiscovery.prototype.setUIConfig = function(data)
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

};

ControllerVolumioDiscovery.prototype.getConf = function(varName)
{
	var self = this;

	return self.config.get(varName);
};

ControllerVolumioDiscovery.prototype.setConf = function(varName, varValue)
{
	var self = this;

	self.config.set(varName,varValue);
};

//Optional functions exposed for making development easier and more clear
ControllerVolumioDiscovery.prototype.getSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
};

ControllerVolumioDiscovery.prototype.setSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
};

ControllerVolumioDiscovery.prototype.getAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
};

ControllerVolumioDiscovery.prototype.setAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
};


/**
 * Registers a callback that is called when a device appears or disappears
 * @param callback
 */
ControllerVolumioDiscovery.prototype.registerCallback = function(callback)
{
	var self = this;

	self.callbacks.push(callback);
};


/**
 * Receives updates for an host about its only information
 * @param info
 */
ControllerVolumioDiscovery.prototype.receiveMultiroomDeviceUpdate = function(info)
{
	var self = this;

	//self.logger.info("receiveMultiroomDeviceUpdate: "+JSON.stringify(info));

};

// ControllerVolumioDiscovery.prototype.saveDeviceInfo=function(data)
// {
// 	var self=this;

// 	var systemController = self.commandRouter.pluginManager.getPlugin('system_controller', 'system');
// 	var uuid = systemController.getConf('uuid');
// 	foundVolumioInstances.set(uuid+'.status',data.status);
// 	foundVolumioInstances.set(uuid+'.volume',data.volume > -1 ? data.volume : 0);
// 	foundVolumioInstances.set(uuid+'.mute',data.mute);
// 	foundVolumioInstances.set(uuid+'.artist',data.artist);
// 	foundVolumioInstances.set(uuid+'.track',data.title);
// 	foundVolumioInstances.set(uuid+'.albumart',data.albumart);
// 	for(var i in self.callbacks)
// 			{
// 				var c=self.callbacks[i];

// 				var callback= c.bind(c.this);
// 				callback(toAdvertise);
// 			}
// }
