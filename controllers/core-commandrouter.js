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

	// Define the command routing table for client commands
	function handleClientEvent (clientEvent) {

		// Play command
		if (clientEvent.type === 'volumioPlay') {
			CorePlayQueue.play(clientEvent.promise);

		// Pause command
		} else if (clientEvent.type === 'volumioPause') {
			CorePlayQueue.pause(clientEvent.promise);

		// Stop command
		} else if (clientEvent.type === 'volumioStop') {
			CorePlayQueue.stop(clientEvent.promise);

		// Next track command
		} else if (clientEvent.type === 'volumioNext') {
			CorePlayQueue.next(clientEvent.promise);

		// Previous track command
		} else if (clientEvent.type === 'volumioPrevious') {
			CorePlayQueue.previous(clientEvent.promise);

		// Get state command
		} else if (clientEvent.type === 'volumioGetState') {
			CorePlayQueue.getState(clientEvent.promise);

		// Get queue command
		} else if (clientEvent.type === 'volumioGetQueue') {
			CorePlayQueue.getQueue(clientEvent.promise);

		// MPD Play command
		} else if (clientEvent.type === 'mpdPlay') {
			ControllerMpd.play(clientEvent.promise);

		// MPD Stop command
		} else if (clientEvent.type === 'mpdStop') {
			ControllerMpd.stop(clientEvent.promise);

		// Otherwise the event was not recognized
		} else {
			if ('promise' in clientEvent) {
				clientEvent.promise.reject("No handler associated with event " + "\"" + clientEvent.type + "\"");

			}

		}

	}

	// Define the command routing table for broadcasted updates from daemons
	function handleDaemonEvent (daemonEvent) {

		// MPD state updated
		if (daemonEvent.type === 'mpdState') {
			for (i = 0; i < arrayInterfaces.length; i++) {

				// Temporary - print the new state on client consoles
				arrayInterfaces[i].consoleMessage('MPD State: ' + JSON.stringify(daemonEvent.data));

			}

		// Otherwise the event was not recognized
		} else {
			if ('promise' in daemonEvent) {
				daemonEvent.promise.reject("No handler associated with event " + "\"" + daemonEvent.type + "\"");

			}

		}

	}

}

