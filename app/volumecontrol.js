/**
 * Created by Michelangelo on 15/06/2015.
 * Inspiration from https://github.com/LinusU/node-loudness by LinusU
 */

var libQ = require('kew');
var libFast = require('fast.js');
var libSortOn = require('sort-on');
var libCrypto = require('crypto');
var libBase64Url = require('base64-url');
var libLevel = require('level');
var libUtil = require('util');
var spawn = require('child_process').spawn;

module.exports = CoreVolumeController;
function CoreVolumeController (commandRouter) {
    // This fixed variable will let us refer to 'this' object at deeper scopes
    var self = this;

    // Save a reference to the parent commandRouter
    self.commandRouter = commandRouter;

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

    var reDefaultDevice = /Simple mixer control \'([a-z0-9 -]+)\',[0-9]+/i;
    var defaultDeviceCache = null;
    var defaultDevice = function(cb) {
        if(defaultDeviceCache === null) {
            amixer([], function (err, data) {
                if(err) {
                    cb(err);
                } else {
                    var res = reDefaultDevice.exec(data);
                    if(res === null) {
                        cb(new Error('Alsa Mixer Error: failed to parse output'));
                    } else {
                        defaultDeviceCache = res[1];
                        cb(null, defaultDeviceCache);
                    }
                }
            });
        } else {
            cb(null, defaultDeviceCache);
        }
    };

    var reInfo = /[a-z][a-z ]*\: Playback [0-9-]+ \[([0-9]+)\%\] (?:[[0-9\.-]+dB\] )?\[(on|off)\]/i;
    var getInfo = function (cb) {
        defaultDevice(function (err, dev) {
            if(err) {
                cb(err);
            } else {
                amixer(['get', dev], function (err, data) {
                    if(err) {
                        cb(err);
                    } else {
                        var res = reInfo.exec(data);
                        if(res === null) {
                            cb(new Error('Alsa Mixer Error: failed to parse output'));
                        } else {
                            cb(null, {
                                volume: parseInt(res[1], 10),
                                muted: (res[2] == 'off')
                            });
                        }
                    }
                });
            }
        });
    };

    self.getVolume = function (cb) {
        getInfo(function (err, obj) {
            if(err) {
                cb(err);
            } else {
                cb(null, obj.volume);
            }
        });
    };

    self.setVolume = function (val, cb) {
        defaultDevice(function (err, dev) {
            if(err) {
                cb(err);
            } else {
                amixer(['set', dev, val + '%'], function (err) {
                    cb(err);
                });
            }
        });
    };

    module.exports.getMuted = function (cb) {
        getInfo(function (err, obj) {
            if(err) {
                cb(err);
            } else {
                cb(null, obj.muted);
            }
        });
    };

    module.exports.setMuted = function (val, cb) {
        amixer(['set', 'PCM', (val?'mute':'unmute')], function (err) {
            cb(err);
        });
    };

}
// Public methods -----------------------------------------------------------------------------------
CoreVolumeController.prototype.alsavolume = function(VolumeInteger) {
    var self = this;
    self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'VolumeController::SetAlsaVolume' + VolumeInteger);

    switch(VolumeInteger)
    {
        case 'MUTE':
            //Mute
            self.setVolume(0, function (err) {
                self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'VolumeController::Mute ');
            });
            break;
        case 'UNMUTE':
            //UnMute
            self.setVolume(50, function (err) {
                self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'VolumeController::UnMute ');
            });
            break;
        case '+':
            //Incrase Volume by one
            this.getVolume(function (err, vol) {
                self.setVolume(vol+1, function (err) {
                    self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'VolumeController::Volume ' + vol+1);
                });
            });
            break;
        case '-':
            //Decrase Volume by one
            this.getVolume(function (err, vol) {
                self.setVolume(vol-1, function (err) {
                    self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'VolumeController::Volume ' + vol-1);
                });
            });
            break;
        default:
            self.setVolume(VolumeInteger, function (err) {
                self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'VolumeController::Volume ' + VolumeInteger);
            });
    }
}
