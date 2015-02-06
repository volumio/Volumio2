#ifndef _SEARCH_RESULT_H
#define _SEARCH_RESULT_H

#include "Track.h"
#include "Album.h"
#include "Playlist.h"
#include "Artist.h"
#include "../node/V8Browseable.h"

#include <memory>
#include <string>

class Search {
friend class NodeSearch;
friend class SearchCallbacks;
public:
  Search() {}
  Search(const Search& other);
  ~Search();
  std::shared_ptr<Track> getTrack(int position);
  std::unique_ptr<Album> getAlbum(int position);
  std::unique_ptr<Artist> getArtist(int position);
  std::shared_ptr<Playlist> getPlaylist(int position);
  void execute(std::string query, int trackOffset, int trackLimit,
    int albumOffset, int albumLimit,
    int artistOffset, int artistLimit,
    int playlistOffset, int playlistLimit);
  std::string link();
  std::string didYouMeanText();
  int numTracks();
  int totalTracks();
  int numAlbums();
  int totalAlbums();
  int numArtists();
  int totalArtists();
  int numPlaylists();
  int totalPlaylists();
private:
  sp_search* search;
  V8Browseable* nodeObject;
};

#endif
