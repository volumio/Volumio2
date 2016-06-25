'use strict';

var libQ = require('kew');
var fs = require('fs-extra');

// Define the CorePlayQueue class
module.exports = CorePlayQueue;
function CorePlayQueue(commandRouter, stateMachine) {
	var self=this;

    this.commandRouter = commandRouter;
	this.stateMachine = stateMachine;
	this.arrayQueue = [];

    this.defaultSampleRate='';
    this.defaultBitdepth=0;
    this.defaultChannels=0;
    
    //trying to read play queue from file
    fs.readJson('/data/queue', function (err, queue) {
        if(err)
            self.commandRouter.logger.info("Cannot read play queue form file");
        else
        {
            self.commandRouter.logger.info("Reloading queue from file");
            //self.commandRouter.logger.info(queue);
            self.arrayQueue=queue;
        }
    })
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
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::removeQueueItem '+nIndex.value);
	var item=this.arrayQueue.splice(nIndex.value, 1);

    this.commandRouter.logger.info(JSON.stringify(item));
    this.saveQueue();

    this.commandRouter.pushToastMessage('success',  this.commandRouter.getI18nString('COMMON.REMOVE_QUEUE_TITLE'),
        this.commandRouter.getI18nString('COMMON.REMOVE_QUEUE_TEXT_1')+
        item[0].name+
        this.commandRouter.getI18nString('COMMON.REMOVE_QUEUE_TEXT_2'));

    return this.commandRouter.volumioPushQueue(this.arrayQueue);
};

// Add one item to the queue
CorePlayQueue.prototype.addQueueItems = function (arrayItems) {
    var self=this;
    var defer=libQ.defer();

	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::addQueueItems');

    self.commandRouter.logger.info(arrayItems);

    var array = [].concat( arrayItems );

    var firstItemIndex=this.arrayQueue.length;
    self.commandRouter.logger.info("First index is "+firstItemIndex);

    // We need to ask the service if the uri corresponds to something bigger, like a playlist
    var promiseArray=[];
    for(var i in array)
    {
        var item=array[i];

        self.commandRouter.logger.info("ADDING THIS ITEM TO QUEUE: "+JSON.stringify(item));
        var service='mpd';

        if(item.hasOwnProperty('service'))
        {
            if(item.service!==null)
                service=item.service;
        }

        if(item.uri.startsWith('spotify:'))
        {
            service='spop';
        }

        if(service==='dirble')
        {
            item.name=item.title;
            item.albumart="/albumart";
            promiseArray.push(libQ.resolve(item));
        }
        else  promiseArray.push(this.commandRouter.explodeUriFromService(service,item.uri));
    }

    libQ.all(promiseArray)
        .then(function(content){
            for(var j in content)
            {
                if(content[j].samplerate===undefined)
                {
                    content[j].samplerate=self.defaultSampleRate;
                }

                if(content[j].bitdepth===undefined)
                {
                    content[j].bitdepth=self.defaultBitdepth;
                }

                if(content[j].channels===undefined)
                {
                    content[j].channels=self.defaultChannels;
                }

                self.arrayQueue = self.arrayQueue.concat(content[j]);
            }

            self.saveQueue();

            self.commandRouter.logger.info("Adding item to queue: "+JSON.stringify(content[j]));
            self.commandRouter.volumioPushQueue(self.arrayQueue);
        })
        .then(function(){
            self.stateMachine.updateTrackBlock();
            defer.resolve({firstItemIndex:firstItemIndex});
        }).fail(function (e) {
        defer.reject(new Error(e));
        self.commandRouter.logger.info("An error occurred while exploding URI: "+e);
    });
    return defer.promise;
};

CorePlayQueue.prototype.clearAddPlayQueue = function (arrayItems) {
    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::clearAddPlayQueue');
    this.arrayQueue = [];
    this.arrayQueue = this.arrayQueue.concat(arrayItems);
    this.saveQueue();

    this.commandRouter.serviceClearAddPlayTracks(arrayItems,arrayItems[0].service);
    return this.commandRouter.volumioPushQueue(this.arrayQueue);
};

CorePlayQueue.prototype.clearPlayQueue = function () {
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::clearPlayQueue');
	this.arrayQueue = [];
    this.saveQueue();
	return this.commandRouter.volumioPushQueue(this.arrayQueue);
};

CorePlayQueue.prototype.getTrack = function (index) {
    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::getTrack '+index);

    if(this.arrayQueue.length>index)
    {
        return this.arrayQueue[index];
    }
    else return;
};

CorePlayQueue.prototype.moveQueueItem = function (from,to) {
    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::moveQueueItem '+from+' --> '+to);

    if(this.arrayQueue.length>to)
    {
        this.arrayQueue.splice(to,0,this.arrayQueue.splice(from,1)[0]);
        return this.commandRouter.volumioPushQueue(this.arrayQueue);
    }
    else return;
};


CorePlayQueue.prototype.saveQueue = function () {
    var self=this;
    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'CorePlayQueue::saveQueue');

    fs.writeJson('/data/queue', self.arrayQueue, function (err) {
        if(err)
            self.commandRouter.logger.info("An error occurred saving queue to disk: "+err);
    });
};
/*CorePlayQueue.prototype.clearMpdQueue = function () {
	return this.commandRouter.executeOnPlugin('music_service', 'mpd', 'clear');
};*/
