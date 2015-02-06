#ifndef _NODE_SPOTIFY_H
#define _NODE_SPOTIFY_H

#include "NodeWrapped.h"
#include "../spotify/Spotify.h"

#include <v8.h>
#include <memory>

using namespace v8;

class NodeSpotify : public NodeWrapped<NodeSpotify> {
public:
  NodeSpotify(Handle<Object> option);
  ~NodeSpotify();
  static Handle<Value> login(const Arguments& args);
  static Handle<Value> logout(const Arguments& args);
  static Handle<Value> getPlaylistContainer(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getRememberedUser(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getSessionUser(Local<String> property, const AccessorInfo& info);
  static Handle<Value> createFromLink(const Arguments& args);
  static Handle<Value> getConstants(Local<String> property, const AccessorInfo& info);
#ifdef NODE_SPOTIFY_NATIVE_SOUND
  static Handle<Value> useNativeAudio(const Arguments& args);
#endif
  static Handle<Value> useNodejsAudio(const Arguments& args);
  static Handle<Value> on(const Arguments& other);
  static void init();
private:
  std::unique_ptr<Spotify> spotify;
};

#endif
