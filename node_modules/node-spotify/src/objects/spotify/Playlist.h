#ifndef PLAYLIST_H
#define PLAYLIST_H

#include "PlaylistBase.h"

#include <string>
#include <map>
#include <vector>
#include <memory>
#include <libspotify/api.h>

class User;
class Track;
class TrackExtended;

class Playlist : public PlaylistBase {
friend class NodePlaylist;
friend class PlaylistCallbacksHolder;
friend class PlaylistContainer;
public:
  Playlist(sp_playlist* playlist);
  Playlist(const Playlist& other);
  ~Playlist();

  std::shared_ptr<TrackExtended> getTrack(int position);
  std::unique_ptr<User> owner();
  virtual std::string name();
  void name(std::string _name);
  std::string link();
  std::string description();
  int numTracks();
  bool isLoaded();
  bool isCollaborative();
  void setCollaborative(bool collaborative);
  void addTracks(std::vector<std::shared_ptr<Track>> tracks, int position);
  void removeTracks(const int* trackPositions, int numberOfTracks);
  void reorderTracks(const int* trackPositions, int numberOfTracks, int newPosition);
  static std::shared_ptr<Playlist> fromCache(sp_playlist* playlist);
private:
  sp_playlist* playlist;
  static std::map<sp_playlist*, std::shared_ptr<Playlist>> cache;
};

#endif
