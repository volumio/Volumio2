'use strict';

var libQ = require('kew');
var _ = require('underscore');
var volumeDeltaArray = [];
var muteToggleArray = [];

module.exports = RESTApiPlayback;

function RESTApiPlayback (context) {
  var self = this;

  // Save a reference to the parent commandRouter
  self.context = context;
  self.logger = self.context.logger;
  self.commandRouter = self.context.coreCommand;
}

RESTApiPlayback.prototype.playbackCommands = function (req, res) {
  var self = this;

  var response = {'Error': 'Failed to execute command'};
  try {
    if (req.query.cmd == 'play') {
      var timeStart = Date.now();
      if (req.query.N == undefined) {
        self.logStart('Client requests Volumio play')
          .then(self.commandRouter.volumioPlay.bind(self.commandRouter))
          .fail(self.pushError.bind(self))
          .done(function () {
            res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
          });
      } else {
        var N = parseInt(req.query.N);
        self.logStart('Client requests Volumio play at index ' + N)
          .then(self.commandRouter.volumioPlay.bind(self.commandRouter, N))
          .done(function () {
            res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
          });
      }
    } else if (req.query.cmd == 'toggle') {
      var timeStart = Date.now();
      self.logStart('Client requests Volumio toggle')
        .then(self.commandRouter.volumioToggle.bind(self.commandRouter))
        .fail(self.pushError.bind(self))
        .done(function () {
          res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
        });
    } else if (req.query.cmd == 'stop') {
      var timeStart = Date.now();
      self.logStart('Client requests Volumio stop')
        .then(self.commandRouter.volumioStop.bind(self.commandRouter))
        .fail(self.pushError.bind(self))
        .done(function () {
          res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
        });
    } else if (req.query.cmd == 'pause') {
      var timeStart = Date.now();
      self.logStart('Client requests Volumio pause')
        .then(self.commandRouter.volumioPause.bind(self.commandRouter))
        .fail(self.pushError.bind(self))
        .done(function () {
          res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
        });
    } else if (req.query.cmd == 'clearQueue') {
      var timeStart = Date.now();
      self.logStart('Client requests Volumio Clear Queue')
        .then(self.commandRouter.volumioClearQueue.bind(self.commandRouter))
        .fail(self.pushError.bind(self))
        .done(function () {
          res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
        });
    } else if (req.query.cmd == 'prev') {
      var timeStart = Date.now();
      self.logStart('Client requests Volumio previous')
        .then(self.commandRouter.volumioPrevious.bind(self.commandRouter))
        .fail(self.pushError.bind(self))
        .done(function () {
          res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
        });
    } else if (req.query.cmd == 'next') {
      var timeStart = Date.now();
      self.logStart('Client requests Volumio next')
        .then(self.commandRouter.volumioNext.bind(self.commandRouter))
        .fail(self.pushError.bind(self))
        .done(function () {
          res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
        });
    } else if (req.query.cmd == 'volume') {
      var VolumeInteger = req.query.volume;
      if (VolumeInteger == 'plus') {
        VolumeInteger = '+';
      } else if (VolumeInteger == 'minus') {
        VolumeInteger = '-';
      } else if (VolumeInteger == 'mute' || VolumeInteger == 'unmute' || VolumeInteger == 'toggle') {

      } else {
        VolumeInteger = parseInt(VolumeInteger);
      }

      var timeStart = Date.now();
      self.logStart('Client requests Volume ' + VolumeInteger)
        .then(function () {
          return self.commandRouter.volumiosetvolume.call(self.commandRouter,
            VolumeInteger);
        })
        .fail(self.pushError.bind(self))
        .done(function () {
          res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
        });
    } else if (req.query.cmd == 'playplaylist') {
      var playlistName = req.query.name;
      var timeStart = Date.now();
      self.logStart('Client requests Volumio Play Playlist ' + playlistName)
        .then(function () {
          return self.commandRouter.playPlaylist.call(self.commandRouter,
            playlistName);
        })
        .fail(self.pushError.bind(self))
        .done(function () {
          res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
        });
    } else if (req.query.cmd == 'seek') {
      var position = req.query.position;
      if (position == 'plus') {
        position = '+';
      } else if (position == 'minus') {
        position = '-';
      } else {
        position = parseInt(position);
      }

      var timeStart = Date.now();
      self.logStart('Client requests Position ' + position)
        .then(function () {
          return self.commandRouter.volumioSeek(position);
        })
        .fail(self.pushError.bind(self))
        .done(function () {
          res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
        });
    } else if (req.query.cmd == 'repeat') {
      var value = req.query.value;
      if (value == 'true') {
        value = true;
      } else if (value == 'false') {
        value = false;
      }

      var timeStart = Date.now();
      self.logStart('Client requests Repeat ' + value)
        .then(function () {
          if (value != undefined) {
            return self.commandRouter.volumioRepeat(value, false);
          } else {
            return self.commandRouter.repeatToggle();
          }
        })
        .fail(self.pushError.bind(self))
        .done(function () {
          res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
        });
    } else if (req.query.cmd == 'random') {
      var value = req.query.value;
      if (value == 'true') {
        value = true;
      } else if (value == 'false') {
        value = false;
      }

      var timeStart = Date.now();
      self.logStart('Client requests Random ' + value)
        .then(function () {
          if (value != undefined) {
            return self.commandRouter.volumioRandom(value);
          } else {
            return self.commandRouter.randomToggle();
          }
        })
        .fail(self.pushError.bind(self))
        .done(function () {
          res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
        });
    } else if (req.query.cmd == 'startAirplayPlayback') {
      var timeStart = Date.now();
      self.logStart('Client requests Start Airplay PlaybackRoutine')
        .then(function () {
          self.commandRouter.executeOnPlugin('music_service', 'airplay_emulation', 'startAirplayPlayback', '');
        })
        .fail(self.pushError.bind(self))
        .done(function () {
          res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
        });
    } else if (req.query.cmd == 'stopAirplayPlayback') {
      var timeStart = Date.now();
      self.logStart('Client requests Stop Airplay Playback')
        .then(function () {
          self.commandRouter.executeOnPlugin('music_service', 'airplay_emulation', 'stopAirplayPlayback', '');
        })
        .fail(self.pushError.bind(self))
        .done(function () {
          res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
        });
    } else if (req.query.cmd == 'airplayActive') {
      var timeStart = Date.now();
      self.logStart('Client requests AirplayActive')
        .then(function () {
          self.commandRouter.executeOnPlugin('music_service', 'airplay_emulation', 'setAirplayActive', '');
        })
        .fail(self.pushError.bind(self))
        .done(function () {
          res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
        });
    } else if (req.query.cmd == 'airplayInactive') {
      var timeStart = Date.now();
      self.logStart('Client requests AirplayInactive')
        .then(function () {
          self.commandRouter.executeOnPlugin('music_service', 'airplay_emulation', 'setAirplayInctive', '');
        })
        .fail(self.pushError.bind(self))
        .done(function () {
          res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
        });
    } else if (req.query.cmd == 'usbAudioAttach') {
      var timeStart = Date.now();
      self.logStart('USB Audio Device Attached')
        .then(function () {
          self.commandRouter.usbAudioAttach();
        })
        .fail(self.pushError.bind(self))
        .done(function () {
          res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
        });
    } else if (req.query.cmd == 'usbAudioDetach') {
      var timeStart = Date.now();
      self.logStart('USB Audio Device Detached')
        .then(function () {
          self.commandRouter.usbAudioDetach();
        })
        .fail(self.pushError.bind(self))
        .done(function () {
          res.json({'time': timeStart, 'response': req.query.cmd + ' Success'});
        });
    } else {
      res.json({'Error': 'command not recognized'});
    }
  } catch (e) {
    self.commandRouter.logger.info('Error executing command: ' + e);
    res.json(response);
  }
};

RESTApiPlayback.prototype.playbackGetQueue = function (req, res) {
  var self = this;

  var queue = this.commandRouter.volumioGetQueue();
  res.json({'queue': queue});
};

RESTApiPlayback.prototype.playbackGetState = function (req, res) {
  var self = this;
  var response = self.commandRouter.volumioGetState();

  if (response != undefined) {
    res.json(response);
  } else {
    res.json(notFound);
  }
};

RESTApiPlayback.prototype.addPlay = function (req, res) {
  var self = this;

  if (!req.is('application/json')) {
      self.logger.error('Cannot execute addPlay REST Call: Request type must be application/json');
      return res.json({'error': 'Request type must be application/json'});
  }

  var data = req.body;
  self.commandRouter.addQueueItems(data)
    .then(function (e) {
      self.commandRouter.volumioPlay(e.firstItemIndex);
      res.json({'response': 'success'});
    })
    .fail(function (e) {
      return res.json({'error': e});
    });
};

RESTApiPlayback.prototype.addToQueue = function (req, res) {
  var self = this;

  if (!req.is('application/json')) {
      self.logger.error('Cannot execute addToQueue REST Call: Request type must be application/json');
      return res.json({'error': 'Request type must be application/json'});
  }

  var data = req.body;
  self.commandRouter.addQueueItems(data)
    .then(function () {
      res.json({'response': 'success'});
    })
    .fail(function (e) {
      return res.json({'error': e});
    });
};

RESTApiPlayback.prototype.replaceAndPlay = function (req, res) {
  var self = this;

  if (!req.is('application/json')) {
    self.logger.error('Cannot execute replaceAndPlay REST Call: Request type must be application/json');
    return res.json({'error': 'Request type must be application/json'});
  }

  var data = req.body;
  self.commandRouter.replaceAndPlay(data)
    .then(function () {
      res.json({'response': 'success'});
    })
    .fail(function (e) {
      return res.json({'error': e});
    });
};

RESTApiPlayback.prototype.logStart = function (sCommand) {
  var self = this;
  self.commandRouter.pushConsoleMessage('\n' + '---------------------------- ' + sCommand);
  return libQ.resolve();
};

RESTApiPlayback.prototype.pushError = function (error) {
  var self = this;
  self.logger.error('API:pushError: ' + error);
  return libQ.resolve();
};
