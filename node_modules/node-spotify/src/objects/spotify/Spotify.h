#ifndef _SPOTIFY_H
#define _SPOTIFY_H

#include "SpotifyOptions.h"
#include "User.h"

#include <libspotify/api.h>
#include <string>
#include <memory>

class Spotify {
friend class NodeSpotify;

public:
  Spotify(SpotifyOptions options);
  ~Spotify() {}
  void login(std::string user, std::string password, bool remeberedUser, bool withRemembered);
  void logout();
  std::string rememberedUser();
  std::unique_ptr<User> sessionUser();
private:
  sp_session* session;
  sp_session* createSession(SpotifyOptions options);
};

#endif
