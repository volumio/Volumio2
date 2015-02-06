#include "Playlist.h"
#include "User.h"
#include "Track.h"
#include "TrackExtended.h"
#include "../../Application.h"
#include "../../exceptions.h"

extern Application* application;
std::map<sp_playlist*, std::shared_ptr<Playlist>> Playlist::cache;

std::shared_ptr<Playlist> Playlist::fromCache(sp_playlist* spPlaylist) {
  auto it = cache.find(spPlaylist);
  if(it != cache.end()) {
    return it->second;
  } else {
    auto playlist = std::make_shared<Playlist>(spPlaylist);
    cache[spPlaylist] = playlist;
    return playlist;
  }
}

Playlist::Playlist(sp_playlist* _playlist) : PlaylistBase(false), playlist(_playlist) {
  sp_playlist_add_ref(playlist);
}

Playlist::Playlist(const Playlist& other) : PlaylistBase(other.isFolder), playlist(other.playlist) {
  sp_playlist_add_ref(playlist);
}

Playlist::~Playlist() {
  sp_playlist_release(playlist);
}

std::unique_ptr<User> Playlist::owner() {
  std::unique_ptr<User> owner;
  if(sp_playlist_is_loaded(playlist)) {
    owner = std::unique_ptr<User>(new User(sp_playlist_owner(playlist)));
  }
  return owner;
}

std::string Playlist::name() {
  std::string name;
  if(sp_playlist_is_loaded(playlist)) {
    name = std::string(sp_playlist_name(playlist));
  } else {
    name = std::string("Loading...");
  }
  return name;
}

void Playlist::name(std::string _name) {
  sp_playlist_rename(playlist, _name.c_str());
}

void Playlist::addTracks(std::vector<std::shared_ptr<Track>> tracks, int position) {
  sp_track* spTracks[tracks.size()];
  for(int i = 0; i < (int)tracks.size(); i++) {
    spTracks[i] = tracks[i]->track;
  }
  sp_error error = sp_playlist_add_tracks(playlist, spTracks, tracks.size(), position, application->session);
  if(error != SP_ERROR_OK) {
    throw TracksNotAddedException(sp_error_message(error));
  }
}

void Playlist::removeTracks(const int* trackPositions, int numberOfTracks) {
  sp_error error = sp_playlist_remove_tracks(playlist, trackPositions, numberOfTracks);
  if(error == SP_ERROR_PERMISSION_DENIED) {
    throw TracksNotRemoveableException();
  }
}

std::string Playlist::link() {
  std::string link;
  if(sp_playlist_is_loaded(playlist)) {
    sp_link* spLink = sp_link_create_from_playlist(playlist);
    if(spLink != nullptr) {
      char linkChar[256];
      sp_link_as_string(spLink, linkChar, 256);
      link = std::string(linkChar);
      sp_link_release(spLink);
    }
  }
  return link;
}

std::string Playlist::description() {
  std::string description;
  if(sp_playlist_is_loaded(playlist)) {
    const char* spDescription = sp_playlist_get_description(playlist);
    if(spDescription != nullptr) {
      description = std::string(spDescription);
    }
  }
  return description;
}

bool Playlist::isLoaded() {
  return sp_playlist_is_loaded(playlist);
}

bool Playlist::isCollaborative() {
  if(sp_playlist_is_loaded(playlist)) {
    return sp_playlist_is_collaborative(playlist);
  } else {
    return false;
  }
}

void Playlist::setCollaborative(bool collaborative) {
  if(sp_playlist_is_loaded(playlist)) {
    sp_playlist_set_collaborative(playlist, collaborative);
  }
}

std::shared_ptr<TrackExtended> Playlist::getTrack(int position) {
  auto track = std::make_shared<TrackExtended>(sp_playlist_track(playlist, position), playlist, position);
  return track;
}

int Playlist::numTracks() {
  if(sp_playlist_is_loaded(playlist)) {
    return sp_playlist_num_tracks(playlist);
  }
  return 0;
}

void Playlist::reorderTracks(const int* trackPositions, int numberOfTracks, int newPosition) {
  sp_error error = sp_playlist_reorder_tracks(playlist, trackPositions, numberOfTracks, newPosition);
  if(error == SP_ERROR_INVALID_INDATA) {
    throw TracksNotReorderableException("Cannot reorder tracks, newPosition > playlist size.");
  } else if(error == SP_ERROR_PERMISSION_DENIED) {
    throw TracksNotReorderableException("Permission denied");
  }
}
