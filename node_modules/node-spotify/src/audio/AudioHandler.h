#ifndef AUDIOHANDLER_H
#define AUDIOHANDLER_H

extern "C" {
  #include "audio.h"
}

#include <libspotify/api.h>

/**
 * @brief The AudioHandler class
 * Abstract base class for handling audio in node-spotify. Provides the basic music delivery callback
 * that pushes music data into a queue and a audio buffer stats callback.
 */
class AudioHandler {
friend class Player; // to set current second and frames received on stop
friend class Spotify; // access the callback methods
public:
  AudioHandler();
  virtual ~AudioHandler();
  virtual void setStopped(bool stopped);
protected:
  audio_fifo_t audioFifo;
  int framesReceived;
  int currentSecond;
  /**
   * @brief afterMusicDelivery Method that will be called after audio data has been written into the queue.
   * @param format audio format delivered together with the raw music data by libspotify.
   */
  virtual void afterMusicDelivery(const sp_audioformat* format) = 0;
  /**
   * @brief dataNeeded Method that will be called before anything happens to the audio data. If it returns false,
   * afterMusicDelivery will return 0 and thus notify libspotify it hasn't consumed any frames.
   * @return
   */
  virtual bool dataNeeded() = 0;
private:
  /**
   * @brief AudioHandler::musicDelivery Callack for libspotify. Write the music data into the queue and call the abstract afterMusic
   * delivery method.
   * @param session libspotify session
   * @param format audio format
   * @param frames raw pcm data
   * @param num_frames number of frames in the pcm data
   * @return The number of frames consumed.
   */
  static int musicDelivery(sp_session* session, const sp_audioformat* format, const void* frames, int num_frames);
  static void getAudioBufferStats(sp_session* session, sp_audio_buffer_stats* stats);
};

#endif // AUDIOHANDLER_H
