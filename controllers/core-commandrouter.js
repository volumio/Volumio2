// Define the CoreCommandRouter class
// This class constructor links a bunch of external handler functions to external listeners.
// Since this class does not have properties or methods, you can potentially destroy the object
// right after you instantiate it without any loss of functionality.
module.exports = CoreCommandRouter;
function CoreCommandRouter (arrayInterfaces, CoreStateMachine, ControllerMpd) {

	// Start event listeners for each client interface
	for (i = 0; i < arrayInterfaces.length; i++) {
		arrayInterfaces[i].on('interfaceEvent', handleInterfaceEvent);

	}

	// Start event listener for each service controller
	ControllerMpd.on('controllerEvent', handleControllerEvent);

	// Start event listener for each core service
	CoreStateMachine.on('coreEvent', handleCoreEvent);


	// Command routing tables -----------------------------------------------------------

	// Define the command routing table for client commands
	function handleInterfaceEvent (interfaceEvent, promisedResponse) {

		// Play command
		if (interfaceEvent.type === 'volumioPlay') {
			CoreStateMachine.play(promisedResponse);

		// Pause command
		} else if (interfaceEvent.type === 'volumioPause') {
			CoreStateMachine.pause(promisedResponse);

		// Stop command
		} else if (interfaceEvent.type === 'volumioStop') {
			CoreStateMachine.stop(promisedResponse);

		// Next track command
		} else if (interfaceEvent.type === 'volumioNext') {
			CoreStateMachine.next(promisedResponse);

		// Previous track command
		} else if (interfaceEvent.type === 'volumioPrevious') {
			CoreStateMachine.previous(promisedResponse);

		// Get state command
		} else if (interfaceEvent.type === 'volumioGetState') {
			CoreStateMachine.getState(promisedResponse);

		// Get queue command
		} else if (interfaceEvent.type === 'volumioGetQueue') {
			CoreStateMachine.getQueue(promisedResponse);

		// MPD Play command
		} else if (interfaceEvent.type === 'mpdPlay') {
			ControllerMpd.play(promisedResponse);

		// MPD Stop command
		} else if (interfaceEvent.type === 'mpdStop') {
			ControllerMpd.stop(promisedResponse);

		// Otherwise the event was not recognized
		} else {
			if (typeof promisedResponse !== 'undefined') {
				promisedResponse.resolve({type: 'responseError', data: 'No handler associated with interface event ' + JSON.stringify(interfaceEvent.type)});

			}

		}

	}

	// Define the command routing table for broadcasted updates from daemons
	function handleControllerEvent (controllerEvent, promisedResponse) {

		// MPD state updated
		if (controllerEvent.type === 'mpdStateUpdate') {
			CoreStateMachine.updateStateFromMpd(controllerEvent.data);

		// Error was broadcast
		} else if (controllerEvent.type === 'error') {
			for (i = 0; i < arrayInterfaces.length; i++) {
				arrayInterfaces[i].printConsoleMessage('error: ' + JSON.stringify(controllerEvent.data));

			}

		// Otherwise the event was not recognized
		} else {
			if (typeof promisedResponse !== 'undefined') {
				controllerEvent.promisedResponse.resolve({type: 'responseError', data: 'No handler associated with controller event ' + JSON.stringify(controllerEvent.type)});

			}

		}

	}

	// Define the command routing table for broadcasted updates from core services
	function handleCoreEvent (coreEvent, promisedResponse) {

		// Volumio player state updated
		if (coreEvent.type === 'volumioStateUpdate') {
			for (i = 0; i < arrayInterfaces.length; i++) {

				// Announce new player state to each client interface
				arrayInterfaces[i].volumioStateUpdate(coreEvent.data);

			}

		// MPD clear-add-play
		} else if (coreEvent.type === 'mpdClearAddPlay') {
			ControllerMpd.clearAddPlay(coreEvent.data, promisedResponse);

		// MPD get updated state
		} else if (coreEvent.type === 'mpdGetState') {
			ControllerMpd.getState(promisedResponse);

		// MPD get updated state
		} else if (coreEvent.type === 'mpdGetQueue') {
			ControllerMpd.getQueue(promisedResponse);

		// Error was broadcast
		} else if (coreEvent.type === 'error') {
			for (i = 0; i < arrayInterfaces.length; i++) {
				arrayInterfaces[i].printConsoleMessage('error: ' + JSON.stringify(coreEvent.data));

			}

		// Otherwise the event was not recognized
		} else {
			if (typeof promisedResponse !== 'undefined') {
				coreEvent.promisedResponse.resolve({type: 'responseError', data: 'No handler associated with core event ' + JSON.stringify(coreEvent.type)});

			}

		}

	}

}

