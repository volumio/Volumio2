// Define the CorePlayQueue class
module.exports = CorePlayQueue;
function CorePlayQueue () {

	// Init temporary play queue for testing purposes
	this.arrayQueue = [

		// trackid is md5-base64 of 'http://2363.live.streamtheworld.com:80/KUSCMP128_SC'
		{service: 'mpd', trackid: 'B6+k7b7XGU+uZrpNI3ayYw==', metadata: {title: 'KUSC Radio'}},

		// trackid is md5-base64 of 'spotify:track:6r509c4WvHaH1OctmcLzNv'
		{service: 'spop', trackid: 'krsU08D9KlvC00UFwzdAHw==', metadata: {title: 'Gates of Gold 1)Arrival: a View From Sea'}}

	];

}

CorePlayQueue.prototype.getQueue = function (promisedResponse) {
	promisedResponse.resolve({type: 'playerQueueUpdate', data: this.arrayQueue});

}

CorePlayQueue.prototype.modQueue = function () {

}
