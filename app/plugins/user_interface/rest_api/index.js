'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var api = require('/volumio/http/restapi.js');

module.exports = interfaceApi;

function interfaceApi(context) {
    var self = this;

    self.context = context;
    self.commandRouter = self.context.coreCommand;
    self.musicLibrary = self.commandRouter.musicLibrary;
    var notFound = {'Error': "Error 404: playlist not found"};

    self.logger = self.commandRouter.logger;

    api.route('/backup/playlists/:type')
        .get(function (req, res) {

            var type = {'type': req.params.type};

            var response = self.commandRouter.loadBackup(type);

            if (response._data != undefined)
                res.json(response._data);
            else
                res.json(notFound);
        });
    api.route('backup/config')
        .get(function (req, res) {
            var self = this;
        });


    api.route('/restore/playlists/:type')
        .post(function (req, res) {
            var self = this;
        });

    api.use('/v1', api);

    api.route('/getstate')
        .get(function (req, res) {


            var response = self.commandRouter.volumioGetState();;

            if (response != undefined)
                res.json(response);
            else
                res.json(notFound);
        });

}

/*
interfaceApi.prototype.onVolumioStart = function ()
{
    var self = this;
    var configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,
        'config.json');
    self.config = new (require('v-conf'))();
    self.config.loadFile(configFile);
};


/*
 api.post('/v1/backup/playlists/', function (req, res) {
 var self = this;

 var defer = libQ.defer();

 })

*/

interfaceApi.prototype.pushQueue = function ()
{
    var self = this;

};

interfaceApi.prototype.pushState = function ()
{
    var self = this;

};