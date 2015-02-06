#ifndef _SPOTIFY_OPTIONS_H
#define _SPOTIFY_OPTIONS_H

#include <string>

struct SpotifyOptions {
  std::string settingsFolder;
  std::string cacheFolder;
  std::string traceFile;
  std::string appkeyFile;
};

#endif