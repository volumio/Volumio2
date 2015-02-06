/*
 * Copyright (c) 2010 Spotify Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 *
 * Audio helper functions.
 *
 * This file is part of the libspotify examples suite.
 */

#include "audio.h"
#include <stdlib.h>

int audio_stopThread;

#ifdef NODE_SPOTIFY_NATIVE_SOUND
static uv_thread_t audioThread;
#endif

audio_fifo_data_t* audio_get(audio_fifo_t* audioFifo) {
  uv_mutex_lock(&audioFifo->audioQueueMutex);

  audio_fifo_data_t* audioData = TAILQ_FIRST(&audioFifo->queue);
  if(audioData) {
    TAILQ_REMOVE(&audioFifo->queue, audioData, link);
    audioFifo->samplesInQueue -= audioData->numberOfSamples;
  }

  uv_mutex_unlock(&audioFifo->audioQueueMutex);
  return audioData;
}

void audio_fifo_flush(audio_fifo_t* audioFifo) {
  audio_fifo_data_t *audioData;
  uv_mutex_lock(&audioFifo->audioQueueMutex);

  while((audioData = TAILQ_FIRST(&audioFifo->queue))) {
	  TAILQ_REMOVE(&audioFifo->queue, audioData, link);
	  free(audioData);
  }

  audioFifo->samplesInQueue = 0;
  uv_mutex_unlock(&audioFifo->audioQueueMutex);
}

/**
Initialize the audio queue and the locking mutex
**/
void audio_init(audio_fifo_t* audioFifo) {
  TAILQ_INIT(&audioFifo->queue);
  audioFifo->samplesInQueue = 0;
  uv_mutex_init(&audioFifo->audioQueueMutex);
}

void audio_stop(audio_fifo_t *audioFifo) {
  audio_fifo_flush(audioFifo);
  uv_mutex_destroy(&audioFifo->audioQueueMutex);
}

#ifdef NODE_SPOTIFY_NATIVE_SOUND
/**
Gets the audio data from the queue. If there is none, waits for the condition variable to trigger.
**/
audio_fifo_data_t* audio_get_native(audio_fifo_t* audioFifo) {
  audio_fifo_data_t* audioData;
  uv_mutex_lock(&audioFifo->audioQueueMutex);

  while( !audio_stopThread && !(audioData = TAILQ_FIRST(&audioFifo->queue)) ) {
    uv_cond_wait(&audioFifo->audioCondition, &audioFifo->audioQueueMutex);
  }

  if(audio_stopThread) {
    uv_mutex_unlock(&audioFifo->audioQueueMutex);
    return NULL;
  }

  TAILQ_REMOVE(&audioFifo->queue, audioData, link);
  audioFifo->samplesInQueue -= audioData->numberOfSamples;

  uv_mutex_unlock(&audioFifo->audioQueueMutex);
  return audioData;
}

void audio_init_native(audio_fifo_t* audioFifo) {
  audio_stopThread = 0;
  uv_cond_init(&audioFifo->audioCondition);
  uv_thread_create(&audioThread, audio_start, audioFifo);
}

void audio_stop_native(audio_fifo_t* audioFifo) {
  audio_stopThread  = 1;
  //Notify audio_get_native to return in case it is waiting for data
  uv_mutex_lock(&audioFifo->audioQueueMutex);
  uv_cond_signal(&audioFifo->audioCondition);
  uv_mutex_unlock(&audioFifo->audioQueueMutex);
  audio_fifo_flush(audioFifo);
  uv_thread_join(&audioThread);
  uv_cond_destroy(&audioFifo->audioCondition);
}
#endif
