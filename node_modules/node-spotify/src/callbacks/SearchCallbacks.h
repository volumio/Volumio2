#ifndef _SPOTIFY_SERVICE_SEARCH_CALLBACKS_H
#define _SPOTIFY_SERVICE_SEARCH_CALLBACKS_H

#include <libspotify/api.h>

class SearchCallbacks {
public:
  static void searchComplete(sp_search* spSearch, void* userdata);
};

#endif