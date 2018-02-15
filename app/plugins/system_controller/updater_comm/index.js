'use strict';

module.exports = updater_comm;
var Inotify = require('inotify').Inotify;
var inotify = new Inotify(); //persistent by default, new Inotify(false) //no persistent
global.io = require('socket.io')(3005);
global.exec = require('child_process').exec;
global.fs = require('fs');
var libQ = require('kew');


function updater_comm(context) {
	var self = this;

	// Save a reference to the parent commandRouter
	self.context = context;
	self.commandRouter = self.context.coreCommand;
	self.configManager=self.context.configManager;
	self.logger = self.context.logger;
}


updater_comm.prototype.onVolumioStart = function () {

    return libQ.resolve();
};

updater_comm.prototype.notifyProgress = function () {
    var self = this;

    var lang_code = self.commandRouter.sharedVars.get('language_code');

    try {
        var cmd = '/usr/bin/touch /tmp/updater';
        var stats = fs.lstatSync('/tmp/updater');
        if (stats.isFile()) {
            cmd = "/bin/echo"
        }
    } catch (e) {
    }

    var callback = function (event) {
        var mask = event.mask;
        var type = mask & Inotify.IN_ISDIR ? 'directory ' : 'file ';
        event.name ? type += ' ' + event.name + ' ' : ' ';
        if (mask & Inotify.IN_CLOSE_WRITE) {
            fs = require('fs')
            fs.readFile('/tmp/updater', function (err, dota) {
                try {
                    var data = dota.toString()
                    //console.log("Got " + data);
                    var arr = data.split("\n")
                    if (arr.length > 1) {
                        var message = arr[0];
                        var obj = JSON.parse(arr[1]);
                        if (obj != undefined && obj.updateavailable != undefined && !obj.updateavailable) {
                            obj.description = self.commandRouter.getI18nString('SYSTEM.UPDATE_ALREADY_LATEST_VERSION');
                            obj.title = self.commandRouter.getI18nString('SYSTEM.NO_UPDATE_AVAILABLE');
                        }
                        console.log(message)
                        console.log(obj)
                        self.commandRouter.executeOnPlugin('user_interface', 'websocket', 'broadcastMessage', {'msg':message,'value':obj});
                    }
                } catch (e) {
                    
                }

            });
        }
    }
    exec(cmd, function (error, stdout, stderr) {
        var self = this;
        var ilFile = {
            path: '/tmp/updater',
            watch_for: Inotify.IN_CLOSE_WRITE,
            callback: callback
        };
        var ilFileDescriptor = inotify.addWatch(ilFile);
    });


};

updater_comm.prototype.onStop = function () {
	var self = this;
	inotify.removeWatch(self.ilFileDescriptor)
};

updater_comm.prototype.onRestart = function () {
	var self = this;
	//Perform startup tasks here
};

updater_comm.prototype.onInstall = function () {
	var self = this;
	//Perform your installation tasks here
};

updater_comm.prototype.onUninstall = function () {
	var self = this;
	//Perform your installation tasks here
};

updater_comm.prototype.getUIConfig = function () {
	var self = this;

	return {
		success: true,
		plugin: "updater_comm"
	};
};

updater_comm.prototype.setUIConfig = function (data) {
	var self = this;
	//Perform your installation tasks here
};

updater_comm.prototype.getConf = function (varName) {
	var self = this;
	//Perform your installation tasks here
};

updater_comm.prototype.setConf = function (varName, varValue) {
	var self = this;
	//Perform your installation tasks here
};

//Optional functions exposed for making development easier and more clear
updater_comm.prototype.getSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your installation tasks here
};

updater_comm.prototype.setSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your installation tasks here
};

updater_comm.prototype.getAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};

updater_comm.prototype.setAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};
