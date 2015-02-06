#ifndef _STARRED_PLAYLIST_H
#define _STARRED_PLAYLIST_H

#include "Playlist.h"

class StarredPlaylist : public Playlist {
public:
  StarredPlaylist(sp_playlist* _playlist) : Playlist(_playlist) {};
  std::string name() { return "Starred"; }
};

#endif