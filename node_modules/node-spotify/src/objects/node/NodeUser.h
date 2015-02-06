#ifndef _NODE_USER_H
#define _NODE_USER_H

#include "NodeWrapped.h"
#include "../spotify/User.h"

#include <v8.h>
#include <memory>

using namespace v8;

class NodeUser : public NodeWrapped<NodeUser> {
private:
  std::unique_ptr<User> user;
public:
  NodeUser(std::unique_ptr<User> user);
  ~NodeUser();
  static Handle<Value> getCanonicalName(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getDisplayName(Local<String> property, const AccessorInfo& info);
  static Handle<Value> isLoaded(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getLink(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getPublishedPlaylistsContainer(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getStarredPlaylist(Local<String> property, const AccessorInfo& info);
  static void init();
};

#endif
