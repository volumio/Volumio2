#ifndef _NODE_PLAYLIST_CONTAINER_H
#define _NODE_PLAYLIST_CONTAINER_H

#include "NodeWrapped.h"
#include "../spotify/PlaylistContainer.h"
#include "../../callbacks/PlaylistContainerCallbacksHolder.h"

#include <v8.h>
#include <memory>

using namespace v8;

class NodePlaylistContainer : public NodeWrapped<NodePlaylistContainer> {
private:
  std::shared_ptr<PlaylistContainer> playlistContainer;
  PlaylistContainerCallbacksHolder playlistContainerCallbacksHolder;
public:
  NodePlaylistContainer(std::shared_ptr<PlaylistContainer> playlistContainer);
  ~NodePlaylistContainer();
  static Handle<Value> getOwner(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getPlaylist(const Arguments& args);
  static Handle<Value> isLoaded(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getNumPlaylists(Local<String> property, const AccessorInfo& info);
  static Handle<Value> addPlaylist(const Arguments& args);
  static Handle<Value> addFolder(const Arguments& args);
  static Handle<Value> deletePlaylist(const Arguments& args);
  static Handle<Value> movePlaylist(const Arguments& args);
  static Handle<Value> on(const Arguments& args);
  static Handle<Value> off(const Arguments& args);
  static void init();
};

#endif