#include "NodePlaylistFolder.h"

NodePlaylistFolder::NodePlaylistFolder(std::shared_ptr<PlaylistFolder> _playlistFolder) : playlistFolder(_playlistFolder) {

};

NodePlaylistFolder::~NodePlaylistFolder() {

}

Handle<Value> NodePlaylistFolder::getName(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodePlaylistFolder* nodePlaylistFolder = node::ObjectWrap::Unwrap<NodePlaylistFolder>(info.Holder());
  return scope.Close(String::New(nodePlaylistFolder->playlistFolder->name().c_str()));
}

Handle<Value> NodePlaylistFolder::getType(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodePlaylistFolder* nodePlaylistFolder = node::ObjectWrap::Unwrap<NodePlaylistFolder>(info.Holder());
  return scope.Close(Number::New(nodePlaylistFolder->playlistFolder->type()));
}

void NodePlaylistFolder::init() {
  HandleScope scope;
  Handle<FunctionTemplate> constructorTemplate = NodeWrapped::init("PlaylistFolder");
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("name"), getName);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("type"), getType);
  constructor = Persistent<Function>::New(constructorTemplate->GetFunction());
}