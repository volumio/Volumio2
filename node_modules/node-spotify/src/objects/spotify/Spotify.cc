#include "Spotify.h"
#include "../../Application.h"
#include "../../callbacks/SessionCallbacks.h"
#include "../../exceptions.h"

#include <fstream>

extern Application* application;
static sp_session_config sessionConfig;
static sp_session_callbacks sessionCallbacks;

Spotify::Spotify(SpotifyOptions options) {
  session = createSession(options);
  application->session = session;
}

sp_session* Spotify::createSession(SpotifyOptions options) {
  sp_error error;
  sp_session* session;

  std::ifstream::pos_type size;
  char* appkey;
  std::ifstream file(options.appkeyFile.c_str(), std::ios::in|std::ios::binary|std::ios::ate);
  if(file.is_open()) {
    size = file.tellg();
    appkey = new char[size];
    file.seekg(0, std::ios::beg);
    file.read(appkey, size);
    file.close();
  } else {
    throw FileException();
  }

  sessionCallbacks.notify_main_thread = &SessionCallbacks::notifyMainThread;
  sessionCallbacks.logged_in = &SessionCallbacks::loggedIn;
  sessionCallbacks.logged_out = &SessionCallbacks::loggedOut;
  sessionCallbacks.play_token_lost = &SessionCallbacks::playTokenLost;
  sessionCallbacks.end_of_track = &SessionCallbacks::end_of_track;
  sessionCallbacks.metadata_updated = &SessionCallbacks::metadata_updated;

  sessionCallbacks.music_delivery = &AudioHandler::musicDelivery;
  sessionCallbacks.start_playback = &SessionCallbacks::start_playback;
  sessionCallbacks.stop_playback = &SessionCallbacks::stop_playback;
  sessionCallbacks.get_audio_buffer_stats = &AudioHandler::getAudioBufferStats;

  sessionConfig.api_version = SPOTIFY_API_VERSION;
  sessionConfig.cache_location = options.cacheFolder.c_str();
  sessionConfig.settings_location = options.settingsFolder.c_str();
  sessionConfig.application_key = appkey;
  sessionConfig.application_key_size = size;
  sessionConfig.user_agent = "nodejs-spotify-adapter";
  sessionConfig.callbacks = &sessionCallbacks;
  if(!options.traceFile.empty()) {
    sessionConfig.tracefile = options.traceFile.c_str();
  }
  sessionConfig.userdata = this;

  error = sp_session_create(&sessionConfig, &session);
  if(SP_ERROR_OK != error) {
    throw SessionCreationException(sp_error_message(error));
  }
  return session;
}

void Spotify::login(std::string username, std::string password, bool rememberMe, bool withRemembered) {
  if(withRemembered) {
    sp_session_relogin(session);
  } else {
    sp_session_login(session, username.c_str(), password.c_str(), rememberMe, NULL);
  }
}

void Spotify::logout() {
  application->playlistContainer.reset();
  sp_session_logout(session);
}

std::string Spotify::rememberedUser() {
  std::string rememberedUserString;
  int maxUsernameLength = 256;
  char rememberedUser[maxUsernameLength];
  int usernameLength = sp_session_remembered_user(session, rememberedUser, maxUsernameLength);
  if(usernameLength != -1) {
    rememberedUserString = std::string(rememberedUser);
  }
  return rememberedUserString;
}

std::unique_ptr<User> Spotify::sessionUser() {
  auto user = std::unique_ptr<User>(new User(sp_session_user(session)));
  return user;
}
