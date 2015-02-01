var libQ = require('q');

// Define the CorePlayQueue class
module.exports = CorePlayQueue;
function CorePlayQueue () {

	// Init temporary play queue for testing purposes
	this.arrayQueue = [
		{service: 'mpd', trackid: 'aHR0cDovL3VrNC5pbnRlcm5ldC1yYWRpby5jb206MTU5Mzgv', metadata: {title: 'Go Ham Radio'}}
		, {service: 'mpd', trackid: 'aHR0cDovLzIzNjMubGl2ZS5zdHJlYW10aGV3b3JsZC5jb206ODAvS1VTQ01QMTI4X1ND', metadata: {title: 'KUSC Radio'}}
		, {service: 'spop', trackid: 'c3BvdGlmeTp0cmFjazo2cjUwOWM0V3ZIYUgxT2N0bWNMek52', metadata: {title: 'Gates of Gold 1)Arrival: a View From Sea'}}

	];

}

// Public Methods ---------------------------------------------------------------------------------------
// These are 'this' aware, and return a promise

// Get a promise for contents of play queue
CorePlayQueue.prototype.getQueue = function () {

	console.log('CorePlayQueue::getQueue');
	return libQ(this.arrayQueue);

}

// Get a array of contiguous trackIds which share the same service, starting at nStartIndex
CorePlayQueue.prototype.getTrackBlock = function (nStartIndex) {

	console.log('CorePlayQueue::getTrackBlock');
	var sTargetService = this.arrayQueue[nStartIndex].service;
	var nEndIndex = nStartIndex;

	while (nEndIndex < this.arrayQueue.length - 1) {
		if (this.arrayQueue[nEndIndex + 1].service !== sTargetService) {
			break;

		}

		nEndIndex ++ ;

	}

	var arrayTrackIds = this.arrayQueue
		.slice(nStartIndex, nEndIndex + 1)
		.map(function (curTrack) {
			return curTrack.trackid;

		});

	return libQ({service: sTargetService, trackids: arrayTrackIds, startindex: nStartIndex});

}
