#ifndef _SPOTIFY_SERVICE_PLAYLIST_CALLBACKS_HOLDER_H
#define _SPOTIFY_SERVICE_PLAYLIST_CALLBACKS_HOLDER_H

#include "../objects/node/V8Wrapped.h"

#include <libspotify/api.h>
#include <v8.h>
#include <initializer_list>

using namespace v8;

class PlaylistCallbacksHolder {
private:
  V8Wrapped* userdata;
  sp_playlist* playlist;
  sp_playlist_callbacks* playlistCallbacks;
  void call(Handle<Function> callback, std::initializer_list<Handle<Value>> args);
public:
  PlaylistCallbacksHolder(V8Wrapped* userdata, sp_playlist* playlist);
  ~PlaylistCallbacksHolder();

  //libspotify callback functions.
  static void playlistRenamed(sp_playlist* spPlaylist, void* userdata);
  static void tracksAdded(sp_playlist* playlist, sp_track *const *tracks, int num_tracks, int position, void *userdata);
  static void tracksMoved(sp_playlist* playlist, const int* tracks, int num_tracks, int new_position, void *userdata);
  static void tracksRemoved(sp_playlist* spPlaylist, const int *tracks, int num_tracks, void *userdata);
  static void trackCreatedChanged(sp_playlist* spPlaylist, int position, sp_user* spUser, int when, void* userdata);
  static void trackSeenChanged(sp_playlist* spPlaylist, int position, bool seen, void* userdata);
  static void trackMessageChanged(sp_playlist* spPlaylist, int position, const char* message, void* userdata);
  
  Handle<Function> playlistRenamedCallback;
  Handle<Function> tracksAddedCallback;
  Handle<Function> tracksMovedCallback;
  Handle<Function> tracksRemovedCallback;
  Handle<Function> trackCreatedChangedCallback;
  Handle<Function> trackSeenChangedCallback;
  Handle<Function> trackMessageChangedCallback;
  /**
    Register the callbacks with libspotify. Will first remove old registered callbacks.
  **/
  void setCallbacks();
  /**
    Unregister all callbacks.
  **/
  void unsetCallbacks();
};

#endif
