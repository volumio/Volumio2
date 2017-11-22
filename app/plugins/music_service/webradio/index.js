'use strict';

var libQ = require('kew');
var libxmljs = require("libxmljs");
var unirest = require('unirest');
var pidof = require('pidof');
var cachemanager=require('cache-manager');
var memoryCache = cachemanager.caching({store: 'memory', max: 100, ttl: 10*60/*seconds*/});
var libMpd = require('mpd');
var nodetools=require('nodetools');
var variant = '';
var selection = {};
var retry = 0;
var selectionEndpoint = 'https://radio-directory.firebaseapp.com/';


// Define the ControllerWebradio class
module.exports = ControllerWebradio;
function ControllerWebradio(context) {
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;
}



ControllerWebradio.prototype.getConfigurationFiles = function()
{
	return ['config.json'];
}

ControllerWebradio.prototype.addToBrowseSources = function () {
	var data = {albumart: '/albumart?sourceicon=music_service/webradio/icon.svg', icon: 'fa fa-microphone', name: 'Webradio', uri: 'radio',plugin_type:'music_service',plugin_name:'webradio'};
	this.commandRouter.volumioAddToBrowseSources(data);
};


ControllerWebradio.prototype.onStart = function() {
    var  self = this;
    this.addToBrowseSources();

    this.mpdPlugin=this.commandRouter.pluginManager.getPlugin('music_service', 'mpd');
    this.getSelectionInfo();

    return libQ.resolve();
};

ControllerWebradio.prototype.handleBrowseUri=function(curUri)
{
    var self=this;
    //console.log(curUri);
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
            if (curUri==='radio/selection') {
                response = self.listSelection();
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


ControllerWebradio.prototype.listRoot=function() {
    var self = this;
    var defer = libQ.defer();

    var radioRoot = {
        "navigation": {
            "lists": [
                {
                    "availableListViews": [
                        "grid","list"
                    ],
                    "items": [
                        {
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
            ],
            "prev": {
                "uri": "/"
            }
        }
    }

    var selectionObject = {
        service: 'webradio',
        type: 'radio-category',
        title: '',
        artist: '',
        album: '',
        uri: 'radio/selection'
    };

    if (retry < 3) {
        var selectionInfo = self.getSelectionInfo();
        selectionInfo.then(function(selection)
        {
            if (selection != undefined && selection.available) {
                selectionObject.title = selection.name;
                selectionObject.albumart = selection.albumart;
                radioRoot.navigation.lists[0].items.unshift(selectionObject);
                defer.resolve(radioRoot)
            } else {
                defer.resolve(radioRoot)
            }

        });
    }
    return defer.promise
}

ControllerWebradio.prototype.listRadioGenres = function () {
    var self = this;

    var defer = libQ.defer();

    var response = {
        "navigation": {
            "lists": [
                {
                    "availableListViews": [
                        "list"
                    ],
                    "items": [

                    ]
                }
            ],
            "prev": {
                "uri": "radio"
            }
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

                    response.navigation.lists[0].items.push(category);
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
        "navigation": {
            "lists": [
                {
                    "availableListViews": [
                        "list"
                    ],
                    "items": [

                    ]
                }
            ],
            "prev": {
                "uri": "radio/byGenre"
            }
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

                        response.navigation.lists[0].items.push(category);
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
        "navigation": {
            "lists": [
                {
                    "availableListViews": [
                        "list"
                    ],
                    "items": [

                    ]
                }
            ],
            "prev": {
                "uri": "radio"
            }
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
                            uri: 'http://yp.shoutcast.com' + base+'?id='+id
                        };
                        try {
                            var albumart = children[i].attr('logo').value();
                            if (albumart != undefined && albumart.length > 0) {
                                category.albumart = albumart;
                            } else {
                                category.icon = 'fa fa-microphone';
                            }
                        } catch (e) {
                            category.icon = 'fa fa-microphone';
                        }



                        response.navigation.lists[0].items.push(category);
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
            return self.mpdPlugin.sendMpdCommand('clear',[]);
        })
        .then(function()
        {
            return self.mpdPlugin.sendMpdCommand('load "'+track.uri+'"',[]);
        })
        .fail(function (e) {
            return self.mpdPlugin.sendMpdCommand('add "'+track.uri+'"',[]);
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
        "navigation": {
            "lists": [
                {
                    "availableListViews": [
                        "list"
                    ],
                    "items": [

                    ]
                }
            ],
            "prev": {
                "uri": "radio"
            }
        }
    };

    var dirbleDefer = libQ.defer();
    self.getCountries(dirbleDefer.makeNodeResolver());
    dirbleDefer.promise.then(function (data) {
        //we sort datas alphabetically by name of country
        data.sort(
            function (a, b) {
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            }
        );
        for (var i in data) {
            var category = {
                type: 'radio-category',
                title: data[i].name,
                icon: 'fa fa-globe',
                uri: 'radio/byCountry/' + data[i].country_code
            };
            response.navigation.lists[0].items.push(category);
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
        "navigation": {
        "lists": [
            {
                "availableListViews": [
                    "list"
                ],
                "items": [

                ]
            }
        ],
            "prev": {
            "uri": "radio/byCountry"
        }
    }
    };

    var id = uri.split('/')[2];


    var paginationPromises = [];

    for (var i = 1; i < 3; i++) {
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
                        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                    }
                );

                for (var k in pageData) {
                    var radio = pageData[k];
                    if (radio.streams.length > 0) {
                        var category = {
                            service: 'webradio',
                            type: 'webradio',
                            title: radio.name,
                            id: radio.id,
                            artist: '',
                            album: '',
                            uri: radio.streams[0].stream
                        };
                        if (radio.image.url != undefined && radio.image.url != null) {
                            category.albumart = radio.image.url;
                        } else {
                            category.icon = 'fa fa-microphone';
                        }
                        response.navigation.lists[0].items.push(category);
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
        data.sort(
            function (a, b) {
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            }
        );

        var response = {
            "navigation": {
                "lists": [
                    {
                        "availableListViews": [
                            "list"
                        ],
                        "items": [

                        ]
                    }
                ],
                "prev": {
                    "uri": "radio"
                }
            }
        };

        for (var i in data) {
            var ithdata = data[i];
            var song = {
                service: 'webradio',
                type: 'mywebradio',
				artist: '',
				album: '',
                title: ithdata.name,
                uri: ithdata.uri,
                icon: 'fa fa-microphone'
            };

            response.navigation.lists[0].items.push(song);
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

        data.sort(
            function (a, b) {
                return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
            }
        );

        var response = {
            "navigation": {
                "lists": [
                    {
                        "availableListViews": [
                            "list"
                        ],
                        "items": [

                        ]
                    }
                ],
                "prev": {
                    "uri": "radio"
                }
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

            response.navigation.lists[0].items.push(song);
        }

        defer.resolve(response);

    })
        .fail(function () {
            defer.reject(new Error("Cannot list Favourites"));
        });

    return defer.promise;
};


ControllerWebradio.prototype.search = function (data) {
    var self = this;

    var defer = libQ.defer();
    var list = {
        "title": self.commandRouter.getI18nString('WEBRADIO.WEBRADIO'),
        "icon": "fa icon",
        "availableListViews": [
            "list"
        ],
        "items": [

        ]
    };

    var search = data.value.toLowerCase();
    //var uri='http://api.shoutcast.com/legacy/stationsearch?k=vKgHQrwysboWzMwH&search='+nodetools.urlEncode(query.value)+'&limit=20';
    var uri = 'http://api.dirble.com/v2/search?token=8d27f1f258b01bd71ad2be7dfaf1cce9d3074ee2';

    unirest.post(uri)
        .headers({'Accept': 'application/json', 'Content-Type': 'application/json'})
        .send({'query':search})
        .timeout(1800)
        .end(function (response) {
           // console.log(response.body);
            if (response.status === 200) {
                for (var i in response.body) {
                    var station = response.body[i];
                    if (station.streams.length > 0) {
                        var radio = {
                            service: 'webradio',
                            type: 'webradio',
                            title: station.name,
                            artist: '',
                            album: '',

                            uri: station.streams[0].stream
                        };
                        if (station.image.url != undefined && station.image.url != null) {
                            radio.albumart = station.image.url;
                        } else {
                            radio.icon = 'fa fa-microphone';
                        }
                        list.items.push(radio);
                    }
                }
                defer.resolve(list);
            } else {
                defer.resolve();
            }

        });



    /*
    memoryCache.wrap(uri, function (cacheCallback) {
        var promise=libQ.defer();

        var request= unirest.get(uri);

        request.timeout(1500);
        request.end(function(xml)
            {
                if(xml.error)
                {
                    promise.resolve(xml);
                }
                else if(xml.ok)
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

                    list.items.push(category);
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
    */
    return defer.promise;
};


ControllerWebradio.prototype.addMyWebRadio = function (data) {
    this.logger.info(JSON.stringify(data));

    return this.commandRouter.playListManager.addToMyWebRadio('webradio',data.name,data.uri);
    //addToMyWebRadio = function (service, radio_name, uri)
}

ControllerWebradio.prototype.removeMyWebRadio = function (data) {
	this.logger.info(JSON.stringify(data));

	return this.commandRouter.playListManager.removeFromMyWebRadio(data.name,'webradio',data.uri);
	//addToMyWebRadio = function (service, radio_name, uri)
}

ControllerWebradio.prototype.getSelectionInfo = function () {
    var defer = libQ.defer();

    //TODO REFACTOR IN BETTER WAY

    if (selection.available) {
        defer.resolve(selection);
    } else {
        selection = {'available':false};
        var variantInfo = this.commandRouter.executeOnPlugin('system_controller', 'system', 'getSystemVersion', '');
        variantInfo.then(function(info)
        {
            if  (info != undefined && info.variant != undefined && info.variant.length > 0) {
                variant = info.variant;
            }

            try {
                var Request = unirest.get(selectionEndpoint + variant+'/selection.json');
                Request.timeout(1500)
                Request.query({
                    token: 'b5d113cd1f3465d39ede63b7cc51d9c0'
                }).end(function (response) {
                    if (response.status === 200) {
                        try {
                            console.log(response.body)
                            selection = {'available' : true, 'name':response.body.info.name , 'albumart': response.body.info.albumart}
                            defer.resolve(selection);
                        } catch(e) {
                            defer.resolve(selection);
                            retry++
                        }

                    } else {
                        defer.resolve(selection);
                        retry++
                    }
                });
            } catch(e) {
                defer.resolve(selection);
                retry++
            }
        });
    }
    return defer.promise
}


ControllerWebradio.prototype.listSelection = function () {
    var self = this;
    var defer = libQ.defer();

    self.logger.info('Getting webradio selection');
    try {

    var object = {
        "navigation": {
            "lists": [
                {
                    "availableListViews": [
                        "list"
                    ],
                    "items": [

                    ]
                }
            ],
            "prev": {
                "uri": "radio"
            }
        }
    };

        var Request = unirest.get(selectionEndpoint + variant+'/selection.json');
        var thumbnaiEndpoint = selectionEndpoint + variant + '/src/images/radio-thumbnails/';
        Request.timeout(1500)
        Request.query({
            token: 'b5d113cd1f3465d39ede63b7cc51d9c0'
        }).end(function (response) {
            if (response.status === 200) {
                for (var i in response.body.radios) {
                    var station = response.body.radios[i];
                        var radio = {
                            service: 'webradio',
                            type: 'webradio',
                            title: station.title,
                            artist: '',
                            album: '',
                            albumart: thumbnaiEndpoint + station.title + '.png',
                            uri: station.uri
                        };
                    object.navigation.lists[0].items.push(radio);
                }
                defer.resolve(object);
            } else {
                defer.resolve(object);
            }
        });
    } catch(e) {
        defer.resolve(object);
    }
    return defer.promise
}
