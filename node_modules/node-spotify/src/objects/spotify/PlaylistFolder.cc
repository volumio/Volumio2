#include "PlaylistFolder.h"

PlaylistFolder::PlaylistFolder(std::string name, int type) : PlaylistBase(true), folderName(name), folderType(type), isStart(true) {

}

PlaylistFolder::PlaylistFolder(int type) : PlaylistBase(true), folderName(""), folderType(type), isStart(false) {

}

std::string PlaylistFolder::name() {
  return folderName;
}

int PlaylistFolder::type() {
  return folderType;
}
