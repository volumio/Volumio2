// Define the CoreCommandRouter class
// This class constructor links a bunch of external handler functions to external listeners.
// Since this class does not have properties or methods, you can potentially destroy the object
// right after you instantiate it without any loss of functionality.
module.exports = CoreCommandRouter;
function CoreCommandRouter (arrayInterfaces, CorePlayQueue, ControllerMpd) {

	// Start event listeners for each client interface
	for (i = 0; i < arrayInterfaces.length; i++) {
		arrayInterfaces[i].on('clientEvent', handleClientEvent);

	}

	// Start event listener for each service controller
	ControllerMpd.on('daemonEvent', handleDaemonEvent);

	// Start event listener for each core service
	CorePlayQueue.on('coreEvent', handleCoreEvent);

	// Define the command routing table for client commands
	function handleClientEvent (clientEvent, promisedResponse) {

		// Play command
		if (clientEvent.type === 'volumioPlay') {
			CorePlayQueue.play(promisedResponse);

		// Pause command
		} else if (clientEvent.type === 'volumioPause') {
			CorePlayQueue.pause(promisedResponse);

		// Stop command
		} else if (clientEvent.type === 'volumioStop') {
			CorePlayQueue.stop(promisedResponse);

		// Next track command
		} else if (clientEvent.type === 'volumioNext') {
			CorePlayQueue.next(promisedResponse);

		// Previous track command
		} else if (clientEvent.type === 'volumioPrevious') {
			CorePlayQueue.previous(promisedResponse);

		// Get state command
		} else if (clientEvent.type === 'volumioGetState') {
			CorePlayQueue.getState(promisedResponse);

		// Get queue command
		} else if (clientEvent.type === 'volumioGetQueue') {
			CorePlayQueue.getQueue(promisedResponse);

		// MPD Play command
		} else if (clientEvent.type === 'mpdPlay') {
			ControllerMpd.play(promisedResponse);

		// MPD Stop command
		} else if (clientEvent.type === 'mpdStop') {
			ControllerMpd.stop(promisedResponse);

		// Otherwise the event was not recognized
		} else {
			if (typeof promisedResponse !== 'undefined') {
				promisedResponse.reject({type: 'responseError', data: 'No handler associated with event ' + '\"' + JSON.stringify(clientEvent.type) + '\"'});

			}

		}

	}

	// Define the command routing table for broadcasted updates from daemons
	function handleDaemonEvent (daemonEvent, promisedResponse) {

		// MPD state updated
		if (daemonEvent.type === 'mpdState') {
			for (i = 0; i < arrayInterfaces.length; i++) {

				// Temporary - print the new state on client consoles
				arrayInterfaces[i].consoleMessage('MPD State: ' + JSON.stringify(daemonEvent.data));

			}

		// Otherwise the event was not recognized
		} else {
			if (typeof promisedResponse !== 'undefined') {
				daemonEvent.promisedResponse.reject({type: 'responseError', data: 'No handler associated with event ' + '\"' + JSON.stringify(daemonEvent.type) + '\"'});

			}

		}

	}

	// Define the command routing table for broadcasted updates from core services
	function handleCoreEvent (coreEvent, promisedResponse) {

		// Volumio player state updated
		if (coreEvent.type === 'playerState') {
			for (i = 0; i < arrayInterfaces.length; i++) {

				// Announce new player state to each client interface
				arrayInterfaces[i].playerState(coreEvent.data);

			}

		// Otherwise the event was not recognized
		} else {
			if (typeof promisedResponse !== 'undefined') {
				coreEvent.promisedResponse.reject({type: 'responseError', data: 'No handler associated with event ' + '\"' + JSON.stringify(coreEvent.type) + '\"'});

			}

		}

	}

}

