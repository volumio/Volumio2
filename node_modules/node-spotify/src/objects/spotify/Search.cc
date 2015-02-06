#include "Search.h"
#include "../../Application.h"
#include "../../callbacks/SearchCallbacks.h"

#include <libspotify/api.h>

extern Application* application;

Search::Search(const Search& other) : search(other.search) {
  sp_search_add_ref(search);
};

Search::~Search() {
  sp_search_release(search);
};

std::string Search::link() {
  std::string link;
  if(sp_search_is_loaded(search)) {
    sp_link* spLink = sp_link_create_from_search(search);
    char linkChar[256];
    sp_link_as_string(spLink, linkChar, 256);
    link = std::string(linkChar);
    sp_link_release(spLink);
  }
  return link;
}

std::string Search::didYouMeanText() {
  std::string didYouMeanText;
  if(sp_search_is_loaded(search)) {
    didYouMeanText = std::string(sp_search_did_you_mean(search));
  }
  return didYouMeanText;
}

std::shared_ptr<Track> Search::getTrack(int position) {
  auto track = std::make_shared<Track>(sp_search_track(search, position));
  return track;
}

std::unique_ptr<Album> Search::getAlbum(int position) {
  auto album = std::unique_ptr<Album>(new Album(sp_search_album(search, position)));
  return album;
}

std::unique_ptr<Artist> Search::getArtist(int position) {
  auto artist = std::unique_ptr<Artist>(new Artist(sp_search_artist(search, position)));
  return artist;
}

std::shared_ptr<Playlist> Search::getPlaylist(int position) {
  auto playlist = Playlist::fromCache(sp_search_playlist(search, position));
  return playlist;
}

int Search::numTracks() {
  return sp_search_num_tracks(search);
}

int Search::totalTracks() {
  int totalTracks = 0;
  if(sp_search_is_loaded(search)) {
    totalTracks = sp_search_total_tracks(search);
  }
  return totalTracks;
}

int Search::numAlbums() {
  return sp_search_num_albums(search);
}

int Search::totalAlbums() {
  int totalAlbums = 0;
  if(sp_search_is_loaded(search)) {
    totalAlbums = sp_search_total_albums(search);
  }
  return totalAlbums;
}

int Search::numArtists() {
  return sp_search_num_artists(search);
}

int Search::totalArtists() {
  int totalArtists = 0;
  if(sp_search_is_loaded(search)) {
    totalArtists = sp_search_total_artists(search);
  }
  return totalArtists;
}

int Search::numPlaylists() {
  return sp_search_num_playlists(search);
}

int Search::totalPlaylists() {
  int totalPlaylists = 0;
  if(sp_search_is_loaded(search)) {
    totalPlaylists = sp_search_total_playlists(search);
  }
  return totalPlaylists;
}

void Search::execute(std::string query, int trackOffset, int trackLimit,
    int albumOffset, int albumLimit,
    int artistOffset, int artistLimit,
    int playlistOffset, int playlistLimit) {
  this->search = sp_search_create(application->session, query.c_str(),
    trackOffset, trackLimit,
    albumOffset, albumLimit,
    artistOffset, artistLimit,
    playlistOffset, playlistLimit,
    SP_SEARCH_STANDARD, //?
    SearchCallbacks::searchComplete,
    this
  );
}
