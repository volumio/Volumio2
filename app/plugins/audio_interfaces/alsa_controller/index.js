var io 	= require('socket.io-client');
var libQ = require('kew');
var exec = require('child_process').exec;
var fs = require('fs-extra');
var S=require('string');

// Define the ControllerMpd class
module.exports = ControllerAlsa;
function ControllerAlsa(context) {
	// This fixed variable will let us refer to 'this' object at deeper scopes
	var self = this;
	self.context=context;
	self.commandRouter = self.context.coreCommand;
	self.logger=self.context.logger;

}

ControllerAlsa.prototype.onVolumioStart = function() {
	var self=this;

	var configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');

	self.config= new (require('v-conf'))();
	self.config.loadFile(configFile);


	var volume=self.config.get('volumestart');

	var socketURL = 'http://localhost:3000';
	var options = {
		transports: ['websocket'],
		'force new connection': true
	};

	var client1 = io.connect(socketURL, options);

	client1.on('connect', function(data){
		self.logger.info("Setting volume on startup at "+volume);
		client1.emit('volume', volume);
	});

	if(self.config.has('outputdevice')==false)
		self.config.addConfigValue('outputdevice','string','0');

	self.logger.debug("Creating shared var alsa.outputdevice");
	self.commandRouter.sharedVars.addConfigValue('alsa.outputdevice','string',self.config.get('outputdevice'));
	self.commandRouter.sharedVars.registerCallback('alsa.outputdevice',self.outputDeviceCallback.bind(self));
}

ControllerAlsa.prototype.outputDeviceCallback = function(value) {
	var self=this;

	self.config.set('outputdevice',value);
}

ControllerAlsa.prototype.getConfigParam = function(key) {
	var self=this;

	return self.config.get(key);
}

ControllerAlsa.prototype.setConfigParam = function(data) {
	var self=this;

	self.config.set(data.key,data.value);
}


ControllerAlsa.prototype.getConfigurationFiles = function()
{
	var self = this;

	return ['config.json'];
}

ControllerAlsa.prototype.getAlsaCards = function()
{
	var self = this;
	var cards=[];
	var index=0;

	while(fs.existsSync('/proc/asound/card'+index+'/pcm0p/info'))
	{
		var content=fs.readFileSync('/proc/asound/card'+index+'/pcm0p/info');

		var splitted=content.toString().split('\n');
		for(var i in splitted)
		{
			var line=S(splitted[i]);
			if(line.startsWith('id:'))
			{
				cards.push({id:index, name:line.chompLeft('id:').trim().s});
				break;
			}

		}

		index++;

	}

	return cards;


}