#include "../Application.h"
#include "AudioHandler.h"
#include "../objects/spotify/Spotify.h"

#include <stdlib.h>

#ifdef OS_LINUX //For memcpy
#include <string.h>
#endif

extern Application* application;

AudioHandler::AudioHandler() {
  audio_init(&audioFifo);
}

AudioHandler::~AudioHandler() {
  audio_stop(&audioFifo);
}

int AudioHandler::musicDelivery(sp_session *session, const sp_audioformat *format, const void *frames, int num_frames) {
  if(num_frames == 0 || !application->audioHandler->dataNeeded()) {
    return 0;
  }

  audio_fifo_t* audioFifo = &application->audioHandler->audioFifo;
  uv_mutex_lock(&audioFifo->audioQueueMutex);

  //If there is more than one second worth of samples in the queue don't buffer more
  if(audioFifo->samplesInQueue > format->sample_rate) {
    uv_mutex_unlock(&audioFifo->audioQueueMutex);
    return 0;
  }

  size_t size = num_frames * sizeof(int16_t) * format->channels;
  audio_fifo_data_t* audioData = (audio_fifo_data_t*)malloc(sizeof(*audioData) + size);
  memcpy(audioData->samples, frames, size);

  audioData->numberOfSamples = num_frames;
  audioData->sampleRate = format->sample_rate;
  audioData->channels = format->channels;

  TAILQ_INSERT_TAIL(&audioFifo->queue, audioData, link);
  audioFifo->samplesInQueue += num_frames;

  application->audioHandler->framesReceived += num_frames;
  if( application->audioHandler->framesReceived / audioData->sampleRate > 0) {
    application->audioHandler->currentSecond++;
    application->audioHandler->framesReceived = application->audioHandler->framesReceived - audioData->sampleRate;
    application->player->setCurrentSecond(application->audioHandler->currentSecond);
  }

  application->audioHandler->afterMusicDelivery(format);

  uv_mutex_unlock(&audioFifo->audioQueueMutex);

  return num_frames;
}

void AudioHandler::getAudioBufferStats(sp_session* session, sp_audio_buffer_stats* stats) {
  //TODO:this crashes when switching the audio handler in between playback because the mutex gets destroyed.
  audio_fifo_t *audioFifo = &application->audioHandler->audioFifo;
  uv_mutex_lock(&audioFifo->audioQueueMutex);
  stats->samples = audioFifo->samplesInQueue;
  stats->stutter = 0;
  uv_mutex_unlock(&audioFifo->audioQueueMutex);
}

void AudioHandler::setStopped(bool stopped) {
  if(stopped == false) {
    audio_fifo_flush(&audioFifo);
  }
}
