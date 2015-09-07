var libQ = require('kew');
var libFast = require('fast.js');

// Define the CorePlayQueue class
module.exports = CorePlayQueue;
function CorePlayQueue(commandRouter, stateMachine) {
	var self = this;

	self.commandRouter = commandRouter;
	self.stateMachine = stateMachine;

	self.queueReadyDeferred = libQ.defer();
	self.queueReady = self.queueReadyDeferred.promise;

	self.arrayQueue = [];

	self.queueReadyDeferred.resolve();


}

// Public Methods ---------------------------------------------------------------------------------------
// These are 'this' aware, and return a promise

// Get a promise for contents of play queue
CorePlayQueue.prototype.getQueue = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::getQueue');

	return self.queueReady
		.then(function() {
			self.commandRouter.pushConsoleMessage(self.arrayQueue);
			return self.arrayQueue;
		});
};

// Get a array of contiguous trackIds which share the same service, starting at nStartIndex
CorePlayQueue.prototype.getTrackBlock = function(nStartIndex) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::getTrackBlock');

	var sTargetService = self.arrayQueue[nStartIndex].service;
	var nEndIndex = nStartIndex;

	while (nEndIndex < self.arrayQueue.length - 1) {
		if (self.arrayQueue[nEndIndex + 1].service !== sTargetService) {
			break;
		}

		nEndIndex++;
	}

	var arrayUris = libFast.map(self.arrayQueue.slice(nStartIndex, nEndIndex + 1), function(curTrack) {
		return curTrack.uri;
	});

	return libQ.resolve({service: sTargetService, uris: arrayUris, startindex: nStartIndex});
};

// Removes one item from the queue
CorePlayQueue.prototype.removeQueueItem = function(nIndex) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::removeQueueItem');

	return self.queueReady
		.then(function() {
			self.arrayQueue.splice(nIndex, 1);
			return self.commandRouter.volumioPushQueue(self.arrayQueue);
		});
};

// Add one item to the queue
CorePlayQueue.prototype.addQueueItems = function(arrayItems) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::addQueueItems');

	return self.queueReady
		.then(function() {
			self.arrayQueue = self.arrayQueue.concat(arrayItems);
			return self.commandRouter.volumioPushQueue(self.arrayQueue);
		});
};

CorePlayQueue.prototype.clearPlayQueue = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::clearPlayQueue');

	return self.arrayQueue = [];
}

CorePlayQueue.prototype.clearMpdQueue = function() {

	var self = this;
	return self.commandRouter.executeOnPlugin('music_service', 'mpd', 'clear');

}