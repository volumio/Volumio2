#include "NodeArtist.h"
#include "NodeTrack.h"
#include "NodeAlbum.h"

NodeArtist::NodeArtist(std::unique_ptr<Artist> _artist) : artist(std::move(_artist)) {
  artist->nodeObject = this;
}

NodeArtist::~NodeArtist() {
  if(artist->nodeObject == this) {
    artist->nodeObject = nullptr;
  }
}

Handle<Value> NodeArtist::getName(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeArtist* nodeArtist = node::ObjectWrap::Unwrap<NodeArtist>(info.Holder());
  return scope.Close(String::New(nodeArtist->artist->name().c_str()));
}

Handle<Value> NodeArtist::getLink(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeArtist* nodeArtist = node::ObjectWrap::Unwrap<NodeArtist>(info.Holder());
  return scope.Close(String::New(nodeArtist->artist->link().c_str()));
}

Handle<Value> NodeArtist::browse(const Arguments& args) {
  HandleScope scope;
  NodeArtist* nodeArtist = node::ObjectWrap::Unwrap<NodeArtist>(args.This());
  if(nodeArtist->artist->artistBrowse == nullptr) {
    nodeArtist->makePersistent();
    sp_artistbrowse_type artistbrowseType = static_cast<sp_artistbrowse_type>(args[0]->ToNumber()->IntegerValue());
    Persistent<Function> callback = Persistent<Function>::New(Handle<Function>::Cast(args[1]));
    nodeArtist->browseCompleteCallback = callback;

    //Mutate the V8 object.
    Handle<Object> nodeArtistV8 = nodeArtist->getV8Object();
    nodeArtistV8->SetAccessor(String::NewSymbol("tracks"), getTracks);
    nodeArtistV8->SetAccessor(String::NewSymbol("tophitTracks"), getTophitTracks);
    nodeArtistV8->SetAccessor(String::NewSymbol("albums"), getAlbums);
    nodeArtistV8->SetAccessor(String::NewSymbol("similarArtists"), getSimilarArtists);
    nodeArtistV8->SetAccessor(String::NewSymbol("biography"), getBiography);
    //TODO: portraits

    nodeArtist->artist->browse(artistbrowseType);
  } else {
    nodeArtist->callBrowseComplete();
  }
  return scope.Close(Undefined());
}

Handle<Value> NodeArtist::getTracks(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeArtist* nodeArtist = node::ObjectWrap::Unwrap<NodeArtist>(info.Holder());
  std::vector<std::shared_ptr<Track>> tracks = nodeArtist->artist->tracks();
  Local<Array> nodeTracks = Array::New(tracks.size());
  for(int i = 0; i < (int)tracks.size(); i++) {
    NodeTrack* nodeTrack = new NodeTrack(tracks[i]);
    nodeTracks->Set(Number::New(i), nodeTrack->getV8Object());
  }
  return scope.Close(nodeTracks);
}

Handle<Value> NodeArtist::getTophitTracks(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeArtist* nodeArtist = node::ObjectWrap::Unwrap<NodeArtist>(info.Holder());
  std::vector<std::shared_ptr<Track>> tophitTracks = nodeArtist->artist->tophitTracks();
  Local<Array> nodeTophitTracks = Array::New(tophitTracks.size());
  for(int i = 0; i < (int)tophitTracks.size(); i++) {
    NodeTrack* nodeTrack = new NodeTrack(tophitTracks[i]);
    nodeTophitTracks->Set(Number::New(i), nodeTrack->getV8Object());
  }
  return scope.Close(nodeTophitTracks);
}

Handle<Value> NodeArtist::getAlbums(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeArtist* nodeArtist = node::ObjectWrap::Unwrap<NodeArtist>(info.Holder());
  std::vector<std::unique_ptr<Album>> albums = nodeArtist->artist->albums();
  Local<Array> nodeAlbums = Array::New(albums.size());
  for(int i = 0; i < (int)albums.size(); i++) {
    NodeAlbum* nodeAlbum = new NodeAlbum(std::move(albums[i]));
    nodeAlbums->Set(Number::New(i), nodeAlbum->getV8Object());
  }
  return scope.Close(nodeAlbums);
}

Handle<Value> NodeArtist::getSimilarArtists(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeArtist* nodeArtist = node::ObjectWrap::Unwrap<NodeArtist>(info.Holder());
  std::vector<std::unique_ptr<Artist>> similarArtists = nodeArtist->artist->similarArtists();
  Local<Array> nodeSimilarArtists = Array::New(similarArtists.size());
  for(int i = 0; i < (int)similarArtists.size(); i++) {
    NodeArtist* nodeArtist = new NodeArtist(std::move(similarArtists[i]));
    nodeSimilarArtists->Set(Number::New(i), nodeArtist->getV8Object());
  }
  return scope.Close(nodeSimilarArtists);
}

Handle<Value> NodeArtist::getBiography(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeArtist* nodeArtist = node::ObjectWrap::Unwrap<NodeArtist>(info.Holder());
  std::string biography = nodeArtist->artist->biography();
  return scope.Close(String::New(biography.c_str()));
}

Handle<Value> NodeArtist::isLoaded(Local<String> property, const AccessorInfo& info) {
  NodeArtist* nodeArtist = node::ObjectWrap::Unwrap<NodeArtist>(info.Holder());
  return Boolean::New(nodeArtist->artist->isLoaded());
}

void NodeArtist::init() {
  HandleScope scope;
  Handle<FunctionTemplate> constructorTemplate = NodeWrapped::init("Artist");
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("name"), getName);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("link"), getLink);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("isLoaded"), isLoaded);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "browse", browse);
  constructor = Persistent<Function>::New(constructorTemplate->GetFunction());
  scope.Close(Undefined());
}
