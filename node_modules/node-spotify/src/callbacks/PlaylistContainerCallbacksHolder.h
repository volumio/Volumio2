#ifndef _PLAYLIST_CONTAINER_CALLBACKS_H
#define _PLAYLIST_CONTAINER_CALLBACKS_H

#include "../objects/node/V8Wrapped.h"

#include <initializer_list>
#include <libspotify/api.h>
#include <v8.h>

using namespace v8;

class PlaylistContainerCallbacksHolder {
private:
  sp_playlistcontainer* playlistContainer;
  sp_playlistcontainer_callbacks* playlistContainerCallbacks;
  V8Wrapped* userdata;
  void call(Handle<Function> callback, std::initializer_list<Handle<Value>> args);
public:
  PlaylistContainerCallbacksHolder(sp_playlistcontainer* pc, V8Wrapped* userdata);
  ~PlaylistContainerCallbacksHolder();

  //libspotify callback functions
  static void playlistAdded(sp_playlistcontainer* pc, sp_playlist* spPlaylist, int position, void* userdata);
  static void playlistRemoved(sp_playlistcontainer *pc, sp_playlist *playlist, int position, void *userdata);
  static void playlistMoved(sp_playlistcontainer *pc, sp_playlist *playlist, int position, int new_position, void *userdata);

  Handle<Function> playlistAddedCallback;
  Handle<Function> playlistRemovedCallback;
  Handle<Function> playlistMovedCallback;

  void setCallbacks();
  void unsetCallbacks();
};

#endif