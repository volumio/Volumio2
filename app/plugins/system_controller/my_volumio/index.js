'use strict';

var libQ = require('kew');

module.exports = myVolumio;

function myVolumio(context)
{
    var self = this;

    self.context = context;
    self.commandRouter = self.context.coreCommand;
}
myVolumio.prototype.onVolumioStart = function ()
{
    var self = this;
    var configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,
        'config.json');
    self.config = new (require('v-conf'))();
    self.config.loadFile(configFile);
};


myVolumio.prototype.onStart = function ()
{
    var self = this;
    var defer = libQ.defer();
    var paths = self.commandRouter.getPluginsConf();

    console.log(paths);

    return defer.promise;

}

myVolumio.prototype.onStop = function () {
    var self = this;
    //Perform startup tasks here
};

myVolumio.prototype.onRestart = function () {
    var self = this;
    //Perform startup tasks here
};

myVolumio.prototype.onInstall = function () {
    var self = this;
    //Perform your installation tasks here
};

myVolumio.prototype.onUninstall = function () {
    var self = this;
    //Perform your installation tasks here
};

myVolumio.prototype.getUIConfig = function ()
{
    var self = this;
    var defer = libQ.defer();
    var lang_code = this.commandRouter.sharedVars.get("language_code");
    self.commandRouter.i18nJson(__dirname+'/../../../i18n/strings_'+lang_code+'.json',
        __dirname+'/../../../i18n/strings_en.json',
        __dirname + '/UIConfig.json')
        .then(function(uiconf)
        {

            //uiconf.sections[0].content[0].value = self.config.get('username');
            //uiconf.sections[0].content[1].value = self.config.get('password');

            defer.resolve(uiconf);
        })
        .fail(function ()
        {
           defer.reject(new Error());
        });

    return defer.promise;
};

//manage parameters from config.json file of every plugin
myVolumio.prototype.retrievePlugConfig = function () {
    var self = this;

    return CoreCommandRouter.getPluginsConf();
}

myVolumio.prototype.login = function ()
{
    var self = this;
}

myVolumio.prototype.setUIConfig = function (data) {
    var self = this;
    //Perform your installation tasks here
};

myVolumio.prototype.getConf = function (varName) {
    var self = this;
    //Perform your installation tasks here
};

myVolumio.prototype.setConf = function (varName, varValue) {
    var self = this;
    //Perform your installation tasks here
};

//Optional functions exposed for making development easier and more clear
myVolumio.prototype.getSystemConf = function (pluginName, varName) {
    var self = this;
    //Perform your installation tasks here
};

myVolumio.prototype.setSystemConf = function (pluginName, varName) {
    var self = this;
    //Perform your installation tasks here
};

myVolumio.prototype.getAdditionalConf = function () {
    var self = this;
    //Perform your installation tasks here
};

myVolumio.prototype.setAdditionalConf = function () {
    var self = this;
    //Perform your installation tasks here
};