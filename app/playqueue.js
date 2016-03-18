'use strict';

var libQ = require('kew');

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
    this.commandRouter.pushConsoleMessage('----------> '+nStartIndex);


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
    var self=this;
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::addQueueItems');

    self.commandRouter.logger.info(arrayItems);
    var array = [].concat( arrayItems );

    // We need to ask the service if the uri corresponds to something bigger, like a playlist
    var promiseArray=[];
    for(var i in array)
    {
        var item=array[i];

        var service='mpd';

        if(item.hasOwnProperty('service'))
        {
            service=item.service;
        }

        if(item.uri.startsWith('spotify:'))
        {
            service='spop';
        }

        promiseArray.push(this.commandRouter.explodeUriFromService(service,item.uri));
    }

    libQ.all(promiseArray)
        .then(function(content){
            for(var j in content)
            {
                self.arrayQueue = self.arrayQueue.concat(content[j]);
            }

            self.commandRouter.volumioPushQueue(self.arrayQueue);
        })
        .then(function(){
            self.stateMachine.updateTrackBlock();

        }).fail(function (e) {
        self.commandRouter.logger.info("An error occurred while exploding URI");
    });
};

CorePlayQueue.prototype.clearAddPlayQueue = function (arrayItems) {
    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::clearAddPlayQueue');
    this.arrayQueue = [];
    this.arrayQueue = this.arrayQueue.concat(arrayItems);
    this.commandRouter.serviceClearAddPlayTracks(arrayItems,arrayItems[0].service);
    return this.commandRouter.volumioPushQueue(this.arrayQueue);
};

CorePlayQueue.prototype.clearPlayQueue = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::clearPlayQueue');
	return this.arrayQueue = [];
};

CorePlayQueue.prototype.getTrack = function (index) {
    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::getTrack '+index);

    if(this.arrayQueue.length>index)
    {
        return this.arrayQueue[index];
    }
    else return;
};


/*CorePlayQueue.prototype.clearMpdQueue = function () {
	return this.commandRouter.executeOnPlugin('music_service', 'mpd', 'clear');
};*/