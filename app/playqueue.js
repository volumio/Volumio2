'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var execSync = require('child_process').execSync;

// Define the CorePlayQueue class
module.exports = CorePlayQueue;
function CorePlayQueue (commandRouter, stateMachine) {
  var self = this;

  this.commandRouter = commandRouter;
  this.stateMachine = stateMachine;
  this.arrayQueue = [];

  this.defaultSampleRate = '';
  this.defaultBitdepth = 0;
  this.defaultChannels = 0;

  // trying to read play queue from file
  var persistentqueue = this.commandRouter.executeOnPlugin('music_service', 'mpd', 'getConfigParam', 'persistent_queue');
  if (persistentqueue == undefined) {
    persistentqueue = true;
  }

  if (persistentqueue) {
    fs.readJson('/data/queue', function (err, queue) {
      if (err) { self.commandRouter.logger.info('Cannot read play queue from file'); } else {
        self.commandRouter.logger.info('Reloading queue from file');
        // self.commandRouter.logger.info(queue);
        self.arrayQueue = queue;
      }
    });
  } else {
    exec('echo "" > /data/queue', function (error, stdout, stderr) {
      if (error !== null) {
        console.log('Cannot empty queue');
      }
    });
  }
}

// Public Methods ---------------------------------------------------------------------------------------
// These are 'this' aware, and return a promise

// Get a promise for contents of play queue
CorePlayQueue.prototype.getQueue = function () {
  this.commandRouter.pushConsoleMessage('CorePlayQueue::getQueue');
  return this.arrayQueue;
};

// Get a array of contiguous trackIds which share the same service, starting at nStartIndex
CorePlayQueue.prototype.getTrackBlock = function (nStartIndex) {
  this.commandRouter.pushConsoleMessage('CorePlayQueue::getTrackBlock');
  // jpa hack workaround for now....
  var goodIndex = Math.min(this.arrayQueue.length - 1, nStartIndex);
  if (this.arrayQueue[goodIndex]) {
    var sTargetService = this.arrayQueue[goodIndex].service;
  } else {
    return {service: 'mpd', uris: '', startindex: ''};
  }

  var nEndIndex = goodIndex;
  var nToCheck = this.arrayQueue.length - 1;

  while (nEndIndex < nToCheck) {
    if (this.arrayQueue[nEndIndex + 1].service !== sTargetService) {
      break;
    }
    nEndIndex++;
  }

  var arrayUris = this.arrayQueue.slice(nStartIndex, nEndIndex + 1).map(function (curTrack) {
    return curTrack.uri;
  });

  return {service: sTargetService, uris: arrayUris, startindex: nStartIndex};
};

// Removes one item from the queue
CorePlayQueue.prototype.removeQueueItem = function (nIndex) {
  var self = this;

  this.commandRouter.pushConsoleMessage('CorePlayQueue::removeQueueItem ' + nIndex.value);
  var item = this.arrayQueue.splice(nIndex.value, 1);

  // this.commandRouter.logger.info(JSON.stringify(item));
  this.saveQueue();

  var name = '';
  if (item[0] && item[0].name) {
    name = item[0].name;
  }
  this.commandRouter.pushToastMessage('success', this.commandRouter.getI18nString('COMMON.REMOVE_QUEUE_TITLE'),
    this.commandRouter.getI18nString('COMMON.REMOVE_QUEUE_TEXT_1') + name + this.commandRouter.getI18nString('COMMON.REMOVE_QUEUE_TEXT_2'));

  var defer = libQ.defer();
  this.commandRouter.volumioPushQueue(this.arrayQueue)
    .then(function () {
      defer.resolve({});
    }).fail(function (err) {
      defer.reject(new Error(err));
    });

  return defer.promise;
};

// Add one item to the queue
CorePlayQueue.prototype.addQueueItems = function (arrayItems) {
  var self = this;
  var defer = libQ.defer();

  this.commandRouter.pushConsoleMessage('CorePlayQueue::addQueueItems');

  // self.commandRouter.logger.info(arrayItems);

  var array = [].concat(arrayItems);

  var firstItemIndex = this.arrayQueue.length;
  // self.commandRouter.logger.info("First index is "+firstItemIndex);

  // We need to ask the service if the uri corresponds to something bigger, like a playlist
  var promiseArray = [];
  for (var i in array) {
    var item = array[i];

    if (item.uri != undefined) {
      self.commandRouter.logger.info('Adding Item to queue: ' + item.uri);

      var service = 'mpd';

      if (item.service) {
        service = item.service;

        if (item.uri.startsWith('cdda:')) {
          item.name = item.title;
          if (!item.albumart) {
            item.albumart = '/albumart';
          }
          promiseArray.push(libQ.resolve(item));
        } else if (service === 'webradio') {
          promiseArray.push(this.commandRouter.executeOnPlugin('music_service', 'webradio', 'explodeUri', item));
        } else {
          promiseArray.push(this.commandRouter.explodeUriFromService(service, item.uri));
        }
      } else {
        // backward compatibility with SPOP plugin
        if (item.uri.startsWith('spotify:')) {
          service = 'spop';
        }

        promiseArray.push(this.commandRouter.explodeUriFromService(service, item.uri));
      }
    }
  }

  libQ.all(promiseArray)
    .then(function (content) {
      var contentArray = [];
      for (var j in content) {
        if (content[j]) {
          if (content[j].samplerate === undefined) {
            content[j].samplerate = self.defaultSampleRate;
          }

          if (content[j].bitdepth === undefined) {
            content[j].bitdepth = self.defaultBitdepth;
          }

          if (content[j].channels === undefined) {
            content[j].channels = self.defaultChannels;
          }
          contentArray = contentArray.concat(content[j])
        }
      }

      if (self.arrayQueue.length > 0 && self.arrayQueue.length >= contentArray.length) {
          // if(content[j].uri!==self.arrayQueue[self.arrayQueue.length-1].uri)

          var queueLastElementsObj = self.arrayQueue.slice(Math.max(self.arrayQueue.length - contentArray.length, 0));
          var addQueueElementsObj = contentArray;
          // If the array we are adding to queue is equal to the last elements of the queue, we don't add it and send index as first item of array we want to add
          if (self.compareTrackListByUri(queueLastElementsObj, addQueueElementsObj)) {
              firstItemIndex = self.arrayQueue.length - contentArray.length;
          } else {
              self.arrayQueue = self.arrayQueue.concat(contentArray);
          }
      } else {
          self.arrayQueue = self.arrayQueue.concat(contentArray);
      }

      self.saveQueue();

      // self.commandRouter.logger.info("Adding item to queue: "+JSON.stringify(content[j]));
      self.commandRouter.volumioPushQueue(self.arrayQueue);
    })
    .then(function () {
      self.stateMachine.updateTrackBlock();
      defer.resolve({firstItemIndex: firstItemIndex});
    }).fail(function (e) {
      defer.reject(new Error(e));
      self.commandRouter.logger.info('An error occurred while exploding URI: ' + e);
    });
  return defer.promise;
};

CorePlayQueue.prototype.clearAddPlayQueue = function (arrayItems) {
  this.commandRouter.pushConsoleMessage('CorePlayQueue::clearAddPlayQueue');
  this.arrayQueue = [];
  this.arrayQueue = this.arrayQueue.concat(arrayItems);
  this.saveQueue();

  this.commandRouter.serviceClearAddPlayTracks(arrayItems, arrayItems[0].service);
  return this.commandRouter.volumioPushQueue(this.arrayQueue);
};

CorePlayQueue.prototype.clearPlayQueue = function () {
  this.commandRouter.pushConsoleMessage('CorePlayQueue::clearPlayQueue');
  this.arrayQueue = [];
  this.saveQueue();

  this.commandRouter.stateMachine.pushEmptyState();
  return this.commandRouter.volumioPushQueue(this.arrayQueue);
};

CorePlayQueue.prototype.getTrack = function (index) {
  this.commandRouter.pushConsoleMessage('CorePlayQueue::getTrack ' + index);

  if (this.arrayQueue.length > index) {
    return this.arrayQueue[index];
  } else return;
};

CorePlayQueue.prototype.moveQueueItem = function (from, to) {
  this.commandRouter.pushConsoleMessage('CorePlayQueue::moveQueueItem ' + from + ' --> ' + to);

  if (this.arrayQueue.length > to) {
    this.arrayQueue.splice(to, 0, this.arrayQueue.splice(from, 1)[0]);
    return this.commandRouter.volumioPushQueue(this.arrayQueue);
  } else return defer.resolve();
};

CorePlayQueue.prototype.saveQueue = function () {
  var self = this;
  this.commandRouter.pushConsoleMessage('CorePlayQueue::saveQueue');

  fs.writeJson('/data/queue', self.arrayQueue, {spaces: 2}, function (err) {
    if (err) { self.commandRouter.logger.info('An error occurred saving queue to disk: ' + err); }
  });
};
/* CorePlayQueue.prototype.clearMpdQueue = function () {
	return this.commandRouter.executeOnPlugin('music_service', 'mpd', 'clear');
}; */

CorePlayQueue.prototype.compareTrackListByUri = function (trackList1, trackList2) {
    var self = this;

    var trackList1String = '';
    var trackList2String = '';

    for (var k in trackList1) {
      if (trackList1[k] && trackList1[k].uri) {
        // We have to replace music-library with mnt to get consistent results
          trackList1String = trackList1String + trackList1[k].uri.replace('music-library', 'mnt');
      }
    }

    for (var h in trackList2) {
        if (trackList2[h] && trackList2[h].uri) {
            trackList2String = trackList2String + trackList2[h].uri.replace('music-library', 'mnt');
        }
    }

    if (trackList1String === trackList2String) {
      return true;
    } else {
      return false;
    }
};