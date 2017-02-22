'use strict';

var exec = require('child_process').exec;
var libQ = require('kew');
var nodetools = require('nodetools');
var enableweb = true;
var defaultwebsize = 'large';

// Define the AlbumArt class
module.exports = AlbumArt;

function AlbumArt(context) {
	var self = this;

	// Save a reference to the parent commandRouter
	self.context=context;
	self.commandRouter = self.context.coreCommand;
	self.configManager = self.context.configManager;

}

AlbumArt.prototype.onVolumioStart = function() {
	var self = this;

	var configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');

	self.config = new (require('v-conf'))();
	self.config.loadFile(configFile);

	enableweb = self.config.get('enableweb', true);
	defaultwebsize = self.config.get('defaultwebsize', 'extralarge');

	//Starting server
	exec('/usr/local/bin/node '+__dirname+'/serverStartup.js '+self.config.get('port')+' '+self.config.get('folder'),
		function (error, stdout, stderr) {

			if (error !== null) {
				console.log('Got an error: '+error);
			}
			else console.log('Album art server started up');

		});

    return libQ.resolve();
};

AlbumArt.prototype.onStop = function() {
	var self = this;
	//Perform startup tasks here
};

AlbumArt.prototype.onRestart = function() {
	var self = this;
	//Perform startup tasks here
};

AlbumArt.prototype.onInstall = function()
{
	var self = this;
	//Perform your installation tasks here
};

AlbumArt.prototype.onUninstall = function()
{
	var self = this;
	//Perform your installation tasks here
};

AlbumArt.prototype.getConfigurationFiles = function()
{
	var self = this;

	return ['config.json'];
};


/**
 * This method builds the url to the albumart server
 * @param data object with fields:  artist, album, size
 * @param path path to album art folder to scan
 * @param icon icon to show
 * @returns {string}
 */
AlbumArt.prototype.getAlbumArt = function (data, path,icon) {

    var artist, album, size;

    if (data != undefined && data.path != undefined) {
        path = this.sanitizeUri(data.path);
    }

    var web;

    if (data != undefined && data.artist != undefined && enableweb) {
        //performing decode since we cannot assume client will pass decoded strings

        artist = nodetools.urlDecode(data.artist);

        if(data.album)
            album = nodetools.urlDecode(data.album);
        else album =artist;

        if (data.size) {
			size=data.size;
		} else {
			size=defaultwebsize;
		}

        web = '?web=' + nodetools.urlEncode(artist) + '/' + nodetools.urlEncode(album) + '/'+size;
    }

    var url = '/albumart';

    if (web != undefined)
        url = url + web;

    if (web != undefined && path != undefined)
        url = url + '&';
    else if (path != undefined)
        url = url + '?';

    if (path != undefined)
        url = url + 'path=' + nodetools.urlEncode(path);

    if(icon!==undefined)
    {
        if(url==='/albumart')
            url=url+'?icon='+icon;
        else url=url+'&icon='+icon;
    }



    return url;
};

AlbumArt.prototype.getConfigParam = function (key) {
	var self = this;
	return self.config.get(key);
};

AlbumArt.prototype.setConfigParam = function (data) {
	var self = this;

	self.config.set(data.key, data.value);
};

AlbumArt.prototype.saveAlbumartOptions = function (data) {
	var self = this;

	if (data.enable_web != undefined) {
		self.config.set('enableweb', data['enable_web']);
		enableweb = data.enable_web;
	}

	if (data.web_quality != undefined) {
		self.config.set('defaultwebsize', data['web_quality'].value);
		defaultwebsize = data.web_quality.value;
	}

	self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('APPEARANCE.ALBUMART_SETTINGS'), self.commandRouter.getI18nString('COMMON.SETTINGS_SAVED_SUCCESSFULLY'));
};
