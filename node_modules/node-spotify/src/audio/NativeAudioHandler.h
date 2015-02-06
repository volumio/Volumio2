#ifndef NATIVEAUDIOHANDLER_H
#define NATIVEAUDIOHANDLER_H

#include "AudioHandler.h"

/**
 * @brief The NativeAudioHandler class
 * Handles audio in a native audio system like ALSA or OpenAL.
 */
class NativeAudioHandler : public AudioHandler {
public:
  NativeAudioHandler();
  ~NativeAudioHandler();
protected:
  void afterMusicDelivery(const sp_audioformat* format);
  bool dataNeeded();
};

#endif // NATIVEAUDIOHANDLER_H
