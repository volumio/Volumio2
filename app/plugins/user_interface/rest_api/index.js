'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var api = require('/volumio/http/restapi.js');
var bodyParser = require('body-parser');

module.exports = interfaceApi;

function interfaceApi(context) {
    var self = this;

    self.context = context;
    self.commandRouter = self.context.coreCommand;
    self.musicLibrary = self.commandRouter.musicLibrary;
    var notFound = {'Error': "Error 404: resource not found"};
    var success = {'Message': "Succesfully restored resource"};

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

    api.route('/backup/config/')
        .get(function (req, res) {
            var response = self.commandRouter.getPluginsConf();

            if (response != undefined)
                res.json(response);
            else
                res.json(notFound);
        });


    api.route('/restore/playlists/')
        .post(function (req, res) {
            var response = {'Error': "Error: impossible to restore given data"};

            try{
                self.commandRouter.restorePlaylist({'type': req.body.type, 'path': req.body.path,
                    'backup': JSON.parse(req.body.data)});
                res.json(success);
            }catch(e){
                res.json(response)
            }
        });

    /*TO FINISH !!!!!!!!!!!
    api.route('/restore/config/')
        .post(function (req, res) {
            var response = {'Error': "Error: impossible to restore configurations"};

            try{
                var bobby = JSON.parse(req.body.config);
                self.commandRouter.restorePluginsConf(bobby);
                res.json(success);
            }catch(e){
                res.json(response);
            }
        });*/

    api.use('/v1', api);
    api.use(bodyParser.json());

    api.route('/getstate')
        .get(function (req, res) {


            var response = self.commandRouter.volumioGetState();

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