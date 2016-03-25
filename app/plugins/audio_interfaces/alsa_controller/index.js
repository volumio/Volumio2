'use strict';

var io = require('socket.io-client');
var fs = require('fs-extra');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var libQ = require('kew');
var libFsExtra = require('fs-extra');
var spawn = require('child_process').spawn;

// Define the ControllerAlsa class
module.exports = ControllerAlsa;
function ControllerAlsa(context) {
	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;
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

	if (this.config.has('outputdevice') == false) {
		this.config.addConfigValue('outputdevice', 'string', '0');
	}
	if (this.config.has('mixer') == false) {
		var value = this.config.get('outputdevice');
		this.setDefaultMixer(value)
	}

	this.logger.debug("Creating shared var alsa.outputdevice");
	this.commandRouter.sharedVars.addConfigValue('alsa.outputdevice', 'string', this.config.get('outputdevice'));
	this.commandRouter.sharedVars.registerCallback('alsa.outputdevice', this.outputDeviceCallback.bind(this));

};


ControllerAlsa.prototype.getUIConfig = function () {
	var self = this;

	var defer = libQ.defer();

	var uiconf = libFsExtra.readJsonSync(__dirname + '/UIConfig.json');
	var value;
	var devicevalue;

	var cards = self.getAlsaCards();

	value = self.config.get('outputdevice');
	if (value == undefined){
		value = 0;}

	self.configManager.setUIConfigParam(uiconf, 'sections[0].content[0].value.value', value);
	self.configManager.setUIConfigParam(uiconf, 'sections[0].content[0].value.label', self.getLabelForSelectedCard(cards, value));

	for (var i in cards) {
		self.configManager.pushUIConfigParam(uiconf, 'sections[0].content[0].options', {
			value: cards[i].id,
			label: cards[i].name
		});
	}

	var i2soptions = self.commandRouter.executeOnPlugin('system_controller', 'i2s_dacs', 'getI2sOptions');
	var i2sstatus = self.commandRouter.executeOnPlugin('system_controller', 'i2s_dacs', 'getI2sStatus');

	if(i2soptions.length > 0){
		if(i2sstatus.enabled){
			self.configManager.setUIConfigParam(uiconf, 'sections[0].content[1].value', i2sstatus.enabled);
			self.configManager.setUIConfigParam(uiconf, 'sections[0].content[2].value', {
				value: i2sstatus.id,
				label: i2sstatus.name
			});

		} else {
			self.configManager.setUIConfigParam(uiconf, 'sections[0].content[1].value', false);
			self.configManager.setUIConfigParam(uiconf, 'sections[0].content[2].value', {
				value: i2soptions[0].value,
				label: i2soptions[0].label
			});
		}

		self.configManager.setUIConfigParam(uiconf, 'sections[0].content[1].id', 'i2s');
		self.configManager.pushUIConfigParam(uiconf, 'sections[0].saveButton.data', 'i2s');
		self.configManager.pushUIConfigParam(uiconf, 'sections[0].saveButton.data', 'i2sid');
		self.configManager.setUIConfigParam(uiconf, 'sections[0].content[1].label', 'I2S DAC');
		self.configManager.setUIConfigParam(uiconf, 'sections[0].content[1].element', 'switch');
		self.configManager.setUIConfigParam(uiconf, 'sections[0].content[2].id', 'i2sid');
		self.configManager.setUIConfigParam(uiconf, 'sections[0].content[2].element', 'select');
		self.configManager.setUIConfigParam(uiconf, 'sections[0].content[2].label', 'DAC Model');

		for(var i in i2soptions) {
			self.configManager.pushUIConfigParam(uiconf, 'sections[0].content[2].options', {
				value: i2soptions[i].value,
				label: i2soptions[i].label
			});
		}
	}

	var mixers = self.getMixerControls(value);
	var activemixer = self.config.get('mixer');

	self.configManager.setUIConfigParam(uiconf, 'sections[2].content[0].id', 'mixer');
	self.configManager.setUIConfigParam(uiconf, 'sections[2].content[0].element', 'select');
	self.configManager.setUIConfigParam(uiconf, 'sections[2].content[0].label', 'Mixer Control');

	console.log(mixers)
	if (typeof mixers != "undefined" && mixers != null && mixers.length > 0) {
		self.configManager.pushUIConfigParam(uiconf, 'sections[2].saveButton.data', 'mixer');
		if (activemixer){
		self.configManager.setUIConfigParam(uiconf, 'sections[2].content[0].value', {
			value: activemixer,
			label: activemixer
		});
		} else {
			self.configManager.setUIConfigParam(uiconf, 'sections[2].content[0].value', {
				value: mixers[0],
				label: mixers[0]
			});
		}

	for(var i in mixers) {
		self.configManager.pushUIConfigParam(uiconf, 'sections[2].content[0].options', {
			value: mixers[i],
			label: mixers[i]
		});
	}

	} else {
		self.configManager.setUIConfigParam(uiconf, 'sections[2].content[0].value', {
			value: "no",
			label: "No Hardware Mixer Available"
		});
		self.configManager.pushUIConfigParam(uiconf, 'sections[2].content[0].options', {
			value: "no",
			label: "No Hardware Mixer Available"
		});

	}



	value = self.getAdditionalConf('music_service', 'mpd', 'gapless_mp3_playback');
	self.configManager.setUIConfigParam(uiconf, 'sections[1].content[0].value', value);
	self.configManager.setUIConfigParam(uiconf, 'sections[1].content[0].value.label', self.getLabelForSelect(self.configManager.getValue(uiconf, 'sections[1].content[0].options'), value));

	value = self.getAdditionalConf('music_service', 'mpd', 'volume_normalization');
	self.configManager.setUIConfigParam(uiconf, 'sections[1].content[1].value', value);
	self.configManager.setUIConfigParam(uiconf, 'sections[1].content[1].value.label', self.getLabelForSelect(self.configManager.getValue(uiconf, 'sections[1].content[1].options'), value));

	value = self.getAdditionalConf('music_service', 'mpd', 'audio_buffer_size');
	self.configManager.setUIConfigParam(uiconf, 'sections[1].content[2].value.value', value);
	self.configManager.setUIConfigParam(uiconf, 'sections[1].content[2].value.label', self.getLabelForSelect(self.configManager.getValue(uiconf, 'sections[1].content[2].options'), value));

	value = self.getAdditionalConf('music_service', 'mpd', 'buffer_before_play');
	self.configManager.setUIConfigParam(uiconf, 'sections[1].content[3].value.value', value);
	self.configManager.setUIConfigParam(uiconf, 'sections[1].content[3].value.label', self.getLabelForSelect(self.configManager.getValue(uiconf, 'sections[1].content[3].options'), value));

	value = self.config.get('volumestart');
	self.configManager.setUIConfigParam(uiconf, 'sections[2].content[1].value.value', value);
	self.configManager.setUIConfigParam(uiconf, 'sections[2].content[1].value.label', self.getLabelForSelect(self.configManager.getValue(uiconf, 'sections[2].content[1].options'), value));

	value = self.config.get('volumemax');
	self.configManager.setUIConfigParam(uiconf, 'sections[2].content[2].value.value', value);
	self.configManager.setUIConfigParam(uiconf, 'sections[2].content[2].value.label', self.getLabelForSelect(self.configManager.getValue(uiconf, 'sections[2].content[2].options'), value));

	value = self.config.get('volumecurvemode');
	self.configManager.setUIConfigParam(uiconf, 'sections[2].content[3].value.value', value);
	self.configManager.setUIConfigParam(uiconf, 'sections[2].content[3].value.label', self.getLabelForSelect(self.configManager.getValue(uiconf, 'sections[2].content[3].options'), value));

	return uiconf;
};

ControllerAlsa.prototype.saveAlsaOptions = function (data) {

	var self = this;

	var defer = libQ.defer();

	var i2sstatus = self.commandRouter.executeOnPlugin('system_controller', 'i2s_dacs', 'getI2sStatus');

	var OutputDeviceNumber = data.output_device.value;

	if (data.i2s){
		var I2SNumber = self.commandRouter.executeOnPlugin('system_controller', 'i2s_dacs', 'getI2SNumber', data.i2sid.label);
		if (i2sstatus.name != data.i2sid.label) {
			self.logger.info('Enabling I2S DAC: ' + data.i2sid.label);
			self.commandRouter.executeOnPlugin('system_controller', 'i2s_dacs', 'enableI2SDAC', data.i2sid.label);
			OutputDeviceNumber = I2SNumber;

			var responseData = {
				title: 'I2S DAC Activated',
				message: data.i2sid.label+ ' has been activated, restart the system for changes to take effect',
				size: 'lg',
				buttons: [
					{
						name: 'Restart',
						class: 'btn btn-info',
						emit:'reboot',
						payload:''
					}
				]
			}

			self.commandRouter.broadcastMessage("openModal", responseData);
		}
	} else if (i2sstatus.enabled){
		self.logger.info('Disabling I2S DAC: ');
		self.commandRouter.executeOnPlugin('system_controller', 'i2s_dacs', 'disableI2SDAC', '');
		OutputDeviceNumber = "0";
		var responseData = {
			title: 'I2S DAC Dectivated',
			message: data.i2sid.label+ ' has been deactivated, restart the system for changes to take effect',
			size: 'lg',
			buttons: [
				{
					name: 'Restart',
					class: 'btn btn-info',
					emit:'reboot',
					payload:''
				}
			]
		}

		self.commandRouter.broadcastMessage("openModal", responseData);
	}

	self.commandRouter.sharedVars.set('alsa.outputdevice', OutputDeviceNumber);
	self.setDefaultMixer(OutputDeviceNumber);


	return defer.promise;

};

ControllerAlsa.prototype.saveVolumeOptions = function (data) {
	var self = this;

	var defer = libQ.defer();

	self.setConfigParam({key: 'volumestart', value: data.volumestart.value});
	self.setConfigParam({key: 'volumemax', value: data.volumemax.value});
	self.setConfigParam({key: 'volumecurvemode', value: data.volumecurvemode.value});
	self.setConfigParam({key: 'mixer', value: data.mixer.value});

	self.logger.info('Volume configurations have been set');


	self.commandRouter.pushToastMessage('success', "Configuration update", 'The volume configuration has been successfully updated');

	defer.resolve({});

	return defer.promise;

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

ControllerAlsa.prototype.getAdditionalConf = function (type, controller, data) {
	var self = this;
	return self.commandRouter.executeOnPlugin(type, controller, 'getConfigParam', data);
};

ControllerAlsa.prototype.setAdditionalConf = function (type, controller, data) {
	var self = this;
	return self.commandRouter.executeOnPlugin(type, controller, 'setConfigParam', data);
};

ControllerAlsa.prototype.getLabelForSelectedCard = function (cards, key) {
	var n = cards.length;
	for (var i = 0; i < n; i++) {
		if (cards[i].id == key)
			return cards[i].name;
	}

	return 'VALUE NOT FOUND BETWEEN SELECT OPTIONS!';
};

ControllerAlsa.prototype.getLabelForSelect = function (options, key) {
	var n = options.length;
	for (var i = 0; i < n; i++) {
		if (options[i].value == key)
			return options[i].label;
	}

	return 'VALUE NOT FOUND BETWEEN SELECT OPTIONS!';
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

ControllerAlsa.prototype.getMixerControls  = function (device) {

	var mixers = [];
	try {
	var array = execSync('amixer -c '+device+' scontrols', { encoding: 'utf8' }).toString().split("\n");

	for (i in array) {
		var line = array[i].split("'");
		var control = line[1];
		//var number = line[2];
		var mixerraw = control;
		if (control){
			var mixer = mixerraw.replace(",", " ");
			mixers.push(mixer);
		}
	}
	} catch (e) {}
	return mixers
}

ControllerAlsa.prototype.setDefaultMixer  = function (device) {
	var self = this;

	var mixers = [];
	var currentcardname = '';
	var defaultmixer = '';
	var match = '';
	var carddata = fs.readJsonSync(('/volumio/app/plugins/audio_interfaces/alsa_controller/cards.json'),  'utf8', {throws: false});
	var cards = self.getAlsaCards();


	for (var i in cards) {
		var devnum = device.toString();
		if ( devnum == cards[i].id) {
			currentcardname = cards[i].name;
		}
	}

	for (var n = 0; n < carddata.cards.length; n++){
		var cardname = carddata.cards[n].prettyname.toString().trim();

		if (cardname == currentcardname){
			var defaultmixer = carddata.cards[n].defaultmixer;
			self.logger.info('Find match in Cards Database: setting mixer '+ defaultmixer + ' for card ' + currentcardname);
		}
	}
	if (defaultmixer) {

	} else {
	try {
		var array = execSync('amixer -c '+device+' scontrols', { encoding: 'utf8' }).toString().split("\n");

		var line = array[0].split("'");
		var control = line[1];
		//var number = line[2];
		var mixerraw = control;
		if (control){
			var defaultmixer = mixerraw.replace(",", " ");
			self.logger.info('Setting mixer '+ defaultmixer + ' for card ' + currentcardname);
		}

	} catch (e) {}
	}
	if (this.config.has('mixer') == false) {
		return this.config.addConfigValue('mixer', 'string', defaultmixer);
	} else {
		return self.setConfigParam({key: 'mixer', value: defaultmixer});
	}

}