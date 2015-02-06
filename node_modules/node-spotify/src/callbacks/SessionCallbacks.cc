#include "SessionCallbacks.h"
#include "../Application.h"
#include "../common_macros.h"
#include "../objects/spotify/PlaylistContainer.h"
#include "../objects/spotify/Player.h"
#include "../utils/V8Utils.h"

#include <string.h>

extern Application* application;
static void handleNotify(uv_async_t* handle, int status);

static sp_playlistcontainer_callbacks rootPlaylistContainerCallbacks;
//Timer to call sp_session_process_events after a timeout
static std::unique_ptr<uv_timer_t> processEventsTimer;
static std::unique_ptr<uv_async_t> notifyHandle;

v8::Handle<v8::Function> SessionCallbacks::loginCallback;
v8::Handle<v8::Function> SessionCallbacks::logoutCallback;
v8::Handle<v8::Function> SessionCallbacks::metadataUpdatedCallback;
v8::Handle<v8::Function> SessionCallbacks::endOfTrackCallback;
v8::Handle<v8::Function> SessionCallbacks::playTokenLostCallback;

void SessionCallbacks::init() {
  processEventsTimer = std::unique_ptr<uv_timer_t>(new uv_timer_t());
  notifyHandle = std::unique_ptr<uv_async_t>(new uv_async_t());
  uv_async_init(uv_default_loop(), notifyHandle.get(), handleNotify);
  uv_timer_init(uv_default_loop(), processEventsTimer.get());
}

/**
 * If the timer for sp_session_process_events has run out this method will be called.
 **/
static void processEventsTimeout(uv_timer_t* timer, int status) {
  handleNotify(notifyHandle.get(), 0);
}

/**
 * This is a callback function that will be called by spotify.
 **/
void SessionCallbacks::notifyMainThread(sp_session* session) {
  //effectively calls handleNotify in another thread
  uv_async_send(notifyHandle.get());
}

/**
 * async callback handle function for process events.
 * This function will always be called in the thread in which the sp_session was created.
 **/
static void handleNotify(uv_async_t* handle, int status) {
  uv_timer_stop(processEventsTimer.get()); //a new timeout will be set at the end
  int nextTimeout = 0;
  while(nextTimeout == 0) {
    sp_session_process_events(application->session, &nextTimeout);
  }
  uv_timer_start(processEventsTimer.get(), &processEventsTimeout, nextTimeout, 0);
}

void SessionCallbacks::metadata_updated(sp_session* session) {
  //If sp_session_player_load did not load the track it must be retried to play. Bug #26.
  if(application->player->isLoading) {
    application->player->retryPlay();
  }
  
  V8Utils::callV8FunctionWithNoArgumentsIfHandleNotEmpty(metadataUpdatedCallback);
}

void SessionCallbacks::loggedIn(sp_session* session, sp_error error) {
  if(SP_ERROR_OK != error) {
    unsigned int argc = 1;
    v8::Handle<v8::Value> argv[1] = { v8::Exception::Error(v8::String::New(sp_error_message(error))) };
    loginCallback->Call( v8::Context::GetCurrent()->Global(), argc, argv );
    return;
  }

  //The creation of the root playlist container is absolutely necessary here, otherwise following callbacks can crash.
  rootPlaylistContainerCallbacks.container_loaded = &SessionCallbacks::rootPlaylistContainerLoaded;
  sp_playlistcontainer *pc = sp_session_playlistcontainer(application->session);
  application->playlistContainer = std::make_shared<PlaylistContainer>(pc);
  sp_playlistcontainer_add_callbacks(pc, &rootPlaylistContainerCallbacks, nullptr); 
}

/**
 * This is the "ready" hook for users. Playlists should be available at this point.
 **/
void SessionCallbacks::rootPlaylistContainerLoaded(sp_playlistcontainer* sp, void* userdata) {
  V8Utils::callV8FunctionWithNoArgumentsIfHandleNotEmpty(loginCallback);
  //Issue 35, rootPlaylistContainerLoaded can be called multiple times throughout the lifetime of a session.
  //loginCallback must only be called once.
  sp_playlistcontainer_remove_callbacks(sp, &rootPlaylistContainerCallbacks, nullptr);    
}

void SessionCallbacks::playTokenLost(sp_session *session) {
  application->audioHandler->setStopped(true);
  application->player->isPaused = true;
  V8Utils::callV8FunctionWithNoArgumentsIfHandleNotEmpty(playTokenLostCallback);
}

void SessionCallbacks::loggedOut(sp_session* session) {
  V8Utils::callV8FunctionWithNoArgumentsIfHandleNotEmpty(logoutCallback);
}
