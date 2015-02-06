#include "NodeTrackExtended.h"
#include "NodeUser.h"

//Since NodeWrapped uses a templating technique to assign the static constructor to each childclass we need to improvise here.
Persistent<Function> NodeTrackExtended::constructor;

NodeTrackExtended::NodeTrackExtended(std::shared_ptr<TrackExtended> _trackExtended) : NodeTrack(_trackExtended), trackExtended(_trackExtended) {
}

/**
  We need rewrite this method because we need to use our own constructor, not the one from NodeTrack.
**/
Handle<Object> NodeTrackExtended::getV8Object() {
  if(handle_.IsEmpty()) {
    Local<Object> o = Local<Object>::New(constructor->NewInstance());
    this->Wrap(o);
  }
  return handle_;
}

/**
  Same for this... we need to rewrite so NodeTrackExtended::constructor is used and not NodeTrack::constructor.
**/
Handle<Function> NodeTrackExtended::getConstructor() {
  return constructor;
}

Handle<Value> NodeTrackExtended::getCreator(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeTrackExtended* nodeTrackExtended = node::ObjectWrap::Unwrap<NodeTrackExtended>(info.Holder());
  Handle<Value> nodeCreator = Undefined();
  if(nodeTrackExtended->trackExtended->creator()) {
    NodeUser* nodeUser = new NodeUser(nodeTrackExtended->trackExtended->creator());
    nodeCreator = nodeUser->getV8Object();
  }
  return scope.Close(nodeCreator);
}

Handle<Value> NodeTrackExtended::getSeen(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeTrackExtended* nodeTrackExtended = node::ObjectWrap::Unwrap<NodeTrackExtended>(info.Holder());
  return scope.Close(Boolean::New(nodeTrackExtended->trackExtended->seen()));
}

void NodeTrackExtended::setSeen(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  HandleScope scope;
  NodeTrackExtended* nodeTrackExtended = node::ObjectWrap::Unwrap<NodeTrackExtended>(info.Holder());
  nodeTrackExtended->trackExtended->seen(value->ToBoolean()->Value());
  scope.Close(Undefined());
}

Handle<Value> NodeTrackExtended::getCreateTime(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeTrackExtended* nodeTrackExtended = node::ObjectWrap::Unwrap<NodeTrackExtended>(info.Holder());
  return scope.Close(Date::New(nodeTrackExtended->trackExtended->createTime() * 1000));
}

Handle<Value> NodeTrackExtended::getMessage(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeTrackExtended* nodeTrackExtended = node::ObjectWrap::Unwrap<NodeTrackExtended>(info.Holder());
  return scope.Close(String::New(nodeTrackExtended->trackExtended->message().c_str()));
}

void NodeTrackExtended::init() {
  HandleScope scope;
  Handle<FunctionTemplate> constructorTemplate = NodeWrapped::init("TrackExtended");
  Handle<FunctionTemplate> nodeTrackTemplate = NodeTrack::init();
  constructorTemplate->Inherit(nodeTrackTemplate);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("creator"), getCreator);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("seen"), getSeen, setSeen);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("createTime"), getCreateTime);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("message"), getMessage);
  constructor = Persistent<Function>::New(constructorTemplate->GetFunction());
  scope.Close(Undefined());
}
