#ifndef _COMMON_MACROS_H
#define _COMMON_MACROS_H

#define V8_EXCEPTION(message) v8::ThrowException(v8::Exception::Error(v8::String::New(message)))

#endif