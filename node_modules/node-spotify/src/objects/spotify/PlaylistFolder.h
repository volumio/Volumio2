#ifndef _PLAYLIST_FOLDER_H
#define _PLAYLIST_FOLDER_H

#include "PlaylistBase.h"

class PlaylistFolder : public PlaylistBase {
friend class NodePlaylistFolder;
private:
  std::string folderName;
  int folderType;
public:
  PlaylistFolder(int type);
  PlaylistFolder(std::string name, int type);
  virtual std::string name();
  int type();
  bool isStart;
};

#endif