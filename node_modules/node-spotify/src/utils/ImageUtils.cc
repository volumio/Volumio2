#include "ImageUtils.h"

#include <stdio.h>
#include "base64.h"

namespace ImageUtils {
  void imageLoadedCallback(sp_image* image, void* imagePromise) {
    sp_image_remove_load_callback(image, &imageLoadedCallback, imagePromise);
  }

  char* convertImageToBase64(sp_image* image) {
    size_t imageSize;
    int base64Size;
    const void* imageData = sp_image_data(image, &imageSize);
    return base64(imageData, (int)imageSize, &base64Size);
  }

}