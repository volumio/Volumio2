#ifndef _NODE_ALBUM_H
#define _NODE_ALBUM_H

#include "NodeWrapped.h"
#include "V8Browseable.h"
#include "../spotify/Album.h"

#include <v8.h>
#include <memory>

using namespace v8;

class NodeAlbum : public NodeWrapped<NodeAlbum>, public V8Browseable {
friend class AlbumBrowseCallbacks;
private:
  std::unique_ptr<Album> album;
public:
  NodeAlbum(std::unique_ptr<Album> album);
  ~NodeAlbum();
  static void init();
  static Handle<Value> getName(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getLink(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getCoverBase64(const Arguments& args);
  static Handle<Value> browse(const Arguments& args);
  static Handle<Value> getTracks(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getCopyrights(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getReview(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getArtist(Local<String> property, const AccessorInfo& info);
  static Handle<Value> isLoaded(Local<String> property, const AccessorInfo& info);
};

#endif
