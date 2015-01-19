// Define the CorePlayQueue class
module.exports = CorePlayQueue;
function CorePlayQueue () {

	// Init temporary play queue for testing purposes
	this.arrayQueue = [

		{service: 'mpd', trackid: 'Ae7R2pn6CEyVG7GNuGGtbQ==', metadata: {title: 'Go Ham Radio'}}

		// trackid is md5-base64 of 'http://2363.live.streamtheworld.com:80/KUSCMP128_SC'
		, {service: 'mpd', trackid: 'B6+k7b7XGU+uZrpNI3ayYw==', metadata: {title: 'KUSC Radio'}}

		// trackid is md5-base64 of 'spotify:track:6r509c4WvHaH1OctmcLzNv'
		, {service: 'spop', trackid: 'krsU08D9KlvC00UFwzdAHw==', metadata: {title: 'Gates of Gold 1)Arrival: a View From Sea'}}

	];

}

CorePlayQueue.prototype.getQueue = function () {
	return this.arrayQueue;

}

CorePlayQueue.prototype.modQueue = function () {

}

// Get a array of contiguous trackIds which share the same service, starting at nStartIndex
CorePlayQueue.prototype.getTrackBlock = function (nStartIndex) {
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

	return {service: sTargetService, trackids: arrayTrackIds};
	
}
