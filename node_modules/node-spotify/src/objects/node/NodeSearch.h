#ifndef _NODE_SEARCH_RESULT_H
#define _NODE_SEARCH_RESULT_H

#include "NodeWrapped.h"
#include "V8Browseable.h"
#include "../spotify/Search.h"

#include <v8.h>
#include <memory>

using namespace v8;

class NodeSearch : public NodeWrapped<NodeSearch>, public V8Browseable {
private:
  std::unique_ptr<Search> search;
  std::string searchQuery;
  int trackOffset, albumOffset, artistOffset, playlistOffset;
  int trackLimit, albumLimit, artistLimit, playlistLimit;
  void setupAdditionalMethods();
public:
  NodeSearch(const char* _query);
  NodeSearch(const char* _query, int offset);
  NodeSearch(const char* _query, int offset, int limit);

  static Handle<Value> getTrackOffset(Local<String> property, const AccessorInfo& info);
  static void setTrackOffset(Local<String> property, Local<Value> value, const AccessorInfo& info);
  static Handle<Value> getAlbumOffset(Local<String> property, const AccessorInfo& info);
  static void setAlbumOffset(Local<String> property, Local<Value> value, const AccessorInfo& info);
  static Handle<Value> getArtistOffset(Local<String> property, const AccessorInfo& info);
  static void setArtistOffset(Local<String> property, Local<Value> value, const AccessorInfo& info);
  static Handle<Value> getPlaylistOffset(Local<String> property, const AccessorInfo& info);
  static void setPlaylistOffset(Local<String> property, Local<Value> value, const AccessorInfo& info);
  static Handle<Value> getTrackLimit(Local<String> property, const AccessorInfo& info);
  static void setTrackLimit(Local<String> property, Local<Value> value, const AccessorInfo& info);
  static Handle<Value> getAlbumLimit(Local<String> property, const AccessorInfo& info);
  static void setAlbumLimit(Local<String> property, Local<Value> value, const AccessorInfo& info);
  static Handle<Value> getArtistLimit(Local<String> property, const AccessorInfo& info);
  static void setArtistLimit(Local<String> property, Local<Value> value, const AccessorInfo& info);
  static Handle<Value> getPlaylistLimit(Local<String> property, const AccessorInfo& info);
  static void setPlaylistLimit(Local<String> property, Local<Value> value, const AccessorInfo& info);
  static Handle<Value> didYouMean(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getTotalTracks(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getNumTracks(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getTotalAlbums(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getNumAlbums(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getTotalArtists(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getNumArtists(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getTotalPlaylists(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getNumPlaylists(Local<String> property, const AccessorInfo& info);
  static Handle<Value> New(const Arguments& args);
  static Handle<Value> execute(const Arguments& args);
  static Handle<Value> getTrack(const Arguments& args);
  static Handle<Value> getAlbum(const Arguments& args);
  static Handle<Value> getArtist(const Arguments& args);
  static Handle<Value> getPlaylist(const Arguments& args);
  static Handle<Value> getLink(Local<String> property, const AccessorInfo& info);
  static void init();
};

#endif
