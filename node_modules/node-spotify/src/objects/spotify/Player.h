#ifndef _PLAYER_H
#define _PLAYER_H

#include "Track.h"

#include <libspotify/api.h>
#include <memory>

class Player {
friend class NodePlayer;
friend class SessionCallbacks;
public:
  Player();
  void stop();
  void pause();
  void resume();
  void play(std::shared_ptr<Track> track);
  void seek(int second);
  void setCurrentSecond(int second);
private:
  int currentSecond;
  bool isPaused;
  bool isLoading;
  sp_track* loadingTrack;
  void retryPlay();
};

#endif
