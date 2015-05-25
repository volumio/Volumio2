var libMpd = require('mpd');
var libQ = require('kew');
var libFast = require('fast.js');

// for testing purposes:
// var libRandomString = require('random-string');

// Internal helper functions
// These are static, and not 'this' aware

// Helper function toconvert trackId to URI
function convertTrackIdToUri(input) {
  // Convert base64->utf8
  return new Buffer(input, 'base64').toString('utf8');
}

// Helper function toconvert URI to trackId
function convertUriToTrackId(input) {
  // Convert utf8->base64
  return new Buffer(input, 'utf8').toString('base64');
}

// Define the ControllerMpd class
function ControllerMpd(nHost, nPort, commandRouter) {
  // This fixed variable will let us refer to 'this' object at deeper scopes
  var self = this;

  // Save a reference to the parent commandRouter
  self.commandRouter = commandRouter;

  // Connect to MPD
  self.clientMpd = libMpd.connect({port: nPort, host: nHost});

  // Make a promise for when the MPD connection is ready to receive events
  self.mpdReady = libQ.nfcall(libFast.bind(self.clientMpd.on, self.clientMpd), 'ready');

  // Catch and log errors
  self.clientMpd.on('error', function(err) {
    console.error('MPD error: ');
    console.error(err);
  });

  // This tracks the the timestamp of the newest detected status change
  self.timeLatestUpdate = 0;

  // When playback status changes
  self.clientMpd.on('system-player', function() {
    var timeStart = Date.now();

    self.logStart('MPD announces state update')
    .then(libFast.bind(self.getState, self))
    .then(libFast.bind(self.pushState, self))
    .fail(libFast.bind(self.pushError, self))
    .done(function() {
      return self.logDone(timeStart);
    });
  });

  self.tracklist = [];
  self.tracklistReady = libQ.resolve();
}

// Public Methods ---------------------------------------------------------------------------------------
// These are 'this' aware, and return a promise

// Define a method to clear, add, and play an array of tracks
ControllerMpd.prototype.clearAddPlayTracks = function(arrayTrackIds) {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::clearAddPlayTracks');

  // From the array of track IDs, get array of track URIs to play
  var arrayTrackUris = libFast.map(arrayTrackIds, convertTrackIdToUri);

  // Clear the queue, add the first track, and start playback
  return self.sendMpdCommandArray([
    {command: 'clear', parameters: []},
    {command: 'add',   parameters: [arrayTrackUris.shift()]},
    {command: 'play',  parameters: []}
  ])
  .then(function() {
    // If there are more tracks in the array, add those also
    if (arrayTrackUris.length > 0) {
      return self.sendMpdCommandArray(
        libFast.map(arrayTrackUris, function(currentTrack) {
          return {command: 'add',   parameters: [currentTrack]};
        })
      );
    } else {
      return libQ.resolve();
    }
  });
};

// MPD stop
ControllerMpd.prototype.stop = function() {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::stop');

  return self.sendMpdCommand('stop', []);
};

// MPD pause
ControllerMpd.prototype.pause = function() {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::pause');

  return self.sendMpdCommand('pause', []);
};

// MPD resume
ControllerMpd.prototype.resume = function() {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::resume');

  return self.sendMpdCommand('play', []);
};

// MPD music library
ControllerMpd.prototype.getTracklist = function() {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::getTracklist');

  return self.tracklistReady
  .then(function() {
    return self.tracklist;
  });
};

// Internal methods ---------------------------------------------------------------------------
// These are 'this' aware, and may or may not return a promise

// Define a method to get the MPD state
ControllerMpd.prototype.getState = function() {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::getState');

  var collectedState = {};
  var timeCurrentUpdate = Date.now();
  self.timeLatestUpdate = timeCurrentUpdate;

  return self.sendMpdCommand('status', [])
  .then(function(data) {
    return self.haltIfNewerUpdateRunning(data, timeCurrentUpdate);
  })
  .then(libFast.bind(self.parseState, self))
  .then(function(state) {
    collectedState = state;

    // If there is a track listed as currently playing, get the track info
    if (collectedState.position !== null) {
      return self.sendMpdCommand('playlistinfo', [collectedState.position])
      .then(function(data) {
        return self.haltIfNewerUpdateRunning(data, timeCurrentUpdate);
      })
      .then(libFast.bind(self.parseTrackInfo, self))
      .then(function(trackinfo) {
        collectedState.dynamictitle = trackinfo.dynamictitle;
        return libQ.resolve(collectedState);
      });
      // Else return null track info
    } else {
      collectedState.dynamictitle = null;
      return libQ.resolve(collectedState);
    }
  });
};

// Stop the current status update thread if a newer one exists
ControllerMpd.prototype.haltIfNewerUpdateRunning = function(data, timeCurrentThread) {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::haltIfNewerUpdateRunning');

  if (self.timeLatestUpdate > timeCurrentThread) {
    return libQ.reject('Alert: Aborting status update - newer one detected');
  } else {
    return libQ.resolve(data);
  }
};

// Announce updated MPD state
ControllerMpd.prototype.pushState = function(state) {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::pushState');

  return self.commandRouter.mpdPushState(state);
};

// Pass the error if we don't want to handle it
ControllerMpd.prototype.pushError = function(sReason) {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::pushError');
  self.commandRouter.pushConsoleMessage(sReason);

  // Return a resolved empty promise to represent completion
  return libQ.resolve();
};

// Define a general method for sending an MPD command, and return a promise for its execution
ControllerMpd.prototype.sendMpdCommand = function(sCommand, arrayParameters) {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::sendMpdCommand');

  return self.mpdReady
  .then(function() {
    self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'sending command...');
    return libQ.nfcall(libFast.bind(self.clientMpd.sendCommand, self.clientMpd), libMpd.cmd(sCommand, arrayParameters));
  })
  .then(function(response) {
    self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'parsing response...');
    return libQ.resolve(libMpd.parseKeyValueMessage.call(libMpd, response));
  });
};

// Define a general method for sending an array of MPD commands, and return a promise for its execution
// Command array takes the form [{command: sCommand, parameters: arrayParameters}, ...]
ControllerMpd.prototype.sendMpdCommandArray = function(arrayCommands) {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::sendMpdCommandArray');

  return self.mpdReady
  .then(function() {
    return libQ.nfcall(libFast.bind(self.clientMpd.sendCommands, self.clientMpd),
      libFast.map(arrayCommands, function(currentCommand) {
        return libMpd.cmd(currentCommand.command, currentCommand.parameters);
      })
    );
  })
  .then(libFast.bind(libMpd.parseKeyValueMessage, libMpd));
};

// Parse MPD's track info text into Volumio recognizable object
ControllerMpd.prototype.parseTrackInfo = function(objTrackInfo) {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::parseTrackInfo');

  if ('Title' in objTrackInfo) {
    return libQ.resolve({dynamictitle: objTrackInfo.Title});
  } else {
    return libQ.resolve({dynamictitle: null});
  }
};

// Parse MPD's text playlist into a Volumio recognizable playlist object
ControllerMpd.prototype.parsePlaylist = function(objQueue) {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::parsePlaylist');

  // objQueue is in form {'0': 'file: http://uk4.internet-radio.com:15938/', '1': 'file: http://2363.live.streamtheworld.com:80/KUSCMP128_SC'}
  // We want to convert to a straight array of trackIds
  return libQ.fcall(libFast.map, Object.keys(objQueue), function(currentKey) {
    return convertUriToTrackId(objQueue[currentKey]);
  });
};

// Parse MPD's text status into a Volumio recognizable status object
ControllerMpd.prototype.parseState = function(objState) {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMpd::parseState');

  // Pull track duration out of status message
  var nDuration = null;
  if ('time' in objState) {
    var arrayTimeData = objState.time.split(':');
    nDuration = Math.round(Number(arrayTimeData[1]));
  }

  // Pull the elapsed time
  var nSeek = null;
  if ('elapsed' in objState) {
    nSeek = Math.round(Number(objState.elapsed) * 1000);
  }

  // Pull the queue position of the current track
  var nPosition = null;
  if ('song' in objState) {
    nPosition = Number(objState.song);
  }

  // Pull audio metrics
  var nBitDepth = null;
  var nSampleRate = null;
  var nChannels = null;
  if ('audio' in objState) {
    var objMetrics = objState.audio.split(':');
    nSampleRate = Number(objMetrics[0]);
    nBitDepth = Number(objMetrics[1]);
    nChannels = Number(objMetrics[2]);
  }

  var sStatus = null;
  if ('state' in objState) {
    sStatus = objState.state;
  }

  return libQ.resolve({
    status: sStatus,
    position: nPosition,
    seek: nSeek,
    duration: nDuration,
    samplerate: nSampleRate,
    bitdepth: nBitDepth,
    channels: nChannels
  });
};

ControllerMpd.prototype.logDone = function(timeStart) {
  var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + '------------------------------ ' + (Date.now() - timeStart) + 'ms');
  return libQ.resolve();
};

ControllerMpd.prototype.logStart = function(sCommand) {
  var self = this;
  self.commandRouter.pushConsoleMessage('\n' + '[' + Date.now() + '] ' + '---------------------------- ' + sCommand);
  return libQ.resolve();
};

module.exports = ControllerMpd;