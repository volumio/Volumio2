#include "PlaylistCallbacksHolder.h"
#include "../objects/node/NodeTrackExtended.h"
#include "../objects/node/NodeUser.h"
#include "../objects/spotify/TrackExtended.h"
#include "../objects/spotify/Playlist.h"
#include "../objects/spotify/User.h"

#include <memory>

PlaylistCallbacksHolder::PlaylistCallbacksHolder(V8Wrapped* _userdata, sp_playlist* _playlist) : userdata(_userdata), playlist(_playlist) {
  playlistCallbacks = new sp_playlist_callbacks();
}

PlaylistCallbacksHolder::~PlaylistCallbacksHolder() {
  sp_playlist_remove_callbacks(playlist, playlistCallbacks, this);
  delete playlistCallbacks;
}

void PlaylistCallbacksHolder::call(Handle<Function> callback, std::initializer_list<Handle<Value>> args) {  
  unsigned int argc = args.size();
  Handle<Value>* argv = const_cast<Handle<Value>*>(args.begin());
  callback->Call(Context::GetCurrent()->Global(), argc, argv);
}

void PlaylistCallbacksHolder::playlistRenamed(sp_playlist* spPlaylist, void* userdata) {
  auto holder = static_cast<PlaylistCallbacksHolder*>(userdata);
  holder->call(holder->playlistRenamedCallback, { Undefined(), holder->userdata->getV8Object() });
}

void PlaylistCallbacksHolder::tracksAdded(sp_playlist* spPlaylist, sp_track *const *tracks, int num_tracks, int position, void *userdata) {
  auto holder = static_cast<PlaylistCallbacksHolder*>(userdata);
  Handle<Array> nodeTracks = Array::New(num_tracks);
  for(int i = 0; i < num_tracks; i++) {
    NodeTrack* nodeTrackExtended = new NodeTrackExtended(std::make_shared<TrackExtended>(tracks[i], spPlaylist, position + i));
    nodeTracks->Set(Number::New(i), nodeTrackExtended->getV8Object());
  }
  holder->call(holder->tracksAddedCallback, { Undefined(), holder->userdata->getV8Object(), nodeTracks, Number::New(position) });
}

void PlaylistCallbacksHolder::tracksMoved(sp_playlist* spPlaylist, const int* tracks, int num_tracks, int new_position, void *userdata) {
  auto holder = static_cast<PlaylistCallbacksHolder*>(userdata);
  Handle<Array> movedTrackIndices = Array::New(num_tracks);
  for(int i = 0; i < num_tracks; i++) {
    movedTrackIndices->Set(Number::New(i), Number::New(tracks[i]));
  }
  holder->call(holder->tracksMovedCallback, { Undefined(), holder->userdata->getV8Object(), movedTrackIndices, Number::New(new_position) });
}

void PlaylistCallbacksHolder::tracksRemoved(sp_playlist* spPlaylist, const int *tracks, int num_tracks, void *userdata) {
  auto holder = static_cast<PlaylistCallbacksHolder*>(userdata);
  Handle<Array> removedTrackIndexes = Array::New(num_tracks);
  for(int i = 0; i < num_tracks; i++) {
    removedTrackIndexes->Set(Number::New(i), Number::New(tracks[i]));
  }
  holder->call(holder->tracksRemovedCallback, { Undefined(), holder->userdata->getV8Object(), removedTrackIndexes });
}

void PlaylistCallbacksHolder::trackCreatedChanged(sp_playlist* spPlaylist, int position, sp_user* spUser, int when, void* userdata) {
  auto holder = static_cast<PlaylistCallbacksHolder*>(userdata);
  double date = (double)when * 1000;
  NodeUser* nodeUser = new NodeUser(std::unique_ptr<User>(new User(spUser)));
  holder->call(holder->trackCreatedChangedCallback, { Undefined(), holder->userdata->getV8Object(), Integer::New(position), nodeUser->getV8Object(), Date::New(date) });
}

void PlaylistCallbacksHolder::trackSeenChanged(sp_playlist* spPlaylist, int position, bool seen, void* userdata) {
  auto holder = static_cast<PlaylistCallbacksHolder*>(userdata);
  holder->call(holder->trackSeenChangedCallback, { Undefined(), holder->userdata->getV8Object(), Integer::New(position), Boolean::New(seen) });
}

void PlaylistCallbacksHolder::trackMessageChanged(sp_playlist* spPlaylist, int position, const char* message, void* userdata) {
  auto holder = static_cast<PlaylistCallbacksHolder*>(userdata);
  holder->call(holder->trackMessageChangedCallback, { Undefined(), holder->userdata->getV8Object(), Integer::New(position), String::New(message) });
}

void PlaylistCallbacksHolder::setCallbacks() {
  sp_playlist_remove_callbacks(playlist, playlistCallbacks, this);
  
  if(!playlistRenamedCallback.IsEmpty() && playlistRenamedCallback->IsCallable()) {
    playlistCallbacks->playlist_renamed = &PlaylistCallbacksHolder::playlistRenamed;  
  }
  if(!tracksAddedCallback.IsEmpty() && tracksAddedCallback->IsCallable()) {
    playlistCallbacks->tracks_added = &PlaylistCallbacksHolder::tracksAdded;  
  }
  if(!tracksMovedCallback.IsEmpty() && tracksMovedCallback->IsCallable()) {
    playlistCallbacks->tracks_moved = &PlaylistCallbacksHolder::tracksMoved;  
  }
  if(!tracksRemovedCallback.IsEmpty() && tracksRemovedCallback->IsCallable()) {
    playlistCallbacks->tracks_removed = &PlaylistCallbacksHolder::tracksRemoved;  
  }
  if(!trackCreatedChangedCallback.IsEmpty() && trackCreatedChangedCallback->IsCallable()) {
    playlistCallbacks->track_created_changed = &PlaylistCallbacksHolder::trackCreatedChanged;
  }
  if(!trackSeenChangedCallback.IsEmpty() && trackSeenChangedCallback->IsCallable()) {
    playlistCallbacks->track_seen_changed = &PlaylistCallbacksHolder::trackSeenChanged;
  }
  if(!trackMessageChangedCallback.IsEmpty() && trackMessageChangedCallback->IsCallable()) {
    playlistCallbacks->track_message_changed = &PlaylistCallbacksHolder::trackMessageChanged;
  }
  sp_playlist_add_callbacks(playlist, playlistCallbacks, this);
}

void PlaylistCallbacksHolder::unsetCallbacks() {
  sp_playlist_remove_callbacks(playlist, playlistCallbacks, this);
}
