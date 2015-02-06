#include "SearchCallbacks.h"
#include "../objects/spotify/Search.h"

void SearchCallbacks::searchComplete(sp_search* spSearch, void* userdata) {
  Search* search = static_cast<Search*>(userdata);
  search->nodeObject->callBrowseComplete();
}