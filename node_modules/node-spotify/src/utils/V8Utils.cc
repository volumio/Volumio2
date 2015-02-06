#include "V8Utils.h"

/**
  Get a field from an object as a persistent function handle. Empty handle if the key does not exist.
**/
Handle<Function> V8Utils::getFunctionFromObject(Handle<Object> callbacks, Handle<String> key) {
  Handle<Function> callback;
  if(callbacks->Has(key)) {
    callback = Persistent<Function>::New(Handle<Function>::Cast(callbacks->Get(key)));
  }
  return callback;
}

void V8Utils::callV8FunctionWithNoArgumentsIfHandleNotEmpty(v8::Handle<v8::Function> function) {
  if(!function.IsEmpty()) {
    unsigned int argc = 0;
    v8::Handle<v8::Value> argv[0];
    function->Call(v8::Context::GetCurrent()->Global(), argc, argv);
  }
}