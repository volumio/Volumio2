#include "NodeSpotify.h"
#include "../../audio/AudioHandler.h"
#include "../../audio/NativeAudioHandler.h"
#include "../../audio/NodeAudioHandler.h"
#include "../../Application.h"
#include "../../exceptions.h"
#include "../../common_macros.h"
#include "../../callbacks/SessionCallbacks.h"
#include "../spotify/SpotifyOptions.h"
#include "NodePlaylist.h"
#include "NodePlaylistFolder.h"
#include "NodePlaylistContainer.h"
#include "NodePlayer.h"
#include "NodeArtist.h"
#include "NodeAlbum.h"
#include "NodeTrack.h"
#include "NodeUser.h"
#include "../../utils/V8Utils.h"

extern Application* application;

NodeSpotify::NodeSpotify(Handle<Object> options) {
  /*
   * Important note: The session callbacks must be initialized before
   * the sp_session is started. The uv timer and async handle must be set up
   * as they will be used as soon as the sp_session is created, which happens in the
   * NodeSpotify ctor.
   */
  SessionCallbacks::init();

  SpotifyOptions _options;
  HandleScope scope;
  Handle<String> settingsFolderKey = String::New("settingsFolder");
  Handle<String> cacheFolderKey = String::New("cacheFolder");
  Handle<String> traceFileKey = String::New("traceFile");
  Handle<String> appkeyFileKey = String::New("appkeyFile");
  if(options->Has(settingsFolderKey)) {
    String::Utf8Value settingsFolderValue(options->Get(settingsFolderKey)->ToString());
    _options.settingsFolder = *settingsFolderValue;
  } else {
    _options.settingsFolder = "settings";
  }
  if(options->Has(cacheFolderKey)) {
    String::Utf8Value cacheFolderValue(options->Get(cacheFolderKey)->ToString());
    _options.cacheFolder = *cacheFolderValue;
  } else {
    _options.cacheFolder = "cache";
  }
  if(options->Has(traceFileKey)) {
    String::Utf8Value traceFileValue(options->Get(traceFileKey)->ToString());
    _options.traceFile = *traceFileValue;
  }
  if(options->Has(appkeyFileKey)) {
    String::Utf8Value appkeyFileValue(options->Get(appkeyFileKey)->ToString());
    _options.appkeyFile = *appkeyFileValue;
  }
  spotify = std::unique_ptr<Spotify>(new Spotify(_options));
  scope.Close(Undefined());
}

NodeSpotify::~NodeSpotify() {

}

Handle<Value> NodeSpotify::createFromLink(const Arguments& args) {
  HandleScope scope;
  Handle<Value> out;
  String::Utf8Value linkToParse(args[0]->ToString());
  sp_link* parsedLink = sp_link_create_from_string(*linkToParse);
  if(parsedLink != nullptr) {
    sp_linktype linkType = sp_link_type(parsedLink);
    switch(linkType) {
      case SP_LINKTYPE_TRACK:
      {
        sp_track* track = sp_link_as_track(parsedLink);
        NodeTrack* nodeTrack = new NodeTrack(std::make_shared<Track>(track));
        out = nodeTrack->getV8Object();
        break;
      }
      case SP_LINKTYPE_ALBUM:
      {
        sp_album* album = sp_link_as_album(parsedLink);
        NodeAlbum* nodeAlbum = new NodeAlbum(std::unique_ptr<Album>(new Album(album)));
        out = nodeAlbum->getV8Object();
        break;
      }
      case SP_LINKTYPE_ARTIST:
      {
        sp_artist* artist = sp_link_as_artist(parsedLink);
        NodeArtist* nodeArtist = new NodeArtist(std::unique_ptr<Artist>(new Artist(artist)));
        out = nodeArtist->getV8Object();
        break;
      }
      case SP_LINKTYPE_PROFILE:
      {
        sp_user* user = sp_link_as_user(parsedLink);
        NodeUser* nodeUser = new NodeUser(std::unique_ptr<User>(new User(user)));
        out = nodeUser->getV8Object();
        break;
      }
      case SP_LINKTYPE_PLAYLIST:
      {
        sp_playlist* spPlaylist = sp_playlist_create(application->session, parsedLink);
        auto playlist = Playlist::fromCache(spPlaylist);
        NodePlaylist* nodePlaylist = new NodePlaylist(playlist);
        out = nodePlaylist->getV8Object();
        break;
      }
      case SP_LINKTYPE_LOCALTRACK:
      {
        sp_track* track = sp_link_as_track(parsedLink);
        NodeTrack* nodeTrack = new NodeTrack(std::make_shared<Track>(track));
        out = nodeTrack->getV8Object();
        break;
      }
      default:
        out = Undefined();
    }
    sp_link_release(parsedLink);
  } else {
    out = Undefined();
  }
  return scope.Close(out);
}

Handle<Value> NodeSpotify::login(const Arguments& args) {
  HandleScope scope;
  NodeSpotify* nodeSpotify = node::ObjectWrap::Unwrap<NodeSpotify>(args.This());
  String::Utf8Value v8User(args[0]->ToString());
  String::Utf8Value v8Password(args[1]->ToString());
  bool rememberMe = args[2]->ToBoolean()->Value();
  bool withRemembered = args[3]->ToBoolean()->Value();
  std::string user(*v8User);
  std::string password(*v8Password);
  nodeSpotify->spotify->login(user, password, rememberMe, withRemembered);
  return scope.Close(Undefined());
}

Handle<Value> NodeSpotify::logout(const Arguments& args) {
  HandleScope scope;
  if(args.Length() > 0) {
    Handle<Function> fun = Handle<Function>::Cast(args[0]);
    Persistent<Function> p = Persistent<Function>::New(fun);
    SessionCallbacks::logoutCallback = p;
  }
  NodeSpotify* nodeSpotify = node::ObjectWrap::Unwrap<NodeSpotify>(args.This());
  nodeSpotify->spotify->logout();
  return scope.Close(Undefined());
}

Handle<Value> NodeSpotify::getPlaylistContainer(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodePlaylistContainer* nodePlaylistContainer = new NodePlaylistContainer(application->playlistContainer);
  return scope.Close(nodePlaylistContainer->getV8Object());
}

Handle<Value> NodeSpotify::getRememberedUser(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSpotify* nodeSpotify = node::ObjectWrap::Unwrap<NodeSpotify>(info.Holder());
  return scope.Close(String::New(nodeSpotify->spotify->rememberedUser().c_str()));
}

Handle<Value> NodeSpotify::getSessionUser(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  NodeSpotify* nodeSpotify = node::ObjectWrap::Unwrap<NodeSpotify>(info.Holder());
  NodeUser* nodeUser = new NodeUser(std::move(nodeSpotify->spotify->sessionUser()));
  return scope.Close(nodeUser->getV8Object());
}

Handle<Value> NodeSpotify::getConstants(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  Local<Object> constants = Object::New();
  constants->Set(String::NewSymbol("ARTISTBROWSE_FULL"), Number::New(SP_ARTISTBROWSE_FULL));
  constants->Set(String::NewSymbol("ARTISTBROWSE_NO_TRACKS"), Number::New(SP_ARTISTBROWSE_NO_TRACKS));
  constants->Set(String::NewSymbol("ARTISTBROWSE_NO_ALBUMS"), Number::New(SP_ARTISTBROWSE_NO_ALBUMS));

  constants->Set(String::NewSymbol("PLAYLIST_TYPE_PLAYLIST"), Number::New(SP_PLAYLIST_TYPE_PLAYLIST));
  constants->Set(String::NewSymbol("PLAYLIST_TYPE_START_FOLDER"), Number::New(SP_PLAYLIST_TYPE_START_FOLDER));
  constants->Set(String::NewSymbol("PLAYLIST_TYPE_END_FOLDER"), Number::New(SP_PLAYLIST_TYPE_END_FOLDER));
  constants->Set(String::NewSymbol("PLAYLIST_TYPE_PLACEHOLDER"), Number::New(SP_PLAYLIST_TYPE_PLACEHOLDER));
  return scope.Close(constants);
}

#ifdef NODE_SPOTIFY_NATIVE_SOUND
Handle<Value> NodeSpotify::useNativeAudio(const Arguments& args) {
  HandleScope scope;
  //Since the old audio handler has to be deleted first, do an empty reset.
  application->audioHandler.reset();
  application->audioHandler = std::unique_ptr<AudioHandler>(new NativeAudioHandler());
  return scope.Close(Undefined());
}
#endif

Handle<Value> NodeSpotify::useNodejsAudio(const Arguments &args) {
  HandleScope scope;
  if(args.Length() < 1) {
    return scope.Close(V8_EXCEPTION("useNodjsAudio needs a function as its first argument."));
  }
  Handle<Function> callback = Persistent<Function>::New(Handle<Function>::Cast(args[0]));
  //Since the old audio handler has to be deleted first, do an empty reset.
  application->audioHandler.reset();
  application->audioHandler = std::unique_ptr<AudioHandler>(new NodeAudioHandler(callback));

  Handle<Function> needMoreDataSetter = FunctionTemplate::New(NodeAudioHandler::setNeedMoreData)->GetFunction();
  return scope.Close(needMoreDataSetter);
}

Handle<Value> NodeSpotify::on(const Arguments& args) {
  HandleScope scope;
  if(args.Length() < 1 || !args[0]->IsObject()) {
    return scope.Close(V8_EXCEPTION("on needs an object as its first argument."));
  }
  Handle<Object> callbacks = args[0]->ToObject();
  Handle<String> metadataUpdatedKey = String::New("metadataUpdated");
  Handle<String> readyKey = String::New("ready");
  Handle<String> logoutKey = String::New("logout");
  Handle<String> playTokenLostKey = String::New("playTokenLost");
  SessionCallbacks::metadataUpdatedCallback = V8Utils::getFunctionFromObject(callbacks, metadataUpdatedKey);
  SessionCallbacks::loginCallback = V8Utils::getFunctionFromObject(callbacks, readyKey);
  SessionCallbacks::logoutCallback = V8Utils::getFunctionFromObject(callbacks, logoutKey);
  SessionCallbacks::playTokenLostCallback = V8Utils::getFunctionFromObject(callbacks, playTokenLostKey);
  return scope.Close(Undefined());
}

void NodeSpotify::init() {
  HandleScope scope;
  Handle<FunctionTemplate> constructorTemplate = NodeWrapped::init("Spotify");
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "login", login);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "logout", logout);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "createFromLink", createFromLink);
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "on", on);
#ifdef NODE_SPOTIFY_NATIVE_SOUND
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "useNativeAudio", useNativeAudio);
#endif
  NODE_SET_PROTOTYPE_METHOD(constructorTemplate, "useNodejsAudio", useNodejsAudio);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("rememberedUser"), getRememberedUser);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("sessionUser"), getSessionUser);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("playlistContainer"), getPlaylistContainer);
  constructorTemplate->InstanceTemplate()->SetAccessor(String::NewSymbol("constants"), getConstants);

  constructor = Persistent<Function>::New(constructorTemplate->GetFunction());
  scope.Close(Undefined());
}
