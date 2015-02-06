#ifndef _TRACK_EXTENDED_H
#define _TRACK_EXTENDED_H

#include "Track.h"
#include "User.h"

#include <libspotify/api.h>
#include <memory>
#include <string>

class TrackExtended : public Track {
private:
  sp_playlist* playlist;
  int position;
public:
  TrackExtended(sp_track* track, sp_playlist* playlist, int position);
  virtual ~TrackExtended();
  std::unique_ptr<User> creator();
  bool seen();
  void seen(bool seen);
  std::string message();
  double createTime();
};

#endif
