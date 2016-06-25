'use strict';

var libQ = require('kew');
var libxmljs = require("libxmljs");
var unirest = require('unirest');
var pidof = require('pidof');
var cachemanager=require('cache-manager');
var memoryCache = cachemanager.caching({store: 'memory', max: 100, ttl: 10*60/*seconds*/});
var libMpd = require('mpd');
var nodetools=require('nodetools');

// Define the ControllerWebradio class
module.exports = ControllerWebradio;
function ControllerWebradio(context) {
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;

    self.mpdPlugin=self.commandRouter.pluginManager.getPlugin('music_service', 'mpd');
}



ControllerWebradio.prototype.getConfigurationFiles = function()
{
	return ['config.json'];
}

ControllerWebradio.prototype.addToBrowseSources = function () {
	var data = {name: 'Webradio', uri: 'radio',plugin_type:'music_service',plugin_name:'webradio'};
	this.commandRouter.volumioAddToBrowseSources(data);
};


ControllerWebradio.prototype.onStart = function() {
    this.addToBrowseSources();

    return libQ.resolve();
};

ControllerWebradio.prototype.handleBrowseUri=function(curUri)
{
    var self=this;
    console.log(curUri);
    var response;

    if (curUri.startsWith('radio')) {
        if (curUri == 'radio')
            response = self.listRoot(curUri);
        else {
            if (curUri.startsWith('radio/myWebRadio')) {
                response = self.listMyWebRadio(curUri);
            }
            if (curUri.startsWith('radio/byGenre')) {
                if (curUri == 'radio/byGenre')
                    response = self.listRadioGenres(curUri);
                else
                    response = self.listRadioForGenres(curUri);
            }
            if (curUri.startsWith('radio/favourites')) {
                response = self.listRadioFavourites(curUri);
            }
             if (curUri==='radio/top500') {
                    response = self.listTop500Radios(curUri);
            }
             else if (curUri.startsWith('radio/byCountry')) {
                 if (curUri == 'radio/byCountry')
                     response = self.listRadioCountries(curUri);
                 else
                     response = self.listRadioForCountry(curUri);

             }
        }
    }

    return response;
}


ControllerWebradio.prototype.listRoot=function()
{  var self = this;
    return libQ.resolve({
        navigation: {
            prev: {
                uri: ''
            },
            list: [{
                service: 'radio',
                type: 'mywebradio-category',
                title: self.commandRouter.getI18nString('WEBRADIO.MY_WEB_RADIOS'),
                artist: '',
                album: '',
                icon: 'fa fa-heartbeat',
                uri: 'radio/myWebRadio'
                },
                {
                    service: 'webradio',
                    type: 'radio-favourites',
                    title: self.commandRouter.getI18nString('WEBRADIO.FAVOURITE_RADIOS'),
                    artist: '',
                    album: '',
                    icon: 'fa fa-heart',
                    uri: 'radio/favourites'
                },
                {
                    service: 'webradio',
                    type: 'radio-category',
                    title: self.commandRouter.getI18nString('WEBRADIO.TOP_500_RADIOS') + ' (Shoutcast)',
                    artist: '',
                    album: '',
                    icon: 'fa fa-star',
                    uri: 'radio/top500'
                },
                {
                    service: 'webradio',
                    type: 'radio-category',
                    title: self.commandRouter.getI18nString('WEBRADIO.BY_GENRE_RADIOS') + ' (Shoutcast)',
                    artist: '',
                    album: '',
                    icon: 'fa fa-tags',
                    uri: 'radio/byGenre'
                },
                {
                    service: 'webradio',
                    type: 'radio-category',
                    title: self.commandRouter.getI18nString('WEBRADIO.BY_COUNTRY_RADIOS') + ' (Dirble)',
                    artist: '',
                    album: '',
                    icon: 'fa fa-globe',
                    uri: 'radio/byCountry'
                }

            ]
        }
    });
}

ControllerWebradio.prototype.listRadioGenres = function () {
    var self = this;

    var defer = libQ.defer();

    var response = {
        navigation: {
            prev: {
                uri: 'radio'
            },
            list: []
        }
    };


    var uri='http://api.shoutcast.com/legacy/genrelist?k=vKgHQrwysboWzMwH';

    memoryCache.wrap(uri, function (cacheCallback) {
        var promise=libQ.defer();

        unirest.get(uri)
            .end(function(xml)
            {
                self.logger.info("READ");
                if(xml.ok)
                {
                    memoryCache.set(uri,xml);
                    promise.resolve(xml);
                }
                else promise.reject(new Error());
            });


        return promise;
        })
        .then( function (xml) {
            if(xml.ok)
            {
                var xmlDoc = libxmljs.parseXml(xml.body);

                var children = xmlDoc.root().childNodes();
                if(children.length==0)
                    self.logger.info("No genres returned by Shoutcast");

                for(var i in children)
                {
                    var name=children[i].attr('name').value();
                    var category = {
                        type: 'radio-category',
                        title: name,
                        icon: 'fa fa-folder-open-o',
                        uri: 'radio/byGenre/' + name
                    };

                    response.navigation.list.push(category);
                }

                defer.resolve(response);
            }
            else defer.reject(new Error('An error occurred while querying SHOUTCAST'));
        });

    return defer.promise;
};

ControllerWebradio.prototype.listRadioForGenres = function (curUri) {
    var self = this;

    var defer = libQ.defer();

    var genre=curUri.split('/')[2];

    var response = {
        navigation: {
            prev: {
                uri: 'radio/byGenre'
            },
            list: []
        }
    };

    var uri='http://api.shoutcast.com/legacy/genresearch?k=vKgHQrwysboWzMwH&genre='+genre;

    memoryCache.wrap(uri, function (cacheCallback) {
        var promise=libQ.defer();

        unirest.get(uri)
            .end(function(xml)
            {
                if(xml.ok)
                {
                    memoryCache.set(uri,xml);
                    promise.resolve(xml);
                }
                else promise.reject(new Error());
            });


        return promise;
    })
        .then( function (xml) {

            if(xml.ok)
            {
                var xmlDoc = libxmljs.parseXml(xml.body);

                var children = xmlDoc.root().childNodes();
                var base;

                for(var i in children)
                {
                    if(children[i].name()==='tunein')
                    {
                        base=(children[i].attr('base').value()).replace('.pls','.m3u');
                    }
                    else if(children[i].name()==='station')
                    {
                        var name=children[i].attr('name').value();
                        var id=children[i].attr('id').value();

                        var category = {
                            service: 'webradio',
                            type: 'webradio',
                            title: name,
                            artist: '',
                            album: '',
                            icon: 'fa fa-microphone',
                            uri: 'http://yp.shoutcast.com' + '/sbin/tunein-station.m3u'+'?id='+id
                        };

                        response.navigation.list.push(category);
                    }

                }

                defer.resolve(response);
            }
            else defer.reject(new Error('An error occurred while querying SHOUTCAST'));
        });

    return defer.promise;
};

ControllerWebradio.prototype.listTop500Radios = function (curUri) {
    var self = this;

    var defer = libQ.defer();

    var response = {
        navigation: {
            prev: {
                uri: 'radio'
            },
            list: []
        }
    };

    var uri='http://api.shoutcast.com/legacy/Top500?k=vKgHQrwysboWzMwH';

    memoryCache.wrap(uri, function (cacheCallback) {
        var promise=libQ.defer();

        unirest.get(uri)
            .end(function(xml)
            {
                if(xml.ok)
                {
                    memoryCache.set(uri,xml);
                    promise.resolve(xml);
                }
                else promise.reject(new Error());
            });


        return promise;
    })
        .then( function (xml) {

            if(xml.ok)
            {
                var xmlDoc = libxmljs.parseXml(xml.body);

                var children = xmlDoc.root().childNodes();
                var base;

                for(var i in children)
                {
                    if(children[i].name()==='tunein')
                    {
                        base=(children[i].attr('base').value()).replace('.pls','.m3u');
                    }
                    else if(children[i].name()==='station')
                    {
                        var name=children[i].attr('name').value();
                        var id=children[i].attr('id').value();

                        var category = {
                            service: 'webradio',
                            type: 'webradio',
                            title: name,
                            artist: '',
                            album: '',
                            icon: 'fa fa-microphone',
                            uri: 'http://yp.shoutcast.com' + base+'?id='+id
                        };

                        response.navigation.list.push(category);
                    }

                }

                defer.resolve(response);
            }
            else defer.reject(new Error('An error occurred while querying SHOUTCAST'));
        });


    return defer.promise;
};




// Define a method to clear, add, and play an array of tracks
ControllerWebradio.prototype.clearAddPlayTrack = function(track) {
    var self = this;
    self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerWebradio::clearAddPlayTrack');

    return self.mpdPlugin.sendMpdCommand('stop',[])
        .then(function()
        {
            return self.mpdPlugin.sendMpdCommand('clear',[])
        })
        .then(function()
        {
            return self.mpdPlugin.sendMpdCommand('load "'+track.uri+'"',[])
        })
        .then(function()
        {
            self.commandRouter.stateMachine.setConsumeUpdateService('mpd');
            return self.mpdPlugin.sendMpdCommand('play',[]);
        });
};

// Spop stop
ControllerWebradio.prototype.stop = function() {
    var self = this;
    self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerWebradio::stop');

    return self.mpdPlugin.sendMpdCommand('stop',[]);
};

// Spop pause
ControllerWebradio.prototype.pause = function() {
    var self = this;
    self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerWebradio::pause');

    // TODO don't send 'toggle' if already paused
    return self.mpdPlugin.sendMpdCommand('pause',[]);
};

// Spop resume
ControllerWebradio.prototype.resume = function() {
    var self = this;
    self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerWebradio::resume');

    // TODO don't send 'toggle' if already playing
    return self.mpdPlugin.sendMpdCommand('play',[]);
};

ControllerWebradio.prototype.seek = function(position) {
    var self=this;
    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerWebradio::seek');

    return self.mpdPlugin.seek(position);
};

ControllerWebradio.prototype.explodeUri = function(uri) {
    var self = this;

    var defer=libQ.defer();

    defer.resolve({
        uri: uri,
        service: 'webradio',
        name: uri,
        type: 'track'
    });

    return defer.promise;
};

ControllerWebradio.prototype.listRadioCountries = function () {
    var self = this;

    var defer = libQ.defer();

    var response = {
        navigation: {
            prev: {
                uri: 'radio'
            },
            list: []
        }
    };

    var dirbleDefer = libQ.defer();
    self.getCountries(dirbleDefer.makeNodeResolver());
    dirbleDefer.promise.then(function (data) {
        //we sort datas alphabetically by name of country
        data.sort(
            function (a, b) {
                if (a.name < b.name)
                    return -1;
                if (a.name > b.name)
                    return 1;
                return 0;
            }
        );
        for (var i in data) {
            var category = {
                type: 'radio-category',
                title: data[i].name,
                icon: 'fa fa-globe',
                uri: 'radio/byCountry/' + data[i].country_code
            };

            response.navigation.list.push(category);
        }

        defer.resolve(response);
    });


    return defer.promise;
};

ControllerWebradio.prototype.getCountries = function (callback) {
    var self = this;

    var Request = unirest.get('http://api.dirble.com/v2/countries');
    Request.query({
        token: '8d27f1f258b01bd71ad2be7dfaf1cce9d3074ee2'
    }).end(function (response) {
        callback(null, response.body);
    });

};

ControllerWebradio.prototype.listRadioForCountry = function (uri) {
    var self = this;

    var defer = libQ.defer();

    var response = {
        navigation: {
            prev: {
                uri: 'radio/byCountry'
            },
            list: []
        }
    };

    var id = uri.split('/')[2];


    var paginationPromises = [];

    for (var i = 0; i < 1; i++) {
        var dirbleDefer = libQ.defer();
        self.getStationsForCountry(id, 30, i, dirbleDefer.makeNodeResolver());

        paginationPromises.push(dirbleDefer);
    }

    libQ.all(paginationPromises)
        .then(function (results) {
            //console.log(results);

            for (var j in results) {
                var pageData = results[j];
                //we sort datas alphabetically by name of station
                pageData.sort(
                    function (a, b) {
                        if (a.name < b.name)
                            return -1;
                        if (a.name > b.name)
                            return 1;
                        return 0;
                    }
                );

                for (var k in pageData) {
                    if (pageData[k].streams.length > 0) {
                        var category = {
                            service: 'webradio',
                            type: 'webradio',
                            title: pageData[k].name,
                            id: pageData[k].id,
                            artist: '',
                            album: '',
                            icon: 'fa fa-microphone',
                            uri: pageData[k].streams[0].stream
                        };
                        response.navigation.list.push(category);
                    }
                }
            }

            defer.resolve(response);
        });

    return defer.promise;
};

ControllerWebradio.prototype.getStationsForCountry = function (id, per_page, page, callback) {
    var self = this;

    var Request = unirest.get('http://api.dirble.com/v2/countries/' + id + '/stations');
    Request.query({
        token: '8d27f1f258b01bd71ad2be7dfaf1cce9d3074ee2',
        page: page,
        per_page: per_page
    }).end(function (response) {
        callback(null, response.body);
    });

};


ControllerWebradio.prototype.listMyWebRadio = function (uri) {
    var self = this;

    var defer = libQ.defer();

    var promise = self.commandRouter.playListManager.getMyWebRadioContent()
    promise.then(function (data) {
        //console.log(data);
        var response = {
            navigation: {
                prev: {
                    uri: 'radio'
                },
                list: []
            }
        };

        for (var i in data) {
            var ithdata = data[i];
            var song = {
                service: 'webradio',
                type: 'webradio',
                title: ithdata.name,
                uri: ithdata.uri,
                icon: '/albumart'
            };

            response.navigation.list.push(song);
        }

        defer.resolve(response);

    })
        .fail(function () {
            defer.reject(new Error("Cannot list Favourites"));
        });

    return defer.promise;
};


ControllerWebradio.prototype.listRadioFavourites = function (uri) {
    var self = this;

    var defer = libQ.defer();

    var promise = self.commandRouter.playListManager.getRadioFavouritesContent();
    promise.then(function (data) {
        //console.log(data);
        var response = {
            navigation: {
                prev: {
                    uri: 'radio'
                },
                list: []
            }
        };

        for (var i in data) {
            var ithdata = data[i];
            var song = {
                service: 'webradio',
                type: 'webradio',
                title: ithdata.title,
                //artist: ithdata.artist,
                //album: ithdata.album,
                icon: 'fa fa-microphone',
                uri: ithdata.uri
            };

            response.navigation.list.push(song);
        }

        defer.resolve(response);

    })
        .fail(function () {
            defer.reject(new Error("Cannot list Favourites"));
        });

    return defer.promise;
};


ControllerWebradio.prototype.search = function (query) {
    var self = this;

    var defer = libQ.defer();
    var list = [];
    list.push({type:'title',title:'Webradios'});

    var uri='http://api.shoutcast.com/legacy/stationsearch?k=vKgHQrwysboWzMwH&search='+nodetools.urlEncode(query.value);

    memoryCache.wrap(uri, function (cacheCallback) {
        var promise=libQ.defer();

        unirest.get(uri)
            .end(function(xml)
            {
                if(xml.ok)
                {
                    memoryCache.set(uri,xml);
                    promise.resolve(xml);
                }
                else promise.reject(new Error());
            });


        return promise;
    })
    .then( function (xml) {
        if(xml.ok)
        {
            var xmlDoc = libxmljs.parseXml(xml.body);

            var children = xmlDoc.root().childNodes();
            var base;

            for(var i in children)
            {
                if(children[i].name()==='tunein')
                {
                    base=(children[i].attr('base').value()).replace('.pls','.m3u');
                }
                else if(children[i].name()==='station')
                {
                    var name=children[i].attr('name').value();
                    var id=children[i].attr('id').value();

                    var category = {
                        service: 'webradio',
                        type: 'webradio',
                        title: name,
                        artist: '',
                        album: '',
                        icon: 'fa fa-microphone',
                        uri: 'http://yp.shoutcast.com' + base+'?id='+id
                    };

                    list.push(category);
                }

            }

            defer.resolve(list);
        }
        else
        {
            self.commandRouter.logger.info('An error occurred while querying SHOUTCAST');
            defer.resolve();
        }
    });
    return defer.promise;
};


ControllerWebradio.prototype.addMyWebRadio = function (data) {
    this.logger.info(JSON.stringify(data));

    return this.commandRouter.playListManager.addToMyWebRadio('webradio',data.name,data.uri);
    //addToMyWebRadio = function (service, radio_name, uri)
}

