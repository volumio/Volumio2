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


	var socketURL = 'http://localhost:3000';
	var options = {
		transports: ['websocket'],
		'force new connection': true
	};

	var client1 = io.connect(socketURL, options);

	var self = this;
	client1.on('connect', function (data) {
		self.logger.info("Setting volume on startup at " + volumeval);
		client1.emit('volume', volumeval);
	});


	if (this.config.has('outputdevice') == false) {
		this.config.addConfigValue('outputdevice', 'string', '0');
		this.updateVolumeSettings();
	}
	if (this.config.has('mixer') == false) {
		var value = this.config.get('outputdevice');
		this.setDefaultMixer(value);
		this.updateVolumeSettings();
	}

	if (this.config.has('volumesteps') == false) {
	this.config.addConfigValue('volumesteps', 'string', '10');
	this.updateVolumeSettings();
	}

	this.logger.debug("Creating shared var alsa.outputdevice");
	this.commandRouter.sharedVars.addConfigValue('alsa.outputdevice', 'string', this.config.get('outputdevice'));
	this.commandRouter.sharedVars.registerCallback('alsa.outputdevice', this.outputDeviceCallback.bind(this));

    return libQ.resolve();
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
	var outdevicename = self.config.get('outputdevicename');
	if (outdevicename) {
		self.configManager.setUIConfigParam(uiconf, 'sections[0].content[0].value.label', outdevicename);
	} else {
		self.configManager.setUIConfigParam(uiconf, 'sections[0].content[0].value.label', self.getLabelForSelectedCard(cards, value));
	}


	for (var i in cards) {
		if (cards[i].name === 'Audio Jack') {
			self.configManager.pushUIConfigParam(uiconf, 'sections[0].content[0].options', {
				value: cards[i].id,
				label: 'Audio Jack'
			});
			self.configManager.pushUIConfigParam(uiconf, 'sections[0].content[0].options', {
				value: cards[i].id,
				label: 'HDMI Out'
			});
		} else {
		self.configManager.pushUIConfigParam(uiconf, 'sections[0].content[0].options', {
			value: cards[i].id,
			label: cards[i].name
		});
		}
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

	value = self.config.get('volumesteps');
	self.configManager.setUIConfigParam(uiconf, 'sections[2].content[3].value.value', value);
	self.configManager.setUIConfigParam(uiconf, 'sections[2].content[3].value.label', self.getLabelForSelect(self.configManager.getValue(uiconf, 'sections[2].content[3].options'), value));

	value = self.config.get('volumecurvemode');
	self.configManager.setUIConfigParam(uiconf, 'sections[2].content[4].value.value', value);
	self.configManager.setUIConfigParam(uiconf, 'sections[2].content[4].value.label', self.getLabelForSelect(self.configManager.getValue(uiconf, 'sections[2].content[4].options'), value));

	return uiconf;
};

ControllerAlsa.prototype.saveAlsaOptions = function (data) {

	var self = this;

	var defer = libQ.defer();

	var i2sstatus = self.commandRouter.executeOnPlugin('system_controller', 'i2s_dacs', 'getI2sStatus');

	var OutputDeviceNumber = data.output_device.value;

	if (data.output_device.label === 'HDMI Out') {
		if (this.config.has('outputdevicename') == false) {
			this.config.addConfigValue('outputdevicename', 'string', 'HDMI Out');
		} else {
			this.config.set('outputdevicename', 'HDMI Out');
		}
		self.enablePiHDMI();
	}

	if (data.output_device.label === 'Audio Jack') {
		if (this.config.has('outputdevicename') == false) {
			this.config.addConfigValue('outputdevicename', 'string', 'Audio Jack');
		} else {
			this.config.set('outputdevicename', 'Audio Jack');
		}
		self.enablePiJack();
	}

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
	self.setConfigParam({key: 'volumesteps', value: data.volumesteps.value});
	self.setConfigParam({key: 'mixer', value: data.mixer.value});

	self.logger.info('Volume configurations have been set');


	self.commandRouter.pushToastMessage('success', self.getI18NString('configuration_update'),
        self.getI18NString('configuration_update_description'));

	defer.resolve({});
	this.updateVolumeSettings();

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
	var carddata = fs.readJsonSync(('/volumio/app/plugins/audio_interface/alsa_controller/cards.json'),  'utf8', {throws: false});

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
//TODO: FINISH THIS PARSING
	var mixers = [];
	try {
	var array = execSync('amixer -c '+device+' scontrols', { encoding: 'utf8' })
		var line = array.toString().split("\n");

	for (var i in line) {
		var lineraw = line[i].split("'")
		var control = lineraw[1];
		//var number = line[2];
		var mixerraw = control;
		if (mixerraw){
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
	var carddata = fs.readJsonSync(('/volumio/app/plugins/audio_interface/alsa_controller/cards.json'),  'utf8', {throws: false});
	var cards = self.getAlsaCards();
	var i2sstatus = self.commandRouter.executeOnPlugin('system_controller', 'i2s_dacs', 'getI2sStatus');


	for (var i in cards) {
		var devnum = device.toString();
		if ( devnum == cards[i].id) {
			currentcardname = cards[i].name;
		}
	}

	if (i2sstatus && i2sstatus.enabled){
		var cardname = i2sstatus.name;
		var mixer = self.commandRouter.executeOnPlugin('system_controller', 'i2s_dacs', 'getI2SMixer', cardname);
		if (mixer){
			var defaultmixer = mixer;
			self.logger.info('Found match in i2s Card Database: setting mixer '+ defaultmixer + ' for card ' + cardname);
		}

	} else {
	for (var n = 0; n < carddata.cards.length; n++){
		var cardname = carddata.cards[n].prettyname.toString().trim();

		if (cardname == currentcardname){
			var defaultmixer = carddata.cards[n].defaultmixer;
			self.logger.info('Found match in Cards Database: setting mixer '+ defaultmixer + ' for card ' + currentcardname);
		}
	}
	}
	if (defaultmixer) {

	} else {
	try {
		if (this.config.has('outputdevice') == false) {
			var audiodevice = "0";
		} else {
			var audiodevice = this.config.get('outputdevice')
		}

		var array = execSync('amixer -c '+audiodevice+' scontrols', { encoding: 'utf8' })
		var line = array.toString().split("\n");
		var lineraw = line[0].split("'")
		var control = lineraw[1];
		var mixerraw = control;
		var mixerraw = control;
		if (control){
			var defaultmixer = mixerraw.replace(",", " ");
			self.logger.info('Setting mixer '+ defaultmixer + ' for card ' + currentcardname);
		}

	} catch (e) {}
	}
	if (this.config.has('mixer') == false) {
		this.config.addConfigValue('mixer', 'string', defaultmixer);
		this.updateVolumeSettings();
	} else {
		self.setConfigParam({key: 'mixer', value: defaultmixer});
		this.updateVolumeSettings();
	}

}


ControllerAlsa.prototype.updateVolumeSettings  = function () {
	var self = this;


	var valvolumecurvemode = self.config.get('volumecurvemode');
	var valdevice = self.config.get('outputdevice');
	var valvolumemax = self.config.get('volumemax');
	var valmixer = self.config.get('mixer');
	var valvolumestart = self.config.get('volumestart');
	var valvolumesteps = self.config.get('volumesteps');

	var settings = {
		device : valdevice,
		mixer : valmixer,
		maxvolume : valvolumemax,
		volumecurve : valvolumecurvemode,
		volumestart : valvolumestart,
		volumesteps : valvolumesteps
	}

	return self.commandRouter.volumioUpdateVolumeSettings(settings)
}

ControllerAlsa.prototype.enablePiJack  = function () {
	var self = this;

	exec('/usr/bin/amixer cset numid=3 1', function (error, stdout, stderr) {
		if (error) {
			self.logger.error('Cannot Enable Raspberry PI Jack Output: '+error);
		} else {
			self.logger.error('Raspberry PI Jack Output Enabled ');
			self.storeAlsaSettings();
		}
	});

}

ControllerAlsa.prototype.enablePiHDMI  = function () {
	var self = this;


	exec('/usr/bin/amixer cset numid=3 2', function (error, stdout, stderr) {
		if (error) {
			self.logger.error('Cannot Enable Raspberry PI HDMI Output: '+error);
		} else {
			self.logger.error('Raspberry PI HDMI Output Enabled ');
			self.storeAlsaSettings();
		}
	});

}

ControllerAlsa.prototype.storeAlsaSettings  = function () {
	var self = this;
	exec('/usr/bin/sudo /usr/sbin/alsactl store', function (error, stdout, stderr) {
		if (error) {
			self.logger.error('Cannot Store Alsa Settings: '+error);
		} else {
			self.logger.error('Alsa Settings successfully stored');
		}
	});
}

ControllerAlsa.prototype.loadI18NStrings = function (code) {
    this.logger.info('ALSA-CONTROLLER I18N LOAD FOR LOCALE '+code);

    this.i18nString=libFsExtra.readJsonSync(__dirname+'/i18n/strings_'+code+".json");
}


ControllerAlsa.prototype.getI18NString = function (key) {
    return this.i18nString[key];
}