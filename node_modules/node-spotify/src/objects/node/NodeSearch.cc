#include "NodeSearch.h"
#include "NodeTrack.h"
#include "NodeAlbum.h"
#include "NodeArtist.h"
#include "NodePlaylist.h"
#include "../../Application.h"
#include "../../common_macros.h"

extern Application* application;

NodeSearch::NodeSearch(const char* _searchQuery) : searchQuery(_searchQuery), trackOffset(0), albumOffset(0), artistOffset(0), playlistOffset(0),
  trackLimit(10), albumLimit(10), artistLimit(10), playlistLimit(10) {

}

NodeSearch::NodeSearch(const char* _searchQuery, int offset) : searchQuery(_searchQuery), trackOffset(offset), albumOffset(offset), artistOffset(offset), playlistOffset(offset),
  trackLimit(10), albumLimit(10), artistLimit(10), playlistLimit(10) {

}

NodeSearch::NodeSearch(const char* _searchQuery, int offset, int limit) : searchQuery(_searchQuery), trackOffset(offset), albumOffset(offset), artistOffset(offset), playlistOffset(offset),
  trackLimit(limit), albumLimit(limit), artistLimit(limit), playlistLimit(limit) {

}

Handle<Value> NodeSearch::execute(const Arguments& args) {
  HandleScope scope;
  if(args.Length() < 1) {//TODO: how to check if it is a function? ->IsFunction() does not work, it does not recoginze functions.
    return scope.Close(V8_EXCEPTION("execute needs a callback function as its argument."));
  }
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(args.This());
  nodeSearch->makePersistent();
  Persistent<Function> callback = Persistent<Function>::New(Handle<Function>::Cast(args[0]));
  nodeSearch->browseCompleteCallback = callback;
  nodeSearch->search = std::unique_ptr<Search>(new Search());
  nodeSearch->search->nodeObject = nodeSearch;
  nodeSearch->search->execute(nodeSearch->searchQuery, nodeSearch->trackOffset, nodeSearch->trackLimit,
    nodeSearch->albumOffset, nodeSearch->albumLimit,
    nodeSearch->artistOffset, nodeSearch->artistLimit,
    nodeSearch->playlistLimit, nodeSearch->playlistLimit);
  nodeSearch->setupAdditionalMethods();
  return scope.Close(Undefined());
}

/**
 * Adds adiitional properties to the V8 object.
 * These will call libspotify functions and should first be available when the search has been executed.
 **/
void NodeSearch::setupAdditionalMethods() {
  Handle<Object> nodeObject = this->getV8Object();
  nodeObject->SetAccessor(String::NewSymbol("didYouMean"), didYouMean);
  nodeObject->SetAccessor(String::NewSymbol("link"), getLink);
  nodeObject->Set(String::NewSymbol("getTrack"), FunctionTemplate::New(getTrack)->GetFunction());
  nodeObject->Set(String::NewSymbol("getAlbum"), FunctionTemplate::New(getAlbum)->GetFunction());
  nodeObject->Set(String::NewSymbol("getArtist"), FunctionTemplate::New(getArtist)->GetFunction());
  nodeObject->Set(String::NewSymbol("getPlaylist"), FunctionTemplate::New(getPlaylist)->GetFunction());
  nodeObject->SetAccessor(String::NewSymbol("totalTracks"), getTotalTracks);
  nodeObject->SetAccessor(String::NewSymbol("numTracks"), getNumTracks);
  nodeObject->SetAccessor(String::NewSymbol("totalAlbums"), getTotalAlbums);
  nodeObject->SetAccessor(String::NewSymbol("numAlbums"), getNumAlbums);
  nodeObject->SetAccessor(String::NewSymbol("totalArtists"), getTotalArtists);
  nodeObject->SetAccessor(String::NewSymbol("numArtists"), getNumArtists);
  nodeObject->SetAccessor(String::NewSymbol("totalPlaylists"), getTotalPlaylists);
  nodeObject->SetAccessor(String::NewSymbol("numPlaylists"), getNumPlaylists);
}

Handle<Value> NodeSearch::getTrackOffset(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  return scope.Close(Integer::New(nodeSearch->trackOffset));
}

void NodeSearch::setTrackOffset(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  nodeSearch->trackOffset = value->ToInteger()->Value();
  scope.Close(Undefined());
}

Handle<Value> NodeSearch::getAlbumOffset(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  return scope.Close(Integer::New(nodeSearch->albumOffset));
}

void NodeSearch::setAlbumOffset(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  nodeSearch->albumOffset = value->ToInteger()->Value();
  scope.Close(Undefined());
}

Handle<Value> NodeSearch::getArtistOffset(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  return scope.Close(Integer::New(nodeSearch->artistOffset));
}

void NodeSearch::setArtistOffset(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  nodeSearch->artistOffset = value->ToInteger()->Value();
  scope.Close(Undefined());
}

Handle<Value> NodeSearch::getPlaylistOffset(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  return scope.Close(Integer::New(nodeSearch->playlistOffset));
}

void NodeSearch::setPlaylistOffset(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  nodeSearch->playlistOffset = value->ToInteger()->Value();
  scope.Close(Undefined());
}

Handle<Value> NodeSearch::getTrackLimit(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  return scope.Close(Integer::New(nodeSearch->trackLimit));
}

void NodeSearch::setTrackLimit(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  nodeSearch->trackLimit = value->ToInteger()->Value();
  scope.Close(Undefined());
}

Handle<Value> NodeSearch::getAlbumLimit(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  return scope.Close(Integer::New(nodeSearch->albumLimit));
}

void NodeSearch::setAlbumLimit(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  nodeSearch->albumLimit = value->ToInteger()->Value();
  scope.Close(Undefined());
}

Handle<Value> NodeSearch::getArtistLimit(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  return scope.Close(Integer::New(nodeSearch->artistLimit));
}

void NodeSearch::setArtistLimit(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  nodeSearch->artistLimit = value->ToInteger()->Value();
  scope.Close(Undefined());
}

Handle<Value> NodeSearch::getPlaylistLimit(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  return scope.Close(Integer::New(nodeSearch->playlistLimit));
}

void NodeSearch::setPlaylistLimit(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  nodeSearch->playlistLimit = value->ToInteger()->Value();
  scope.Close(Undefined());
}

Handle<Value> NodeSearch::New(const Arguments& args) {
  HandleScope scope;
  NodeSearch* search;
  String::Utf8Value searchQuery(args[0]->ToString());
  if(args.Length() == 1) {
    search = new NodeSearch(*searchQuery);
  } else if(args.Length() == 2) {
    int offset = args[1]->ToInteger()->Value();
    search = new NodeSearch(*searchQuery, offset);
  } else if(args.Length() == 3) {
    int offset = args[1]->ToInteger()->Value();
    int limit = args[2]->ToInteger()->Value();
    search = new NodeSearch(*searchQuery, offset, limit);
  } else {
    return scope.Close(V8_EXCEPTION("Please provide an object to the node-spotify initializer function"));
  }
  search->Wrap(args.This());
  return scope.Close(args.This());
}

Handle<Value> NodeSearch::didYouMean(Local<String> property, const AccessorInfo& info) {
    HandleScope scope;
    NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
    return scope.Close(String::New(nodeSearch->search->didYouMeanText().c_str()));
}

Handle<Value> NodeSearch::getLink(Local<String> property, const AccessorInfo& info) {
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  return String::New(nodeSearch->search->link().c_str());
}

Handle<Value> NodeSearch::getTrack(const Arguments& args) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(args.This());
  if(args.Length() < 1 || !args[0]->IsNumber()) {
    return scope.Close(V8_EXCEPTION("getTrack needs a number as its first argument."));
  }

  int position = args[0]->ToNumber()->IntegerValue();
  if(position >= nodeSearch->search->numTracks() || position < 0) {
    return scope.Close(V8_EXCEPTION("Track index out of bounds"));
  }

  NodeTrack* nodeTrack = new NodeTrack(nodeSearch->search->getTrack(position));
  return scope.Close(nodeTrack->getV8Object());
}

Handle<Value> NodeSearch::getAlbum(const Arguments& args) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(args.This());
  if(args.Length() < 1 || !args[0]->IsNumber()) {
    return scope.Close(V8_EXCEPTION("getAlbum needs a number as its first argument."));
  }

  int position = args[0]->ToNumber()->IntegerValue();
  if(position >= nodeSearch->search->numAlbums() || position < 0) {
    return scope.Close(V8_EXCEPTION("Album index out of bounds"));
  }

  NodeAlbum* nodeAlbum = new NodeAlbum(nodeSearch->search->getAlbum(position));
  return scope.Close(nodeAlbum->getV8Object());
}

Handle<Value> NodeSearch::getArtist(const Arguments& args) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(args.This());
  if(args.Length() < 1 || !args[0]->IsNumber()) {
    return scope.Close(V8_EXCEPTION("getArtist needs a number as its first argument."));
  }

  int position = args[0]->ToNumber()->IntegerValue();
  if(position >= nodeSearch->search->numArtists() || position < 0) {
    return scope.Close(V8_EXCEPTION("Artist index out of bounds"));
  }

  NodeArtist* nodeArtist = new NodeArtist(nodeSearch->search->getArtist(position));
  return scope.Close(nodeArtist->getV8Object());
}

Handle<Value> NodeSearch::getPlaylist(const Arguments& args) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(args.This());
  if(args.Length() < 1 || !args[0]->IsNumber()) {
    return scope.Close(V8_EXCEPTION("getPlaylist needs a number as its first argument."));
  }

  int position = args[0]->ToNumber()->IntegerValue();
  if(position >= nodeSearch->search->numPlaylists() || position < 0) {
    return scope.Close(V8_EXCEPTION("Playlist index out of bounds"));
  }

  NodePlaylist* nodePlaylist = new NodePlaylist(nodeSearch->search->getPlaylist(position));
  return scope.Close(nodePlaylist->getV8Object());
}

Handle<Value> NodeSearch::getTotalTracks(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  return scope.Close(Integer::New(nodeSearch->search->totalTracks()));
}

Handle<Value> NodeSearch::getNumTracks(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  return scope.Close(Integer::New(nodeSearch->search->numTracks()));
}

Handle<Value> NodeSearch::getTotalAlbums(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  return scope.Close(Integer::New(nodeSearch->search->totalAlbums()));
}

Handle<Value> NodeSearch::getNumAlbums(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  return scope.Close(Integer::New(nodeSearch->search->numAlbums()));
}

Handle<Value> NodeSearch::getTotalArtists(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  return scope.Close(Integer::New(nodeSearch->search->totalArtists()));
}

Handle<Value> NodeSearch::getNumArtists(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  return scope.Close(Integer::New(nodeSearch->search->numArtists()));
}

Handle<Value> NodeSearch::getTotalPlaylists(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  return scope.Close(Integer::New(nodeSearch->search->totalPlaylists()));
}

Handle<Value> NodeSearch::getNumPlaylists(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSearch* nodeSearch = node::ObjectWrap::Unwrap<NodeSearch>(info.Holder());
  return scope.Close(Integer::New(nodeSearch->search->numPlaylists()));
}

void NodeSearch::init() {
HandleScope scope;
  Local<FunctionTemplate> constructorTemplate = FunctionTemplate::New(New);
  constructorTemplate->SetClassName(String::NewSymbol("Search"));
  constructorTemplate->InstanceTemplate()->SetInternalFieldCount(1);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "execute", execute);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("trackOffset"), getTrackOffset, setTrackOffset);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("trackLimit"), getTrackLimit, setTrackLimit);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("albumOffset"), getAlbumOffset, setAlbumOffset);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("albumLimit"), getAlbumLimit, setAlbumLimit);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("artistOffset"), getArtistOffset, setArtistOffset);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("artistLimit"), getArtistLimit, setArtistLimit);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("playlistOffset"), getPlaylistOffset, setPlaylistOffset);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("playlistLimit"), getPlaylistLimit, setPlaylistLimit);
  constructor = Persistent<Function>::New(constructorTemplate->GetFunction());
  scope.Close(Undefined());
}
