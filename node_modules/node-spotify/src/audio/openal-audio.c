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
 * OpenAL audio output driver.
 *
 * This file is part of the libspotify examples suite.
 */

#include <OpenAL/al.h>
#include <OpenAL/alc.h>
#include <errno.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/time.h>

#include "audio.h"

#define NUM_BUFFERS 3

extern int audio_stopThread;

static void error_exit(const char *msg) {
  puts(msg);
  exit(1);
}

static int queue_buffer(ALuint source, audio_fifo_t *audioFifo, ALuint buffer) {
  audio_fifo_data_t *audioData = audio_get_native(audioFifo);
  if(audioData == NULL) {
    return 0;
  }
  alBufferData(buffer,
    audioData->channels == 1 ? AL_FORMAT_MONO16 : AL_FORMAT_STEREO16,
    audioData->samples,
    audioData->numberOfSamples * audioData->channels * sizeof(short),
    audioData->sampleRate);
  alSourceQueueBuffers(source, 1, &buffer);
  free(audioData);
  return 1;
}

void audio_start(void *aux) {
  audio_fifo_t *audioFifo = aux;
  audio_fifo_data_t *audioData;
  unsigned int frame = 0;
  ALCdevice *device = NULL;
  ALCcontext *context = NULL;
  ALuint buffers[NUM_BUFFERS];
  ALuint source;
  ALint processed, status;
  ALenum error;
  ALint rate;
  ALint channels;
  device = alcOpenDevice(NULL); /* Use the default device */
  if (!device) {
    error_exit("failed to open device");
  }
  context = alcCreateContext(device, NULL);
  alcMakeContextCurrent(context);
  alListenerf(AL_GAIN, 1.0f);
  alDistanceModel(AL_NONE);
  alGenBuffers((ALsizei)NUM_BUFFERS, buffers);
  alGenSources(1, &source);

  /* First prebuffer some audio */
  int prebuffer = 1;
  prebuffer = queue_buffer(source, audioFifo, buffers[0]);
  if(prebuffer == 1) {
    prebuffer = queue_buffer(source, audioFifo, buffers[1]);
  }
  if(prebuffer == 1) {
    prebuffer = queue_buffer(source, audioFifo, buffers[2]);
  }
  for (;!audio_stopThread;) {
    alSourcePlay(source);
    for (;!audio_stopThread;) {
      /* Wait for some audio to play */
      do {
        alGetSourcei(source, AL_BUFFERS_PROCESSED, &processed);
        usleep(100);
      } while (!processed);

      /* Remove old audio from the queue.. */
      alSourceUnqueueBuffers(source, 1, &buffers[frame % NUM_BUFFERS]);

      /* and queue some more audio */
      audioData = audio_get_native(audioFifo);

      /* audio_get_native will return NULL when the thread should be stopped */
      if(audioData == NULL) {
        break;
      }

      alGetSourcei(source, AL_SOURCE_STATE, &status);
      if(status != AL_PLAYING) {
        /* player has been paused, restart */
        break;
      }

      alGetBufferi(buffers[frame % NUM_BUFFERS], AL_FREQUENCY, &rate);
      alGetBufferi(buffers[frame % NUM_BUFFERS], AL_CHANNELS, &channels);
      if (audioData->sampleRate != rate || audioData->channels != channels) {
        printf("rate or channel count changed, resetting\n");
        free(audioData);
        break;
      }
      alBufferData(buffers[frame % NUM_BUFFERS],
             audioData->channels == 1 ? AL_FORMAT_MONO16 : AL_FORMAT_STEREO16,
             audioData->samples,
             audioData->numberOfSamples * audioData->channels * sizeof(short),
             audioData->sampleRate);
      free(audioData);
      alSourceQueueBuffers(source, 1, &buffers[frame % NUM_BUFFERS]);

      if ((error = alcGetError(device)) != AL_NO_ERROR) {
        printf("openal al error: %d\n", error);
        exit(1);
      }
      frame++;
    }
    if(!audio_stopThread) {
      /* Format or rate changed, so we need to reset all buffers */
      alSourcei(source, AL_BUFFER, 0);
      alSourceStop(source);

      /* Make sure we don't lose the audio packet that caused the change */
      alBufferData(buffers[0],
             audioData->channels == 1 ? AL_FORMAT_MONO16 : AL_FORMAT_STEREO16,
             audioData->samples,
             audioData->numberOfSamples * audioData->channels * sizeof(short),
             audioData->sampleRate);

      alSourceQueueBuffers(source, 1, &buffers[0]);
      queue_buffer(source, audioFifo, buffers[1]);
      queue_buffer(source, audioFifo, buffers[2]);
      frame = 0;
    }
  }

  alSourceUnqueueBuffers(source, NUM_BUFFERS, buffers);
  alDeleteSources(1, &source);
  alDeleteBuffers(NUM_BUFFERS, buffers);
  alcDestroyContext(context);
  alcCloseDevice(device);
  //TODO: find out what of this is necessary.
}
