'use strict';

var libQ = require('kew');
var libFast = require('fast.js');
var fs=require('fs-extra');

// Define the CoreMusicLibrary class
module.exports = CoreMusicLibrary;
function CoreMusicLibrary (commandRouter) {
	// This fixed variable will let us refer to 'this' object at deeper scopes
	var self = this;

	// Save a reference to the parent commandRouter
	self.commandRouter = commandRouter;
    self.logger = self.commandRouter.logger;

	// Start up a extra metadata handler
	//self.metadataCache = new (require('./metadatacache.js'))(self);

	// Specify the preference for service when adding tracks to the queue
	self.servicePriority = ['mpd', 'spop'];

	// The library contains hash tables for genres, artists, albums, and tracks
	self.library = {};
	self.libraryIndex = {};
	self.libraryIndex.root = {
		name: 'root',
		uid: 'root',
		type: 'index',
		children: []
	}
	self.arrayIndexDefinitions = [
		{
			'name': 'Genres by Name',
			'table': 'genre',
			'sortby': 'name',
			'datapath': [{
				'name': 'name',
				'type': 'type',
				'uid': 'uid'
			}]
		},
		{
			'name': 'Artists by Name',
			'table': 'artist',
			'sortby': 'name',
			'datapath': [{
				'name': 'name',
				'uid': 'uid',
				'type': 'type',
				'genres': ['genreuids', '#', {'name': 'name', 'uid': 'uid'}]
			}]
		},
		{
			'name': 'Albums by Name',
			'table': 'album',
			'sortby': 'name',
			'datapath': [{
				'name': 'name',
				'uid': 'uid',
				'type': 'type',
				'artists': ['artistuids', '#', {'name': 'name', 'uid': 'uid'}]
			}]
		},
		{
			'name': 'Albums by Artist',
			'table': 'album',
			'sortby': 'artistuids:#:name',
			'datapath': [{
				'name': 'name',
				'uid': 'uid',
				'type': 'type',
				'artists': ['artistuids', '#', {'name': 'name', 'uid': 'uid'}]
			}]
		},
		{
			'name': 'Tracks by Name',
			'table': 'track',
			'sortby': 'name',
			'datapath': [{
				'name': 'name',
				'uid': 'uid',
				'type': 'type',
				'album': ['albumuids', '#0', {'name': 'name', 'uid': 'uid'}],
				'artists': ['artistuids', '#', {'name': 'name', 'uid': 'uid'}]
			}]
		}
	];
	self.queueItemDataPath = [
		{
			'name': 'name',
			'uid': 'uid',
			'type': 'type',
			'albums': ['albumuids', '#', {'name': 'name', 'uid': 'uid'}],
			'artists': ['artistuids', '#', {'name': 'name', 'uid': 'uid'}],
			'tracknumber': 'tracknumber',
			'date': 'date'
		}
	];

	// The Browse Sources Array is the list showed on Browse Page
	var sourcesJson = '/volumio/app/browsesources.json'
    if (fs.existsSync(sourcesJson)) {
        self.browseSources = fs.readJsonSync((sourcesJson),  'utf8', {throws: false});
    } else {
        self.browseSources = [{albumart: '/albumart?sourceicon=music_service/mpd/favouritesicon.png', name: 'Favourites', uri: 'favourites',plugin_type:'',plugin_name:''},
            {albumart: '/albumart?sourceicon=music_service/mpd/playlisticon.png', name: 'Playlists', uri: 'playlists',plugin_type:'music_service',plugin_name:'mpd'},
            {albumart: '/albumart?sourceicon=music_service/mpd/musiclibraryicon.png', name: 'Music Library', uri: 'music-library',plugin_type:'music_service',plugin_name:'mpd'},
            {albumart: '/albumart?sourceicon=music_service/mpd/artisticon.png',name: 'Artists', uri: 'artists://',plugin_type:'music_service',plugin_name:'mpd'},
            {albumart: '/albumart?sourceicon=music_service/mpd/albumicon.png',name: 'Albums', uri: 'albums://',plugin_type:'music_service',plugin_name:'mpd'},
            {albumart: '/albumart?sourceicon=music_service/mpd/genreicon.png',name: 'Genres', uri: 'genres://',plugin_type:'music_service',plugin_name:'mpd'},

			{albumart: '/albumart?sourceicon=music_service/mpd/musiclibraryicon.png', name: 'Music Library JS', uri: 'music-library-js',plugin_type:'music_service',plugin_name:'musiclibrary'}
		];
    }


	// Start library promise as rejected, so requestors do not wait for it if not immediately available.
	// This is okay because no part of Volumio requires a populated library to function.
	//self.libraryReadyDeferred = null;
	//self.libraryReady = libQ.reject('Library not yet loaded.');

	// Attempt to load library from database on disk
	//self.sLibraryPath = __dirname + '/db/musiclibrary';
	//self.loadLibraryFromDB()
	//	.fail(libFast.bind(self.pushError, self));
}

// Public methods -----------------------------------------------------------------------------------

// Return a music library view for a given object UID
CoreMusicLibrary.prototype.getListing = function(sUid, objOptions) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreMusicLibrary::getListing');

	return self.libraryReady
		.then(function() {
			//TODO implement use of nEntries and nOffset for paging of results
			var arrayPath = objOptions.datapath;
			var sSortBy = objOptions.sortby;

			var objRequested = self.getLibraryObject(sUid);
			if (!sSortBy && arrayPath.length === 0) {
				return objRequested;
			} else if (!sSortBy) {
				return self.getObjectInfo(objRequested, arrayPath);
			} else if (arrayPath.length === 0) {
				// TODO - return raw object?
			} else {
				// TODO - sort data before returning
				return self.getObjectInfo(objRequested, arrayPath);
			}
		});
}

CoreMusicLibrary.prototype.getIndex = function(sUid) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreLibraryFS::getIndex');
	return libQ.resolve(self.libraryIndex[sUid].children);
}

CoreMusicLibrary.prototype.addQueueUids = function(arrayUids) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreMusicLibrary::addUidsToQueue');

	return self.libraryReady
		.then(function () {
			var arrayQueueItems = [];

			libFast.map(arrayUids, function(sCurrentUid) {
				var objCurrent = self.getLibraryObject(sCurrentUid);
				if (objCurrent.type === 'track') {
					arrayQueueItems.push(self.makeQueueItem(objCurrent));
				} else {
					libFast.map(Object.keys(objCurrent.trackuids), function(sCurrentKey) {
						// TODO - allow adding tracks per a given sort order
						var objCurrentTrack = self.getLibraryObject(sCurrentKey);
						arrayQueueItems.push(self.makeQueueItem(objCurrentTrack));
					});
				}
			});
			self.commandRouter.addQueueItems(arrayQueueItems);
		});
}

CoreMusicLibrary.prototype.makeQueueItem = function(objTrack) {
	var self = this;

	for (i = 0; i < self.servicePriority.length; i++) {
		if (self.servicePriority[i] in objTrack.uris) {
			var objQueueItem = objTrack.uris[self.servicePriority[i]];
			objQueueItem.service = self.servicePriority[i];
			var objTrackInfo = self.getObjectInfo(objTrack, self.queueItemDataPath);

			libFast.map(Object.keys(objTrackInfo), function(sCurField) {
				objQueueItem[sCurField] = objTrackInfo[sCurField];
			});

			return objQueueItem;
		}
	}
	return {};
}

CoreMusicLibrary.prototype.pushError = function(sReason) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreMusicLibrary::pushError(' + sReason + ')');

	// Return a resolved empty promise to represent completion
	return libQ.resolve();
}

//Retrieve Browse Sources


CoreMusicLibrary.prototype.getBrowseSources = function() {
	var self = this;

	return self.browseSources;
}

CoreMusicLibrary.prototype.getVisibleBrowseSources = function() {
    var self = this;

    var visibleSources = self.setDisabledBrowseSources(self.browseSources);
    return visibleSources;
}

CoreMusicLibrary.prototype.addToBrowseSources = function(data) {
	var self = this;

	if(data.name!= undefined) {
	    self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CoreMusicLibrary::Adding element ' + data.name);

        var replaced=false;

        //searching for existing browse source
        for(var i in self.browseSources)
        {
            var source=self.browseSources[i];
            if(source.name===data.name)
            {
                source.uri=data.uri;
                source.plugin_type=data.plugin_type;
                source.plugin_name=data.plugin_name;
                replaced=true;
            }
        }
        if(replaced===false)
            self.browseSources.push(data);
	}
	var response = self.getBrowseSources();
	return self.pushBrowseSources(response);
}

CoreMusicLibrary.prototype.removeBrowseSource = function(name) {
    var self = this;

    if(name!= undefined) {
        self.browseSources=self.browseSources.filter(function(x){
            if(x.name!==name)
                return true;
        });
    }
	var response = self.getBrowseSources();
	return self.pushBrowseSources(response);
}

CoreMusicLibrary.prototype.updateBrowseSources = function(name,data) {
    var self = this;

    if(data && data.name!= undefined) {
        for(var i in self.browseSources)
        {
            var source=self.browseSources[i];
            if(source.name==name)
            {
                source.name=data.name;
                source.uri=data.uri;
                source.plugin_type=data.plugin_type;
                source.plugin_name=data.plugin_name;
                if (data.albumart != undefined) {
                    source.albumart=data.albumart;
				}
            }
        }
    }
	var response = self.getBrowseSources();

	return self.pushBrowseSources(response);
}

CoreMusicLibrary.prototype.setSourceActive = function(uri) {
    var self = this;

        for(var i in self.browseSources)
        {
            var source=self.browseSources[i];
            if(source.uri==uri) {
				source.active = true;
            } else {
                source.active = false;
			}
        }

    var response = self.getBrowseSources();

    return self.pushBrowseSources(response);
}

CoreMusicLibrary.prototype.executeBrowseSource = function(curUri) {
    var self = this;

    var response;
	//console.log('--------------------------'+curUri)
	if (curUri != undefined) {
        if (curUri.startsWith('favourites')) {
            return self.commandRouter.playListManager.listFavourites(curUri);
        }
        else if (curUri.startsWith('search')) {
            var splitted = curUri.split('/');

            return this.search({"value": splitted[2]});
        } else if (curUri.startsWith('playlists') || curUri.startsWith('artists://') || curUri.startsWith('albums://') || curUri.startsWith('genres://')) {
            return self.commandRouter.executeOnPlugin('music_service','mpd','handleBrowseUri',curUri);
        } else if (curUri.startsWith('upnp')) {
            return self.commandRouter.executeOnPlugin('music_service','upnp_browser','handleBrowseUri',curUri);
        } else {
            for(var i in self.browseSources)
            {
                var source=self.browseSources[i];

                if(curUri.startsWith(source.uri))
                {
                    return self.commandRouter.executeOnPlugin(source.plugin_type,source.plugin_name,'handleBrowseUri',curUri);
                }
            }

            var promise=libQ.defer();
            promise.resolve({});
            return promise.promise;
        }
	} else {
        var promise=libQ.defer();
        promise.resolve({});
        return promise.promise;
	}
}


CoreMusicLibrary.prototype.search = function(data) {
	var self = this;

	var query = {};
	var defer = libQ.defer();
    var deferArray=[];
	var searcharray = [];
	if (data.value) {
		if (data.type) {
			query = {"value": data.value, "type": data.type, "uri":data.uri};
		} else {
			query = {"value": data.value, "uri":data.uri};
		}

        var executed=[];


		var enableSelectiveSearch
        enableSelectiveSearch=this.commandRouter.sharedVars.get("selective_search")

		/*
		 * New search method. If data structure contains fields service or plugin_name that field will be used to pick
		 * a plugin for search. If that is not available (only root should be this case) then search will be performed
		 * over all plugins.
		 *
		 * Examples:
		 *
		 * {"type":"any","value":"paolo","plugin_name":"mpd","plugin_type":"music_service","uri":"music-library"}
		 *
		 * {"type":"any","value":"sfff","uri":"albums://Nomadi/Ma%20Noi%20No!","service":"mpd"}
		 *
		 */
        var searchAll=false

        if(enableSelectiveSearch)
        {
            if (data.service || data.plugin_name)
            {
                // checking if uri is /. Should revert to search to all
                if(data.uri!== undefined && data.uri === '/')
                {
                    searchAll=true
                } else {
                    searchAll=false
                }

            } else {
                searchAll=true
            }
        } else {
            searchAll=true
        }

		if(searchAll)
        {
            console.log("Searching all installed plugins")
            /**
             * Searching over all plugins
             */

            for (var i = 0; i < self.browseSources.length; i++) {
                var source=self.browseSources[i];

                var key=source.plugin_type+'_'+source.plugin_name;
                if(executed.indexOf(key)==-1)
                {
                    executed.push(key);

                    var response;

                    response = self.commandRouter.executeOnPlugin(source.plugin_type,source.plugin_name,'search',query);

                    if (response != undefined) {
                        deferArray.push(response);
                    }
                }
            }
        } else {
            var pluginName=''
            var pluginType='music_service'

            if(data.service)
            {
                pluginName=data.service
            } else if(data.plugin_name) {
                pluginName=data.plugin_name
            }

            if(data.plugin_type)
            {
                pluginType=data.plugin_type
            }

            console.log("Searching plugin "+pluginType+"/"+pluginName)

            response = self.commandRouter.executeOnPlugin(pluginType,pluginName,'search',query);
            if (response != undefined) {
                deferArray.push(response);
            }
        }

		libQ.all(deferArray)
            .then(function (result) {
				self.logger.info('All search sources collected, pushing search results');

                var searchResult={
                    "navigation": {
                    	"isSearchResult": true,
                        "lists": []
                    }
                };

                for(var i in result)
                {
                    if(result[i]!== undefined && result[i]!==null) {
                        searchResult.navigation.lists=searchResult.navigation.lists.concat(result[i]);
					}
                }
				if (!searchResult.navigation.lists.length) {
					var noResultTitle = {"type":"title","title":self.commandRouter.getI18nString('COMMON.NO_RESULTS'),"availableListViews":["list"], "items":[]};
                    searchResult.navigation.lists[0]= noResultTitle
				}
                defer.resolve(searchResult);
            })
            .fail(function (err) {
                self.loger.error('Search error in Plugin: '+source.plugin_name+". Details: "+err);
                defer.reject(new Error());
            });
	} else {

	}
	return defer.promise;
}

CoreMusicLibrary.prototype.updateBrowseSourcesLang = function() {
	var self = this;

	console.log('Updating browse sources language');

	for (var i in  self.browseSources) {

		if(self.browseSources[i]!==undefined) {
			
		switch(self.browseSources[i].uri) {
			case 'favourites':
				self.browseSources[i].name = self.commandRouter.getI18nString('COMMON.FAVOURITES');
				break;
			case 'playlists':
				self.browseSources[i].name = self.commandRouter.getI18nString('COMMON.PLAYLISTS');
				break;
			case 'music-library':
				self.browseSources[i].name = self.commandRouter.getI18nString('COMMON.MUSIC_LIBRARY');
				break;
			case 'artists://':
				self.browseSources[i].name = self.commandRouter.getI18nString('COMMON.ARTISTS');
				break;
			case 'albums://':
				self.browseSources[i].name = self.commandRouter.getI18nString('COMMON.ALBUMS');
				break;
			case 'genres://':
				self.browseSources[i].name = self.commandRouter.getI18nString('COMMON.GENRES');
				break;
			case 'radio':
				self.browseSources[i].name = self.commandRouter.getI18nString('WEBRADIO.WEBRADIO');
				break;
			case 'Last_100':
				self.browseSources[i].name = self.commandRouter.getI18nString('COMMON.LAST_100');
				break;
			default:
			console.log('Cannot find translation for source'+self.browseSources[i].name)
		}

		}
	}
	return this.pushBrowseSources(self.browseSources);
}

CoreMusicLibrary.prototype.goto=function(data){
	var stateMachine = this.commandRouter.stateMachine
	var curState=stateMachine.getTrack(stateMachine.currentPosition);

	var response;

	if(curState) {
		data.uri = curState.uri
		response = this.commandRouter.executeOnPlugin('music_service',curState.service,'goto',data);
	}
	else response = this.commandRouter.executeOnPlugin('music_service','mpd','goto',data);
    return response;
}

CoreMusicLibrary.prototype.pushBrowseSources=function(data){
	var self = this;

	var visibleSources = self.setDisabledBrowseSources(data);
    return this.commandRouter.broadcastMessage('pushBrowseSources', visibleSources);
}

CoreMusicLibrary.prototype.setDisabledBrowseSources=function(data){
	var self = this;
	var visibleSources = [];

	try {
        var disabledSources = self.commandRouter.executeOnPlugin('miscellanea','my_music','getDisabledSources','');
        for (var i in data) {
            var source = data[i];
            if (!disabledSources.includes(source.uri)) {
                visibleSources.push(source)
            }
        }
	} catch(e) {
		visibleSources = data;
	}

    return visibleSources;
}



