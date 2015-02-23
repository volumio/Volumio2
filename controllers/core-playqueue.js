var libQ = require('kew');
var libFast = require('fast.js');

// Define the CorePlayQueue class
module.exports = CorePlayQueue;
function CorePlayQueue () {

	// Init temporary play queue for testing purposes
	this.arrayQueue = [
		{service: 'mpd', trackid: 'aHR0cDovL3VrNC5pbnRlcm5ldC1yYWRpby5jb206MTU5Mzgv', metadata: {title: 'Go Ham Radio'}},
		{service: 'mpd', trackid: 'aHR0cDovLzIzNjMubGl2ZS5zdHJlYW10aGV3b3JsZC5jb206ODAvS1VTQ01QMTI4X1ND', metadata: {title: 'KUSC Radio'}},
		{service: 'spop', trackid: 'c3BvdGlmeTp0cmFjazoyZm5tWGp1Z0VrQ3RRNnhBOHpqVUpn', metadata: {title: 'Gates of Gold 3)Call of the Mountain'}},
		{service: 'spop', trackid: 'c3BvdGlmeTp0cmFjazo0ZnhwcEhwalRYdnhVQkFxNHQ5QlpJ', metadata: {title: 'Radio Song'}},
		{service: 'spop', trackid: 'c3BvdGlmeTp0cmFjazozNmM0Sm9oYXlCOXFkNjRlaWRRTUJp', metadata: {title: 'Doin\' it Right'}}

	];

}

// Public Methods ---------------------------------------------------------------------------------------
// These are 'this' aware, and return a promise

// Get a promise for contents of play queue
CorePlayQueue.prototype.getQueue = function () {

	console.log('[' + Date.now() + '] ' + 'CorePlayQueue::getQueue');
	return libQ.resolve(this.arrayQueue);

}

// Get a array of contiguous trackIds which share the same service, starting at nStartIndex
CorePlayQueue.prototype.getTrackBlock = function (nStartIndex) {

	console.log('[' + Date.now() + '] ' + 'CorePlayQueue::getTrackBlock');
	var sTargetService = this.arrayQueue[nStartIndex].service;
	var nEndIndex = nStartIndex;

	while (nEndIndex < this.arrayQueue.length - 1) {
		if (this.arrayQueue[nEndIndex + 1].service !== sTargetService) {
			break;

		}

		nEndIndex ++ ;

	}

	var arrayTrackIds = libFast.map(this.arrayQueue.slice(nStartIndex, nEndIndex + 1), function (curTrack) {
		return curTrack.trackid;

	});

	return libQ.resolve({service: sTargetService, trackids: arrayTrackIds, startindex: nStartIndex});

}
