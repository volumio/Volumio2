#include "NodePlayer.h"
#include "NodeTrack.h"
#include "../../callbacks/SessionCallbacks.h"
#include "../../exceptions.h"
#include "../../common_macros.h"
#include "../../utils/V8Utils.h"

NodePlayer::NodePlayer(std::shared_ptr<Player> _player) : player(_player) {}

NodePlayer::~NodePlayer() {

}

NodePlayer::NodePlayer(const NodePlayer& other) {

}

Handle<Value> NodePlayer::pause(const Arguments& args) {
  HandleScope scope;
  NodePlayer* nodePlayer = node::ObjectWrap::Unwrap<NodePlayer>(args.This());
  nodePlayer->player->pause();
  return scope.Close(Undefined());
}

Handle<Value> NodePlayer::stop(const Arguments& args) {
  HandleScope scope;
  NodePlayer* nodePlayer = node::ObjectWrap::Unwrap<NodePlayer>(args.This());
  nodePlayer->player->stop();
  return scope.Close(Undefined());
}

Handle<Value> NodePlayer::resume(const Arguments& args) {
  HandleScope scope;
  NodePlayer* nodePlayer = node::ObjectWrap::Unwrap<NodePlayer>(args.This());
  nodePlayer->player->resume();
  return scope.Close(Undefined());
}

Handle<Value> NodePlayer::play(const Arguments& args) {
  HandleScope scope;
  if(args.Length() < 1) {
    return scope.Close(V8_EXCEPTION("play needs a track as its first argument."));
  }
  NodePlayer* nodePlayer = node::ObjectWrap::Unwrap<NodePlayer>(args.This());
  NodeTrack* nodeTrack = node::ObjectWrap::Unwrap<NodeTrack>(args[0]->ToObject());
  try {
    nodePlayer->player->play(nodeTrack->track);
  } catch (const TrackNotPlayableException& e) {
    return scope.Close(V8_EXCEPTION("Track not playable"));
  }
#ifndef NODE_SPOTIFY_NATIVE_SOUND
  catch (const NoAudioHandlerException& e) {
    return scope.Close(V8_EXCEPTION("No audio handler registered. Use spotify.useNodejsAudio()."));
  }
#endif

  return scope.Close(Undefined());
}

Handle<Value> NodePlayer::seek(const Arguments& args) {
  HandleScope scope;
  if(args.Length() < 1 || !args[0]->IsNumber()) {
    return scope.Close(V8_EXCEPTION("seek needs an integer as its first argument."));
  }
  NodePlayer* nodePlayer = node::ObjectWrap::Unwrap<NodePlayer>(args.This());
  int second = args[0]->ToInteger()->Value();
  nodePlayer->player->seek(second);
  return scope.Close(Undefined());
}

Handle<Value> NodePlayer::getCurrentSecond(Local<String> property, const AccessorInfo& info) {
  NodePlayer* nodePlayer = node::ObjectWrap::Unwrap<NodePlayer>(info.Holder());
  return Integer::New(nodePlayer->player->currentSecond);
}

Handle<Value> NodePlayer::on(const Arguments& args) {
  HandleScope scope;
  if(args.Length() < 1 || !args[0]->IsObject()) {
    return scope.Close(V8_EXCEPTION("on needs an object as its first argument."));
  }
  Handle<Object> callbacks = args[0]->ToObject();
  Handle<String> endOfTrackKey = String::New("endOfTrack");
  SessionCallbacks::endOfTrackCallback = V8Utils::getFunctionFromObject(callbacks, endOfTrackKey);
  return scope.Close(Undefined());
}

Handle<Value> NodePlayer::off(const Arguments& args) {
  HandleScope scope;
  SessionCallbacks::endOfTrackCallback = Handle<Function>();
  return scope.Close(Undefined());
}

void NodePlayer::init() {
  HandleScope scope;
  Local<FunctionTemplate> constructorTemplate = FunctionTemplate::New();
  constructorTemplate->SetClassName(String::NewSymbol("Player"));
  constructorTemplate->InstanceTemplate()->SetInternalFieldCount(1);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "on", on);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "off", off);

  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "play", play);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "pause", pause);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "resume", resume);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "stop", stop);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "seek", seek);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("currentSecond"), &getCurrentSecond);
  constructor = Persistent<Function>::New(constructorTemplate->GetFunction());
  scope.Close(Undefined());
}
