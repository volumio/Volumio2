#include "NodePlaylistContainer.h"
#include "NodePlaylist.h"
#include "NodePlaylistFolder.h"
#include "NodeUser.h"
#include "../../exceptions.h"
#include "../../common_macros.h"
#include "../../utils/V8Utils.h"

NodePlaylistContainer::NodePlaylistContainer(std::shared_ptr<PlaylistContainer> _playlistContainer) : playlistContainer(_playlistContainer),
  playlistContainerCallbacksHolder(playlistContainer->playlistContainer, this) {
}

NodePlaylistContainer::~NodePlaylistContainer() {
}

Handle<Value> NodePlaylistContainer::getOwner(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodePlaylistContainer* nodePlaylistContainer = node::ObjectWrap::Unwrap<NodePlaylistContainer>(info.Holder());
  NodeUser* nodeUser = new NodeUser(nodePlaylistContainer->playlistContainer->owner());
  return scope.Close(nodeUser->getV8Object());
}

Handle<Value> NodePlaylistContainer::getNumPlaylists(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodePlaylistContainer* nodePlaylistContainer = node::ObjectWrap::Unwrap<NodePlaylistContainer>(info.Holder());
  return scope.Close(Integer::New(nodePlaylistContainer->playlistContainer->numPlaylists()));
}

Handle<Value> NodePlaylistContainer::getPlaylist(const Arguments& args) {
  HandleScope scope;
  if(args.Length() < 1 || !args[0]->IsNumber()) {
    return scope.Close(V8_EXCEPTION("getPlaylist needs an interger as its first argument."));
  }
  int index = args[0]->ToNumber()->IntegerValue();
  NodePlaylistContainer* nodePlaylistContainer = node::ObjectWrap::Unwrap<NodePlaylistContainer>(args.This());
  if(index < 0 || index > nodePlaylistContainer->playlistContainer->numPlaylists()) {
    return scope.Close(V8_EXCEPTION("Index out of range."));
  }
  std::shared_ptr<PlaylistBase> playlist = nodePlaylistContainer->playlistContainer->getPlaylist(index);

  Handle<Value> outNodePlaylist;
  if(!playlist->isFolder) {
    NodePlaylist* nodePlaylist = new NodePlaylist(std::static_pointer_cast<Playlist>(playlist));
    outNodePlaylist = nodePlaylist->getV8Object();
  } else {
    NodePlaylistFolder* nodePlaylistFolder = new NodePlaylistFolder(std::static_pointer_cast<PlaylistFolder>(playlist));
    outNodePlaylist = nodePlaylistFolder->getV8Object();
  }

  return scope.Close(outNodePlaylist);
}

Handle<Value> NodePlaylistContainer::addPlaylist(const Arguments& args) {
  HandleScope scope;
  if(args.Length() < 1 || !args[0]->IsString()) {
    return scope.Close(V8_EXCEPTION("addPlaylist needs a string as its argument"));
  }
  NodePlaylistContainer* nodePlaylistContainer = node::ObjectWrap::Unwrap<NodePlaylistContainer>(args.This());
  String::Utf8Value playlistName(args[0]->ToString());
  try {
    nodePlaylistContainer->playlistContainer->addPlaylist(std::string(*playlistName));
  } catch(const PlaylistCreationException& e) {
    return scope.Close(V8_EXCEPTION("Playlist creation failed"));
  }
  return scope.Close(Undefined());
}

Handle<Value> NodePlaylistContainer::addFolder(const Arguments& args) {
  HandleScope scope;
  if(args.Length() < 2 || !args[0]->IsNumber() || !args[1]->IsString()) {
    return scope.Close(V8_EXCEPTION("addFolder needs a number and a string as arguments."));
  }
  NodePlaylistContainer* nodePlaylistContainer = node::ObjectWrap::Unwrap<NodePlaylistContainer>(args.This());
  int index = args[0]->ToNumber()->IntegerValue();
  String::Utf8Value folderName(args[1]->ToString());
  try {
    nodePlaylistContainer->playlistContainer->addFolder(index, std::string(*folderName));
  } catch(const PlaylistCreationException& e) {
    return scope.Close(V8_EXCEPTION("Folder creation failed"));
  }
  return scope.Close(Undefined());
}

Handle<Value> NodePlaylistContainer::deletePlaylist(const Arguments& args) {
  HandleScope scope;
  if(args.Length() < 1 || !args[0]->IsNumber()) {
    return scope.Close(V8_EXCEPTION("deletePlaylist needs an integer as its first argument."));
  }
  NodePlaylistContainer* nodePlaylistContainer = node::ObjectWrap::Unwrap<NodePlaylistContainer>(args.This());
  int position = args[0]->ToNumber()->IntegerValue();
  nodePlaylistContainer->playlistContainer->removePlaylist(position);
  return scope.Close(Undefined());
}

Handle<Value> NodePlaylistContainer::movePlaylist(const Arguments& args) {
  HandleScope scope;
  if(args.Length() < 2 || !args[0]->IsNumber() || !args[1]->IsNumber()) {
    return scope.Close(V8_EXCEPTION("Move playlist needs 2 numbers as its first arguments."));
  }
  int index = args[0]->ToNumber()->IntegerValue();
  int newPosition = args[1]->ToNumber()->IntegerValue();
  NodePlaylistContainer* nodePlaylistContainer = node::ObjectWrap::Unwrap<NodePlaylistContainer>(args.This());
  try {
    nodePlaylistContainer->playlistContainer->movePlaylist(index, newPosition);
  } catch(const PlaylistNotMoveableException& e) {
    return scope.Close(V8_EXCEPTION(e.message.c_str()));
  }
  return scope.Close(Undefined());
}

Handle<Value> NodePlaylistContainer::isLoaded(Local<String> property, const AccessorInfo& info) {
  NodePlaylistContainer* nodePlaylistContainer = node::ObjectWrap::Unwrap<NodePlaylistContainer>(info.Holder());
  return Boolean::New(nodePlaylistContainer->playlistContainer->isLoaded());
}

Handle<Value> NodePlaylistContainer::on(const Arguments& args) {
  HandleScope scope;
  if(args.Length() < 1 || !args[0]->IsObject()) {
    return scope.Close(V8_EXCEPTION("on needs an object as its first argument."));
  }
  NodePlaylistContainer* nodePlaylistContainer = node::ObjectWrap::Unwrap<NodePlaylistContainer>(args.This());
  Handle<Object> callbacks = args[0]->ToObject();
  Handle<String> playlistAddedKey = String::New("playlistAdded");
  Handle<String> playlistMovedKey = String::New("playlistMoved");
  Handle<String> playlistRemovedKey = String::New("playlistRemoved");
  nodePlaylistContainer->playlistContainerCallbacksHolder.playlistAddedCallback = V8Utils::getFunctionFromObject(callbacks, playlistAddedKey);
  nodePlaylistContainer->playlistContainerCallbacksHolder.playlistMovedCallback = V8Utils::getFunctionFromObject(callbacks, playlistMovedKey);
  nodePlaylistContainer->playlistContainerCallbacksHolder.playlistRemovedCallback = V8Utils::getFunctionFromObject(callbacks, playlistRemovedKey);
  nodePlaylistContainer->playlistContainerCallbacksHolder.setCallbacks();
  return scope.Close(Undefined());
}

Handle<Value> NodePlaylistContainer::off(const Arguments& args) {
  HandleScope scope;
  NodePlaylistContainer* nodePlaylistContainer = node::ObjectWrap::Unwrap<NodePlaylistContainer>(args.This());
  nodePlaylistContainer->playlistContainerCallbacksHolder.unsetCallbacks();
  return scope.Close(Undefined());
}

void NodePlaylistContainer::init() {
  HandleScope scope;
  Local<FunctionTemplate> constructorTemplate = FunctionTemplate::New();
  constructorTemplate->SetClassName(String::NewSymbol("PlaylistContainer"));
  constructorTemplate->InstanceTemplate()->SetInternalFieldCount(1);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "on", on);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "off", off);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("owner"), getOwner);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("numPlaylists"), getNumPlaylists);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("isLoaded"), isLoaded);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "getPlaylist", getPlaylist);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "addPlaylist", addPlaylist);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "addFolder", addFolder);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "deletePlaylist", deletePlaylist);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "movePlaylist", movePlaylist);

  constructor = Persistent<Function>::New(constructorTemplate->GetFunction());
  scope.Close(Undefined());
}
