'use strict';

var fs=require('fs-extra');
var config= new (require('v-conf'))();
var libQ = require('kew');


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

    for (var i in steps) {
        var step = fs.readJsonSync((__dirname + '/wizard_steps/' + steps[i]),  'utf8', {throws: false});
        stepsArray.push(step.id)
    }
    return  stepsArray
};

