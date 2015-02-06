#ifndef _PLAYLIST_BASE_H
#define _PLAYLIST_BASE_H

#include <string>

class PlaylistBase {
public:
  PlaylistBase(bool _isFolder) : isFolder(_isFolder) {};
  virtual std::string name() = 0;
  virtual ~PlaylistBase() {};
  bool isFolder;
};
#endif