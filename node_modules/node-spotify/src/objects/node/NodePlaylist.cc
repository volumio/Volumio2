#include "NodePlaylist.h"
#include "../../exceptions.h"
#include "../../common_macros.h"
#include "../spotify/Track.h"
#include "../spotify/TrackExtended.h"
#include "NodeTrack.h"
#include "NodeTrackExtended.h"
#include "NodeUser.h"
#include "../../utils/V8Utils.h"

NodePlaylist::NodePlaylist(std::shared_ptr<Playlist> _playlist) : playlist(_playlist),
  playlistCallbacksHolder(this, _playlist->playlist) {
}

NodePlaylist::~NodePlaylist() {
  
}

void NodePlaylist::setName(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  NodePlaylist* nodePlaylist = node::ObjectWrap::Unwrap<NodePlaylist>(info.Holder());
  String::Utf8Value newName(value->ToString());
  nodePlaylist->playlist->name(*newName);
}

Handle<Value> NodePlaylist::getName(Local<String> property, const AccessorInfo& info) {
  NodePlaylist* nodePlaylist = node::ObjectWrap::Unwrap<NodePlaylist>(info.Holder());
  return String::New(nodePlaylist->playlist->name().c_str());
}

void NodePlaylist::setCollaborative(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  HandleScope scope;
  NodePlaylist* nodePlaylist = node::ObjectWrap::Unwrap<NodePlaylist>(info.Holder());
  nodePlaylist->playlist->setCollaborative(value->ToBoolean()->Value());
  scope.Close(Undefined());
}

Handle<Value> NodePlaylist::getCollaborative(Local<String> property, const AccessorInfo& info) {
  NodePlaylist* nodePlaylist = node::ObjectWrap::Unwrap<NodePlaylist>(info.Holder());
  return Boolean::New(nodePlaylist->playlist->isCollaborative());
}

Handle<Value> NodePlaylist::getLink(Local<String> property, const AccessorInfo& info) {
  NodePlaylist* nodePlaylist = node::ObjectWrap::Unwrap<NodePlaylist>(info.Holder());
  return String::New(nodePlaylist->playlist->link().c_str());
}

Handle<Value> NodePlaylist::getDescription(Local<String> property, const AccessorInfo& info) {
  NodePlaylist* nodePlaylist = node::ObjectWrap::Unwrap<NodePlaylist>(info.Holder());
  return String::New(nodePlaylist->playlist->description().c_str());
}

Handle<Value> NodePlaylist::getNumTracks(Local<String> property, const AccessorInfo& info) {
  NodePlaylist* nodePlaylist = node::ObjectWrap::Unwrap<NodePlaylist>(info.Holder());
  return Integer::New(nodePlaylist->playlist->numTracks());
}

Handle<Value> NodePlaylist::getTrack(const Arguments& args) {
  HandleScope scope;
  NodePlaylist* nodePlaylist = node::ObjectWrap::Unwrap<NodePlaylist>(args.This());
  if(args.Length() < 1 || !args[0]->IsNumber()) {
    return scope.Close(V8_EXCEPTION("getTrack needs a number as its first argument."));
  }
  int position = args[0]->ToNumber()->IntegerValue();
  if(position >= nodePlaylist->playlist->numTracks() || position < 0) {
    return scope.Close(V8_EXCEPTION("Track index out of bounds"));
  }
  std::shared_ptr<TrackExtended> track = nodePlaylist->playlist->getTrack(position);
  NodeTrackExtended* nodeTrack = new NodeTrackExtended(track);
  return scope.Close(nodeTrack->getV8Object());
}

Handle<Value> NodePlaylist::addTracks(const Arguments& args) {
  HandleScope scope;
  if(args.Length() < 2 || !args[0]->IsArray() || !args[1]->IsNumber()) {
    return scope.Close(V8_EXCEPTION("addTracks needs an array and a number as its arguments."));
  }
  NodePlaylist* nodePlaylist = node::ObjectWrap::Unwrap<NodePlaylist>(args.This());
  Handle<Array> trackArray = Handle<Array>::Cast(args[0]);
  std::vector<std::shared_ptr<Track>> tracks(trackArray->Length());
  for(unsigned int i = 0; i < trackArray->Length(); i++) {
    Handle<Object> trackObject = trackArray->Get(i)->ToObject();
    NodeTrack* nodeTrack = node::ObjectWrap::Unwrap<NodeTrack>(trackObject);
    tracks[i] = nodeTrack->track;
  }
  int position = args[1]->ToNumber()->IntegerValue();
  try {
    nodePlaylist->playlist->addTracks(tracks, position);
  } catch(const TracksNotAddedException& e) {
    return scope.Close(V8_EXCEPTION(e.message.c_str()));
  }

  return scope.Close(Undefined());
}

Handle<Value> NodePlaylist::removeTracks(const Arguments& args) {
  HandleScope scope;
  if(args.Length() < 1 || !args[0]->IsArray()) {
    return scope.Close(V8_EXCEPTION("removeTracks needs an array as its first argument."));
  }
  NodePlaylist* nodePlaylist = node::ObjectWrap::Unwrap<NodePlaylist>(args.This());
  Handle<Array> trackPositionsArray = Handle<Array>::Cast(args[0]);
  int trackPositions[trackPositionsArray->Length()];
  for(unsigned int i = 0; i < trackPositionsArray->Length(); i++) {
    trackPositions[i] = trackPositionsArray->Get(i)->ToNumber()->IntegerValue();
  }
  try {
    nodePlaylist->playlist->removeTracks(trackPositions, trackPositionsArray->Length());
  } catch(const TracksNotRemoveableException& e) {
    return scope.Close(V8_EXCEPTION("Tracks not removeable, permission denied."));
  }

  return scope.Close(Undefined());
}

Handle<Value> NodePlaylist::reorderTracks(const Arguments& args) {
  HandleScope scope;
  if(args.Length() < 2 || !args[0]->IsArray() || !args[1]->IsNumber()) {
    return scope.Close(V8_EXCEPTION("reorderTracks needs an array and a numer as its arguments."));
  }
  NodePlaylist* nodePlaylist = node::ObjectWrap::Unwrap<NodePlaylist>(args.This());
  Handle<Array> trackPositionsArray = Handle<Array>::Cast(args[0]);
  int trackPositions[trackPositionsArray->Length()];
  int newPosition = args[1]->ToNumber()->IntegerValue();
  for(unsigned int i = 0; i < trackPositionsArray->Length(); i++) {
    trackPositions[i] = trackPositionsArray->Get(i)->ToNumber()->IntegerValue();
  }
  try {
    nodePlaylist->playlist->reorderTracks(trackPositions, trackPositionsArray->Length(), newPosition);
  } catch(const TracksNotReorderableException& e) {
    return scope.Close(V8_EXCEPTION(e.message.c_str()));
  }

  return scope.Close(Undefined());
}

Handle<Value> NodePlaylist::isLoaded(Local<String> property, const AccessorInfo& info) {
  NodePlaylist* nodePlaylist = node::ObjectWrap::Unwrap<NodePlaylist>(info.Holder());
  return Boolean::New(nodePlaylist->playlist->isLoaded());
}

Handle<Value> NodePlaylist::getOwner(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodePlaylist* nodePlaylist = node::ObjectWrap::Unwrap<NodePlaylist>(info.Holder());
  Handle<Value> owner;
  if(nodePlaylist->playlist->owner()) {
    owner = (new NodeUser(nodePlaylist->playlist->owner()))->getV8Object();
  }
  return scope.Close(owner);
}

/**
  Set all callbacks for this playlist. Replaces all old callbacks.
**/
Handle<Value> NodePlaylist::on(const Arguments& args) {
  HandleScope scope;
  NodePlaylist* nodePlaylist = node::ObjectWrap::Unwrap<NodePlaylist>(args.This());
  if(args.Length() < 1 || !args[0]->IsObject()) {
    return scope.Close(V8_EXCEPTION("on needs an object as its first argument."));
  }
  Handle<Object> callbacks = args[0]->ToObject();
  Handle<String> playlistRenamedKey = String::New("playlistRenamed");
  Handle<String> tracksMovedKey = String::New("tracksMoved");
  Handle<String> tracksAddedKey = String::New("tracksAdded");
  Handle<String> tracksRemovedKey = String::New("tracksRemoved");
  Handle<String> trackCreatedChangedKey = String::New("trackCreatedChanged");
  Handle<String> trackSeenChangedKey = String::New("trackSeenChanged");
  Handle<String> trackMessageChangedKey = String::New("trackMessageChanged");
  nodePlaylist->playlistCallbacksHolder.playlistRenamedCallback = V8Utils::getFunctionFromObject(callbacks, playlistRenamedKey);
  nodePlaylist->playlistCallbacksHolder.tracksAddedCallback = V8Utils::getFunctionFromObject(callbacks, tracksAddedKey);
  nodePlaylist->playlistCallbacksHolder.tracksMovedCallback = V8Utils::getFunctionFromObject(callbacks, tracksMovedKey);
  nodePlaylist->playlistCallbacksHolder.tracksRemovedCallback = V8Utils::getFunctionFromObject(callbacks, tracksRemovedKey);
  nodePlaylist->playlistCallbacksHolder.trackCreatedChangedCallback = V8Utils::getFunctionFromObject(callbacks, trackCreatedChangedKey);
  nodePlaylist->playlistCallbacksHolder.trackSeenChangedCallback = V8Utils::getFunctionFromObject(callbacks, trackSeenChangedKey);
  nodePlaylist->playlistCallbacksHolder.trackMessageChangedCallback = V8Utils::getFunctionFromObject(callbacks, trackMessageChangedKey);
  nodePlaylist->playlistCallbacksHolder.setCallbacks();
  return scope.Close(Undefined());
}

Handle<Value> NodePlaylist::off(const Arguments& args) {
  HandleScope scope;
  NodePlaylist* nodePlaylist = node::ObjectWrap::Unwrap<NodePlaylist>(args.This());
  nodePlaylist->playlistCallbacksHolder.unsetCallbacks();
  return scope.Close(Undefined());
}

void NodePlaylist::init() {
  HandleScope scope;
  Local<FunctionTemplate> constructorTemplate = FunctionTemplate::New();
  constructorTemplate->SetClassName(String::NewSymbol("Playlist"));
  constructorTemplate->InstanceTemplate()->SetInternalFieldCount(1);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "on", on);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "off", off);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("name"), getName, setName);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("collaborative"), getCollaborative, setCollaborative);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("link"), getLink);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("description"), getDescription);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("isLoaded"), isLoaded);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("owner"), getOwner);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("numTracks"), getNumTracks);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "getTrack", getTrack);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "addTracks", addTracks);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "removeTracks", removeTracks);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "reorderTracks", reorderTracks);

  constructor = Persistent<Function>::New(constructorTemplate->GetFunction());
  scope.Close(Undefined());
}
