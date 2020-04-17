'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;

module.exports = inputs;
function inputs (context) {
  var self = this;

  this.context = context;
  this.commandRouter = this.context.coreCommand;
  this.logger = this.context.logger;
  this.configManager = this.context.configManager;
}

inputs.prototype.onVolumioStart = function () {
  var self = this;
  var configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
  this.config = new (require('v-conf'))();
  this.config.loadFile(configFile);

  return libQ.resolve();
};

inputs.prototype.onStart = function () {
  var self = this;
  var defer = libQ.defer();

  defer.resolve();

  return defer.promise;
};

inputs.prototype.onStop = function () {
  var self = this;
  var defer = libQ.defer();

  defer.resolve();

  return libQ.resolve();
};

// Configuration Methods -----------------------------------------------------------------------------

inputs.prototype.getUIConfig = function () {
  var defer = libQ.defer();
  var self = this;

  var lang_code = this.commandRouter.sharedVars.get('language_code');

  self.commandRouter.i18nJson(__dirname + '/i18n/strings_' + lang_code + '.json',
    __dirname + '/i18n/strings_en.json',
    __dirname + '/UIConfig.json')
    .then(function (uiconf) {
      defer.resolve(uiconf);
    })
    .fail(function () {
      defer.reject(new Error());
    });

  return defer.promise;
};

inputs.prototype.setUIConfig = function (data) {
  var self = this;
  // Perform your installation tasks here
};

inputs.prototype.getConf = function (varName) {
  var self = this;
  // Perform your installation tasks here
};

inputs.prototype.setConf = function (varName, varValue) {
  var self = this;
  // Perform your installation tasks here
};

inputs.prototype.addToBrowseSources = function () {
  this.commandRouter.volumioAddToBrowseSources(data);
};

inputs.prototype.handleBrowseUri = function (curUri) {
  var self = this;

  var response;

  return response;
};

// Define a method to clear, add, and play an array of tracks
inputs.prototype.clearAddPlayTrack = function (track) {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'inputs::clearAddPlayTrack');

  self.commandRouter.logger.info(JSON.stringify(track));

  return self.sendSpopCommand('uplay', [track.uri]);
};

inputs.prototype.seek = function (timepos) {
  this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'inputs::seek to ' + timepos);

  return this.sendSpopCommand('seek ' + timepos, []);
};

// Stop
inputs.prototype.stop = function () {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'inputs::stop');
};

// Spop pause
inputs.prototype.pause = function () {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'inputs::pause');
};

// Get state
inputs.prototype.getState = function () {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'inputs::getState');
};

// Parse state
inputs.prototype.parseState = function (sState) {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'inputs::parseState');

  // Use this method to parse the state and eventually send it with the following function
};

// Announce updated State
inputs.prototype.pushState = function (state) {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'inputs::pushState');

  return self.commandRouter.servicePushState(state, self.servicename);
};

inputs.prototype.explodeUri = function (uri) {
  var self = this;
  var defer = libQ.defer();

  // Mandatory: retrieve all info for a given URI

  return defer.promise;
};

inputs.prototype.getAlbumArt = function (data, path) {
  var artist, album;

  if (data != undefined && data.path != undefined) {
    path = data.path;
  }

  var web;

  if (data != undefined && data.artist != undefined) {
    artist = data.artist;
    if (data.album != undefined) { album = data.album; } else album = data.artist;

    web = '?web=' + nodetools.urlEncode(artist) + '/' + nodetools.urlEncode(album) + '/large';
  }

  var url = '/albumart';

  if (web != undefined) { url = url + web; }

  if (web != undefined && path != undefined) { url = url + '&'; } else if (path != undefined) { url = url + '?'; }

  if (path != undefined) { url = url + 'path=' + nodetools.urlEncode(path); }

  return url;
};

inputs.prototype.search = function (query) {
  var self = this;
  var defer = libQ.defer();

  // Mandatory, search. You can divide the search in sections using following functions

  return defer.promise;
};

inputs.prototype._searchArtists = function (results) {

};

inputs.prototype._searchAlbums = function (results) {

};

inputs.prototype._searchPlaylists = function (results) {

};

inputs.prototype._searchTracks = function (results) {

};
