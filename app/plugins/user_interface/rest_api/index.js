'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var api = require('/volumio/http/restapi.js');
var bodyParser = require('body-parser');
var ifconfig = require('wireless-tools/ifconfig');
var unirest = require('unirest');

var pushNotificationsUrls = [];

module.exports = interfaceApi;

function interfaceApi(context) {
    var self = this;

    self.context = context;
    self.commandRouter = self.context.coreCommand;
    self.musicLibrary = self.commandRouter.musicLibrary;
    self.logger = self.commandRouter.logger;
    this.setIPAddress();

    api.use('/v1', api);
    api.use(bodyParser.json());

    this.browse=new (require(__dirname+'/browse.js'))(context);
    this.playback=new (require(__dirname+'/playback.js'))(context);
    this.system=new (require(__dirname+'/system.js'))(context);

    // Listings
    api.get('/browse', this.browse.browseListing.bind(this.browse));
    api.get('/search', this.browse.listingSearch.bind(this.browse));
    api.get('/listplaylists', this.browse.listPlaylists.bind(this.browse));
    api.get('/collectionstats', this.browse.getCollectionStats.bind(this.browse));
    api.get('/getzones', this.browse.getZones.bind(this.browse));

    // System
    api.get('/ping', this.system.ping.bind(this.browse));

    // Playback
    api.get('/commands', this.playback.playbackCommands.bind(this.playback));
    api.get('/getState', this.playback.playbackGetState.bind(this.playback));
    api.get('/getQueue', this.playback.playbackGetQueue.bind(this.playback));
    api.post('/addToQueue', this.playback.addToQueue.bind(this.playback));
    api.post('/addPlay', this.playback.addPlay.bind(this.playback));
    api.post('/replaceAndPlay', this.playback.replaceAndPlay.bind(this.playback));

    // Plugin Endpoints
    api.get('/pluginEndpoint', this.pluginRestEndpoint.bind(this));
    api.post('/pluginEndpoint', this.pluginRestEndpoint.bind(this));

    // Notifications
    api.get('/pushNotificationUrls', this.getPushNotificationUrls.bind(this));
    api.post('/pushNotificationUrls', this.addPushNotificationUrls.bind(this));
    api.delete('/pushNotificationUrls', this.removePushNotificationUrls.bind(this));

};

interfaceApi.prototype.printConsoleMessage = function (message) {
    var self = this;
    self.logger.debug("API:printConsoleMessage");
    return libQ.resolve();
};

interfaceApi.prototype.pushQueue = function (queue) {
    var self = this;
    self.logger.debug("API:pushQueue");

    self.emitPushNotification('queue', queue);
};

interfaceApi.prototype.pushLibraryFilters = function (browsedata) {
    var self = this;
    self.logger.debug("API:pushLibraryFilters");
};

interfaceApi.prototype.pushLibraryListing = function (browsedata) {
    var self = this;
    self.logger.debug("API:pushLibraryListing");
};

interfaceApi.prototype.pushPlaylistIndex = function (browsedata, connWebSocket) {
    var self = this;
    self.logger.debug("API:pushPlaylistIndex");

};

interfaceApi.prototype.pushMultiroom = function (data) {
    var self = this;
    self.logger.debug("Api push multiroom");

    self.emitPushNotification('multiroom', data);
};


interfaceApi.prototype.pushState = function (state) {
    var self = this;
    self.logger.debug("API:pushState");

    self.emitPushNotification('state', state);
};


interfaceApi.prototype.printToastMessage = function (type, title, message) {
    var self = this;
    self.logger.debug("API:printToastMessage");
};

interfaceApi.prototype.broadcastToastMessage = function (type, title, message) {
    var self = this;
    self.logger.debug("API:broadcastToastMessage");
};

interfaceApi.prototype.pushMultiroomDevices = function (data) {
    var self = this;
    self.logger.debug("API:pushMultiroomDevices");

    self.emitPushNotification('zones', data);
};

interfaceApi.prototype.pushError = function (error) {
    var self = this;
    self.logger.error("API:pushError: " + error);
    return libQ.resolve();
};

interfaceApi.prototype.pushAirplay = function (value) {
    var self = this;
    self.logger.debug("API:pushAirplay");
};

interfaceApi.prototype.emitFavourites = function (value) {
    var self = this;
    self.logger.debug("API:emitFavourites");
};

interfaceApi.prototype.broadcastMessage = function() {
    var self = this;
    self.logger.debug("API:emitFavourites");
};

interfaceApi.prototype.logStart = function (sCommand) {
    var self = this;
    self.commandRouter.pushConsoleMessage('\n' + '---------------------------- ' + sCommand);
    return libQ.resolve();
};

interfaceApi.prototype.pluginRestEndpoint = function (req, res) {
    var self = this;

    if (req.method == "POST") {
        var payload = req.query;
    }

    if (req.method == "POST") {
        var payload = req.body;
    }

    var result = self.executeRestEndpoint(payload);
    result.then(function(response) {
        res.json({'success': true});
    })
    .fail(function(error){
        res.json({'success': false, 'error': error});
    })
};

interfaceApi.prototype.executeRestEndpoint = function(data) {
    var self = this;
    var executed = false;
    var defer = libQ.defer();
    
    var pluginsRestEndpoints = self.commandRouter.getPluginsRestEndpoints();
    if (pluginsRestEndpoints.length && data.endpoint) {
        for (var i in pluginsRestEndpoints) {
            var endpoint = pluginsRestEndpoints[i];
            if (data.endpoint === endpoint.endpoint) {
                executed = true;
                self.logger.info('Executing endpoint ' + endpoint.endpoint);
                var execute = self.commandRouter.executeOnPlugin(endpoint.type, endpoint.name, endpoint.method, data.data);
                if (Promise.resolve(execute) == execute) {
                    execute.then(function(result) {
                        defer.resolve(result);
                    })
                } else {
                    defer.resolve('OK');
                }
            }
        }
        if (!executed) {
            var message = 'No valid Plugin REST Endpoint: ' + data.endpoint
            self.logger.info(message);
            defer.reject(message);
        }
    } else {
        var message = 'No valid Plugin REST Endpoint';
        self.logger.info(message);
        defer.reject(message);
    }

    return defer.promise
};


interfaceApi.prototype.setIPAddress=function() {
    var self = this;

    ifconfig.status('wlan0',(err, status) => {
        if(err) {
            ifconfig.status('eth0',(err, status) => {
                if(err) {
                    self.logger.error("Cannot retrieve current ipAddress!");
                } else {
                    self.commandRouter.sharedVars.set('ipAddress',status.ipv4_address);
                }
            });
        } else {
            self.commandRouter.sharedVars.set('ipAddress',status.ipv4_address);
        }
    });
};

interfaceApi.prototype.getPushNotificationUrls=function(req, res) {
    var self = this;

    self.logger.info('Getting Push Notification urls');

    if (pushNotificationsUrls && pushNotificationsUrls.length) {
        res.send(pushNotificationsUrls);
    } else {
        res.send('No URLs defined for push notifications');
    }
};

interfaceApi.prototype.addPushNotificationUrls=function(req, res) {
    var self = this;

    self.logger.info('Adding Push Notification url');

    if (req.body && req.body.url) {
        if (!pushNotificationsUrls.includes(req.body.url)) {
            pushNotificationsUrls.push(req.body.url);
            res.send({'success':true});
        } else {
            res.send({'error':'URL already present'});
        }
    } else {
        res.send({'error':'Missing URL parameter'});
    }
};

interfaceApi.prototype.removePushNotificationUrls=function(req, res) {
    var self = this;

    self.logger.info('Removing Push Notification urls');

    if (req.body && req.body.url) {
        if (pushNotificationsUrls.includes(req.body.url)) {
            var removed = false;
            for( var i = 0; i < pushNotificationsUrls.length; i++){
                if ( pushNotificationsUrls[i] === req.body.url) {
                    pushNotificationsUrls.splice(i, 1);
                    res.send({'success':true});
                }
            }
        } else {
            res.send({'error':'No such URL is present'});
        }
    } else {
        res.send({'error':'Missing URL parameter'});
    }
};

interfaceApi.prototype.emitPushNotification=function(item, data) {
    var self = this;

    var payload = {"item":item,"data":data};
    for (var i in pushNotificationsUrls) {
        unirest.post(pushNotificationsUrls[i])
            .header('Content-Type', 'application/json')
            .send(payload)
            .timeout(2000)
            .end(function () {})
    }
};