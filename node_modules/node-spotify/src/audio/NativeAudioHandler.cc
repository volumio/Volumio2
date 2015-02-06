#include "NativeAudioHandler.h"

NativeAudioHandler::NativeAudioHandler() {
  audio_init_native(&audioFifo);
}

NativeAudioHandler::~NativeAudioHandler() {
  audio_stop_native(&audioFifo);
}

void NativeAudioHandler::afterMusicDelivery(const sp_audioformat *format) {
  uv_cond_signal(&audioFifo.audioCondition);
}

bool NativeAudioHandler::dataNeeded() {
  return true;
}
