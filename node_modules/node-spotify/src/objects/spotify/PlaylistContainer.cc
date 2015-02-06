#include "PlaylistContainer.h"
#include "../../Application.h"
#include "../../exceptions.h"
#include "PlaylistFolder.h"

extern Application* application;

std::shared_ptr<PlaylistBase> PlaylistContainer::getPlaylist(int index) {
  std::shared_ptr<PlaylistBase> playlist;
  sp_playlist_type playlistType = sp_playlistcontainer_playlist_type(playlistContainer, index);
  if(playlistType == SP_PLAYLIST_TYPE_PLAYLIST) {
    sp_playlist* spPlaylist = sp_playlistcontainer_playlist(playlistContainer, index);
    playlist = Playlist::fromCache(spPlaylist);
  } else if(playlistType == SP_PLAYLIST_TYPE_START_FOLDER) {
    char buf[256];
    sp_playlistcontainer_playlist_folder_name(playlistContainer, index, buf, 256);
    playlist = std::make_shared<PlaylistFolder>(buf, playlistType);
  } else if(playlistType == SP_PLAYLIST_TYPE_END_FOLDER) {
    playlist = std::make_shared<PlaylistFolder>(playlistType);
  } else if(playlistType == SP_PLAYLIST_TYPE_PLACEHOLDER) {
    playlist = std::make_shared<PlaylistFolder>(playlistType);
  }
  return playlist;
}

int PlaylistContainer::numPlaylists() {
  if(sp_playlistcontainer_is_loaded(playlistContainer)) {
    return sp_playlistcontainer_num_playlists(playlistContainer);
  }
  return 0;
}

void PlaylistContainer::addPlaylist(std::string name) {
  sp_playlist* spotifyPlaylist = sp_playlistcontainer_add_new_playlist(playlistContainer, name.c_str());
  if(spotifyPlaylist == nullptr) {
    throw PlaylistCreationException();
  }
}

void PlaylistContainer::addFolder(int index, std::string name) {
  sp_error error = sp_playlistcontainer_add_folder(playlistContainer, index, name.c_str());
  if(error == SP_ERROR_INDEX_OUT_OF_RANGE) {
    throw PlaylistCreationException();
  }
}

void PlaylistContainer::removePlaylist(int index) {
  sp_playlistcontainer_remove_playlist(playlistContainer, index);
}

/**
 * This method moves a playlist. Both index and newPosition are 0-based, but newPosition is the desired position *before* anything is moved.

 * So if you have
 * Playlist 1 (0)
 * Playlist 2 (1)
 * Playlist 3 (2)
 * and want to move playlist 1 behinde playlist 2 the new desired index is actually 2. So you call move(0, 2).
 * If you want to move playlist 2 before playlist 1 the new desired index is 0, so you call move(1,0).
 **/
void PlaylistContainer::movePlaylist(int index, int newPosition) {
  sp_error error = sp_playlistcontainer_move_playlist(playlistContainer, index, newPosition, false);
  if(error == SP_ERROR_INDEX_OUT_OF_RANGE || error == SP_ERROR_INVALID_INDATA) {
    throw PlaylistNotMoveableException(sp_error_message(error));
  }
}

bool PlaylistContainer::isLoaded() {
  return sp_playlistcontainer_is_loaded(playlistContainer);
}

std::unique_ptr<User> PlaylistContainer::owner() {
  auto owner = std::unique_ptr<User>(new User(sp_playlistcontainer_owner(playlistContainer)));
  return owner;
}
