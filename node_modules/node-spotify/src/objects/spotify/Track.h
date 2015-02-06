#ifndef _TRACK_H
#define _TRACK_H

#include "Artist.h"
#include "Album.h"

#include <libspotify/api.h>
#include <string>
#include <vector>
#include <memory>

class Album;
class Artist;

class Track {
friend class Player;
friend class Playlist;
friend class NodeTrack;
public:
  Track(sp_track* _track);
  Track(const Track& other) : track(other.track) {
      sp_track_add_ref(track);
    };
  virtual ~Track() {
    sp_track_release(track);
  };

  std::string name();
  std::string link();
  std::vector<std::unique_ptr<Artist>> artists();
  std::unique_ptr<Album> album();
  int duration();
  bool starred();
  void setStarred(bool starred);
  int popularity();
  bool isLoaded();
private:
  sp_track* track;
};

#endif
