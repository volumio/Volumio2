var libNet = require('net');
var server = libNet.createServer(onConnect);

function onConnect (connClient) {
	// Announce the current status
	connClient.write(JSON.stringify(stateCurrent) + '\n');

	// When the client sends a command
	connClient.on('data', function (input) {
		var nNewlineLocation = input.toString().indexOf('\r\n');
		var sCommand = input.toString().substring(0, nNewlineLocation);

		// There are 3x possible playback states and 5x client commands which change that playback state, handle each transition case separately
		// First, if the 'close' command is sent, skip the other cases
		if (sCommand === "close") {
			connClient.end();

		// Current status is stopped
		} else if (stateCurrent.status === 'stop') {
			// Play command sent
			if (sCommand === 'play') {
				stateCurrent.status = 'play';
				stateCurrent.track = arrayQueue[stateCurrent.position];
				stateCurrent.seek = 0;

			// Next command sent
			} else if (sCommand === 'next') {
				if (stateCurrent.position < arrayQueue.length - 1) {
					stateCurrent.position++;
					stateCurrent.track = arrayQueue[stateCurrent.position];

				}

			// Previous command sent
			} else if (sCommand === 'previous') {
				if (stateCurrent.position > 0) {
					stateCurrent.position--;
					stateCurrent.track = arrayQueue[stateCurrent.position];

				}

			}

		// Current status is playing
		} else if (stateCurrent.status === 'play') {
			// Stop command sent
			if(sCommand === 'stop') {
				stateCurrent.status = 'stop';
				stateCurrent.seek = 0;

			// Next command sent
			} else if (sCommand === 'next') {
				if (stateCurrent.position < arrayQueue.length - 1) {
					stateCurrent.position++;
					stateCurrent.track = arrayQueue[stateCurrent.position];
					stateCurrent.seek = 0;

				}

			// Previous command sent
			} else if (sCommand === 'previous') {
				if (stateCurrent.position > 0) {
					stateCurrent.position--;
					stateCurrent.track = arrayQueue[stateCurrent.position];
					stateCurrent.seek = 0;

				}

			// Pause command sent
			} else if (sCommand === 'pause') {
				stateCurrent.status = 'pause';
				// <- update seek pos here

			}

		// Current status is paused
		} else if (stateCurrent.status === 'pause') {
			// Play command sent
			if (sCommand === 'play') {
				stateCurrent.status = 'play';

			// Stop command sent
			} else if(sCommand === 'stop') {
				stateCurrent.status = 'stop';
				stateCurrent.seek = 0;

			// Next command sent
			} else if (sCommand === 'next') {
				if (stateCurrent.position < arrayQueue.length - 1) {
					stateCurrent.position++;
					stateCurrent.track = arrayQueue[stateCurrent.position];

				}

				stateCurrent.status = 'play';
				stateCurrent.seek = 0;

			// Previous command sent
			} else if (sCommand === 'previous') {
				if (stateCurrent.position > 0) {
					stateCurrent.position--;
					stateCurrent.track = arrayQueue[stateCurrent.position];

				}

				stateCurrent.status = 'play';
				stateCurrent.seek = 0;

			}

		}

		connClient.write(JSON.stringify(stateCurrent) + '\n');

	});

}

// Server listens for commands on port 3002
server.listen(3002);

// Initialize the player state
var stateCurrent = {status: "stop", position: 0, seek: 0, track: {}}; // Current state of the player
var arrayQueue = [
	{track_interface: 'mpd', track_uri: 'http://2363.live.streamtheworld.com:80/KUSCMP128_SC'},
	{track_interface: 'spop', track_uri: 'spotify:track:6r509c4WvHaH1OctmcLzNv'}

];

stateCurrent.position = 0;
stateCurrent.status = 'stop';
stateCurrent.seek = 0;

if (arrayQueue.length > 0) {
	stateCurrent.track = arrayQueue[stateCurrent.position];

}

