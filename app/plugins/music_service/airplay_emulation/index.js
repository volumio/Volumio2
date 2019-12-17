'use strict';

var fs = require('fs-extra');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var execSync = require('child_process').execSync;
var config = new (require('v-conf'))();
var libQ = require('kew');
var ShairportReader = require('./shairport-sync-reader/shairport-sync-reader.js');
var pipeReader;
var seekTimer;
var onDemand = false;
var airplayActive = false;

// Define the UpnpInterface class
module.exports = AirPlayInterface;

function AirPlayInterface(context) {
    // Save a reference to the parent commandRouter
    this.context = context;
    this.commandRouter = this.context.coreCommand;
    this.logger = this.commandRouter.logger;
    this.obj={
        status: 'play',
        service:'airplay_emulation',
        title: '',
        artist: '',
        album: '',
        albumart: '/albumart',
        uri: '',
        trackType: 'airplay',
        seek: 0,
        duration: 0,
        samplerate: '',
        bitdepth: '',
        channels: 2,
        disableUiControls: true
    };

}

AirPlayInterface.prototype.onVolumioStart = function () {
    var self = this;
    self.logger.info('Starting Shairport Sync');

    this.commandRouter.sharedVars.registerCallback('alsa.outputdevice', this.outputDeviceCallback.bind(this));
    this.commandRouter.sharedVars.registerCallback('system.name', this.playerNameCallback.bind(this));
    var configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
    this.config = new (require('v-conf'))();
    this.config.loadFile(configFile);

    return libQ.resolve();
};

AirPlayInterface.prototype.onStart = function () {
    var self = this;

    if (process.env.SHAIRPORT_SYNC_ON_DEMAND === "true") {
        onDemand = true;
    }

    if (onDemand) {
        var data = {"albumart": "/albumart?sourceicon=music_service/airplay_emulation/shairporticon.png", "name": "Shairport-Sync", "uri": "airplayOnDemand","plugin_type":"music_service","plugin_name": "airplay_emulation", "static":true};
        this.commandRouter.volumioAddToBrowseSources(data);
    } else {
        self.startShairportSync();
    }

    this.startShairportSync();
    return libQ.resolve();
};

AirPlayInterface.prototype.onStop = function () {
    var self = this;

    this.commandRouter.volumioRemoveToBrowseSources('Shairport-Sync');
    this.stopShairportSync();
    return libQ.resolve();
};

AirPlayInterface.prototype.onRestart = function () {
};

AirPlayInterface.prototype.onInstall = function () {
};

AirPlayInterface.prototype.onUninstall = function () {
};

AirPlayInterface.prototype.getUIConfig = function () {
};

AirPlayInterface.prototype.setUIConfig = function (data) {
};

AirPlayInterface.prototype.getConf = function (varName) {
};

AirPlayInterface.prototype.setConf = function (varName, varValue) {
};

//Optional functions exposed for making development easier and more clear
AirPlayInterface.prototype.getSystemConf = function (pluginName, varName) {
};

AirPlayInterface.prototype.setSystemConf = function (pluginName, varName) {
};

AirPlayInterface.prototype.getAdditionalConf = function () {
};

AirPlayInterface.prototype.setAdditionalConf = function () {
};

AirPlayInterface.prototype.startShairportSync = function () {
    var self = this;
    // Loading Configured output device
    var outdev = this.commandRouter.sharedVars.get('alsa.outputdevice');
    if (outdev == 'softvolume' ) {
        outdev = self.getAdditionalConf('audio_interface', 'alsa_controller', 'softvolumenumber');
    }
    if (outdev.indexOf(',') >= 0) {
        outdev = 'plughw:'+outdev;
    } else {
        outdev = 'plughw:'+outdev+',0';
    }

    var buffer_size_line;
    var mixer = this.commandRouter.sharedVars.get('alsa.outputdevicemixer');
    var name = this.commandRouter.sharedVars.get('system.name');
    var isPrimo = self.detectPrimo();
    // With Primo we need to set a lower buffer size
    if (isPrimo && outdev === 'plughw:0,0') {
        buffer_size_line = 'buffer_size = 5536;';
    }

    var fs = require('fs');
    fs.readFile(__dirname + "/shairport-sync.conf.tmpl", 'utf8', function (err, data) {
        if (err) {
            self.logger.error('Could not read default Shairport Sync Conf: ' + err);
        } else {
            var conf = data;
            conf = conf.replace("${name}", name);
            conf = conf.replace("${device}", outdev);
            if (buffer_size_line && buffer_size_line.length) {
                conf = conf.replace("${buffer_size_line}", buffer_size_line);
            } else {
                conf = conf.replace("${buffer_size_line}", "");
            }
            conf = conf.replace("${mixer}", mixer);
            var onDemand_line = '';
            if (!onDemand){
                onDemand_line = 'run_this_after_play_ends = "/usr/local/bin/volumio stopairplay";'
            }
            conf = conf.replace('"${run_this_after_play_ends}"', onDemand_line);
            fs.writeFile("/tmp/shairport-sync.conf", conf, 'utf8', function (err) {
                if (err) {
                    self.logger.info('Could not write Shairport Sync Configuration: ' + err);
                } else {
                    startShairportSync(self);
                }

            });
        }
    });
};

function startShairportSync(self) {
    self.logger.info('Starting Shairport Sync');

    exec('/usr/bin/sudo /bin/systemctl restart shairport-sync', function (error, stdout, stderr) {
        if (error !== null) {
            self.logger.info('Shairport-sync error: ' + error);
        } else {
            self.logger.info('Shairport-Sync Started');
            self.startShairportSyncMeta();
        }
    });
}

AirPlayInterface.prototype.stopShairportSync = function () {
    var self = this;

    exec('/usr/bin/sudo /bin/systemctl stop shairport-sync', {uid:1000, gid:1000}, function (error, stdout, stderr) {
        if (error !== null) {
            self.logger.info('Shairport-sync error: ' + error);
        } else {
            self.logger.info('Shairport-Sync Stopped');
        }
    });
}

AirPlayInterface.prototype.outputDeviceCallback = function () {
    var self = this;

    self.logger.info('Output device has changed, restarting Shairport Sync');

    if (onDemand) {

    } else {
        self.startShairportSync();
    }

}


AirPlayInterface.prototype.playerNameCallback = function () {
    var self = this;

    self.logger.info('System name has changed, restarting Shairport Sync');

    if (onDemand) {

    } else {
        self.startShairportSync();
    }
}

AirPlayInterface.prototype.startShairportSyncMeta = function () {
    var self = this;
    var pipeReader = new ShairportReader({ address: '127.0.0.1', port: '5555' });

    // Play begin
    pipeReader.on('pbeg', function(data) {
        self.logger.info("Airplay started streaming, receiving metadatas");
        self.obj.status='play';
        self.obj.title="";
        self.obj.artist="";
        self.obj.album="";
        self.obj.seek=0;
        self.obj.duration=0;
        self.obj.albumart="/albumart";

        if (!onDemand) {
            self.prepareAirplayPlayback();
        }
    })

    pipeReader.on('meta', function(meta) {

        if (meta.asaa != undefined && meta.asaa.length > 0) {
            self.obj.artist=meta.asaa;
        }

        if (meta.minm != undefined && meta.minm.length > 0) {
            self.obj.title=meta.minm;
        }

        if (meta.asar != undefined && meta.asar.length > 0) {
            self.obj.artist=meta.asar;
        }

        if (meta.asal != undefined && meta.asal.length > 0) {
            self.obj.album=meta.asal;
        }

        if (meta.assr != undefined && meta.assr.length > 0) {
            self.obj.samplerate=meta.assr/1000+' kHz';
            self.obj.bitdepth='16 bit';
        } else {
            self.obj.samplerate='44.1 kHz';
            self.obj.bitdepth='16 bit';
        }

        if (meta.caps != undefined && meta.caps == 1) {
            self.obj.status='play';
        }

        if (meta.caps != undefined && meta.caps == 2) {
            self.obj.status='pause';
        }

        self.obj.albumart=self.getAlbumArt({artist:self.obj.artist,album: self.obj.album},'');

        self.pushAirplayMeta();

    })

    pipeReader.on('prgr', function(meta) {

        var samplerate = (self.obj.samplerate.replace(' kHz', '')*1000);
        var duration = Math.round(parseFloat((meta.end-meta.start)/samplerate));
        var seek = (Math.round(parseFloat((meta.current-meta.start)/samplerate)))*1000;

        self.obj.status='play';
        self.obj.duration= duration;
        self.obj.seek = seek;
        self.pushAirplayMeta();
    })

    pipeReader.on('pvol', function(pvol) {


        //if (pvol.airplay === -144) {
        //    self.commandRouter.volumiosetvolume('mute');
        //}
    })

    pipeReader.on('pend', function(pend) {

        self.obj.title="";
        self.obj.artist="";
        self.obj.album="";
        self.obj.seek=0;
        self.obj.duration=0;
        self.obj.albumart="/albumart";
        self.obj.samplerate='';
        self.obj.bitdepth='';
        self.pushAirplayMeta();
    })


}

AirPlayInterface.prototype.pushAirplayMeta = function () {
    var self = this;
    self.seekTimerAction();
    self.context.coreCommand.servicePushState(self.obj, 'airplay_emulation');
}

AirPlayInterface.prototype.getAlbumArt = function (data, path,icon) {
    var self = this;

    if(this.albumArtPlugin==undefined)
    {
        //initialization, skipped from second call
        this.albumArtPlugin=  self.context.coreCommand.pluginManager.getPlugin('miscellanea', 'albumart');
    }

    if(this.albumArtPlugin)
        return this.albumArtPlugin.getAlbumArt(data,path,icon);
    else
    {
        return "/albumart";
    }
};

AirPlayInterface.prototype.airPlayStop = function () {
    var self = this;

    /*
    self.context.coreCommand.stateMachine.unSetVolatile();
    self.context.coreCommand.stateMachine.resetVolumioState().then(
        self.context.coreCommand.volumioStop.bind(self.commandRouter));
        */

};

AirPlayInterface.prototype.unsetVol = function () {
    var self = this;

    if (!onDemand) {
        var state = self.commandRouter.stateMachine.getState();
        if (state && state.service && state.service !== 'airplay_emulation' && self.commandRouter.stateMachine.isVolatile) {
            return self.sendShairportStopCommand();
        } else {
            setTimeout(()=>{
                return libQ.resolve()
            },1500)
        }
        return self.sendShairportStopCommand();
    } else {
        setTimeout(()=>{
            return libQ.resolve()
        },500)
    }
};

AirPlayInterface.prototype.getAdditionalConf = function (type, controller, data) {
    var self = this;
    return self.context.coreCommand.executeOnPlugin(type, controller, 'getConfigParam', data);
};

AirPlayInterface.prototype.stop = function () {
    var self = this;
    var defer = libQ.defer();

    self.logger.info('Airplay Stop');
    if (!onDemand) {
        return self.sendShairportStopCommand();
    } else {
        defer.resolve('');
    }

    return defer.promise
};

AirPlayInterface.prototype.startShairportSyncOnDemand = function () {
    var self = this;

    this.commandRouter.stateMachine.setConsumeUpdateService(undefined);
    try {
        this.commandRouter.volumioStop().then(()=>{

            self.context.coreCommand.volumioStop();
        self.context.coreCommand.stateMachine.setConsumeUpdateService(undefined);
        self.context.coreCommand.stateMachine.setVolatile({
            service:'airplay_emulation',
            callback: self.unsetVol.bind(self)
        });
    });

    } catch(e) {
        self.context.coreCommand.volumioStop();
        self.context.coreCommand.stateMachine.setConsumeUpdateService(undefined);
        self.context.coreCommand.stateMachine.setVolatile({
            service:'airplay_emulation',
            callback: self.unsetVol.bind(self)
        });
    }

    self.startShairportSync();
};

AirPlayInterface.prototype.handleBrowseUri = function (uri) {
    var self = this;
};

AirPlayInterface.prototype.stopAirplay = function () {
    var self = this;

    self.logger.info('Stopping airplay');

    if (onDemand) {
        self.stopShairportSync();
    }
};

AirPlayInterface.prototype.seekTimerAction = function() {
    var self = this;

    if (this.obj.status === 'play') {
        if (seekTimer === undefined) {
            seekTimer = setInterval(()=>{
                this.obj.seek = this.obj.seek + 1000;
                //console.log('SEEK: ' + this.obj.seek);
        }, 1000)
        }
    } else {
        clearInterval(seekTimer);
        seekTimer = undefined;
    }
};

AirPlayInterface.prototype.detectPrimo = function () {
    var self = this;

    try {
        var primoAudioDevice = execSync('aplay -l | grep es90x8q2m-dac-dai-0').toString();
        if (primoAudioDevice.length > 0) {
            return true
        } else {
            return false
        }
    } catch(e) {
        self.logger.info('Could not detect Primo: ' + e);
        return false
    }
};

AirPlayInterface.prototype.sendShairportStopCommand = function () {
    var self = this;
    var defer = libQ.defer();

    self.logger.info('Stopping Airplay Playback with DBUS Call');

    exec("/usr/bin/dbus-send --system --print-reply --type=method_call --dest=org.gnome.ShairportSync '/org/gnome/ShairportSync' org.gnome.ShairportSync.RemoteControl.Stop", function (error, stdout, stderr) {
        if (error !== null) {
            self.logger.info('Error stopping Airplay Playback with DBUS Call: ' + error);
        } else {
            setTimeout(()=>{
                var killShairport = true;
                if (killShairport) {
                    self.gracefulRestart();
                }
            }, 500)
            setTimeout(()=>{
                // Waiting 500ms to make sure audio device is properly released
                defer.resolve();
            },4500)
        }
    });

    return defer.promise
};

AirPlayInterface.prototype.gracefulRestart = function () {
    var self = this;

    exec('/usr/bin/sudo /bin/systemctl restart shairport-sync', function (error, stdout, stderr) {
        if (error !== null) {
            self.logger.info('Shairport-sync error: ' + error);
        } else {
            self.logger.info('Shairport-Sync retarted');
        }
    });
};


AirPlayInterface.prototype.startAirplayPlayback = function () {
    var self = this;

    self.logger.info('Airplay playback start');

    self.prepareAirplayPlayback();
};

AirPlayInterface.prototype.stopAirplayPlayback = function () {
    var self = this;

    self.logger.info('Airplay playback stop');

    if (!onDemand) {
        var state = self.commandRouter.stateMachine.getState();
        if (state && state.service && state.service === 'airplay_emulation') {
            self.logger.info('Airplay Playback Stopped, clearing state');
            self.context.coreCommand.stateMachine.resetVolumioState();
        }
    }
};

AirPlayInterface.prototype.setAirplayActive = function () {
    var self = this;
    airplayActive = true;
};

AirPlayInterface.prototype.setAirplayInctive = function () {
    var self = this;
    airplayActive = false;
};


AirPlayInterface.prototype.prepareAirplayPlayback = function () {
    var self = this;

    var state = self.commandRouter.stateMachine.getState();
    if (state && state.service && state.service !== 'airplay_emulation') {
        if (self.commandRouter.stateMachine.isVolatile) {
            self.commandRouter.stateMachine.unSetVolatile();
        } else {
            self.context.coreCommand.volumioStop();
            self.context.coreCommand.stateMachine.setConsumeUpdateService(undefined);
        }

    }
    setTimeout(()=>{
        self.context.coreCommand.stateMachine.setVolatile({
        service:'airplay_emulation',
        callback: self.unsetVol.bind(self)
    });
        self.pushAirplayMeta();
    }, 1000)
};

// Playback controls
// TODO: Find an event that signals playback pause and enable them.
// See https://github.com/mikebrady/shairport-sync/blob/master/documents/sample%20dbus%20commands

AirPlayInterface.prototype.play = function () {
    var self = this;

    self.logger.info('Airplay Play with DBUS Call');
    exec("/usr/bin/dbus-send --system --print-reply --type=method_call --dest=org.gnome.ShairportSync '/org/gnome/ShairportSync' org.gnome.ShairportSync.RemoteControl.Play", function (error, stdout, stderr) {
        if (error !== null) {
            self.logger.info('Error Airplay DBUS Call Play: ' + error);
        }
    });
};

AirPlayInterface.prototype.pause = function () {
    var self = this;

    self.logger.info('Airplay Pause with DBUS Call');
    exec("/usr/bin/dbus-send --system --print-reply --type=method_call --dest=org.gnome.ShairportSync '/org/gnome/ShairportSync' org.gnome.ShairportSync.RemoteControl.Pause", function (error, stdout, stderr) {
        if (error !== null) {
            self.logger.info('Error Airplay DBUS Call Pause: ' + error);
        }
    });
};

AirPlayInterface.prototype.next = function () {
    var self = this;

    self.logger.info('Airplay Next with DBUS Call');
    exec("/usr/bin/dbus-send --system --print-reply --type=method_call --dest=org.gnome.ShairportSync '/org/gnome/ShairportSync' org.gnome.ShairportSync.RemoteControl.Next", function (error, stdout, stderr) {
        if (error !== null) {
            self.logger.info('Error Airplay DBUS Call Next: ' + error);
        }
    });
};

AirPlayInterface.prototype.previous = function () {
    var self = this;

    self.logger.info('Airplay Previous with DBUS Call');
    exec("/usr/bin/dbus-send --system --print-reply --type=method_call --dest=org.gnome.ShairportSync '/org/gnome/ShairportSync' org.gnome.ShairportSync.RemoteControl.Previous", function (error, stdout, stderr) {
        if (error !== null) {
            self.logger.info('Error Airplay DBUS Call Previous: ' + error);
        }
    });
};

AirPlayInterface.prototype.seek = function () {
    var self = this;

    self.logger.info('Airplay Seek not available');
};