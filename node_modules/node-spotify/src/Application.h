#ifndef _APPLICATION_H
#define _APPLICATION_H

#include <libspotify/api.h>
#include <memory>
#include "objects/spotify/PlaylistContainer.h"
#include "objects/spotify/Player.h"
#include "audio/AudioHandler.h"

struct Application {
  sp_session* session;
  std::shared_ptr<PlaylistContainer> playlistContainer;
  std::shared_ptr<Player> player;
  std::unique_ptr<AudioHandler> audioHandler;
};

#endif
