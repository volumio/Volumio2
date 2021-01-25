'use strict';

var libQ = require('kew');
var spawn = require('child_process').spawn;
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var Volume = {};
Volume.vol = null;
Volume.mute = null;

var device = '';
var mixer = '';
var maxvolume = '';
var volumecurve = '';
var volumesteps = '';
var currentvolume = '';
var hasHWMute = false;
var currentmute = false;
var premutevolume = '';
var mixertype = '';
var devicename = '';
var volumescript = { enabled: false, setvolumescript: '', getvolumescript: '' };
var volumeOverride = false;
var overridePluginType;
var overridePluginName;

module.exports = CoreVolumeController;
function CoreVolumeController (commandRouter) {
  // This fixed variable will let us refer to 'this' object at deeper scopes
  var self = this;

  // Save a reference to the parent commandRouter
  self.commandRouter = commandRouter;
  self.logger = self.commandRouter.logger;

  var outputdevicename = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'outputdevicename');
  device = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'outputdevice');
  
  if (device.indexOf(',') >= 0) {
    device = device.charAt(0);
  }
  
  if (process.env.MODULAR_ALSA_PIPELINE === 'true') {
    if(this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'softvolume')) {
      // Software volume is enabled
      devicename = 'softvolume';
    } else {
      devicename = outputdevicename;
    }
  } else {
    if (device === 'softvolume') {
      device = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'softvolumenumber');
      devicename = 'softvolume';
    } else {
      devicename = outputdevicename;
    }
  }
  
  var mixerdev = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'mixer');

  if (mixerdev.indexOf(',') >= 0) {
    var mixerarr = mixerdev.split(',');
    mixer = mixerarr[0] + ',' + mixerarr[1];
  } else {
    mixer = '"' + mixerdev + '"';
  }
  maxvolume = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'volumemax');
  volumecurve = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'volumecurvemode');
  volumesteps = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'volumesteps');
  mixertype = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'mixer_type');

  var amixer = function (args, cb) {
    var ret = '';
    var err = null;
    var p = spawn('amixer', args, { uid: 1000, gid: 1000 });

    p.stdout.on('data', function (data) {
      ret += data;
    });

    p.stderr.on('data', function (data) {
      try {
        // Avoid to pass pulse introduced error in parsing
        // console.log('---' + data.toString().replace(/\n/g, '') + '---');
        if (data.toString().replace(/\n/g, '') === 'No protocol specified' || data.toString().replace(/\n/g, '') === 'xcb_connection_has_error() returned true') {
          // ignoring those errors
          // console.log('IGNORING')
        } else {
          err = new Error('Alsa Mixer Error: ' + data);
        }
      } catch (e) {
        err = new Error('Alsa Mixer Error: ' + data);
      }
    });

    p.on('close', function () {
      cb(err, ret.trim());
    });
  };

  var reInfo = /[a-z][a-z ]*: Playback [0-9-]+ \[([0-9]+)%\] (?:[[0-9.-]+dB\] )?\[(on|off)\]/i;
  var reInfoOnlyVol = /[a-z][a-z ]*: Playback [0-9-]+ \[([0-9]+)%\] (?:[[0-9.-]+dB\] )?\[/i;
  var getInfo = function (cb) {
    if (volumescript.enabled) {
      try {
        var scriptvolume = execSync('/bin/sh ' + volumescript.getvolumescript, { uid: 1000, gid: 1000, encoding: 'utf8' });
        self.logger.info('External Volume: ' + scriptvolume);
        Volume.mute = false;
        if (volumescript.mapTo100 !== undefined && volumescript.maxVol !== undefined && volumescript.mapTo100) {
          Volume.vol = parseInt((scriptvolume * 100) / volumescript.maxVol);
        } else {
          Volume.vol = scriptvolume;
        }
        if (volumescript.getmutescript !== undefined && volumescript.getmutescript.length > 0) {
          var scriptmute = execSync('/bin/sh ' + volumescript.getmutescript, { uid: 1000, gid: 1000, encoding: 'utf8' });
          self.logger.info('External Volume: ' + scriptmute);
          if (parseInt(scriptmute) === 1) {
            Volume.mute = true;
          }
        }
        cb(null, {
          volume: Volume.vol,
          muted: Volume.mute
        });
      } catch (e) {
        self.logger.info('Cannot get Volume with script: ' + e);
        cb(new Error('Cannot execute Volume script'));
      }
    } else {
      let volumeParamsArray;
      if (volumecurve === 'logarithmic') {
        volumeParamsArray = ['-M', 'get', '-c', device, mixer];
      } else {
        volumeParamsArray = ['get', '-c', device, mixer];
      }
      amixer(volumeParamsArray, function (err, data) {
        if (err) {
          cb(err);
        } else {
          var res = reInfo.exec(data);
          if (res === null) {
            var resOnlyVol = reInfoOnlyVol.exec(data);
            if (resOnlyVol === null) {
              console.warn('Unable to parse:\n', data);
              cb(new Error('Alsa Mixer Error: failed to parse output'));
            } else {
              hasHWMute = false;
              var volOut = parseInt(resOnlyVol[1], 10);
              let muteOut;
              if (volOut === 0) {
                muteOut = true;
              } else {
                muteOut = false;
              }
              cb(null, {
                volume: volOut,
                muted: muteOut
              });
            }
          } else {
            hasHWMute = true;
            cb(null, {
              volume: parseInt(res[1], 10),
              muted: (res[2] === 'off')
            });
          }
        }
      });
    }
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
    if (volumescript.enabled) {
      try {
        if (volumescript.minVol !== undefined && val < volumescript.minVol) {
          val = volumescript.minVol;
        }
        let cmd;
        if (volumescript.mapTo100 !== undefined && volumescript.maxVol !== undefined && volumescript.mapTo100) {
          cmd = '/bin/sh ' + volumescript.setvolumescript + ' ' + parseInt(val * (volumescript.maxVol / 100));
        } else {
          if (volumescript.maxVol !== undefined && val > volumescript.maxVol) {
            val = volumescript.maxVol;
          }
          cmd = '/bin/sh ' + volumescript.setvolumescript + ' ' + val;
        }

        self.logger.info('Volume script ' + cmd);
        Volume.mute = false;
        if (volumescript.setmutescript !== undefined && volumescript.setmutescript.length > 0) {
          let scriptmute;
          if (val === 0) {
            Volume.mute = true;
            scriptmute = execSync('/bin/sh ' + volumescript.setmutescript + ' 1', { uid: 1000, gid: 1000, encoding: 'utf8' });
          } else {
            execSync(cmd, { uid: 1000, gid: 1000, encoding: 'utf8', tty: 'pts/1' });
            scriptmute = execSync('/bin/sh ' + volumescript.setmutescript + ' 0', { uid: 1000, gid: 1000, encoding: 'utf8' });
          }
          self.logger.info('External Volume: ' + scriptmute);
        }
        Volume.vol = parseInt(val);
        currentvolume = parseInt(val);
        self.commandRouter.volumioupdatevolume(Volume);
      } catch (e) {
        self.logger.info('Cannot set Volume with script: ' + e);
      }
    } else {
      if (volumecurve === 'logarithmic') {
        amixer(['-M', 'set', '-c', device, mixer, 'unmute', val + '%'], function (err) {
          cb(err);
        });
        if (devicename === 'PianoDACPlus' || devicename === 'Allo Piano 2.1' || devicename === 'PianoDACPlus multicodec-0') {
          amixer(['-M', 'set', '-c', device, 'Subwoofer', 'unmute', val + '%'], function (err) {
            if (err) {
              self.logger.error('Cannot set ALSA Volume: ' + err);
            }
          });
        }
      } else {
        amixer(['set', '-c', device, mixer, 'unmute', val + '%'], function (err) {
          cb(err);
        });
        if (devicename === 'PianoDACPlus' || devicename === 'Allo Piano 2.1' || devicename === 'PianoDACPlus multicodec-0') {
          amixer(['set', '-c', device, 'Subwoofer', 'unmute', val + '%'], function (err) {
            if (err) {
              self.logger.error('Cannot set ALSA Volume: ' + err);
            }
          });
        }
      }
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
    if (hasHWMute) {
      amixer(['set', '-c', device, mixer, (val ? 'mute' : 'unmute')], function (err) {
        cb(err);
      });
    } else {
      amixer(['set', '-c', device, mixer, (val ? 0 : premutevolume)], function (err) {
        cb(err);
      });
    }
  };
}

CoreVolumeController.prototype.updateVolumeSettings = function (data) {
  var self = this;

  self.logger.info('Updating Volume Controller Parameters: Device: ' + data.device + ' Name: ' + data.name + ' Mixer: ' + data.mixer + ' Max Vol: ' + data.maxvolume + ' Vol Curve; ' + data.volumecurve + ' Vol Steps: ' + data.volumesteps);

  if (data.mixertype !== undefined && mixertype !== 'None' && mixer !== undefined && mixer.length && (data.mixertype === 'None' || data.mixertype === 'Software')) {
    self.setVolume(100, function (err) {
      if (err) {
        self.logger.error('Cannot set ALSA Volume: ' + err);
      }
    });
  }

  if (mixertype && mixertype === 'None' && data.mixertype !== undefined && (data.mixertype === 'Software' || data.mixertype === 'Hardware')) {
    setTimeout(() => {
      self.setStartupVolume();
    }, 5000);
  }

  device = data.device;
  if (device.indexOf(',') >= 0) {
    device = device.charAt(0);
  }
  mixer = '"' + data.mixer + '"';
  if (data.mixer.indexOf(',') >= 0) {
    var mixerarr = data.mixer.split(',');
    mixer = mixerarr[0] + ',' + mixerarr[1];
  } else {
    mixer = '"' + data.mixer + '"';
  }
  maxvolume = data.maxvolume;
  volumecurve = data.volumecurve;
  volumesteps = data.volumesteps;
  mixertype = data.mixertype;
  devicename = data.name;

  if (data.volumeOverride) {
    volumeOverride = true;
    overridePluginType = data.pluginType;
    overridePluginName = data.pluginName;
  } else {
    volumeOverride = false;
  }

  return self.retrievevolume();
};

CoreVolumeController.prototype.updateVolumeScript = function (data) {
  var self = this;

  if (data.setvolumescript !== undefined && data.getvolumescript !== undefined) {
    self.logger.info('Updating Volume script: ' + JSON.stringify(data));
    volumescript = data;
  }
};

// Public methods -----------------------------------------------------------------------------------
CoreVolumeController.prototype.alsavolume = function (VolumeInteger) {
  var self = this;

  if (volumeOverride) {
    return this.commandRouter.executeOnPlugin(overridePluginType, overridePluginName, 'alsavolume', VolumeInteger);
  } else {
    var defer = libQ.defer();
    self.logger.info('VolumeController::SetAlsaVolume' + VolumeInteger);
    if (mixertype === 'None') {
      Volume.vol = 100;
      Volume.mute = false;
      Volume.disableVolumeControl = true;
      defer.resolve(Volume);
    } else {
      switch (VolumeInteger) {
        case 'mute':
          // Mute
          self.getVolume(function (err, vol) {
            if (err) {
              self.logger.error('Cannot get ALSA Volume: ' + err);
            }
            if (!vol) {
              vol = currentvolume;
            }
            currentmute = true;
            premutevolume = vol;
            if (mixertype === 'Software') {
              Volume.vol = currentvolume;
              Volume.mute = true;
              Volume.disableVolumeControl = false;
              defer.resolve(Volume);
              self.setVolume(0, function (err) {
                if (err) {
                  self.logger.error('Cannot set ALSA Volume: ' + err);
                }
              });
            } else {
              Volume.vol = premutevolume;
              Volume.mute = true;
              Volume.disableVolumeControl = false;
              defer.resolve(Volume);
              self.setMuted(true, function (err) {
                if (err) {
                  self.logger.error('Cannot set mute ALSA: ' + err);
                }
              });
            }
          });
          break;
        case 'unmute':
          // Unmute
          currentmute = false;
          // Log Volume Control
          Volume.vol = premutevolume;
          Volume.mute = false;
          Volume.disableVolumeControl = false;
          currentvolume = premutevolume;
          defer.resolve(Volume);
          self.setVolume(premutevolume, function (err) {
            if (err) {
              self.logger.error('Cannot set ALSA Volume: ' + err);
            }
          });
          break;
        case 'toggle':
          // Mute or unmute, depending on current state
          if (Volume.mute) {
            defer.resolve(self.alsavolume('unmute'));
          } else {
            defer.resolve(self.alsavolume('mute'));
          }
          break;
        case '+':
          self.getVolume(function (err, vol) {
            if (err) {
              self.logger.error('Cannot get ALSA Volume: ' + err);
            }
            if (!vol || currentmute) {
              vol = currentvolume;
            }
            VolumeInteger = Number(vol) + Number(volumesteps);
            if (VolumeInteger > 100) {
              VolumeInteger = 100;
            }
            if (VolumeInteger > maxvolume) {
              VolumeInteger = maxvolume;
            }
            currentvolume = VolumeInteger;
            Volume.vol = VolumeInteger;
            Volume.mute = false;
            Volume.disableVolumeControl = false;
            defer.resolve(Volume);
            self.setVolume(VolumeInteger, function (err) {
              if (err) {
                self.logger.error('Cannot set ALSA Volume: ' + err);
              }
            });
          });
          break;
        case '-':
          // Decrease volume by one (TEST ONLY FUNCTION - IN PRODUCTION USE A NUMERIC VALUE INSTEAD)
          self.getVolume(function (err, vol) {
            if (err) {
              self.logger.error('Cannot get ALSA Volume: ' + err);
            }
            if (!vol || currentmute) {
              vol = currentvolume;
            }
            VolumeInteger = Number(vol) - Number(volumesteps);
            if (VolumeInteger < 0) {
              VolumeInteger = 0;
            }
            if (VolumeInteger > maxvolume) {
              VolumeInteger = maxvolume;
            }
            currentvolume = VolumeInteger;
            Volume.vol = VolumeInteger;
            Volume.mute = false;
            Volume.disableVolumeControl = false;
            defer.resolve(Volume);
            self.setVolume(VolumeInteger, function (err) {
              if (err) {
                self.logger.error('Cannot set ALSA Volume: ' + err);
              }
            });
          });
          break;
        default:
          // Set the volume with numeric value 0-100
          if (VolumeInteger < 0) {
            VolumeInteger = 0;
          }
          if (VolumeInteger > 100) {
            VolumeInteger = 100;
          }
          if (VolumeInteger > maxvolume) {
            VolumeInteger = maxvolume;
          }
          currentvolume = VolumeInteger;
          Volume.vol = VolumeInteger;
          Volume.mute = false;
          Volume.disableVolumeControl = false;
          defer.resolve(Volume);
          self.setVolume(VolumeInteger, function (err) {
            if (err) {
              self.logger.error('Cannot set ALSA Volume: ' + err);
            }
          });
      }
    }
    return defer.promise;
  }
};

CoreVolumeController.prototype.retrievevolume = function () {
  var self = this;

  if (volumeOverride) {
    return this.commandRouter.executeOnPlugin(overridePluginType, overridePluginName, 'retrievevolume', '');
  } else {
    var defer = libQ.defer();
    if (mixertype === 'None') {
      Volume.vol = 100;
      Volume.mute = false;
      Volume.disableVolumeControl = true;
      return libQ.resolve(Volume)
        .then(function (Volume) {
          defer.resolve(Volume);
          self.commandRouter.volumioupdatevolume(Volume);
        });
    } else if (mixertype === 'Software') {
      exec('/usr/bin/amixer -M get -c ' + device + " 'SoftMaster' | awk '$0~/%/{print}' | cut -d '[' -f2 | tr -d '[]%' | head -1", function (error, stdout, stderr) {
        if (error) {
          self.logger.error('Cannot read softvolume: ' + error);
        } else {
          var volume = stdout.replace('\n', '');
          currentvolume = volume;
          if (currentvolume === '0') {
            currentmute = true;
          } else {
            currentmute = false;
          }
          Volume.vol = volume;
          Volume.mute = currentmute;
          Volume.disableVolumeControl = false;
          return libQ.resolve(Volume)
            .then(function (Volume) {
              defer.resolve(Volume);
              self.commandRouter.volumioupdatevolume(Volume);
            });
        }
      });
    } else {
      this.getVolume(function (err, vol) {
        if (err) {
          self.logger.error('Cannot get ALSA Volume: ' + err);
        }
        self.getMuted(function (err, mute) {
          if (err) {
            mute = false;
          }
          // Log volume control
          self.logger.info('VolumeController:: Volume=' + vol + ' Mute =' + mute);
          if (!vol) {
            vol = currentvolume;
            mute = currentmute;
          } else {
            currentvolume = vol;
          }
          Volume.vol = vol;
          Volume.mute = mute;
          Volume.disableVolumeControl = false;
          return libQ.resolve(Volume)
            .then(function (Volume) {
              defer.resolve(Volume);
              self.commandRouter.volumioupdatevolume(Volume);
            });
        });
      });
    }
    return defer.promise;
  }
};

CoreVolumeController.prototype.setStartupVolume = function () {
  var self = this;

  var startupVolume = this.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'getConfigParam', 'volumestart');
  if (startupVolume !== 'disabled') {
    self.logger.info('VolumeController:: Setting startup Volume ' + startupVolume);
    return self.commandRouter.volumiosetvolume(parseInt(startupVolume));
  }
};
