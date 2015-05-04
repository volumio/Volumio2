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
document.getElementById('button-spopupdatetracklist').onclick = function() {emitClientEvent('spopUpdateTracklist', '');}
document.getElementById('button-volumiorebuildlibrary').onclick = function() {emitClientEvent('volumioRebuildLibrary', '');}
document.getElementById('button-clearconsole').onclick = clearConsole;

// Create listeners for websocket events--------------------------------

socket.on('connect', function () {
	printConsoleMessage('Websocket connected.');
	enableControls();

	// Get the state upon load
	emitClientEvent('volumioGetState', '');

	// Get the play queue
	emitClientEvent('volumioGetQueue', '');

	// Request the music library root
	emitClientEvent('volumioBrowseLibrary', '');

});

socket.on('disconnect', function () {
	printConsoleMessage('Websocket disconnected.');
	disableControls();
	clearPlayQueue();
	clearBrowseView();
	clearPlayerStateDisplay();
	stopPlaybackTimer();

});

socket.on('volumioPushState', function (state) {
	playerState = state;
	timeLastStateUpdate = Date.now();
	updatePlayerStateDisplay();

	if (state.status === 'play') {
		startPlaybackTimer(state.seek);

	} else {
		stopPlaybackTimer();

	}

//	printConsoleMessage('volumioPushState: ' + JSON.stringify(state));

});

socket.on('volumioPushQueue', function (arrayQueue) {
	updatePlayerQueue(arrayQueue);
//	printConsoleMessage('volumioPushQueue: ' + JSON.stringify(arrayQueue));

});

socket.on('volumioPushBrowseData', function (objBrowseData) {
	updateBrowseView(objBrowseData);
//	printConsoleMessage('volumioPushBrowseData: ' + JSON.stringify(objBrowseData));

});

socket.on('printConsoleMessage', function (sMessage) {
	printConsoleMessage(sMessage);

});

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

function updateBrowseView (objBrowseData) {
	clearBrowseView();

	var nodeBrowseView = document.getElementById('browseview');
	var arrayDataKeys = Object.keys(objBrowseData);

	for (i = 0; i < arrayDataKeys.length; i++) {
		var curEntry = objBrowseData[arrayDataKeys[i]];

		var nodeListItem = document.createElement('LI');

		var nodeLink = document.createElement('a');
		nodeLink.setAttribute('href', '#');
		nodeLink.onclick = registerBrowseLibraryLink(curEntry['id']);

		var nodeText = document.createTextNode(curEntry['name']);

		nodeLink.appendChild(nodeText);
		nodeListItem.appendChild(nodeLink);
		nodeBrowseView.appendChild(nodeListItem);

	}

}

function registerBrowseLibraryLink (sId) {
	return function() {
		emitClientEvent('volumioBrowseLibrary', sId);

	}

}

function clearBrowseView () {
	var nodeBrowseView = document.getElementById('browseview');

	if (nodeBrowseView.firstChild) {
		while (nodeBrowseView.firstChild) {
			nodeBrowseView.removeChild(nodeBrowseView.firstChild);

		}

	}

}

function emitClientEvent (sEvent, sData) {
	socket.emit(sEvent, sData);
	printConsoleMessage(sEvent + ': ' + sData);

}

