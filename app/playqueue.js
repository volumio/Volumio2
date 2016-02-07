'use strict';

// Define the CorePlayQueue class
module.exports = CorePlayQueue;
function CorePlayQueue(commandRouter, stateMachine) {
	this.commandRouter = commandRouter;
	this.stateMachine = stateMachine;
	this.arrayQueue = [];
}

// Public Methods ---------------------------------------------------------------------------------------
// These are 'this' aware, and return a promise

// Get a promise for contents of play queue
CorePlayQueue.prototype.getQueue = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::getQueue');
	return this.arrayQueue;
};

// Get a array of contiguous trackIds which share the same service, starting at nStartIndex
CorePlayQueue.prototype.getTrackBlock = function (nStartIndex) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::getTrackBlock');

	var sTargetService = this.arrayQueue[nStartIndex].service;
	var nEndIndex = nStartIndex;
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
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::removeQueueItem');
	this.arrayQueue.splice(nIndex, 1);
	return this.commandRouter.volumioPushQueue(this.arrayQueue);
};

// Add one item to the queue
CorePlayQueue.prototype.addQueueItems = function (arrayItems) {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::addQueueItems');
	this.arrayQueue = this.arrayQueue.concat(arrayItems);
	return this.commandRouter.volumioPushQueue(this.arrayQueue);
};

CorePlayQueue.prototype.clearPlayQueue = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::clearPlayQueue');
	return this.arrayQueue = [];
};

CorePlayQueue.prototype.clearMpdQueue = function () {
	return this.commandRouter.executeOnPlugin('music_service', 'mpd', 'clear');
};