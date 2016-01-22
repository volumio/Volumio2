var io = require('socket.io-client');
var libQ = require('kew');
var exec = require('child_process').exec;
var fs = require('fs-extra');
var S = require('string');

// Define the ControllerMpd class
module.exports = ControllerAlsa;
function ControllerAlsa(context) {
    // This fixed variable will let us refer to 'this' object at deeper scopes
    var self = this;
    self.context = context;
    self.commandRouter = self.context.coreCommand;
    self.logger = self.context.logger;

}

ControllerAlsa.prototype.onVolumioStart = function () {
    var self = this;

    var configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');

    self.config = new (require('v-conf'))();
    self.config.loadFile(configFile);


    var volume = self.config.get('volumestart');

    var socketURL = 'http://localhost:3000';
    var options = {
        transports: ['websocket'],
        'force new connection': true
    };

    var client1 = io.connect(socketURL, options);

    client1.on('connect', function (data) {
        self.logger.info("Setting volume on startup at " + volume);
        client1.emit('volume', volume);
    });

    if (self.config.has('outputdevice') == false)
        self.config.addConfigValue('outputdevice', 'string', '0');

    self.logger.debug("Creating shared var alsa.outputdevice");
    self.commandRouter.sharedVars.addConfigValue('alsa.outputdevice', 'string', self.config.get('outputdevice'));
    self.commandRouter.sharedVars.registerCallback('alsa.outputdevice', self.outputDeviceCallback.bind(self));
};

ControllerAlsa.prototype.outputDeviceCallback = function (value) {
    var self = this;

    self.config.set('outputdevice', value);
};

ControllerAlsa.prototype.getConfigParam = function (key) {
    var self = this;

    return self.config.get(key);
};

ControllerAlsa.prototype.setConfigParam = function (data) {
    var self = this;

    self.config.set(data.key, data.value);
};


ControllerAlsa.prototype.getConfigurationFiles = function () {
    var self = this;

    return ['config.json'];
};

ControllerAlsa.prototype.getAlsaCards = function () {
    var self = this;
    var cards = [];

    var soundCardDir = '/proc/asound/';
    var infoFile = '/pcm0p/info';
    var regex = /card(\d+)/;

    var soundFiles = fs.readdirSync(soundCardDir);

    for (var i = 0; i < soundFiles.length; i++) {
        var fileName = soundFiles[i];
        var matches = regex.exec(fileName);
        var infoFileName = soundCardDir + fileName + infoFile;
        if (matches && fs.existsSync(infoFileName)) {
            var index = matches[1];
            var content = fs.readFileSync(infoFileName);

            var splitted = content.toString().split('\n');
            for (var j = 0; j < splitted.length; j++) {
                var line = S(splitted[j]);
                if (line.startsWith('id:')) {
                    cards.push({id: index, name: line.chompLeft('id:').trim().s});
                    break;
                }
            }
        }
    }

    return cards;
};