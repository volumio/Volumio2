var cacheManager = require('cache-manager');
var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 0});
var libMpd = require('./lib/mpd.js');
var libQ = require('kew');
var libFast = require('fast.js');
var libFsExtra = require('fs-extra');
var exec = require('child_process').exec;
var convert = require('convert-seconds');
var pidof = require('pidof');
var parser = require('cue-parser');
var mm = require('music-metadata');
var os = require('os');
var execSync = require('child_process').execSync;
// Moved all imports form index.js... Qhen moving function has completed those unused can be removed


function NativeImplementation() {

}

NativeImplementation.prototype.search = function (query) {
    var self = this;
    var defer = libQ.defer();
    var safeValue = query.value.replace(/"/g,'\\"');

    var commandArtist = 'search artist '+' "' + safeValue + '"';
    var commandAlbum = 'search album '+' "' + safeValue + '"';
    var commandSong = 'search title '+' "' + safeValue + '"';
    var artistcount = 0;
    var albumcount = 0;
    var trackcount = 0;
    var deferArray=[];
    deferArray.push(libQ.defer());
    deferArray.push(libQ.defer());
    deferArray.push(libQ.defer());


    console.time('MPD.search');

    var cmd = libMpd.cmd;
//ARTIST
    self.mpdReady.then(function () {

        self.clientMpd.sendCommand(cmd(commandArtist, []), function (err, msg) {
            var subList=[];
            if (msg) {
                var lines = msg.split('\n');  //var lines is now an array
                var artistsfound = [];
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (line.startsWith('file:')) {
                        var path = line.slice(5).trimLeft();
                        var artist = self.searchFor(lines, i + 1, 'Artist:');
                        //**********Check if artist is already found and exists in 'artistsfound' array
                        if (artistsfound.indexOf(artist) <0 ) { //Artist is not in 'artistsfound' array
                            artistcount ++;
                            artistsfound.push(artist);
                            subList.push({
                                service: 'mpd',
                                type: 'folder',
                                title: artist,
                                uri: 'artists://' + encodeURIComponent(artist),
                                albumart: self.getAlbumArt({artist: artist},undefined,'users')
                            });
                        }
                    }
                }
                deferArray[0].resolve(subList);
            }
            else if(err)  deferArray[0].reject(new Error('Artist:' +err));
            else deferArray[0].resolve();
        });
    });
//ALBUM
    self.mpdReady.then(function () {

        self.clientMpd.sendCommand(cmd(commandAlbum, []), function (err, msg) {

            var subList=[];

            if (msg) {
                var lines = msg.split('\n');
                var albumsfound=[];
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (line.startsWith('file:')) {
                        var path = line.slice(5).trimLeft();
                        var album = self.searchFor(lines, i + 1, 'Album:');
                        var artist = self.searchFor	(lines, i + 1, 'AlbumArtist:');

                        //********Check if album and artist combination is already found and exists in 'albumsfound' array (Allows for duplicate album names)
                        if (album != undefined && artist != undefined && albumsfound.indexOf(album + artist) <0 ) { // Album/Artist is not in 'albumsfound' array
                            albumcount ++;
                            albumsfound.push(album + artist);
                            subList.push({
                                service: 'mpd',
                                type: 'folder',
                                title: album,
                                artist: artist,
                                album:'',
                                //Use the correct album / artist match
                                uri: 'albums://' + encodeURIComponent(artist) + '/'+ encodeURIComponent(album),
                                albumart: self.getAlbumArt({artist: artist, album: album}, self.getParentFolder('/mnt/' + path),'fa-tags')
                            });
                        }
                    }

                }
                deferArray[1].resolve(subList);
            }
            else if(err)  deferArray[1].reject(new Error('Album:' +err));
            else deferArray[1].resolve();
        });
    });
//SONG
    self.mpdReady.then(function () {
        self.clientMpd.sendCommand(cmd(commandSong, []), function (err, msg) {
            var subList=[];
            if (msg) {
                var lines = msg.split('\n');
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (line.startsWith('file:')) {
                        trackcount ++;
                        var path = line.slice(5).trimLeft();
                        var name = path.split('/');
                        var count = name.length;
                        var artist = self.searchFor(lines, i + 1, 'Artist:');
                        var album = self.searchFor(lines, i + 1, 'Album:');
                        //Include track number if tracknumber variable is set to 'true'
                        if (!tracknumbers) {
                            var title = self.searchFor(lines, i + 1, 'Title:');
                        }
                        else {
                            var title1 = self.searchFor(lines, i + 1, 'Title:');
                            var track = self.searchFor(lines, i + 1, 'Track:');
                            if(track && title1) {
                                var title = track + " - " + title1;
                            } else {
                                var title = title1;
                            }
                        }
                        if (title == undefined) {
                            title = name[count - 1];
                        }
                        subList.push({
                            service: 'mpd',
                            type: 'song',
                            title: title,
                            artist: artist,
                            album: album,
                            uri: 'music-library/' + path,
                            albumart : self.getAlbumArt({artist: artist, album: album}, self.getParentFolder('/mnt/' + path),'fa-tags')
                        });
                    }
                }
                deferArray[2].resolve(subList);
            }
            else if(err)  deferArray[2].reject(new Error('Song:' +err));
            else deferArray[2].resolve();
        });
    });

    libQ.all(deferArray).then(function(values){

        var list = [];

        if(values[0])
        {
            var artistdesc = self.commandRouter.getI18nString('COMMON.ARTIST');
            if (artistcount > 1) artistdesc = self.commandRouter.getI18nString('COMMON.ARTISTS');
            list=[
                {
                    "title": self.commandRouter.getI18nString('COMMON.FOUND') + " " + artistcount + " " + artistdesc + " '" + query.value +"'",
                    "availableListViews": [
                        "list",
                        "grid"
                    ],
                    "items": []
                }];

            list[0].items=list[0].items.concat(values[0]);
        }

        if(values[1])
        {
            var albumdesc = self.commandRouter.getI18nString('COMMON.ALBUM');
            if (albumcount > 1) albumdesc = self.commandRouter.getI18nString('COMMON.ALBUMS');
            var albList=
                {
                    "title": self.commandRouter.getI18nString('COMMON.FOUND') + " " + albumcount + " " + albumdesc + " '" + query.value +"'",
                    "availableListViews": [
                        "list",
                        "grid"
                    ],
                    "items": []
                };
            albList.items=values[1];

            list.push(albList);
        }

        if(values[2])
        {
            var trackdesc = self.commandRouter.getI18nString('COMMON.TRACK');
            if (trackcount > 1) var trackdesc = self.commandRouter.getI18nString('COMMON.TRACKS');;
            var songList=
                {
                    "title": self.commandRouter.getI18nString('COMMON.FOUND') + " " + trackcount + " " + trackdesc + " '" + query.value +"'",
                    "availableListViews": [
                        "list"
                    ],
                    "items": []
                };
            songList.items=values[2];

            list.push(songList);
        }

        list=list.filter(function(v){return !!v;});


        console.timeEnd('MPD.search');
        defer.resolve(list);
    }).fail(function(err){
        self.commandRouter.logger.info("PARSING RESPONSE ERROR "+err);

        defer.resolve();
    });
    return defer.promise;
}


NativeImplementation.prototype.handleBrowseUri = function (curUri, previous) {
    var self = this;
    var response;

    self.logger.info("CURURI: "+curUri);
    var splitted=curUri.split('/');

//music-library
    if (curUri.startsWith('music-library')) {
        response = self.lsInfo(curUri);
    }

//playlist
    else if (curUri.startsWith('playlists')) {
        if (curUri == 'playlists'){
            response = self.listPlaylists(curUri);
        }
        else {
            response = self.browsePlaylist(curUri);
        }
    }

//albums
    else if (curUri.startsWith('albums://')) {

        if (curUri == 'albums://') {			//Just list albums
            response = self.listAlbums(curUri);
        }
        else {
            if(splitted.length==3) {
                response = self.listAlbumSongs(curUri,2,'albums://');
            }
            else {
                response = self.listAlbumSongs(curUri,3,'albums://');
            }
        }
    }

//artists
    else if (curUri.startsWith('artists://')) {

        if (curUri == 'artists://') {
            response = self.listArtists(curUri);
        }
        else
        {
            if(splitted.length==3) {  //No album name
                response = self.listArtist(curUri,2,'artists://','artists://');  //Pass back to listArtist
            }
            else {  //Has album name
                response = self.listAlbumSongs(curUri,3,'artists://'+ splitted[2]);  //Pass to listAlbumSongs with artist and album name
            }
        }
    }

//genres
    else if (curUri.startsWith('genres://')) {

        if (curUri == 'genres://') {
            response = self.listGenres(curUri);
        }
        else {
            if(splitted.length==3) {
                response = self.listGenre(curUri);
            }
            else if(splitted.length==4) {
                response = self.listArtist(curUri,3,'genres://'+splitted[2],'genres://');
            }
            else if(splitted.length==5) {
                response = self.listAlbumSongs(curUri,4,'genres://'+ splitted[2]);
            }
            else if(splitted.length=6) {
                response = self.listAlbumSongs(curUri,4,'genres://'+splitted[4] +"/"+splitted[5]);
            }
        }


    }


    return response;
};

NativeImplementation.prototype.explodeUri = function(uri) {
    var self = this;

    var defer=libQ.defer();
    var items = [];
    var cmd = libMpd.cmd;

    if(uri.startsWith('cue://')) {
        var splitted=uri.split('@');
        var index=splitted[1];
        var path='/mnt/' + splitted[0].substring(6);

        var cuesheet = parser.parse(path);

        var tracks = cuesheet.files[0].tracks;
        var cueartist = tracks[index].performer;
        var cuealbum =	cuesheet.title;
        var cuenumber = tracks[index].number - 1;
        var path = uri.substring(0, uri.lastIndexOf("/") + 1).replace('cue:/','');

        defer.resolve({
            uri:uri,
            type: 'cuesong',
            service:'mpd',
            name: tracks[index].title,
            artist: cueartist,
            album: cuealbum,
            number: cuenumber,
            albumart:self.getAlbumArt({artist:cueartist,album: cuealbum},path)
        });
    } else if(uri.endsWith('.cue')) {

        try {
            var uriPath='/mnt/'+self.sanitizeUri(uri);


            var cuesheet = parser.parse(uriPath);

            var tracks = cuesheet.files[0].tracks;
            var list=[];

            for (var j in tracks) {
                var cueItem = self.explodeCue(uriPath , j);
                list.push({
                    uri: cueItem.uri,
                    type: cueItem.type,
                    service: cueItem.service,
                    name: cueItem.name,
                    artist: cueItem.artist,
                    album: cueItem.album,
                    number: cueItem.number,
                    albumart:cueItem.albumart
                });
            }

            defer.resolve(list);
        } catch (err) {
            self.logger.info(err);
            self.logger.info('Cue Parser - Cannot parse ' + uriPath);
        }
    }
    else if(uri.startsWith('search://'))
    {
        //exploding search
        var splitted=uri.split('/');
        var argument=splitted[2];  //artist
        var value=splitted[3];	//album
        var safeValue = value.replace(/"/g,'\\"')

        if(argument==='artist') {
            var commandArtist = 'search artist '+' "' + safeValue + '"';

            self.mpdReady.then(function () {
                self.clientMpd.sendCommand(cmd(commandArtist, []), function (err, msg) {
                    var subList=[];

                    if (msg) {
                        var lines = msg.split('\n');
                        for (var i = 0; i < lines.length; i++) {
                            var line = lines[i];

                            if (line.startsWith('file:')) {
                                var path = line.slice(5).trimLeft();
                                var name = path.split('/');
                                var count = name.length;

                                var artist = self.searchFor(lines, i + 1, 'Artist:');
                                var album = self.searchFor(lines, i + 1, 'Album:');
                                //Include track number if tracknumber variable is set to 'true'
                                if (!tracknumbers) {
                                    var title = self.searchFor(lines, i + 1, 'Title:');
                                }
                                else {
                                    var title1 = self.searchFor(lines, i + 1, 'Title:');
                                    var track = self.searchFor(lines, i + 1, 'Track:');
                                    if(track && title1) {
                                        var title = track + " - " + title1;
                                    } else {
                                        var title = title1;
                                    }
                                }
                                var time = parseInt(self.searchFor(lines, i + 1, 'Time:'));

                                if (title) {
                                    title = title;
                                } else {
                                    title = name;
                                }

                                items.push({
                                    uri: 'music-library/'+path,
                                    service: 'mpd',
                                    name: title,
                                    artist: artist,
                                    album: album,
                                    type: 'track',
                                    tracknumber: 0,
                                    albumart: self.getAlbumArt({artist:artist,album: album},uri),
                                    duration: time,
                                    trackType: 'mp3'
                                });
                            }

                        }

                        defer.resolve(items);
                    }
                    else if(err)  defer.reject(new Error('Artist:' +err));
                    else defer.resolve(items);
                });
            });
        }
        else if(argument==='album') {
            if (compilation.indexOf(value)>-1) {  //artist is in Various Artists array
                var commandArtist = 'search albumartist '+' "' + safeValue + '"';
            }
            else {
                var commandAlbum = 'search album '+' "' + safeValue + '"';
            }
            self.mpdReady.then(function () {
                self.clientMpd.sendCommand(cmd(commandAlbum, []), function (err, msg) {
                    var subList=[];

                    if (msg) {

                        var lines = msg.split('\n');
                        for (var i = 0; i < lines.length; i++) {
                            var line = lines[i];

                            if (line.startsWith('file:')) {
                                var path = line.slice(5).trimLeft();
                                var name = path.split('/');
                                var count = name.length;

                                var artist = self.searchFor(lines, i + 1, 'Artist:');
                                var album = self.searchFor(lines, i + 1, 'Album:');
                                //Include track number if tracknumber variable is set to 'true'
                                if (!tracknumbers) {
                                    var title = self.searchFor(lines, i + 1, 'Title:');
                                }
                                else {
                                    var title1 = self.searchFor(lines, i + 1, 'Title:');
                                    var track = self.searchFor(lines, i + 1, 'Track:');
                                    if(track && title1) {
                                        var title = track + " - " + title1;
                                    } else {
                                        var title = title1;
                                    }
                                }
                                var time = parseInt(self.searchFor(lines, i + 1, 'Time:'));

                                if (title) {
                                    title = title;
                                } else {
                                    title = name;
                                }

                                items.push({
                                    uri: 'music-library/' + path,
                                    service: 'mpd',
                                    name: title,
                                    artist: artist,
                                    album: album,
                                    type: 'track',
                                    tracknumber: 0,
                                    albumart: self.getAlbumArt({artist: artist, album: album}, uri),
                                    duration: time,
                                    trackType: 'mp3'
                                });
                            }
                        }
                        defer.resolve(items);
                    }
                    else if(err)  defer.reject(new Error('Artist:' +err));
                    else defer.resolve(items);
                });
            });
        }
        else defer.reject(new Error());
    }
    else if(uri.startsWith('albums://')) {
        //exploding search
        var splitted = uri.split('/');
        var artistName = decodeURIComponent(splitted[2]);
        var albumName = decodeURIComponent(splitted[3]);
        var cmd = libMpd.cmd;
        // Escape any " within the strings used to construct the 'find' cmd
        var safeArtistName = artistName.replace(/"/g,'\\"');
        var safeAlbumName = albumName.replace(/"/g,'\\"');


        if (compilation.indexOf(artistName)>-1) {  //artist is in Various Artists array
            var GetAlbum = "find album \""+safeAlbumName+"\"" + " albumartist \"" +safeArtistName+"\"";
        }
        else {
            // This section is commented beacuse, although correct it results in some albums not playing.
            // Until we find a better way to handle this we search just for album
            //var GetAlbum = "find album \""+safeAlbumName+"\"" + " artist \"" +safeArtistName+"\"";
            var GetAlbum = "find album \""+safeAlbumName+"\"";
        }

        self.clientMpd.sendCommand(cmd(GetAlbum, []), function (err, msg) {
            var list = [];
            if (msg) {
                var path;
                var name;
                var lines = msg.split('\n');
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (line.indexOf('file:') === 0) {
                        var path = line.slice(6);
                        var name = path.split('/').pop();

                        var artist = self.searchFor(lines, i + 1, 'Artist:');
                        var album = self.searchFor(lines, i + 1, 'Album:');

                        //Include track number if tracknumber variable is set to 'true'
                        if (!tracknumbers) {
                            var title = self.searchFor(lines, i + 1, 'Title:');
                        }
                        else {
                            var title1 = self.searchFor(lines, i + 1, 'Title:');
                            var track = self.searchFor(lines, i + 1, 'Track:');
                            if(track && title1) {
                                var title = track + " - " + title1;
                            } else {
                                var title = title1;
                            }
                        }
                        var albumart=self.getAlbumArt({artist: artist, album: album,icon:'dot-circle-o'}, self.getParentFolder('/mnt/'+path));
                        var time = parseInt(self.searchFor(lines, i + 1, 'Time:'));

                        if (title) {
                            title = title;
                        } else {
                            title = name;
                        }
                        list.push({
                            uri: 'music-library/'+path,
                            service: 'mpd',
                            name: title,
                            artist: artist,
                            album: album,
                            type: 'track',
                            tracknumber: 0,
                            albumart: albumart,
                            duration: time,
                            trackType: path.split('.').pop()
                        });


                    }

                }
            }
            else self.logger.info(err);

            defer.resolve(list);
        });
    }
    else if(uri.startsWith('artists://')) {
        /*
         artists://AC%2FDC/Rock%20or%20Bust in service mpd
         */
        var splitted = uri.split('/');

        if(splitted.length===4) {
            return this.explodeUri('albums://'+ splitted[2] + '/' + splitted[3]);
        }
        var artist = decodeURIComponent(splitted[2]);

        var cmd = libMpd.cmd;

        var safeArtist = artist.replace(/"/g,'\\"');
        self.clientMpd.sendCommand(cmd("find artist \""+safeArtist+"\"", []), function (err, msg) {
            if(msg=='') {
                self.clientMpd.sendCommand(cmd("find albumartist \""+safeArtist+"\"", []), function (err, msg) {
                    self.exploderArtist(err,msg,defer);
                });
            }
            else self.exploderArtist(err,msg,defer);
        });

    }
    else if(uri.startsWith('genres://')) {

        //exploding search
        var splitted = uri.split('/');
        var genreName = decodeURIComponent(splitted[2]);
        var artistName = decodeURIComponent(splitted[3]);
        var albumName = decodeURIComponent(splitted[4]);
        // Escape any " within the strings used to construct the 'find' cmd
        var safeGenreName = genreName.replace(/"/g,'\\"');
        var safeArtistName = artistName.replace(/"/g,'\\"');
        var safeAlbumName = albumName.replace(/"/g,'\\"');

        if(splitted.length==4) {
            var GetMatches = "find genre \"" + safeGenreName + "\" artist \"" +  safeArtistName + "\"";
        }
        else if(splitted.length==5) {
            if (compilation.indexOf(artistName)>-1) {   //artist is in compilation array so only find album
                var GetMatches = "find genre \"" + safeGenreName + "\" album \"" + safeAlbumName + "\"";
            }
            else {                                      //artist is NOT in compilation array so use artist
                var GetMatches = "find genre \"" + safeGenreName + "\" artist \"" +  safeArtistName + "\" album \"" + safeAlbumName + "\"";
            }
        }

        else {
            var GetMatches = "find genre \"" + safeGenreName + "\"";
        }

        var cmd = libMpd.cmd;

        self.clientMpd.sendCommand(cmd(GetMatches, []), function (err, msg) {
            var list = [];
            var albums=[],albumarts=[];
            if (msg) {
                var path;
                var name;
                var lines = msg.split('\n');
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (line.indexOf('file:') === 0) {
                        var path = line.slice(6);
                        var name = path.split('/').pop();
                        var artist = self.searchFor(lines, i + 1, 'Artist:');
                        var album = self.searchFor(lines, i + 1, 'Album:');
                        //Include track number if tracknumber variable is set to 'true'
                        if (!tracknumbers) {
                            var title = self.searchFor(lines, i + 1, 'Title:');
                        }
                        else {
                            var title1 = self.searchFor(lines, i + 1, 'Title:');
                            var track = self.searchFor(lines, i + 1, 'Track:');
                            if(track && title1) {
                                var title = track + " - " + title1;
                            } else {
                                var title = title1;
                            }
                        }
                        var albumart=self.getAlbumArt({artist: artist, album: album}, self.getParentFolder('/mnt/'+path));
                        var time = parseInt(self.searchFor(lines, i + 1, 'Time:'));

                        if (title) {
                            title = title;
                        } else {
                            title = name;
                        }

                        if(title!=='') {
                            list.push({
                                uri: 'music-library/'+path,
                                service: 'mpd',
                                name: title,
                                artist: artist,
                                album: album,
                                type: 'track',
                                tracknumber: 0,
                                albumart: albumart,
                                duration: time,
                                trackType: path.split('.').pop()
                            });
                        }
                    }
                }

                defer.resolve(list);

            }
            else {
                self.logger.info(err);
                defer.reject(new Error());
            }
        });
    }
    else if(uri.endsWith('.iso')) {
        var uriPath = '/mnt/' + self.sanitizeUri(uri);

        var uris = self.scanFolder(uriPath);
        var response = [];

        libQ.all(uris)
            .then(function (result) {
                // IF we need to explode the whole iso file
                if (Array.isArray(result)) {
                    result = result[0]
                    defer.resolve(result);
                } else {
                    for (var j in result) {

                        //self.commandRouter.logger.info("----->>>>> " + JSON.stringify(result[j]));
                        //console.log('AAAAAAAAALLLLLLLLLLLLLLLLLLLLL'+result[j].albumart)
                        var albumartiso = result[j].albumart.substring(0, result[j].albumart.lastIndexOf("%2F"));
                        if (result !== undefined && result[j].uri !== undefined) {
                            response.push({
                                uri: self.fromPathToUri(result[j].uri),
                                service: 'mpd',
                                name: result[j].name,
                                artist: result[j].artist,
                                album: result[j].album,
                                type: 'track',
                                tracknumber: result[j].tracknumber,
                                albumart: albumartiso,
                                duration: result[j].duration,
                                samplerate: result[j].samplerate,
                                bitdepth: result[j].bitdepth,
                                trackType: result[j].trackType
                            });
                        }

                    }
                    defer.resolve(response);
                }

            })
    }
    else {


        var uriPath='/mnt/'+self.sanitizeUri(uri);
        //self.commandRouter.logger.info('----------------------------'+uriPath);
        var uris=self.scanFolder(uriPath);
        var response=[];

        libQ.all(uris)
            .then(function(result)
            {
                for(var j in result)
                {

                    //self.commandRouter.logger.info("----->>>>> "+JSON.stringify(result[j]));

                    if(result!==undefined && result[j].uri!==undefined) {
                        response.push({
                            uri: self.fromPathToUri(result[j].uri),
                            service: 'mpd',
                            name: result[j].name,
                            artist: result[j].artist,
                            album: result[j].album,
                            type: 'track',
                            tracknumber: result[j].tracknumber,
                            albumart: result[j].albumart,
                            duration: result[j].duration,
                            samplerate: result[j].samplerate,
                            bitdepth: result[j].bitdepth,
                            trackType: result[j].trackType
                        });
                    }

                }
                defer.resolve(response);
            }).fail(function(err)
        {
            self.commandRouter.logger.info("explodeURI: ERROR "+err);
            defer.resolve([]);
        });


    }

    return defer.promise;
};

module.exports=NativeImplementation;