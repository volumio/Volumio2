#include "NodeUser.h"
#include "NodePlaylistContainer.h"
#include "NodePlaylist.h"

NodeUser::NodeUser(std::unique_ptr<User> _user) : user(std::move(_user)) {}

NodeUser::~NodeUser() {}

Handle<Value> NodeUser::getLink(Local<String> property, const AccessorInfo& info) {
  NodeUser* nodeUser = node::ObjectWrap::Unwrap<NodeUser>(info.Holder());
  return String::New(nodeUser->user->link().c_str());
}

Handle<Value> NodeUser::getCanonicalName(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeUser* nodeUser = node::ObjectWrap::Unwrap<NodeUser>(info.Holder());
  return scope.Close(String::New(nodeUser->user->canonicalName().c_str()));
}

Handle<Value> NodeUser::getDisplayName(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeUser* nodeUser = node::ObjectWrap::Unwrap<NodeUser>(info.Holder());
  return scope.Close(String::New(nodeUser->user->displayName().c_str()));
}

Handle<Value> NodeUser::isLoaded(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeUser* nodeUser = node::ObjectWrap::Unwrap<NodeUser>(info.Holder());
  return scope.Close(Boolean::New(nodeUser->user->isLoaded()));
}

Handle<Value> NodeUser::getPublishedPlaylistsContainer(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeUser* nodeUser = node::ObjectWrap::Unwrap<NodeUser>(info.Holder());
  auto playlistContainer = nodeUser->user->publishedPlaylists();
  NodePlaylistContainer* nodePlaylistContainer = new NodePlaylistContainer(playlistContainer);
  return scope.Close(nodePlaylistContainer->getV8Object());
}

Handle<Value> NodeUser::getStarredPlaylist(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeUser* nodeUser = node::ObjectWrap::Unwrap<NodeUser>(info.Holder());
  auto playlist = nodeUser->user->starredPlaylist();
  NodePlaylist* nodePlaylist = new NodePlaylist(playlist);
  return scope.Close(nodePlaylist->getV8Object()); 
}

void NodeUser::init() {
  HandleScope scope;
  Handle<FunctionTemplate> constructorTemplate = NodeWrapped::init("User");
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("canonicalName"), getCanonicalName);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("link"), getLink);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("displayName"), getDisplayName);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("isLoaded"), isLoaded);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("playlistContainer"), getPublishedPlaylistsContainer);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("starredPlaylist"), getStarredPlaylist);
  constructor = Persistent<Function>::New(constructorTemplate->GetFunction());
  scope.Close(Undefined());
}
