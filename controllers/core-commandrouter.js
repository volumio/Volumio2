// Define the CoreCommandRouter class
// This class constructor links a bunch of external handler functions to external listeners.
// Since this class does not have properties or methods, you can potentially destroy the object
// right after you instantiate it without any loss of functionality.
module.exports = CoreCommandRouter;
function CoreCommandRouter (arrayInterfaces, CorePlayQueue, ControllerMpd) {

	// Start event listeners for each client interface
	for (i = 0; i < arrayInterfaces.length; i++) {
		arrayInterfaces[i].on('clientCommand', handleClientCommand);

	}

	// Define the command routing table for client commands
	function handleClientCommand (clientCommand) {

		// Play command
		if (clientCommand.command === 'volumioPlay') {
			CorePlayQueue.play(clientCommand.promise);

		// Pause command
		} else if (clientCommand.command === 'volumioPause') {
			CorePlayQueue.pause(clientCommand.promise);

		// Stop command
		} else if (clientCommand.command === 'volumioStop') {
			CorePlayQueue.stop(clientCommand.promise);

		// Next track command
		} else if (clientCommand.command === 'volumioNext') {
			CorePlayQueue.next(clientCommand.promise);

		// Previous track command
		} else if (clientCommand.command === 'volumioPrevious') {
			CorePlayQueue.previous(clientCommand.promise);

		// Get state command
		} else if (clientCommand.command === 'volumioGetState') {
			CorePlayQueue.getState(clientCommand.promise);

		// Get queue command
		} else if (clientCommand.command === 'volumioGetQueue') {
			CorePlayQueue.getQueue(clientCommand.promise);

		// MPD Play command
		} else if (clientCommand.command === 'mpdPlay') {
			ControllerMpd.Play(clientCommand.promise);

		// MPD Stop command
		} else if (clientCommand.command === 'mpdStop') {
			ControllerMpd.Stop(clientCommand.promise);

		// Otherwise the command was not recognized
		} else {
			clientCommand.promise.reject("No handler associated with command " + "\"" + clientCommand.command + "\"");

		}

	}

	// Define the command routing table for broadcasted updates from core services
	function handleBroadcastUpdate () {

	}

}

