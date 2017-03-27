'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var Promise = require('bluebird');
var wipeer = require('wipeer');
var myvolumio = require('myvolumio');

module.exports = myVolumioController;

function myVolumioController(context)
{
    var self = this;

    self.context = context;
    self.commandRouter = self.context.coreCommand;
    self.logger = self.context.logger;
    var backend;
}

myVolumioController.prototype.onVolumioStart = function ()
{
    var self = this;
    var configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,
        'config.json');
    self.config = new (require('v-conf'))();
    self.config.loadFile(configFile);
};


myVolumioController.prototype.onStart = function ()
{
    var self = this;
    var defer = libQ.defer();

    var token = self.config.get('token');
    var uuid = self.commandRouter.executeOnPlugin('system_controller', 'system', 'getConfigParam', 'uuid');
    var device = self.commandRouter.executeOnPlugin('system_controller', 'system', 'getConfigParam', 'device');
    var name = self.commandRouter.executeOnPlugin('system_controller', 'system', 'getConfigParam', 'playerName');


    if (token == undefined) {
        var username = self.config.get('username');
        var password = self.config.get('password');

    };

    self.cloudLink();

    return defer.promise;
}

myVolumioController.prototype.onStop = function () {
    var self = this;
    //Perform startup tasks here
};

myVolumioController.prototype.onRestart = function () {
    var self = this;
    //Perform startup tasks here
};

myVolumioController.prototype.onInstall = function () {
    var self = this;
    //Perform your installation tasks here
};

myVolumioController.prototype.onUninstall = function () {
    var self = this;
    //Perform your installation tasks here
};

myVolumioController.prototype.getUIConfig = function () {
    var self = this;
    var defer = libQ.defer();
    var lang_code = this.commandRouter.sharedVars.get("language_code");
    self.commandRouter.i18nJson(__dirname+'/../../../i18n/strings_'+lang_code+'.json',
        __dirname+'/../../../i18n/strings_en.json',
        __dirname + '/UIConfig.json')
        .then(function(uiconf) {

            //uiconf.sections[0].content[0].value = self.config.get('username');
            //uiconf.sections[0].content[1].value = self.config.get('password');

            defer.resolve(uiconf);
        })
        .fail(function () {
           defer.reject(new Error());
        });

    return defer.promise;
};

//manage parameters from config.json file of every plugin
myVolumioController.prototype.retrievePlugConfig = function () {
    var self = this;

    return self.commandRouter.getPluginsConf();
}

myVolumioController.prototype.login = function () {
    var self = this;
}

myVolumioController.prototype.setUIConfig = function (data) {
    var self = this;
    //Perform your installation tasks here
};

myVolumioController.prototype.getConf = function (varName) {
    var self = this;
    //Perform your installation tasks here
};

myVolumioController.prototype.setConf = function (varName, varValue) {
    var self = this;
    //Perform your installation tasks here
};

//Optional functions exposed for making development easier and more clear
myVolumioController.prototype.getSystemConf = function (pluginName, varName) {
    var self = this;
    //Perform your installation tasks here
};

myVolumioController.prototype.setSystemConf = function (pluginName, varName) {
    var self = this;
    //Perform your installation tasks here
};

myVolumioController.prototype.getAdditionalConf = function () {
    var self = this;
    //Perform your installation tasks here
};

myVolumioController.prototype.setAdditionalConf = function () {
    var self = this;
    //Perform your installation tasks here
};

myVolumioController.prototype.connectToCloud = function () {
    var self = this;

    var name = self.commandRouter.executeOnPlugin('system_controller', 'system', 'getConfigParam', 'playerName');
    var username = self.config.get('username');
    var password = self.config.get('password');

    var conf = {
        url: 'wss://dev-my.volumio.org/',
            name: name,
            type: wipeer.client.type.NODEJS,
            credentials: {
            username: 'account1',
            password: 'password1'
        }
    }

    return new Promise((resolve) => {
        self.logger.info('Establishing MyVolumio Cloud Connection')
        this.backend = new myvolumio.Backend(conf)
        this.backend.events.on('started', resolve)
        this.backend.start()
        this.backend.events.on('linked', resolve)
        this.backend.link('http://localhost:3000')
})

};

myVolumioController.prototype.cloudLink = function () {
    var self = this;
    return self.connectToCloud()
            .catch((e) => {
            self.logger.error('Volumio Cloud Backend error: '+ e)
})
}