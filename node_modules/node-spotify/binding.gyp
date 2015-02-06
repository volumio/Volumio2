{
  "targets": [
  {
    "target_name": "nodespotify",
    "sources": [
      "src/node-spotify.cc", "src/audio/audio.c", "src/audio/AudioHandler.cc",
      "src/audio/NodeAudioHandler.cc",
      "src/callbacks/PlaylistCallbacksHolder.cc",
      "src/callbacks/SessionCallbacks.cc", "src/callbacks/SessionCallbacks_Audio.cc",
      "src/callbacks/SearchCallbacks.cc", "src/callbacks/AlbumBrowseCallbacks.cc",
      "src/callbacks/ArtistBrowseCallbacks.cc", "src/callbacks/PlaylistContainerCallbacksHolder.cc",

      "src/utils/ImageUtils.cc", "src/utils/V8Utils.cc",

      "src/objects/spotify/Track.cc", "src/objects/spotify/Artist.cc",
      "src/objects/spotify/Playlist.cc", "src/objects/spotify/PlaylistContainer.cc",
      "src/objects/spotify/Album.cc", "src/objects/spotify/Search.cc",
      "src/objects/spotify/Spotify.cc", "src/objects/spotify/Player.cc",
      "src/objects/spotify/PlaylistFolder.cc", "src/objects/spotify/User.cc",
      "src/objects/spotify/TrackExtended.cc",

      "src/objects/node/NodeTrack.cc", "src/objects/node/NodeArtist.cc",
      "src/objects/node/NodePlaylist.cc", "src/objects/node/NodeAlbum.cc",
      "src/objects/node/NodePlayer.cc", "src/objects/node/NodeSearch.cc",
      "src/objects/node/NodeSpotify.cc", "src/objects/node/NodePlaylistFolder.cc",
      "src/objects/node/NodePlaylistContainer.cc", "src/objects/node/NodeUser.cc",
      "src/objects/node/NodeTrackExtended.cc"
    ],
    "link_settings" : {
      "libraries": ["-lspotify"]
    },
    "copies": [ {
      "destination": "<(PRODUCT_DIR)",
      "files": ["src/spotify.js", "src/metadataUpdater.js"]
      }
    ],
    "variables": {
      "native_audio%": 'true'
    },
    "conditions": [
      ["OS=='mac'", {
        "xcode_settings": {
          "OTHER_CPLUSPLUSFLAGS" : ["-std=c++11", "-stdlib=libc++"],
          "GCC_ENABLE_CPP_EXCEPTIONS": 'YES',
          "MACOSX_DEPLOYMENT_TARGET" : "10.8"
        },
        "defines": ["OS_OSX"],
      }],
      [ "OS=='mac' and native_audio=='true'", {
        "sources": ["src/audio/openal-audio.c", "src/audio/NativeAudioHandler.cc"],
        "link_settings" : { "libraries" : ["-framework", "OpenAL"] },
        "defines": ["NODE_SPOTIFY_NATIVE_SOUND"]
      }],
      ["OS=='linux'", {
        "cflags_cc": [
          "-std=c++11",
          "-fexceptions"
          ],
        "defines": ["OS_LINUX"]
      }],
      [ "OS=='linux' and native_audio=='true'", {
        "sources": ["src/audio/alsa-audio.c", "src/audio/NativeAudioHandler.cc"],
        "cflags": ["-I/usr/include/alsa"],
        "link_settings" : { "libraries" : ["-lasound"] },
        "defines": ["NODE_SPOTIFY_NATIVE_SOUND"]
      }],
    ]
  }
  ]
}
