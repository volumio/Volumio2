#ifndef _IMAGE_UTILS
#define _IMAGE_UTILS

#include <libspotify/api.h>

namespace ImageUtils {
  void imageLoadedCallback(sp_image* image, void* userdata);
  char* convertImageToBase64(sp_image* image);
}

#endif