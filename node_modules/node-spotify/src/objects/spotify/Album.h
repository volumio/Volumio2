#ifndef _ALBUM_H
#define _ALBUM_H

#include "Track.h"
#include "Artist.h"
#include "../node/V8Browseable.h"

#include <libspotify/api.h>
#include <string>
#include <vector>
#include <memory>

class Track;
class Artist;

class Album {
friend class NodeAlbum;
friend class AlbumBrowseCallbacks;
public:
  Album(sp_album* _album);
  ~Album();
  Album(const Album& other);
  std::string name();
  std::string link();
  std::string coverBase64();
  std::vector<std::shared_ptr<Track>> tracks();
  std::string review();
  std::vector<std::string> copyrights();
  std::unique_ptr<Artist> artist();
  void browse();
  bool isLoaded();
private:
  sp_album* album;
  sp_image* cover;
  V8Browseable* nodeObject;
  sp_albumbrowse* albumBrowse;
};

#endif
