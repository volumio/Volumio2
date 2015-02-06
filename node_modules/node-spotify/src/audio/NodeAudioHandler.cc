#include "NodeAudioHandler.h"
#include "../objects/spotify/Spotify.h"
#include "../Application.h"
#include "../common_macros.h"

#include <node_buffer.h>

using namespace v8;

extern Application* application;

NodeAudioHandler::NodeAudioHandler(Handle<Function> _musicDeliveryCallback) :
  AudioHandler(), musicDeliveryCallback(_musicDeliveryCallback), needMoreData(true), stopped(false), musicTimerRepeat(20) {
  uv_timer_init(uv_default_loop(), &musicTimer);
  musicTimer.data = this;
  uv_timer_start(&musicTimer, &musicTimeout, 0, musicTimerRepeat);
}

NodeAudioHandler::~NodeAudioHandler() {
  uv_timer_stop(&musicTimer);
}

void NodeAudioHandler::musicTimeout(uv_timer_t* timer, int status) {
  NodeAudioHandler* audioHandler = static_cast<NodeAudioHandler*>(timer->data);
  audio_fifo_t *audioFifo = &audioHandler->audioFifo;
  audio_fifo_data_t* audioData;

  if( !audioHandler->stopped && audioHandler->needMoreData && (audioData = audio_get(audioFifo)) ) {
    // The audio data will be freed in a callback that is set up in this method.
    audioHandler->needMoreData = audioHandler->callMusicDeliveryCallback(audioData);
  }
}

/**
 * @brief free_data Free the audio data after buffer initialization.
 */
static void free_data(char* data, void* hint) {
  audio_fifo_data_t* audioData = static_cast<audio_fifo_data_t*>(hint);
  assert((char*)audioData->samples == data);
  free(audioData);
}

/**
 * @brief NodeAudioHandler::callMusicDeliveryCallback
 * Call the user provided JavaScript callback with the audio data.
 * @param audioData
 * @return true if the callback needs more data.
 */
bool NodeAudioHandler::callMusicDeliveryCallback(audio_fifo_data_t* audioData) {
  static Local<String> numberOfSamplesKey = String::NewSymbol("numberOfSamples");
  static Local<String> sampleRateKey = String::NewSymbol("sampleRate");
  static Local<String> channelsKey = String::NewSymbol("channels");

  size_t size = audioData->numberOfSamples * sizeof(int16_t) * audioData->channels;
  node::Buffer *slowBuffer = node::Buffer::New((char*)audioData->samples, size, free_data, audioData);

  Local<Object> globalObj = Context::GetCurrent()->Global();
  Local<Function> ctor = Local<Function>::Cast(globalObj->Get(String::New("Buffer")));
  Handle<Value> constructorArgs[3] = { slowBuffer->handle_, Integer::New(size), Integer::New(0)};
  Handle<Object> actualBuffer = ctor->NewInstance(3, constructorArgs);

  actualBuffer->Set(numberOfSamplesKey, Integer::New(audioData->numberOfSamples));
  actualBuffer->Set(sampleRateKey, Integer::New(audioData->sampleRate));
  actualBuffer->Set(channelsKey, Integer::New(audioData->channels));

  int argc = 2;
  Handle<Value> argv[] = { Undefined(), actualBuffer };
  Handle<Value> bufferFilled = musicDeliveryCallback->Call(globalObj, argc, argv);
  return bufferFilled->ToBoolean()->BooleanValue();
}

void NodeAudioHandler::afterMusicDelivery(const sp_audioformat *format) { }

bool NodeAudioHandler::dataNeeded() {
  return needMoreData;
}

void NodeAudioHandler::setStopped(bool _stopped) {
  stopped = _stopped;
  AudioHandler::setStopped(_stopped);
}

Handle<Value> NodeAudioHandler::setNeedMoreData(const Arguments &args) {
  HandleScope scope;
  if(args.Length() < 1 || !args[0]->IsBoolean()) {
    return scope.Close(V8_EXCEPTION("setNeedMoreData needs a boolean as its first argument."));
  }
  NodeAudioHandler* audioHandler = static_cast<NodeAudioHandler*>(application->audioHandler.get());
  bool needMoreData = args[0]->ToBoolean()->BooleanValue();
  audioHandler->needMoreData = needMoreData;
  return scope.Close(Undefined());
}
