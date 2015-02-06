#ifndef _NODE_WRAPPED_H
#define _NODE_WRAPPED_H

#include <string>
#include <map>

#include <uv.h>
#include <node.h>

#include "V8Wrapped.h"

/**
 * A class used as a base class for wrapping objects to node objects.
 **/
template <class T>
class NodeWrapped : public node::ObjectWrap, public virtual V8Wrapped {
public:
  ~NodeWrapped() {}
  /**
   * Get a V8 handle with the Javascript object inside.
   **/
  virtual v8::Handle<v8::Object> getV8Object() {
    //check if the handle from ObjectWrap has been initialized and if not wrap the object in a new JS instance
    if(handle_.IsEmpty()) {
      v8::Local<v8::Object> o = v8::Local<v8::Object>::New(constructor->NewInstance());
      this->Wrap(o);
    }
    return handle_;
  }

  static v8::Handle<v8::Function> getConstructor() {
    return constructor;
  }
protected:
  static v8::Persistent<v8::Function> constructor;

  /**
   * Basic init method for a wrapped node object.
   */
  static v8::Handle<v8::FunctionTemplate> init(const char* className) {
    v8::Local<v8::FunctionTemplate> constructorTemplate = v8::FunctionTemplate::New();
    constructorTemplate->SetClassName(v8::String::NewSymbol(className));
    constructorTemplate->InstanceTemplate()->SetInternalFieldCount(1);
    return constructorTemplate;
  }
};

//The constructor must be static per template instance not fro all NodeWrapped subclasses.
template <class T> v8::Persistent<v8::Function> NodeWrapped<T>::constructor;
#endif
