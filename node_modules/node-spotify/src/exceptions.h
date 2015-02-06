#ifndef _NODESPOTIFY_EXCEPTIONS_H
#define _NODESPOTIFY_EXCEPTIONS_H

#define CREATE_EXCEPTION_WITH_MESSAGE(name) class name : public ExceptionWithMessage {\
  public:\
    name(const char* message) : ExceptionWithMessage(message) {};\
  };

#include <exception>

class ExceptionWithMessage {
public:
  ExceptionWithMessage(const char* _message) : message(_message) {}
  std::string message;
};
class FileException : public std::exception {};
class TrackNotPlayableException : public std::exception {};
class PlaylistCreationException : public std::exception {};
class PlaylistNotDeleteableException : public std::exception {};
class TracksNotRemoveableException : public std::exception {};
#ifndef NODE_SPOTIFY_NATIVE_SOUND
class NoAudioHandlerException : public std::exception {};
#endif

CREATE_EXCEPTION_WITH_MESSAGE(PlaylistNotMoveableException)
CREATE_EXCEPTION_WITH_MESSAGE(TracksNotReorderableException)
CREATE_EXCEPTION_WITH_MESSAGE(SessionCreationException)
CREATE_EXCEPTION_WITH_MESSAGE(TracksNotAddedException)

#endif
