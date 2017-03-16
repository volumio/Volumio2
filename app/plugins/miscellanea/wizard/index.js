'use strict';

var fs=require('fs-extra');
var config= new (require('v-conf'))();
var libQ = require('kew');
var netJson = {};
var wifiConnectPayload = {};
var wifiConnectPayloadExec = false;


var backgroundPath = '/data/backgrounds';

// Define the volumioWizard class
module.exports = volumioWizard;

function volumioWizard(context) {
    var self = this;

    // Save a reference to the parent commandRouter
    self.context=context;
    self.commandRouter = self.context.coreCommand;
    self.configManager = self.context.configManager;

    self.logger=self.context.logger;
}

volumioWizard.prototype.getConfigurationFiles = function()
{
    var self = this;

    return ['config.json'];
};

volumioWizard.prototype.onVolumioStart = function() {
    var self = this;
    //Perform startup tasks here
    self.configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');
    config.loadFile(self.configFile);

    return libQ.resolve();
};

volumioWizard.prototype.onStart = function() {
    var self = this;
    return libQ.resolve();
};

volumioWizard.prototype.onStop = function() {
    var self = this;
    //Perform startup tasks here
};

volumioWizard.prototype.onRestart = function() {
    var self = this;
    //Perform startup tasks here
};

volumioWizard.prototype.onInstall = function()
{
    var self = this;
    //Perform your installation tasks here
};

volumioWizard.prototype.onUninstall = function()
{
    var self = this;
    //Perform your installation tasks here
};


volumioWizard.prototype.setUIConfig = function(data)
{
    var self = this;

    var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

};

volumioWizard.prototype.getConf = function()
{
    var self = this;
    var conf = [];
    try {
        var conf = JSON.parse(fs.readJsonSync(self.configFile));
    } catch (e) {}

    return  conf;
};

//Optional functions exposed for making development easier and more clear
volumioWizard.prototype.getSystemConf = function(pluginName,varName)
{
    var self = this;
    //Perform your installation tasks here
};

volumioWizard.prototype.setSystemConf = function(pluginName,varName)
{
    var self = this;
    //Perform your installation tasks here
};


volumioWizard.prototype.getAdditionalConf = function (type, controller, data, def) {
    var self = this;
    var setting = self.commandRouter.executeOnPlugin(type, controller, 'getConfigParam', data);

    if (setting == undefined) {
        setting = def;
    }
    return setting
};

volumioWizard.prototype.setAdditionalConf = function()
{
    var self = this;
    //Perform your installation tasks here
};


volumioWizard.prototype.getConfigParam = function (key) {
    var self = this;
    return config.get(key);
};

volumioWizard.prototype.getShowWizard = function () {
    var self = this;
    return  config.get('show_wizard', true)
};


volumioWizard.prototype.getWizardSteps = function () {
    var self = this;

    var stepsFolder = __dirname + '/wizard_steps';
    var steps = fs.readdirSync(stepsFolder).sort(function(a, b){return a-b});
    var stepsArray = [];
    netJson = {};

    for (var i in steps) {
        console.log(steps[i])
        if (steps[i].indexOf("conf") <= -1)  {
            var step = fs.readJsonSync((__dirname + '/wizard_steps/' + steps[i]),  'utf8', {throws: false});
                if (step.show){
                        stepsArray.push(step);
                }
        }
    }
    return  stepsArray
};

volumioWizard.prototype.connectWirelessNetwork = function (data) {
    var self = this;
    var defer = libQ.defer();
    wifiConnectPayload = {};
    wifiConnectPayloadExec = false;

    var ethinfo = self.commandRouter.executeOnPlugin('system_controller', 'network', 'getWiredInfo', '');

    ethinfo.then(function (ethdata) {
        if (ethdata.connected) {
            if (data.ssid != undefined) {
                self.commandRouter.executeOnPlugin('system_controller', 'network', 'saveWirelessNetworkSettings', data);

                var connResults = {"wait": true, "message":"Connecting to network "+ data.ssid + "... " +  "Please wait"}
                defer.resolve(connResults)
            } else {
                defer.resolve('')
            }
        } else {
            wifiConnectPayload = data;
            wifiConnectPayloadExec = true;
            var message = self.commandRouter.getI18nString('NETWORK.WIRELESS_NETWORK_CONNECTION_DEFER');
            var message2 = self.commandRouter.getI18nString('NETWORK.WIRELESS_NETWORK_CONNECTION_DEFER2');
            var connStatus = {"wait": false, "result": message + " " + data.ssid +" " + message2};
            defer.resolve(connResults)
        }

    });

    return defer.promise;
};

volumioWizard.prototype.reportWirelessConnection = function () {
    var self = this;
    var defer = libQ.defer();
    var netInfo = self.commandRouter.executeOnPlugin('system_controller', 'network', 'getWirelessInfo', '');

    netInfo.then(function (data) {
        if (data != undefined) {
            if (data.connected && data.ssid != undefined) {
                var message = self.commandRouter.getI18nString('NETWORK.WIRELESS_NETWORK_CONNECTION_SUCCESSFUL');
                var message2 = self.commandRouter.getI18nString('NETWORK.WIRELESS_NETWORK_CONNECTION_SUCCESSFUL_PROCEED');
                var connStatus = {"wait": false, "result": message + " " + data.ssid +", " + message2};
            } else {
                var message = self.commandRouter.getI18nString('NETWORK.WIRELESS_NETWORK_CONNECTION_ERROR');
                var message2 = self.commandRouter.getI18nString('NETWORK.WIRELESS_NETWORK_CONNECTION_ERROR_PROCEED');
                var connStatus = {"wait": false, "result": message + " " + data.ssid +", " + message2};
            }
            return self.commandRouter.broadcastMessage('pushWizardWirelessConnResults', connStatus);
        }
    });

};

volumioWizard.prototype.getWizardConfig = function (data) {
    var self = this;

    var defer = libQ.defer();

    var lang_code = this.commandRouter.sharedVars.get('language_code');
    var conf = __dirname + '/wizard_steps/conf/' + data.page+'.json';

    self.commandRouter.i18nJson(__dirname+'/../../../i18n/strings_'+lang_code+'.json',
        __dirname+'/../../../i18n/strings_en.json',
        conf)
        .then(function(uiconf)
        {


            defer.resolve(uiconf);
        })
        .fail(function()
        {
            defer.reject(new Error());
        })

    return defer.promise
};
