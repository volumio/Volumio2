#ifndef _NODE_TRACK_EXTENDED_H
#define _NODE_TRACK_EXTENDED_H

#include "NodeTrack.h"
#include "../spotify/TrackExtended.h"

#include <v8.h>
#include <memory>

using namespace v8;

class NodeTrackExtended : public NodeTrack {
private:
  std::shared_ptr<TrackExtended> trackExtended;
public:
  NodeTrackExtended(std::shared_ptr<TrackExtended> trackExtended);
  static Handle<Value> getCreator(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getSeen(Local<String> property, const AccessorInfo& info);
  static void setSeen(Local<String> property, Local<Value> value, const AccessorInfo& info);
  static Handle<Value> getCreateTime(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getMessage(Local<String> property, const AccessorInfo& info);
  static void init();
  static Handle<Function> getConstructor();
  Handle<Object> getV8Object();
protected:
  static Persistent<Function> constructor;
};

#endif