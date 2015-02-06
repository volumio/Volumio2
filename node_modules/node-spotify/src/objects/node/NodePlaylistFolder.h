#ifndef _NODE_PLAYLIST_FOLDER_H
#define _NODE_PLAYLIST_FOLDER_H

#include "NodeWrapped.h"
#include "../spotify/PlaylistFolder.h"

#include <v8.h>
#include <memory>

using namespace v8;

class NodePlaylistFolder : public NodeWrapped<NodePlaylistFolder> {
private:
  std::shared_ptr<PlaylistFolder> playlistFolder;
public:
  NodePlaylistFolder(std::shared_ptr<PlaylistFolder> playlistFolder);
  ~NodePlaylistFolder();
  static void init();
  static Handle<Value> getName(Local<String> property, const AccessorInfo& info);
  static Handle<Value> getType(Local<String> property, const AccessorInfo& info);
};

#endif