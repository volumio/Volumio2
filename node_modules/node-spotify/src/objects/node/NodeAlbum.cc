#include "NodeAlbum.h"
#include "NodeTrack.h"
#include "NodeArtist.h"
#include "../spotify/Track.h"

NodeAlbum::NodeAlbum(std::unique_ptr<Album> _album) : album(std::move(_album)) {
  album->nodeObject = this;
};

NodeAlbum::~NodeAlbum() {
  if(album->nodeObject == this) {
    album->nodeObject = nullptr;
  }
}

Handle<Value> NodeAlbum::getName(Local<String> property, const AccessorInfo& info) {
  NodeAlbum* nodeAlbum = node::ObjectWrap::Unwrap<NodeAlbum>(info.Holder());
  return String::New(nodeAlbum->album->name().c_str());
}

Handle<Value> NodeAlbum::getLink(Local<String> property, const AccessorInfo& info) {
  NodeAlbum* nodeAlbum = node::ObjectWrap::Unwrap<NodeAlbum>(info.Holder());
  return String::New(nodeAlbum->album->link().c_str());
}

Handle<Value> NodeAlbum::getCoverBase64(const Arguments& args) {
  HandleScope scope;
  NodeAlbum* nodeAlbum = node::ObjectWrap::Unwrap<NodeAlbum>(args.This());
  return scope.Close(String::New(nodeAlbum->album->coverBase64().c_str()));
}

Handle<Value> NodeAlbum::browse(const Arguments& args) {
  HandleScope scope;
  NodeAlbum* nodeAlbum = node::ObjectWrap::Unwrap<NodeAlbum>(args.This());
  if(nodeAlbum->album->albumBrowse == nullptr) {
    nodeAlbum->makePersistent();
    Persistent<Function> callback = Persistent<Function>::New(Handle<Function>::Cast(args[0]));
    nodeAlbum->browseCompleteCallback = callback;

    //Mutate the V8 object.
    Handle<Object> nodeAlbumV8 = nodeAlbum->getV8Object();
    nodeAlbumV8->SetAccessor(String::NewSymbol("tracks"), getTracks);
    nodeAlbumV8->SetAccessor(String::NewSymbol("review"), getReview);
    nodeAlbumV8->SetAccessor(String::NewSymbol("copyrights"), getCopyrights);
    nodeAlbumV8->SetAccessor(String::NewSymbol("artist"), getArtist);

    nodeAlbum->album->browse();
  } else {
    nodeAlbum->callBrowseComplete();
  }
  return scope.Close(Undefined());
}

Handle<Value> NodeAlbum::getTracks(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeAlbum* nodeAlbum = node::ObjectWrap::Unwrap<NodeAlbum>(info.Holder());
  std::vector<std::shared_ptr<Track>> tracks = nodeAlbum->album->tracks();
  Handle<Array> nodeTracks = Array::New(tracks.size());
  for(int i = 0; i < (int)tracks.size(); i++) {
    NodeTrack* nodeTrack = new NodeTrack(tracks[i]);
    nodeTracks->Set(Number::New(i), nodeTrack->getV8Object());
  }
  return scope.Close(nodeTracks);
}

Handle<Value> NodeAlbum::getReview(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeAlbum* nodeAlbum = node::ObjectWrap::Unwrap<NodeAlbum>(info.Holder());
  Handle<String> review = String::New(nodeAlbum->album->review().c_str());
  return scope.Close(review);
}

Handle<Value> NodeAlbum::getCopyrights(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeAlbum* nodeAlbum = node::ObjectWrap::Unwrap<NodeAlbum>(info.Holder());
  std::vector<std::string> copyrights = nodeAlbum->album->copyrights();
  Handle<Array> nodeCopyrights = Array::New(copyrights.size());
  for(int i = 0; i < (int)copyrights.size(); i++) {
    nodeCopyrights->Set(Number::New(i), String::New(copyrights[i].c_str()));
  }
  return scope.Close(nodeCopyrights);
}

Handle<Value> NodeAlbum::getArtist(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeAlbum* nodeAlbum = node::ObjectWrap::Unwrap<NodeAlbum>(info.Holder());
  NodeArtist* nodeArtist = new NodeArtist(nodeAlbum->album->artist());
  return scope.Close(nodeArtist->getV8Object());
}

Handle<Value> NodeAlbum::isLoaded(Local<String> property, const AccessorInfo& info) {
  NodeAlbum* nodeAlbum = node::ObjectWrap::Unwrap<NodeAlbum>(info.Holder());
  return Boolean::New(nodeAlbum->album->isLoaded());
}

void NodeAlbum::init() {
  HandleScope scope;
  Handle<FunctionTemplate> constructorTemplate = NodeWrapped::init("Album");
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("name"), getName);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("link"), getLink);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("isLoaded"), isLoaded);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "getCoverBase64", getCoverBase64);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "browse", browse);
  constructor = Persistent<Function>::New(constructorTemplate->GetFunction());
  scope.Close(Undefined());
}
