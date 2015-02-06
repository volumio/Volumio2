#ifndef _NODE_TRACK_H
#define _NODE_TRACK_H

#include "NodeWrapped.h"
#include "../spotify/Track.h"

#include <v8.h>
#include <memory>

using namespace v8;

class NodeTrack : public NodeWrapped<NodeTrack> {
friend class NodePlayer;
friend class NodePlaylist;
private:
  std::shared_ptr<Track> track;
public:
  NodeTrack(std::shared_ptr<Track> track);
  ~NodeTrack();
  static Handle<Value> getName(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getLink(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getArtists(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getDuration(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getAlbum(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getStarred(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getPopularity(Local<String> property, const AccessorInfo& info);
  static Handle<Value> isLoaded(Local<String> property, const AccessorInfo& info);
  static void setStarred(Local<String> property, Local<Value> value, const AccessorInfo& info);
  static Handle<FunctionTemplate> init();
};

#endif