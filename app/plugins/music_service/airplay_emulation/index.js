'use strict';

var fs = require('fs-extra');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var config = new (require('v-conf'))();
var libQ = require('kew');
var ShairportReader = require('./shairport-sync-reader/shairport-sync-reader.js');


// Define the UpnpInterface class
module.exports = AirPlayInterface;


function AirPlayInterface(context) {
    // Save a reference to the parent commandRouter
    this.context = context;
    this.commandRouter = this.context.coreCommand;

    this.obj={
        status: 'play',
        service:'airplay',
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
        channels: 2
    };

}

AirPlayInterface.prototype.onVolumioStart = function () {
    var self = this;
    this.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Starting Shairport Sync');
    this.commandRouter.sharedVars.registerCallback('alsa.outputdevice', this.outputDeviceCallback.bind(this));
    this.commandRouter.sharedVars.registerCallback('system.name', this.playerNameCallback.bind(this));

    self.startShairportSync();
    return libQ.resolve();
};


AirPlayInterface.prototype.onStop = function () {
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


    var mixer = this.commandRouter.sharedVars.get('alsa.outputdevicemixer');
    var name = this.commandRouter.sharedVars.get('system.name');


    var fs = require('fs');

    var self = this;
    fs.readFile(__dirname + "/shairport-sync.conf.tmpl", 'utf8', function (err, data) {
        if (err) {
            return console.log(err);
        }

        var conf = data;
        conf = conf.replace("${name}", name);
        conf = conf.replace("${device}", outdev);
        conf = conf.replace("${mixer}", mixer);


        fs.writeFile("/etc/shairport-sync.conf", conf, 'utf8', function (err) {
            if (err) return console.log(err);
            startAirPlay(self);
        });
    });
};

function startAirPlay(self) {
    exec("sudo systemctl restart airplay", function (error, stdout, stderr) {
        if (error !== null) {
            self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Shairport-sync error: ' + error);
        }
        else {
            self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Shairport-Sync Started');
                self.startAirplayMeta();
        }
    });
}

AirPlayInterface.prototype.outputDeviceCallback = function () {
    var self = this;

    self.context.coreCommand.pushConsoleMessage('Output device has changed, restarting Shairport Sync');
    self.startShairportSync()
}


AirPlayInterface.prototype.playerNameCallback = function () {
    var self = this;

    self.context.coreCommand.pushConsoleMessage('System name has changed, restarting Shairport Sync');
    self.startShairportSync()
}

AirPlayInterface.prototype.startAirplayMeta = function () {
    var self = this;
    var pipeReader = new ShairportReader({ address: '226.0.0.1', port: '5555' });


    // Play begin
    pipeReader.on('pbeg', function(data) {
        self.context.coreCommand.volumioStop();
        self.context.coreCommand.stateMachine.setConsumeUpdateService(undefined);
        self.context.coreCommand.pushConsoleMessage("Airplay started streaming");

        self.obj.status='play';
        self.obj.title="";
        self.obj.artist="";
        self.obj.album="";
        self.obj.seek=0;
        self.obj.duration=0;
        self.obj.albumart="/albumart";

        self.context.coreCommand.stateMachine.setVolatile({
            service:"airplay",
            callback: self.unsetVol.bind(self)
        });

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
            self.obj.samplerate=meta.assr/1000+' KHz';
            self.obj.bitdepth='16 bit';
        } else {
            self.obj.samplerate='44.1 KHz';
            self.obj.bitdepth='16 bit';
        }

        self.obj.albumart=self.getAlbumArt({artist:self.obj.artist,album: self.obj.album},'');

        self.pushAirplayMeta();

    })

    pipeReader.on('prgr', function(meta) {

        var samplerate = (self.obj.samplerate.replace(' KHz', '')*1000);
        var duration = Math.round(parseFloat((meta.end-meta.start)/samplerate));
        var seek = Math.round(parseFloat((meta.current-meta.start)/samplerate));

        self.obj.duration= duration;
        self.obj.seek = seek;
        self.pushAirplayMeta();
    })


}

AirPlayInterface.prototype.pushAirplayMeta = function () {
    var self = this;

    self.context.coreCommand.servicePushState(self.obj, 'airplay');
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
    self.context.coreCommand.stateMachine.unSetVolatile();
    self.context.coreCommand.stateMachine.resetVolumioState().then(
        self.context.coreCommand.volumioStop.bind(self.commandRouter));

};

AirPlayInterface.prototype.unsetVol = function () {
    var self = this;

};

AirPlayInterface.prototype.getAdditionalConf = function (type, controller, data) {
    var self = this;
    return self.context.coreCommand.executeOnPlugin(type, controller, 'getConfigParam', data);
};
