#include "Track.h"
#include "../../Application.h"

extern Application* application;

Track::Track(sp_track* _track) : track(_track) {
  sp_track_add_ref(track);
};

std::string Track::name() {
  std::string name;
  if(sp_track_is_loaded(track)) {
    name = std::string(sp_track_name(track));
  } else {
    name = "Loading...";
  }
  return name;
}

std::string Track::link() {
  std::string link;
  if(sp_track_is_loaded(track)) {
    sp_link* spLink = sp_link_create_from_track(track, 0);
    char linkChar[256];
    sp_link_as_string(spLink, linkChar, 256);
    link = std::string(linkChar);
    sp_link_release(spLink);
  }
  return link;
}

std::vector<std::unique_ptr<Artist>> Track::artists() {
  std::vector<std::unique_ptr<Artist>> artists;
  if(sp_track_is_loaded(track)) {
    int numArtists = sp_track_num_artists(track);
    artists.resize(numArtists);
    for(int i = 0; i < numArtists; i++) {
      sp_artist* spArtist = sp_track_artist(track, i);
      artists[i] = std::unique_ptr<Artist>(new Artist(spArtist));
    }
  }
  return artists;
}

std::unique_ptr<Album> Track::album() {
  std::unique_ptr<Album> album;
  if(sp_track_is_loaded(track)) {
    sp_album* spAlbum = sp_track_album(track);
    if(spAlbum != nullptr) {
      album = std::unique_ptr<Album>(new Album(spAlbum));
    }
  }
  return std::move(album);
}

int Track::duration() {
  int duration = -1;
  if(sp_track_is_loaded(track)) {
    duration = sp_track_duration(track);
  }
  return duration;
}

bool Track::starred() {
  bool starred = false;
  if(sp_track_is_loaded(track)) {
    starred = sp_track_is_starred(application->session, track);
  }
  return starred;
}

int Track::popularity() {
  int popularity = -1;
  if(sp_track_is_loaded(track)) {
    popularity = sp_track_popularity(track);
  }
  return popularity;
}

bool Track::isLoaded() {
  return sp_track_is_loaded(track);
}

void Track::setStarred(bool starred) {
  //This takes an array of pointers to nodeTracks, so we need to tack the adress of the saved spotifyNodeTrack pointer.
  sp_track_set_starred(application->session, &track, 1, starred);
}
