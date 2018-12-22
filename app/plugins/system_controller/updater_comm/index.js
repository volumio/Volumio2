'use strict';

module.exports = updater_comm;
var Inotify = require('inotify').Inotify;
var inotify = new Inotify(); //persistent by default, new Inotify(false) //no persistent
var io = require('socket.io-client');
global.io = require('socket.io')(3005);
global.exec = require('child_process').exec;
var execSync = require('child_process').execSync;
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
                        if (obj.status) {
                            obj.status = self.translateUpdateString(obj.status);
                        }
                        if (obj.message) {
                            obj.message = self.translateUpdateString(obj.message);
                        }
                        if (message === 'updateDone') {
                            return self.initRestartRoutine(obj.message);
                        } else {
                            self.commandRouter.executeOnPlugin('user_interface', 'websocket', 'broadcastMessage', {'msg':message,'value':obj});
                        }
                        console.log(message);
                        console.log(obj);
                    }
                } catch (e) {
                    self.logger.error('Error in translating update message: ' + e);
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

updater_comm.prototype.translateUpdateString = function (string) {
    var self = this;

    try {
        if (string.indexOf('Successfully updated to ') >= 0) {
            var version = string.split('"')[1];
            var status = self.commandRouter.getI18nString('UPDATER.SUCCESSFULLY_UPDATED_TO_VERSION') + ' ' + version + '. ' + self.commandRouter.getI18nString('UPDATER.SYSTEM_RESTART_IN');
            return status
        } else {
            switch(string) {
                case 'Preparing update':
                    return self.commandRouter.getI18nString('UPDATER.PREPARING_UPDATE');
                    break;
                case 'Creating backup':
                    return self.commandRouter.getI18nString('UPDATER.CREATING_BACKUP');
                    break;
                case 'Downloading new update':
                    return self.commandRouter.getI18nString('UPDATER.DOWNLOADING_UPDATE');
                    break;
                case 'Cleaning old files':
                    return self.commandRouter.getI18nString('UPDATER.CLEANING');
                    break;
                case 'Finalizing update':
                    return self.commandRouter.getI18nString('UPDATER.FINALIZING_UPDATE');
                    break;
                case 'Error':
                    return self.commandRouter.getI18nString('UPDATER.ERROR');
                    break;
                case 'Error: update failed, please restart system and retry':
                    return self.commandRouter.getI18nString('UPDATER.ERROR_UPDATE_FAILED');
                    break;
                case 'Update file not found':
                    return self.commandRouter.getI18nString('UPDATER.ERROR_UPDATE_FILE_NOT_FOUND');
                    break;
                default:
                    return string
            }
        }
    } catch(e) {
        self.logger.error('Cannot translate update string ' + string + ': ' + e);
        return string
    }


}

updater_comm.prototype.initRestartRoutine = function (string) {
    var self = this;
    var seconds = 15;

    try {
        setInterval(()=>{
        if (seconds !== 0) {
            var message = string + ' ' + seconds;
            var obj = { message: message, progress: 100, status: 'success' };
            self.commandRouter.executeOnPlugin('user_interface', 'websocket', 'broadcastMessage', {'msg':'updateDone','value':obj});
            seconds = seconds-1;
        } else {
            self.commandRouter.closeModals();
            return self.commandRouter.reboot();
        }
    }, 1000)
    } catch(e) {
        self.logger.error('Updater, cannot finalize update and restart: ' + e);
    }
};

updater_comm.prototype.onStart = function () {
    var self = this;

    setTimeout(()=>{
        if (process.env.PUSH_UPDATES_COMM === "true"){
            self.pushUpdatesSubscribe();
        }
    },30000)
    return libQ.resolve();
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

updater_comm.prototype.getAdditionalConf = function (type, controller, data, def) {
    var self = this;
    var setting = self.commandRouter.executeOnPlugin(type, controller, 'getConfigParam', data);

    if (setting == undefined) {
        setting = def;
    }
    return setting
};

updater_comm.prototype.setAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};

updater_comm.prototype.checkSystemIntegrity = function () {
    var self = this;
    var defer = libQ.defer();

    var ignoreSystemCheck = self.getAdditionalConf('system_controller', 'system', 'ignoreSystemCheck', false)
    if (fs.existsSync('/data/ignoresystemcheck') || ignoreSystemCheck) {
        defer.resolve({'isSystemOk':true});
    } else {
        var file = fs.readFileSync('/etc/os-release').toString().split('\n');
        var nLines = file.length;
        var str;
        for (var l = 0; l < nLines; l++) {
            if (file[l].match(/VOLUMIO_HASH/i)) {
                str = file[l].split('=');
                var defaultHash = str[1].replace(/\"/gi, "");
            }
        }

        exec('/usr/bin/md5deep -r -l -s -q /volumio | sort | md5sum | tr -d "-" | tr -d " \t\n\r"', function (error, stdout, stderr) {
            if (error !== null) {
                self.logger.error('Cannot read os relase file: ' + error);
                defer.resolve({'isSystemOk':false});
            } else {
                var currentHash = stdout;
                if (currentHash === defaultHash) {
                    defer.resolve({'isSystemOk':true});
                } else {
                    defer.resolve({'isSystemOk':false});
                }
            }
        });
    }



    return defer.promise
};

updater_comm.prototype.pushUpdatesSubscribe = function () {
    var self = this;

    try {
        var id = execSync('/usr/bin/md5sum /sys/class/net/eth0/address', {uid: 1000, gid: 1000}).toString().split(' ')[0];
        var isHw = true;
    } catch(e) {
        var id = self.getAdditionalConf('system_controller', 'system', 'uuid', '0000000000000000000000000');
        var isHw = false;
    }
    var systemInfo = self.commandRouter.executeOnPlugin('system_controller', 'system', 'getSystemVersion', '');
    var name = self.getAdditionalConf('system_controller', 'system', 'playerName', 'none');
    systemInfo.then((info)=>{
        var socket = io.connect('http://pushupdates.volumio.org');
        var subscribeData = {
            'id': id,
            'systemversion': info.systemversion,
            'variant': info.variant,
            'hardware': info.hardware,
            'isHw': isHw,
            'name': name

        };
        socket.emit('pushUpdateSubscribe', subscribeData);
        socket.on('ack', function(data) {
            socket.disconnect();

        });
    })
    .fail((e)=>{
        console.log('PUPD' + e);
    })
};
