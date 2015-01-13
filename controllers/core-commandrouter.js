// Define the CoreCommandRouter class
module.exports = CoreCommandRouter;
function CoreCommandRouter (arrayInterfaces, CorePlayQueue) {

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

		// Otherwise the command was not recognized
		} else {
			clientCommand.promise.reject("command not recognized");

		}

	}

	// Define the command routing table for broadcasted updates from core services
	function handleBroadcastUpdate () {

	}

}

