var io 	= require('socket.io-client');


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

