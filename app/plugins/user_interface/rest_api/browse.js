'use strict';

var libQ=require('kew');
var _=require('underscore');
var moment=require('moment');

module.exports = RESTApiBrowse;

function RESTApiBrowse(context) {
    var self = this;


    // Save a reference to the parent commandRouter
    self.context=context;
    self.logger=self.context.logger;
    self.commandRouter = self.context.coreCommand;
}

RESTApiBrowse.prototype.browseListing=function(req,res) {
    var uri;
    var defer;
    var ipAddress=this.commandRouter.sharedVars.get('ipAddress');
    var filters = {};

    if (req.query && req.query.uri) {
        uri=decodeURIComponent(req.query.uri);
    } else {
        uri='/';
    }

    if (req.query && req.query.offset) {
        filters.offset = req.query.offset;
    }

    if (req.query && req.query.limit) {
        filters.limit = req.query.limit;
    }

    if(uri === '/') {
        var content={"navigation":{
            "lists":[{
                "items":[]
            }]
        }};

        var browseSourcesList = this.commandRouter.volumioGetVisibleBrowseSources();
        content.navigation.lists = browseSourcesList;
        res.json(content);
    } else {
        var response;
        response = this.commandRouter.musicLibrary.executeBrowseSource(uri, filters);
        response.then(function (result) {
            res.json(result);
        }).fail(function () {
            res.json({'error':'No Result'});
        });
    }
};

RESTApiBrowse.prototype.listingSearch=function(req,res) {
    var query;
    var searchUri = '/';

    if (req.query && req.query.query) {
        query = decodeURIComponent(req.query.query);
        if (req.query.uri) {
            searchUri = req.query.uri;
        }
    } else {
        return res.json({'error':'No search query provided'});
    }

    var searchQuery = this.commandRouter.musicLibrary.search({'value':query,'uri':searchUri});
    searchQuery.then(function (result) {
        res.json(result);
    }).fail(function () {
        res.json({'error':'No Result'});
    });
};

RESTApiBrowse.prototype.listPlaylists=function(req,res) {
    var self = this;
    var response = self.commandRouter.playListManager.listPlaylist();

    var response = self.commandRouter.playListManager.listPlaylist();
    response.then(function (data) {
        if (data != undefined) {
            res.json(data);
        } else {
            res.json({'error': 'No Playlists'});
        }
    });
}

RESTApiBrowse.prototype.getCollectionStats=function(req,res) {
    var returnedData = this.commandRouter.executeOnPlugin('music_service', 'mpd', 'getMyCollectionStats', '');

    returnedData.then(function(stats) {
        if (stats) {
            res.json(stats);
        }
        else {
            res.json({'error':'No Result'});
        }
    })
}

RESTApiBrowse.prototype.getZones=function(req,res) {

    var zones = this.commandRouter.executeOnPlugin('system_controller', 'volumiodiscovery', 'getDevices');
    if (zones && zones.list) {
        res.json({"zones":zones.list});
    }
    else {
        res.json({'error':'Error retrieving zones'});
    }
}
