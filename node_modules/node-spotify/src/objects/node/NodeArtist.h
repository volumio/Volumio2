#ifndef _NODE_ARTIST_H
#define _NODE_ARTIST_H

#include "NodeWrapped.h"
#include "V8Wrapped.h"
#include "../spotify/Artist.h"

#include <v8.h>
#include <memory>

using namespace v8;

class NodeArtist : public NodeWrapped<NodeArtist>, public V8Browseable {
private:
  std::unique_ptr<Artist> artist;
public:
  NodeArtist(std::unique_ptr<Artist> artist);
  ~NodeArtist();
  static Handle<Value> getName(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getLink(Local<String> property, const AccessorInfo& info);
  static Handle<Value> browse(const Arguments& args);
  static Handle<Value> getTracks(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getTophitTracks(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getAlbums(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getSimilarArtists(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getBiography(Local<String> property, const AccessorInfo& info);
  static Handle<Value> isLoaded(Local<String> property, const AccessorInfo& info);
  static void init();
};

#endif
