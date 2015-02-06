#ifndef _USER_H
#define _USER_H

#include "PlaylistContainer.h"
#include "StarredPlaylist.h"

#include <libspotify/api.h>
#include <string>
#include <memory>

class PlaylistContainer;

class User {
friend class NodeUser;
public:
  User(sp_user* user);
  User(const User& other);
  ~User();

  std::string canonicalName();
  std::string displayName();
  std::string link();
  bool isLoaded();
  std::shared_ptr<PlaylistContainer> publishedPlaylists();
  std::shared_ptr<Playlist> starredPlaylist();
private:
  sp_user* user;
};

#endif
