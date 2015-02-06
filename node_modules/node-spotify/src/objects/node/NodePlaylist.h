#ifndef _NODE_PLAYLIST_H
#define _NODE_PLAYLIST_H

#include "NodeWrapped.h"
#include "../../callbacks/PlaylistCallbacksHolder.h"
#include "../spotify/Playlist.h"

#include <v8.h>
#include <map>
#include <string>
#include <memory>

using namespace v8;

class NodePlaylist : public NodeWrapped<NodePlaylist> {
private:
  std::shared_ptr<Playlist> playlist;
  PlaylistCallbacksHolder playlistCallbacksHolder;
public:
  NodePlaylist(std::shared_ptr<Playlist> playlist);
  ~NodePlaylist();
  static void setName(Local<String> property, Local<Value> value, const AccessorInfo& info);
  static Handle<Value> getName(Local<String> property, const AccessorInfo& info);
  static void setCollaborative(Local<String> property, Local<Value> value, const AccessorInfo& info);
  static Handle<Value> getCollaborative(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getLink(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getDescription(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getNumTracks(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getTrack(const Arguments& args);
  static Handle<Value> addTracks(const Arguments& args);
  static Handle<Value> removeTracks(const Arguments& args);
  static Handle<Value> reorderTracks(const Arguments& args);
  static Handle<Value> isLoaded(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getOwner(Local<String> property, const AccessorInfo& info);
  static Handle<Value> on(const Arguments& args);
  static Handle<Value> off(const Arguments& args);
  static void init();
};

#endif