var socket = io();
var nPlayQueuePosition = 0;

// Define button actions --------------------------------------------
document.getElementById('button-volumioplay').onclick = function() {emitClientEvent('volumioPlay', '');}
document.getElementById('button-volumiopause').onclick = function() {emitClientEvent('volumioPause', '');}
document.getElementById('button-volumiostop').onclick = function() {emitClientEvent('volumioStop', '');}
document.getElementById('button-volumioprev').onclick = function() {emitClientEvent('volumioPrevious', '');}
document.getElementById('button-volumionext').onclick = function() {emitClientEvent('volumioNext', '');}
document.getElementById('button-clearconsole').onclick = clearConsole;

// Define internal functions ----------------------------------------------
function clearConsole () {
	var nodeConsole = document.getElementById('console');

	while (nodeConsole.firstChild) {
		nodeConsole.removeChild(nodeConsole.firstChild);
	}

}

function enableControls () {
	arrayWebsocketControls = document.getElementsByClassName("control-websocket");

	for (i = 0; i < arrayWebsocketControls.length; i++) {
		arrayWebsocketControls[i].disabled = false;

	}

}

function disableControls() {
	arrayWebsocketControls = document.getElementsByClassName("control-websocket");

	for (i = 0; i < arrayWebsocketControls.length; i++) {
		arrayWebsocketControls[i].disabled = true;

	}

}

function printConsoleMessage (message) {
	var nodeListItem = document.createElement('LI');
	var nodeText = document.createTextNode(message);

	nodeListItem.appendChild(nodeText);
	document.getElementById('console').appendChild(nodeListItem);

	var divConsole = document.getElementById('div-console');
	divConsole.scrollTop = divConsole.scrollHeight;

}

function updatePlayerState (playerState) {
	clearPlayerState();

	var nodeText = document.createTextNode(JSON.stringify(playerState));
	document.getElementById('playerstate').appendChild(nodeText);

}

function clearPlayerState() {
	var nodePlayerState = document.getElementById('playerstate');

	if (nodePlayerState.firstChild) {
		while (nodePlayerState.firstChild) {
			nodePlayerState.removeChild(nodePlayerState.firstChild);

		}

	}

}

function updatePlayerQueue (arrayQueue) {
	clearPlayQueue();

	var nodePlayQueue = document.getElementById('playqueue');
	var nodeListItem = null;
	var nodeText = null;
	for (i = 0; i < arrayQueue.length; i++) {
		nodeListItem = document.createElement('LI');
		nodeText = document.createTextNode(JSON.stringify(arrayQueue[i]));

		nodeListItem.appendChild(nodeText);
		nodePlayQueue.appendChild(nodeListItem);

	}

}

function clearPlayQueue () {
	var nodePlayQueue = document.getElementById('playqueue');

	if (nodePlayQueue.firstChild) {
		while (nodePlayQueue.firstChild) {
			nodePlayQueue.removeChild(nodePlayQueue.firstChild);

		}

	}

}

function emitClientEvent (sType, sData) {
	socket.emit('clientEvent', {type: sType, data: sData});
	printConsoleMessage(sType + ': ' + sData);

}

// Create listeners for websocket events--------------------------------

socket.on('interfaceEvent', handleInterfaceEvent);

socket.on('connect', function () {
	printConsoleMessage('Websocket connected.');
	enableControls();

	// Get the state upon load
	emitClientEvent('volumioGetState', '');
	emitClientEvent('volumioGetQueue', '');

});

socket.on('disconnect', function () {
	printConsoleMessage('Websocket disconnected.');
	disableControls();
	clearPlayQueue();
	clearPlayerState();

});

// Handle incoming interface events
function handleInterfaceEvent (interfaceEvent) {
	if (interfaceEvent.type === 'consoleMessage') {
		printConsoleMessage(interfaceEvent.data);

	} else if (interfaceEvent.type === 'volumioQueueUpdate') {
		updatePlayerQueue(interfaceEvent.data);
		printConsoleMessage('volumioQueueUpdate: ' + JSON.stringify(interfaceEvent.data));

	} else if (interfaceEvent.type === 'volumioStateUpdate') {
		updatePlayerState(interfaceEvent.data);
		printConsoleMessage('volumioStateUpdate: ' + JSON.stringify(interfaceEvent.data));

	} else if (interfaceEvent.type === 'responseError') {
		printConsoleMessage('responseError: ' + interfaceEvent.data);

	}

}

