'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;

// Define the ControllerMyMusic class
module.exports = ControllerMyMusic;

function ControllerMyMusic(context) {
	var self = this;

	// Save a reference to the parent commandRouter
	self.context = context;
	self.commandRouter = self.context.coreCommand;
	self.logger = self.commandRouter.logger;
	self.configManager = self.context.configManager;
}

ControllerMyMusic.prototype.getConfigurationFiles = function () {
	var self = this;

	return ['config.json'];
};

ControllerMyMusic.prototype.onVolumioStart = function () {
	var self = this;

    var configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');
    self.config = new (require('v-conf'))();
    self.config.loadFile(configFile);

    return libQ.resolve();
};

ControllerMyMusic.prototype.onStart = function () {
    var self = this;

    return libQ.resolve();
};

ControllerMyMusic.prototype.onStop = function () {
	var self = this;
	//Perform startup tasks here
};

ControllerMyMusic.prototype.onRestart = function () {
	var self = this;
	//Perform startup tasks here
};

ControllerMyMusic.prototype.getUIConfig = function () {
	var self = this;

	var self = this;
	var lang_code = self.commandRouter.sharedVars.get('language_code');

	var defer=libQ.defer();

    var additionalConf = self.getAdditionalPluginsConf();
    additionalConf.then(function(aconf) {
        self.commandRouter.i18nJson(__dirname+'/../../../i18n/strings_'+lang_code+'.json',
            __dirname+'/../../../i18n/strings_en.json',
            __dirname + '/UIConfig.json')
            .then(function(uiconf)
            {   var advancedSettingsStatus = self.commandRouter.getAdvancedSettingsStatus();
                if (advancedSettingsStatus === false) {
                    uiconf.sections[3].hidden = true;
                    uiconf.sections[4].hidden = true;
                    uiconf.sections[5].hidden = true;
                }
                var enableweb = self.getAdditionalConf('miscellanea', 'albumart', 'enableweb', true);
                self.configManager.setUIConfigParam(uiconf, 'sections[3].content[0].value', enableweb);
                self.configManager.setUIConfigParam(uiconf, 'sections[3].content[0].value.label', self.getLabelForSelect(self.configManager.getValue(uiconf, 'sections[3].content[0].options'), enableweb));

                var websize = self.getAdditionalConf('miscellanea', 'albumart', 'defaultwebsize', 'large');
                self.configManager.setUIConfigParam(uiconf, 'sections[3].content[1].value.value', websize);
                self.configManager.setUIConfigParam(uiconf, 'sections[3].content[1].value.label', self.getLabelForSelect(self.configManager.getValue(uiconf, 'sections[3].content[1].options'), websize));

                var metadataimage = self.getAdditionalConf('miscellanea', 'albumart', 'metadataimage', false);
                self.configManager.setUIConfigParam(uiconf, 'sections[3].content[2].value', metadataimage);
                self.configManager.setUIConfigParam(uiconf, 'sections[3].content[2].value.label', self.getLabelForSelect(self.configManager.getValue(uiconf, 'sections[3].content[2].options'), metadataimage));

                var tracknumbersConf = self.getAdditionalConf('music_service', 'mpd', 'tracknumbers', false);
                self.configManager.setUIConfigParam(uiconf, 'sections[4].content[0].value', tracknumbersConf);

                var compilationConf = self.getAdditionalConf('music_service', 'mpd', 'compilation', 'Various,various,Various Artists,various artists,VA,va');
                self.configManager.setUIConfigParam(uiconf, 'sections[4].content[1].value', compilationConf);

                var artistsortConf = self.getAdditionalConf('music_service', 'mpd', 'artistsort', true);
                if (artistsortConf) {
                    self.configManager.setUIConfigParam(uiconf, 'sections[4].content[2].value.value', true);
                    self.configManager.setUIConfigParam(uiconf, 'sections[4].content[2].value.label', 'albumartist')
                } else {
                    self.configManager.setUIConfigParam(uiconf, 'sections[4].content[2].value.value', false);
                    self.configManager.setUIConfigParam(uiconf, 'sections[4].content[2].value.label', 'artist')
                }

                var ffmpeg = self.getAdditionalConf('music_service', 'mpd', 'ffmpegenable', false);
                self.configManager.setUIConfigParam(uiconf, 'sections[4].content[3].value', ffmpeg);

                try {
                    var disabledSources = self.getDisabledSources();
                    var browseSources = self.commandRouter.volumioGetBrowseSources();
                    for (var i in browseSources) {
                        var source = browseSources[i];
                        var enabled = true;
                        uiconf.sections[5].saveButton.data.push(source.uri);
                        if (disabledSources && disabledSources.includes(source.uri)) {
                            enabled = false;
                        }
                        var sourceSetting = {
                            "id": source.uri,
                            "element": "switch",
                            "label": source.name,
                            "value": enabled
                        };
                        uiconf.sections[5].content.push(sourceSetting);
                    }
                } catch(e) {
                    self.logger.error('Could not retrieve disabled sources: ' + e);
                }

                if (process.env.HIDE_BROWSE_SOURCES_VISIBILITY_SELECTOR === 'true') {
                    uiconf.sections[5].hidden = true;
                }

                if (aconf) {
                    var insertInto = 3;
                    for (var i in aconf.sections) {
                        var streamingSection = aconf.sections[i];
                        uiconf.sections.splice(insertInto, 0, streamingSection);
                        insertInto++
                    }
                }

                defer.resolve(uiconf);
            })
            .fail(function(error)
            {
                self.logger.error('Could not build UIconfig for MyMusic: ' + error)
                defer.reject(new Error());
            })
	})

	return defer.promise;
};

ControllerMyMusic.prototype.getAdditionalPluginsConf = function() {
    let self = this;
    let defer = libQ.defer();

    let pluginsMyMysicConfig = self.context.coreCommand.pluginManager.getPluginsMyMusicConfig();
    pluginsMyMysicConfig.then(function(conf) {
        defer.resolve(conf);
    }).fail(function() {
        defer.resolve(false);
    });

    return defer.promise;
};

ControllerMyMusic.prototype.setUIConfig = function (data) {
	var self = this;

	var uiconf = fs.readJsonSync(__dirname + '/UIConfig.json');

};

ControllerMyMusic.prototype.getConf = function (varName) {
	var self = this;

	return self.config.get(varName);
};

ControllerMyMusic.prototype.setConf = function (varName, varValue) {
	var self = this;

	self.config.set(varName, varValue);
};

ControllerMyMusic.prototype.getConfigurationFiles = function () {
	var self = this;

	return ['config.json'];
};

ControllerMyMusic.prototype.scanDatabase = function () {
	var self = this;

	exec("/usr/bin/mpc update", function (error, stdout, stderr) {
		if (error !== null) {
			self.commandRouter.pushToastMessage('error', self.commandRouter.getI18nString('COMMON.MY_MUSIC'), self.commandRouter.getI18nString('COMMON.SCAN_DB_ERROR') + error);
			self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Database scan error: ' + error);
		}
		else {
			self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Database update started');
			self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('COMMON.MY_MUSIC'), self.commandRouter.getI18nString('COMMON.SCAN_DB'));
		}
	});
};

ControllerMyMusic.prototype.getAdditionalConf = function (type, controller, data, def) {
	var self = this;
	var setting = self.commandRouter.executeOnPlugin(type, controller, 'getConfigParam', data);

	if (setting == undefined) {
		setting = def;
	}
	return setting
};

ControllerMyMusic.prototype.getLabelForSelect = function (options, key) {
    var self=this;
    var n = options.length;
    for (var i = 0; i < n; i++) {
        if (options[i].value == key)
            return options[i].label;
    }

    return 'Error';
};

ControllerMyMusic.prototype.updateMusicLibraryBrowseSourcesVisibility = function (data) {
    var self=this;

    var disabledSourcesString = '';
    // Workaround to save arrays in v-conf
    for (var key in data) {
        var source = key;
        var enabled = data[key];
        if (data[key] === false) {
            if (disabledSourcesString.length) {
                disabledSourcesString = disabledSourcesString + '|';
            }
            disabledSourcesString = disabledSourcesString + source;
        }
    }
    self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('COMMON.CONFIGURATION_UPDATE'), self.commandRouter.getI18nString('APPEARANCE.BROWSE_SOURCES_VISIBILITY'));
    self.config.set('sources_disabled', disabledSourcesString);
    return self.commandRouter.volumioUpdateToBrowseSources();
};

ControllerMyMusic.prototype.getDisabledSources = function () {
    var self=this;
    // Workaround to read arrays in v-conf
    try {
        var disabledSourcesString = self.config.get('sources_disabled', []);
        var disabledSourcesArray = disabledSourcesString.split('|');
    } catch(e) {
        var disabledSourcesArray = [];
    }

    return disabledSourcesArray;
};



