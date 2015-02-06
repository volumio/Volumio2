/*
 * Copyright (c) 2006-2009 Spotify Ltd
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
 * Audio output driver.
 *
 * This file is part of the libspotify examples suite.
 */
#ifndef _JUKEBOX_AUDIO_H_
#define _JUKEBOX_AUDIO_H_

#include <uv.h>
#include <stdint.h>
#include "queue.h"

typedef struct audio_fifo_data {
  TAILQ_ENTRY(audio_fifo_data) link;
  int channels;
  int sampleRate;
  int numberOfSamples;
  int16_t samples[0];
} audio_fifo_data_t;

typedef struct audio_fifo {
  TAILQ_HEAD(, audio_fifo_data) queue;
  int samplesInQueue;
  uv_mutex_t audioQueueMutex;
#ifdef NODE_SPOTIFY_NATIVE_SOUND
  uv_cond_t audioCondition;
#endif
} audio_fifo_t;

extern void audio_fifo_flush(audio_fifo_t *audioFifo);
#ifdef NODE_SPOTIFY_NATIVE_SOUND
/**
Initializes the native audio system and the condition variable.
**/
void audio_init_native(audio_fifo_t *audioFifo);
void audio_stop_native(audio_fifo_t* audioFifo);
audio_fifo_data_t* audio_get_native(audio_fifo_t* audioFifo);
void audio_start(void* aux);
#endif

/**
Gets audio data from the queue
**/
audio_fifo_data_t* audio_get(audio_fifo_t* audioFifo);
void audio_init(audio_fifo_t* audioFifo);
void audio_stop(audio_fifo_t* audioFifo);

#endif
