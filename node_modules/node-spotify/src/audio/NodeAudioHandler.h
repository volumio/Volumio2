#ifndef NODEAUDIOHANDLER_H
#define NODEAUDIOHANDLER_H

#include "AudioHandler.h"

#include <v8.h>
#include <uv.h>

/**
 * @brief The NodeAudioHandler class
 * Handles audio data by calling a user provided Javascript callback with it.
 */
class NodeAudioHandler : public AudioHandler {
public:
  NodeAudioHandler(v8::Handle<v8::Function> musicDeliveryCallback);
  ~NodeAudioHandler();
  void setStopped(bool stopped);
  static v8::Handle<v8::Value> setNeedMoreData(const v8::Arguments& args);
protected:
  void afterMusicDelivery(const sp_audioformat* format);
  bool dataNeeded();
private:
  v8::Handle<v8::Function> musicDeliveryCallback;
  uv_timer_t musicTimer;
  bool needMoreData;
  bool stopped;
  int musicTimerRepeat;
  static void musicTimeout(uv_timer_t* timer, int status);
  bool callMusicDeliveryCallback(audio_fifo_data_t* audioData);
};

#endif // NODEAUDIOHANDLER_H
