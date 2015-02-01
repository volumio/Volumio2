var socket = io();
var playerState = {};
var timeLastStateUpdate = 0;
var timerPlayback = null;

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

function updatePlayerStateDisplay () {
	clearPlayerStateDisplay();

	var nodeText = document.createTextNode(JSON.stringify(playerState));
	document.getElementById('playerstate').appendChild(nodeText);

}

function startPlaybackTimer (nStartTime) {
	window.clearInterval(timerPlayback);

	timerPlayback = window.setInterval(function () {
		playerState.seek = nStartTime + Date.now() - timeLastStateUpdate;
		updatePlayerStateDisplay();

	}, 500);

}

function stopPlaybackTimer () {
	window.clearInterval(timerPlayback);

}

function clearPlayerStateDisplay() {
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

function emitClientEvent (sEvent, sData) {
	socket.emit(sEvent, sData);
	printConsoleMessage(sEvent + ': ' + sData);

}

// Create listeners for websocket events--------------------------------

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
	clearPlayerStateDisplay();
	stopPlaybackTimer();

});

socket.on('volumioPushState', function (state) {
	playerState = state;
	timeLastStateUpdate = Date.now();
	updatePlayerStateDisplay();

	if (state.status === 'play') {
		startPlaybackTimer(state.seek);

	}

	printConsoleMessage('volumioPushState: ' + JSON.stringify(state));

});

socket.on('volumioPushQueue', function (arrayQueue) {
	updatePlayerQueue(arrayQueue);
	printConsoleMessage('volumioPushQueue: ' + JSON.stringify(arrayQueue));

});

socket.on('printConsoleMessage', function (sMessage) {
	printConsoleMessage(sMessage);

});
