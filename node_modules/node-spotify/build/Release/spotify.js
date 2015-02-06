var _spotify = require('./nodespotify');
var metadataUpdater = require('./metadataUpdater');

function addMethodsToPrototypes(sp) {
  function arrayGetter(name, refer) {
    var out = new Array(refer['num' + name + 's']);
    for(var i = 0; i < out.length; i++) {
      out[i] = refer['get' + name](i);
    }
    return out;
  }

  Object.defineProperty(sp.Search.prototype, 'tracks', {
    get: function() {
      console.warn('tracks property of search is deprecated, use getTrack(position) and numTracks instead.');
      if(this.hasOwnProperty('getTrack')) {
        return arrayGetter('Track', this);
      } else {
        throw new Error('Search not yet executed, can\'t access tracks');
      }
    }
  });

  Object.defineProperty(sp.Search.prototype, 'albums', {
    get: function() {
      console.warn('albums property of search is deprecated, use getAlbum(position) and numAlbums instead.');
      if(this.hasOwnProperty('getAlbum')) {
        return arrayGetter('Album', this);
      } else {
        throw new Error('Search not yet executed, can\'t access albums');
      }
    }
  });

  Object.defineProperty(sp.Search.prototype, 'artists', {
    get: function() {
      console.warn('artists property of search is deprecated, use getArtist(position) and numArtists instead.');
      if(this.hasOwnProperty('getArtist')) {
        return arrayGetter('Artist', this);
      } else {
        throw new Error('Search not yet executed, can\'t access artists');
      }
    }
  });

  Object.defineProperty(sp.Search.prototype, 'playlists', {
    get: function() {
      console.warn('playlists property of search is deprecated, use getPlaylist(position) and numPlaylists instead.');
      if(this.hasOwnProperty('getPlaylist')) {
        return arrayGetter('Playlist', this);
      } else {
        throw new Error('Search not yet executed, can\'t access tracks');
      }
    }
  });

  sp.internal.protos.Playlist.prototype.getTracks = function() {
    return arrayGetter('Track', this);
  }

  sp.internal.protos.PlaylistContainer.prototype.getPlaylists = function () {
    return arrayGetter('Playlist', this);
  }
}

var beefedupSpotify = function(options) {
  var spotify = _spotify(options);
  addMethodsToPrototypes(spotify);
  spotify.version = '0.7.0';

  var _on = spotify.on;
  spotify.on = function(callbacks) {
    if(callbacks.metadataUpdated) {
      var userCallback = callbacks.metadataUpdated;
      callbacks.metadataUpdated = function() {
        userCallback();
        metadataUpdater.metadataUpdated();
      }
    } else {
      callbacks.metadataUpdated = metadataUpdater.metadataUpdated;
    }
    _on.call(spotify, callbacks);
  }

  spotify.waitForLoaded = metadataUpdater.waitForLoaded;
  return spotify;
}

module.exports = beefedupSpotify;
