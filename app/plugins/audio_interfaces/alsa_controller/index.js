'use strict';

var io = require('socket.io-client');
var fs = require('fs-extra');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var libQ = require('kew');

// Define the ControllerMpd class
module.exports = ControllerAlsa;
function ControllerAlsa(context) {
	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
}

ControllerAlsa.prototype.onVolumioStart = function () {

	var configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');

	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);

	var volumeval = this.config.get('volumestart');

	if (volumeval != "disabled"){
	var volume = Number(volumeval);

	var socketURL = 'http://localhost:3000';
	var options = {
		transports: ['websocket'],
		'force new connection': true
	};

	var client1 = io.connect(socketURL, options);

	var self = this;
	client1.on('connect', function (data) {
		self.logger.info("Setting volume on startup at " + volume);
		client1.emit('volume', volume);
	});
	}

	if (this.config.has('outputdevice') == false)
		this.config.addConfigValue('outputdevice', 'string', '0');

	this.logger.debug("Creating shared var alsa.outputdevice");
	this.commandRouter.sharedVars.addConfigValue('alsa.outputdevice', 'string', this.config.get('outputdevice'));
	this.commandRouter.sharedVars.registerCallback('alsa.outputdevice', this.outputDeviceCallback.bind(this));
};

ControllerAlsa.prototype.outputDeviceCallback = function (value) {
	this.config.set('outputdevice', value);
};

ControllerAlsa.prototype.getConfigParam = function (key) {
	return this.config.get(key);
};

ControllerAlsa.prototype.setConfigParam = function (data) {
	this.config.set(data.key, data.value);
};


ControllerAlsa.prototype.getConfigurationFiles = function () {
	return ['config.json'];
};


ControllerAlsa.prototype.getAlsaCards = function () {
	var cards = [];

	var soundCardDir = '/proc/asound/';
	var idFile = '/id';
	var regex = /card(\d+)/;
	var carddata = fs.readJsonSync(('/volumio/app/plugins/audio_interfaces/alsa_controller/cards.json'),  'utf8', {throws: false});

	var soundFiles = fs.readdirSync(soundCardDir);

	for (var i = 0; i < soundFiles.length; i++) {
		var fileName = soundFiles[i];
		var matches = regex.exec(fileName);
		var idFileName = soundCardDir + fileName + idFile;
		if (matches && fs.existsSync(idFileName)) {
			var id = matches[1];
			var content = fs.readFileSync(idFileName);
			var rawname = content.toString().trim();
			var name = rawname;
			for (var n = 0; n < carddata.cards.length; n++){
				var cardname = carddata.cards[n].name.toString().trim();
				if (cardname === rawname){
					 var name = carddata.cards[n].prettyname;
				}
			} cards.push({id: id, name: name});

		}
	}

	return cards;
};


ControllerAlsa.prototype.getMixerControls = function (device) {
	var self = this;

	var defer = libQ.defer();
	var mixers = [];
	var cmd = 'amixer -c '+device+' scontrols';
	var dirbleDefer = libQ.defer();
	exec(cmd, function(err, stdout, stderr) {
		if (err) {
			self.logger.info('Cannot execute amixer ' + err);
		} else {
			var array = stdout.toString().split("\n");
			for (i in array) {
			var line = array[i].split("'");
			var control = line[1];
			var number = line[2];
			var mixerraw = control + number;
				if (control && number){
			var mixer = mixerraw.replace(",", " ");
				mixers.push(mixer);
				}
			}
		} defer.resolve(mixers);
	});


	return defer.promise;

}