'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var os = require('os');
var libQ = require('kew');
var util = require('util');

var i2sOverlayBanner = '#### Volumio i2s setting below: do not alter ####' + os.EOL;

// Define the ControllerSystem class
module.exports = ControllerI2s;

function ControllerI2s (context) {
  var self = this;

  // Save a reference to the parent commandRouter
  self.context = context;
  self.commandRouter = self.context.coreCommand;
  self.configManager = self.context.configManager;

  self.logger = self.context.logger;
  self.callbacks = [];
}

ControllerI2s.prototype.onVolumioStart = function () {
  var self = this;

  var configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');

  this.config = new (require('v-conf'))();
  this.config.loadFile(configFile);
  var i2sdac = this.config.get('i2s_dac');

  var startupPromise = null;
  if (i2sdac == null || i2sdac.length === 0) {
    self.logger.info('I2S DAC not set, start Auto-detection');
    startupPromise = self.i2sDetect();
  } else {
    startupPromise = self.execDacScript();
  }

  var bannerPromise = self.forceConfigTxtBannerCompat();

  return libQ.all(startupPromise, bannerPromise);
};

ControllerI2s.prototype.onStop = function () {
  var self = this;
  // Perform startup tasks here
};

ControllerI2s.prototype.onRestart = function () {
  var self = this;
  // Perform startup tasks here
};

ControllerI2s.prototype.onInstall = function () {
  var self = this;
  // Perform your installation tasks here
};

ControllerI2s.prototype.onUninstall = function () {
  var self = this;
  // Perform your installation tasks here
};

ControllerI2s.prototype.getUIConfig = function () {
  var self = this;

  var uiconf = fs.readJsonSync(__dirname + '/UIConfig.json');

  return uiconf;
};

ControllerI2s.prototype.setUIConfig = function (data) {
  var self = this;

  var uiconf = fs.readJsonSync(__dirname + '/UIConfig.json');
};

ControllerI2s.prototype.getConf = function (varName) {
  var self = this;

  return config.get(varName);
};

ControllerI2s.prototype.setConf = function (varName, varValue) {
  var self = this;

  var defer = libQ.defer();
};
ControllerI2s.prototype.getConfigParam = function (key) {
  return this.config.get(key);
};

ControllerI2s.prototype.getConfigurationFiles = function () {
  var self = this;

  return ['config.json'];
};

// Optional functions exposed for making development easier and more clear
ControllerI2s.prototype.getSystemConf = function (pluginName, varName) {
  var self = this;
  // Perform your installation tasks here
};

ControllerI2s.prototype.setSystemConf = function (pluginName, varName) {
  var self = this;
  // Perform your installation tasks here
};

ControllerI2s.prototype.getAdditionalConf = function (type, controller, data) {
  var self = this;
  return self.commandRouter.executeOnPlugin(type, controller, 'getConfigParam', data);
};

ControllerI2s.prototype.setAdditionalConf = function () {
  var self = this;
  // Perform your installation tasks here
};

ControllerI2s.prototype.registerCallback = function (callback) {
  var self = this;

  self.callbacks.push(callback);
};

ControllerI2s.prototype.i2sDetect = function () {
  var self = this;

  var eepromname = self.eepromDetect();
  var i2caddr = self.i2cDetect();
  var eepromName = '';
  var i2cAddress = '';

  var methods = [eepromname, i2caddr ];

  return libQ.all(methods)
    .then(function (content) {
      for (var j in content) {
        var discoveryParameters = {eepromName: '', i2cAddress: ''};

        if (content[j].eeeprom) {
          eepromName = content[j].eeeprom;
        }

        if (content[j].i2c) {
          i2cAddress = content[j].i2c;
        }
      }
      return self.i2sMatch({'eepromName': eepromName, 'i2cAddress': i2cAddress});
    });
};

ControllerI2s.prototype.eepromDetect = function () {
  var self = this;

  var defer = libQ.defer();
  var dacdata = fs.readJsonSync(('/volumio/app/plugins/system_controller/i2s_dacs/dacs.json'), 'utf8', {throws: false});
  var hatnamefile = '/proc/device-tree/hat/product';

  try {
    fs.statSync(hatnamefile);
    fs.readFile(hatnamefile, 'utf8', function (err, data) {
      if ((err) || (data == null)) {
        self.logger.info('Cannot read eeprom hat name');
      } else {
        var name = data.replace('\u0000', '');
        defer.resolve({eeeprom: name});
      }
    });
  } catch (e) {
    defer.resolve({eeeprom: ''});
  }
  return defer.promise;
};

ControllerI2s.prototype.i2cDetect = function () {
  var self = this;

  var i2cbus;
  var defer = libQ.defer();
  exec("echo `awk '{if ($1==\"Revision\") print substr($3,length($3)-3)}' /proc/cpuinfo`", function (err, stdout, stderr) {
    var revision = stdout.slice(0, 4);
    if ((!err) && (revision != '0002') && (revision != '0003')) {
      readI2S('1');
    } else {
      readI2S('0');
    }
  });

  function readI2S (i2cbus) {
    try {
      var i2cAddr = '';
      var cmd = '/usr/bin/sudo /usr/sbin/i2cdetect -y ' + i2cbus;
      exec(cmd, function (err, stdout, stderr) {
        if (err) {
          self.logger.info('Cannot read I2C interface or I2C interface not present' + err);
        } else {
          var result = [];
          var rows = stdout.split('\n');
          rows.shift();
          rows.forEach(function (row) {
            var items = row.slice(0, 52).split(' ');
            items.shift();
            items.forEach(function (item) {
              if ((item != '') && (item != '--')) {
                i2cAddr = (item);
              }
            });
          });
          defer.resolve({i2c: i2cAddr});
        }
      });
    } catch (err) {
      self.logger.error('Cannot read i2c bus');
    }
  }

  return defer.promise;
};

ControllerI2s.prototype.i2sMatch = function (data) {
  var self = this;

  var dacdata = fs.readJsonSync(('/volumio/app/plugins/system_controller/i2s_dacs/dacs.json'), 'utf8', {throws: false});
  var devicename = self.getAdditionalConf('system_controller', 'system', 'device');

  for (var i = 0; i < dacdata.devices.length; i++) {
    if (dacdata.devices[i].name == devicename) {
      var num = i;
      for (var i = 0; i < dacdata.devices[num].data.length; i++) {
        var dac = dacdata.devices[num].data[i];

        if (util.isArray(dac.eeprom_name)) {
          for (var w = 0; w < dac.eeprom_name.length; w++) {
            if (dac.eeprom_name[w] == data.eepromName) {
              self.logger.info('I2S DAC DETECTION: Found Match with EEPROM ' + dac.eeprom_name[w]);
              var str = {'output_device': {'value': dac.alsanum, 'label': dac.name, 'alsacard': dac.alsacard}, 'i2s': true, 'i2sid': {'value': dac.id, 'label': dac.name}};
              return self.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'saveAlsaOptions', str);
            }
          }
        } else if (dac.eeprom_name == data.eepromName) {
          self.logger.info('I2S DAC DETECTION: Found Match with EEPROM ' + dac.eeprom_name);
          var str = {'output_device': {'value': dac.alsanum, 'label': dac.name, 'alsacard': dac.alsacard}, 'i2s': true, 'i2sid': {'value': dac.id, 'label': dac.name}};
          return self.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'saveAlsaOptions', str);
        } else if (dac.i2c_address == data.i2cAddress) {
          self.logger.info('I2S DAC DETECTION: Found Match with ' + dac.name + ' at address ' + dac.i2c_address);
          var str = {'output_device': {'value': dac.alsanum, 'label': dac.name, 'alsacard': dac.alsacard}, 'i2s': true, 'i2sid': {'value': dac.id, 'label': dac.name}};
          return self.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'saveAlsaOptions', str);
        } else {

        }
      }
    }
  }
  return libQ.resolve();
};

ControllerI2s.prototype.getI2sOptions = function () {
  var self = this;

  var options = [];
  var dacdata = fs.readJsonSync(('/volumio/app/plugins/system_controller/i2s_dacs/dacs.json'), 'utf8', {throws: false});
  var devicename = self.getAdditionalConf('system_controller', 'system', 'device');

  for (var i = 0; i < dacdata.devices.length; i++) {
    if (dacdata.devices[i].name == devicename) {
      var num = i;
      for (var i = 0; i < dacdata.devices[num].data.length; i++) {
        var valuedata = dacdata.devices[num].data[i].id;
        var labeldata = dacdata.devices[num].data[i].name;
        options.push({value: valuedata, label: labeldata});
      }
    }
  }

  return options;
};

ControllerI2s.prototype.getI2sStatus = function () {
  var self = this;
  var status = {enabled: false, name: null, id: null};
  var i2senabled = self.getConfigParam('i2s_enabled');
  var i2sdac = self.getConfigParam('i2s_dac');
  var i2sid = self.getConfigParam('i2s_id');

  if (i2senabled) {
    status.enabled = true;
    status.name = i2sdac;
    status.id = i2sid;
  }

  return status;
};

ControllerI2s.prototype.getI2SNumber = function (data) {
    var self = this;

    var dacdata = fs.readJsonSync(('/volumio/app/plugins/system_controller/i2s_dacs/dacs.json'), 'utf8', {throws: false});
    var devicename = self.getAdditionalConf('system_controller', 'system', 'device');
    var number = '';

    for (var i = 0; i < dacdata.devices.length; i++) {
        if (dacdata.devices[i].name == devicename) {
            var num = i;
            for (var i = 0; i < dacdata.devices[num].data.length; i++) {
                if (dacdata.devices[num].data[i].name == data) {
                    number = dacdata.devices[num].data[i].alsanum;
                }
            }
            if (!number) {
                number = dacdata.devices[num].data[0].alsanum;
            }
        }
    }

    return number;
};

ControllerI2s.prototype.getI2SAlsaName = function (data) {
    var self = this;

    var dacdata = fs.readJsonSync(('/volumio/app/plugins/system_controller/i2s_dacs/dacs.json'), 'utf8', {throws: false});
    var devicename = self.getAdditionalConf('system_controller', 'system', 'device');
    var alsaname = '';

    for (var i = 0; i < dacdata.devices.length; i++) {
        if (dacdata.devices[i].name == devicename) {
            var num = i;
            for (var i = 0; i < dacdata.devices[num].data.length; i++) {
                if (dacdata.devices[num].data[i].name == data) {
                    alsaname = dacdata.devices[num].data[i].alsacard;
                }
            }
            if (!alsaname) {
                alsaname = dacdata.devices[num].data[0].alsacard;
            }
        }
    }

    return alsaname;
};

ControllerI2s.prototype.getI2SMixer = function (data) {
  var self = this;

  var dacdata = fs.readJsonSync(('/volumio/app/plugins/system_controller/i2s_dacs/dacs.json'), 'utf8', {throws: false});
  var devicename = self.getAdditionalConf('system_controller', 'system', 'device');
  var mixer = '';

  for (var i = 0; i < dacdata.devices.length; i++) {
    if (dacdata.devices[i].name == devicename) {
      var num = i;
      for (var i = 0; i < dacdata.devices[num].data.length; i++) {
        if (dacdata.devices[num].data[i].name == data) {
          if (dacdata.devices[num].data[i].mixer) {
            var mixer = dacdata.devices[num].data[i].mixer;
          }
        }
      }
    }
  }

  return mixer;
};

ControllerI2s.prototype.enableI2SDAC = function (data) {
  var self = this;

  var defer = libQ.defer();
  var dacdata = fs.readJsonSync(('/volumio/app/plugins/system_controller/i2s_dacs/dacs.json'), 'utf8', {throws: false});
  var devicename = self.getAdditionalConf('system_controller', 'system', 'device');
  var response = '';

  var outdevicename = data;

  for (var k = 0; k < dacdata.devices.length; k++) {
    if (dacdata.devices[k].name === devicename) {
      var num = k;

      for (var i = 0; i < dacdata.devices[num].data.length; i++) {
        if (dacdata.devices[num].data[i].name === outdevicename) {
          var dac = dacdata.devices[num].data[i];
          var overlay = dac.overlay;
          var num = dac.alsanum;
          var reboot = dac.needsreboot;
          var script = dac.script;
          var modules = dac.modules;
          var id = dac.id;

          if (modules) {
            this.config.set('i2s_id', id);
            self.writeModulesFile(modules);
          } else {
            self.revomeAllDtOverlays();
            self.writeI2SDAC(overlay);
            if (script) {
              self.hotAddI2SDAC({'overlay': overlay, 'script': script});
            } else {
              self.hotAddI2SDAC({'overlay': overlay});
            }
            this.config.set('i2s_id', overlay);
          }

          this.config.set('i2s_enabled', true);
          this.config.set('i2s_dac', outdevicename);
          
          if (process.env.MODULAR_ALSA_PIPELINE !== 'true') {
            self.commandRouter.sharedVars.set('alsa.outputdevice', num);
            // Restarting MPD, this seems needed only on first boot
            setTimeout(function () {
              self.commandRouter.executeOnPlugin('music_service', 'mpd', 'restartMpd', '');
              self.commandRouter.executeOnPlugin('audio_interface', 'alsa_controller', 'updateVolumeSettings', '');
            }, 1500);
          }

          return libQ.resolve({'reboot': reboot});
        }
      }
    }
  }

  return libQ.reject("Unable to locate I2S DAC " + data);
};

ControllerI2s.prototype.writeI2SDAC = function (data) {
  var self = this;
  var devicename = self.getAdditionalConf('system_controller', 'system', 'device');
  var bootstring = 'dtoverlay=' + data + os.EOL;
  var searchexp = new RegExp(i2sOverlayBanner + 'dtoverlay=.*' + os.EOL);
  var i2sFile = '/boot/config.txt';

  if (devicename === 'Tinkerboard') {
    	bootstring = 'intf:' + bootstring;
    i2sFile = '/boot/hw_intf.conf';
    searchexp = new RegExp(i2sOverlayBanner + 'intf:dtoverlay=.*' + os.EOL);
  }

  fs.readFile(i2sFile, 'utf8', function (err, configTxt) {
  		if (err) {
      self.logger.error('Cannot read config.txt file: ' + err);
  		} else {
  			var newConfigTxt;

  			newConfigTxt = configTxt.replace(searchexp, i2sOverlayBanner + bootstring);

  			if (configTxt == newConfigTxt) {
  			// there was no pre-existing Volumio i2S DAC in config.txt => appending new entry
  				newConfigTxt = configTxt + os.EOL + i2sOverlayBanner + bootstring + os.EOL;
 			}

  			fs.writeFile(i2sFile, newConfigTxt, 'utf8', function (err) {
        if (err) self.logger.error('Cannot write config.txt file: ' + err);
  			});
  		}
  });
};

ControllerI2s.prototype.disableI2SDAC = function () {
  var self = this;
  var devicename = self.getAdditionalConf('system_controller', 'system', 'device');
  var i2sFile = '/boot/config.txt';
  var searchexp = new RegExp(os.EOL + os.EOL + '*' + i2sOverlayBanner + 'dtoverlay=.*' + os.EOL + '*');

  if (devicename === 'Tinkerboard') {
    i2sFile = '/boot/hw_intf.conf';
    searchexp = new RegExp(i2sOverlayBanner + 'intf:dtoverlay=.*' + os.EOL);
  }

  this.config.set('i2s_enabled', false);

  fs.readFile(i2sFile, 'utf8', function (err, configTxt) {
  		if (err) {
      self.logger.error('Cannot read config.txt file: ' + err);
  		} else {
  			configTxt = configTxt.replace(searchexp, os.EOL);

  			fs.writeFile(i2sFile, configTxt, 'utf8', function (err) {
        if (err) self.logger.error('Cannot write config.txt file: ' + err);
  			});

  			self.revomeAllDtOverlays();
  		}
  });
};

ControllerI2s.prototype.forceConfigTxtBannerCompat = function () {
  var self = this;
  var defer = libQ.defer();
  
  fs.readFile('/boot/config.txt', 'utf8', function (err, configTxt) {
  		if (err) {
            self.logger.error('Cannot read config.txt file: ' + err);
            defer.reject(err);
  		} else {
  			var index = configTxt.search(i2sOverlayBanner);

  			if (index == -1) {
  				// there is no Banner in config.txt; check if DAC dtoverlay is present (for backward compatibility)

                fs.readFile('/volumio/app/plugins/system_controller/i2s_dacs/dacs.json', 'utf8', function (err, dacdata) {
  					if (err) {
                        self.logger.error('Cannot read dacs.json file: ' + err);
                        defer.resolve();
  					} else {
                        var entries = configTxt.split(/dtoverlay=/);
                        var searchexp;

                        entries.forEach(function (str) {
                            str = str.split(/[^a-zA-Z0-9-]/)[0]; // take first word only (candidate overlay name)
                            if (dacdata.includes(str)) { // we found current dtoverlay name within .json database => is an i2s!
                                searchexp = new RegExp('dtoverlay=' + str);
                            }
                        });

  						if (searchexp !== undefined) { // we found older config file with valid DAC dtoverlay set and no Banner
  							// we add Banner before existing dtoverlay i2s entry and rewrite file
  							configTxt = configTxt.replace(searchexp, os.EOL + i2sOverlayBanner + searchexp.source + os.EOL);

  							fs.writeFile('/boot/config.txt', configTxt, 'utf8', function (err) {
                                if (err) {
                                    self.logger.error('Cannot write config.txt file: ' + err);
                                    defer.reject(err);
                                } else {
                                    defer.resolve();
                                }
  							});
                        } else {
                            defer.resolve();
                        }
 					}
  				});
  			} else {
  			    defer.resolve();
  			}
  		}
  });

  return defer.promise;
};

ControllerI2s.prototype.hotAddI2SDAC = function (data) {
  var self = this;

  var overlay = data.overlay.split(',');

  dtcommand(overlay[0]);

  if (data.script) {
    exec(__dirname + '/scripts/' + data.script, {uid: 1000, gid: 1000}, function (err, stdout, stderr) {
      if (err) {
        self.logger.error('Cannot execute DAC script: ' + err);
      } else {
        self.logger.info('Data script executed');
      }
    });
  }

  function dtcommand (parameter) {
    exec('/usr/bin/sudo /usr/bin/dtoverlay ' + parameter, {uid: 1000, gid: 1000}, function (err, stdout, stderr) {
      if (err) {
        self.logger.error('Cannot enable I2S Param: ' + err);
      } else {
        self.logger.info('I2S Param ' + data + ' successfully enabled');
      }
    });
  }
};

ControllerI2s.prototype.hotRemoveI2SDAC = function () {
};

ControllerI2s.prototype.revomeAllDtOverlays = function () {
  var self = this;

  var defer = libQ.defer();
  try {
    var overlaysRaw = execSync('/usr/bin/sudo /usr/bin/dtoverlay -l', { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
    var overlaysLine = overlaysRaw.split('\n');
  } catch (e) {
    self.logger.info('Cannot Remove all dtoverlays');
    var overlaysLine = [];
  }

  if (overlaysLine.length > 2) {
    for (var i = 1; i < overlaysLine.length; i++) {
      var overlaynameraw = overlaysLine[i].split(':');
      if (overlaynameraw[1]) {
        var overlayname = overlaynameraw[1].replace(/ /g, '');
        try {
          execSync('/usr/bin/sudo /usr/bin/dtoverlay -r ' + overlayname, { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
          self.logger.info('Removed overlay ' + overlayname);
        } catch (err) {
          self.logger.error('Cannot remove overlay ' + err.stdout);
        }
      }
    }
    defer.resolve('');
  } else {
    self.logger.info('No Overlays Loaded');
    defer.resolve('');
  }
};

ControllerI2s.prototype.execDacScript = function () {
  var self = this;
  var dacname = self.getConfigParam('i2s_dac');
  var defer = libQ.defer();

  fs.readJson(('/volumio/app/plugins/system_controller/i2s_dacs/dacs.json'), {encoding: 'utf8', throws: false},
  function(err, dacdata) {
    if(err || dacdata === null || dacdata.devices === null) {
      defer.reject(err);
      return;
    }
  
    var devicename = self.getAdditionalConf('system_controller', 'system', 'device');

    outer: for (var i = 0; i < dacdata.devices.length; i++) {
      if (dacdata.devices[i].name == devicename) {
        var num = i;
        for (var i = 0; i < dacdata.devices[num].data.length; i++) {
          if (dacdata.devices[num].data[i].name === dacname) {
            if (dacdata.devices[num].data[i].script && dacdata.devices[num].data[i].script.length > 0) {
              self.logger.info('Executing start script for DAC ' + dacname);
              exec(__dirname + '/scripts/' + dacdata.devices[num].data[i].script, {uid: 1000, gid: 1000}, function (err, stdout, stderr) {
                if (err) {
                  self.logger.error('Cannot execute DAC script: ' + err);
                } else {
                  self.logger.info('DAC script executed');
                }
                defer.resolve();
              });
            } else {
              defer.resolve();
            }
            return;
          }
        }
      }
    }
    // No matching device
    defer.resolve();
  });
  
  return defer.promise;
};

ControllerI2s.prototype.writeModulesFile = function (modules) {
  var self = this;
  var modulesfile = '/etc/modules';
  var moduleslist = modules;

  exec('/usr/bin/sudo /bin/chmod 777 ' + modulesfile, {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
    if (error !== null) {
      self.logger.error('Cannot set permissions for /etc/modules: ' + error);
    } else {
      var ws = fs.createWriteStream(modulesfile);
      ws.cork();
      for (var i = 0; i < moduleslist.length; i++) {
        ws.write(moduleslist[i] + '\n');
      }
      ws.end();
    }
  });
};
