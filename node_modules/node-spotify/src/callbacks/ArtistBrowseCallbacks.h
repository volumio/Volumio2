#ifndef _ARTISTBROWSE_CALLBACKS_H
#define _ARTISTBROWSE_CALLBACKS_H

#include <libspotify/api.h>

class ArtistBrowseCallbacks {
public:
  static void artistBrowseComplete(sp_artistbrowse* result, void* userdata);
};

#endif