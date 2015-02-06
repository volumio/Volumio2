#ifndef _ALBUMBROWSE_CALLBACKS_H
#define _ALBUMBROWSE_CALLBACKS_H

#include <libspotify/api.h>

class AlbumBrowseCallbacks {
public:
  static void albumBrowseComplete(sp_albumbrowse* result, void* userdata);
};

#endif