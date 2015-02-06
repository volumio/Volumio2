#ifndef _NODE_PLAYER_H
#define _NODE_PLAYER_H

#include "NodeWrapped.h"
#include "../spotify/Player.h"

#include <v8.h>
#include <memory>

using namespace v8;

class NodePlayer : public NodeWrapped<NodePlayer> {
private:
  std::shared_ptr<Player> player;
  NodePlayer(const NodePlayer& other);
public:
  NodePlayer(std::shared_ptr<Player> player);
  ~NodePlayer();
  static Handle<Value> stop(const Arguments& args);
  static Handle<Value> pause(const Arguments& args);
  static Handle<Value> resume(const Arguments& args);
  static Handle<Value> play(const Arguments& args);
  static Handle<Value> getCurrentSecond(Local<String> property, const AccessorInfo& info);
  static Handle<Value> seek(const Arguments& args);
  static Handle<Value> on(const Arguments& args);
  static Handle<Value> off(const Arguments& args);
  static void init();
};

#endif
