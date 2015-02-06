#ifndef PLAYLIST_CONTAINER_H
#define PLAYLIST_CONTAINER_H

#include "Playlist.h"
#include "PlaylistBase.h"
#include "User.h"

#include <libspotify/api.h>
#include <memory>
#include <string>

class User;

class PlaylistContainer {
friend class NodePlaylistContainer;
public:
  PlaylistContainer(sp_playlistcontainer* _playlistContainer) : playlistContainer(_playlistContainer) {}
  std::shared_ptr<PlaylistBase> getPlaylist(int index);
  int numPlaylists();
  void addPlaylist(std::string name);
  void addFolder(int index, std::string name);
  void removePlaylist(int index);
  void movePlaylist(int index, int newPosition);
  std::unique_ptr<User> owner();
  bool isLoaded();
private:
  sp_playlistcontainer* playlistContainer;
};

#endif
