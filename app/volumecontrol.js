'use strict';

var libQ = require('kew');
var spawn = require('child_process').spawn;
var Volume = {};
Volume.vol = null;
Volume.mute = null;


var device = '';
var mixer = '';
var maxvolume = 0;
var volumecurve = '';
var volumesteps = 0;
var currentvolume = 0;
var currentmute = false;
var premutevolume = 0;
var mixertype = '';
var devicename = '';

module.exports = CoreVolumeController;
function CoreVolumeController(commandRouter) {
	// This fixed variable will let us refer to 'this' object at deeper scopes
	var self = this;

	// Save a reference to the parent commandRouter
	self.commandRouter = commandRouter;
	self.logger = self.commandRouter.logger;


	device = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'outputdevice');
	if (device === 'softvolume') {
		device = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'softvolumenumber');
		devicename = 'softvolume';
	} else {
		var cards = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getAlsaCards', '');
		if ((cards[device] != undefined) && (cards[device].name != undefined)) {
			devicename = cards[device].name;
		}

	}
	var mixerdev = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'mixer');
	mixer = '"'+mixerdev+'"';
	
        maxvolume = Number(this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'volumemax'));
        if(isNaN(maxvolume)) maxvolume = 100;
	
        volumecurve = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'volumecurvemode');

	volumesteps = Number(this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'volumesteps'));
        if(isNaN(volumesteps)) volumesteps = 10;

	mixertype = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'mixer_type');


	var amixer = function (args, cb) {

		var ret = '';
		var err = null;
		var p = spawn('amixer', args);

		p.stdout.on('data', function (data) {
			ret += data;
		});

		p.stderr.on('data', function (data) {
			err = new Error('Alsa Mixer Error: ' + data);
		});

		p.on('close', function () {
			cb(err, ret.trim());
		});

	};

	var reInfo = /[a-z][a-z ]*\: Playback [0-9-]+ \[([0-9]+)\%\] (?:[[0-9\.-]+dB\] )?\[(on|off)\]/i;
	var getInfo = function (cb) {
                var command = ['get', '-c', device, mixer];
                if (volumecurve === 'logarithmic'){
			command.unshift('-M');
		}
		amixer(['get', '-c', device , mixer], function (err, data) {
			if (err) {
				cb(err);
			} else {
				var res = reInfo.exec(data);
				if (res === null) {
					cb(new Error('Alsa Mixer Error: failed to parse output'));
				} else {
					cb(null, {
						volume: parseInt(res[1], 10),
						muted: (res[2] == 'off')
					});
				}
			}
		});
	};

	self.getVolume = function (cb) {
		getInfo(function (err, obj) {
			if (err) {
				cb(err);
			} else {
				cb(null, obj.volume);
			}
		});
	};

	self.setVolume = function (val, cb) {
                        currentvolume = val;
                        var command = ['set', '-c', device, mixer, val + '%'];
                        if (volumecurve === 'logarithmic'){
                            command.unshift('-M');
                        }
			amixer(command, function (err) {
				cb(err);
			});
			if (devicename == 'PianoDACPlus'  || devicename == 'Allo Piano 2.1') {
				amixer(command, function (err) {
					cb(err);
				});
			}
	};

	self.getMuted = function (cb) {
		getInfo(function (err, obj) {
			if (err) {
				cb(err);
			} else {
				cb(null, obj.muted);
			}
		});
	};

	self.setMuted = function (val, cb) {
		amixer(['set', '-c', device, mixer , (val ? 'mute' : 'unmute')], function (err) {
			cb(err);
		});
	};
}


CoreVolumeController.prototype.updateVolumeSettings = function (data) {
	var self = this;


	self.logger.info('Updating Volume Controller Parameters: Device: '+ data.device + ' Name: '+ data.name +' Mixer: '+ data.mixer + ' Max Vol: ' + data.maxvolume + ' Vol Curve; ' + data.volumecurve + ' Vol Steps: ' + data.volumesteps);
	device = data.device;
	mixer = '"'+data.mixer+'"';
	maxvolume = Number(data.maxvolume);
	volumecurve = data.volumecurve;
	volumesteps = Number(data.volumesteps);
	mixertype = data.mixertype
	devicename = data.name;
}


// Public methods -----------------------------------------------------------------------------------
CoreVolumeController.prototype.alsavolume = function (CommandString) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'VolumeController::SetAlsaVolume ' + CommandString);

        // Bail out if there's no device to control
	if(mixertype === 'None'){
            return;
        }

        // Try to cast CommandString to an integer volume
        var VolumeInteger = Number(CommandString);

        // Check for invalid integer, and set a default
        if(isNaN(VolumeInteger)){
            VolumeInteger = 100;
        }
        else // In the case of an integer CommandString, assume an implicit 'set' command
        {
            CommandString = 'set';
        }

	switch (CommandString) {
		case 'mute':
			//Mute or Unmute, depending on state
			self.getVolume(function (err, vol) {
				if (vol == null) {
					vol =  currentvolume
				}
				currentmute = true;
				premutevolume = vol;

				self.setVolume(0, function (err) {
					Volume.vol = 0
					Volume.mute = true;
					self.commandRouter.volumioupdatevolume(Volume);
				});
			});
			break;
		case 'unmute':
			//UnMute
			currentmute = false;
			self.setVolume(premutevolume, function (err) {
				self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'VolumeController::Volume ' + premutevolume);
				//Log Volume Control
				Volume.vol = premutevolume;
				Volume.mute = false;
				currentvolume = premutevolume;
				self.commandRouter.volumioupdatevolume(Volume);
			});
			break;
		case '+':
			//Incrase Volume by one (TEST ONLY FUNCTION - IN PRODUCTION USE A NUMERIC VALUE INSTEAD)
			self.setMuted(false, function (err) {
				self.getVolume(function (err, vol) {
					if (vol == null) {
						vol =  currentvolume
					}
					VolumeInteger = Number(vol)+volumesteps;
					if (VolumeInteger < 0){
						VolumeInteger = 0;
					}
					if (VolumeInteger > maxvolume){
						VolumeInteger = maxvolume;
					}
					self.setVolume(VolumeInteger, function (err) {
						Volume.vol = VolumeInteger
						Volume.mute = false;
						self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'VolumeController::Volume ' + VolumeInteger);
						self.commandRouter.volumioupdatevolume(Volume);

					});
				});
			});
			break;
		case '-':
			//Decrase Volume by one (TEST ONLY FUNCTION - IN PRODUCTION USE A NUMERIC VALUE INSTEAD)
			self.getVolume(function (err, vol) {
				if (vol == null) {
					vol =  currentvolume
				}
				VolumeInteger = Number(vol)-volumesteps;
				if (VolumeInteger < 0){
					VolumeInteger = 0;
				}
				if (VolumeInteger > maxvolume){
					VolumeInteger = maxvolume;
				}
				self.setVolume(VolumeInteger, function (err) {
					self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'VolumeController::Volume ' + VolumeInteger);
					Volume.vol = VolumeInteger
					Volume.mute = false;
					self.commandRouter.volumioupdatevolume(Volume);
				});
			});
			break;
                case 'set':
                        // Set a specific volume
			if (VolumeInteger > maxvolume){
				VolumeInteger = maxvolume;
			}
			self.setVolume(VolumeInteger, function (err) {
				self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'VolumeController::Volume ' + VolumeInteger);
				//Log Volume Control
				Volume.vol = VolumeInteger;
				Volume.mute = false;
				currentvolume = VolumeInteger;
				self.commandRouter.volumioupdatevolume(Volume);
			});
                        break;
		default:
                        self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'VolumeController::Volume Unhandled Command: ' + CommandString);
                        new Error('Unhandled command: ' + CommandString);
	}

};

CoreVolumeController.prototype.retrievevolume = function () {
	var self = this;
	this.getVolume(function (err, vol) {
		self.getMuted(function (err, mute) {
			self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'VolumeController:: Volume=' + vol + ' Mute =' + mute);
			//Log Volume Control
			 //Log Volume Control
                        if (vol == null) {
                        vol = currentvolume,
                        mute = currentmute
                        } else {
                        currentvolume = vol
                        }
			Volume.vol = vol;
			Volume.mute = mute;
			if (mixertype === 'None') {
				Volume.vol = 100;
			}
			return libQ.resolve(Volume)
				.then(function (Volume) {
					self.commandRouter.volumioupdatevolume(Volume);
				});

		});
	});
};

