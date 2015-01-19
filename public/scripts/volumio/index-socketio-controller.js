var socket = io();
var nPlayQueuePosition = 0;

// Define button actions --------------------------------------------
document.getElementById('button-volumioplay').onclick = function() {emitClientEvent('volumioPlay', '');}
document.getElementById('button-volumiopause').onclick = function() {emitClientEvent('volumioPause', '');}
document.getElementById('button-volumiostop').onclick = function() {emitClientEvent('volumioStop', '');}
document.getElementById('button-volumioprev').onclick = function() {emitClientEvent('volumioPrevious', '');}
document.getElementById('button-volumionext').onclick = function() {emitClientEvent('volumioNext', '');}
document.getElementById('button-volumiostatus').onclick = function() {emitClientEvent('volumioGetState', '');}
document.getElementById('button-mpdplay').onclick = function() {emitClientEvent('mpdPlay', '');}
document.getElementById('button-mpdstop').onclick = function() {emitClientEvent('mpdStop', '');}
document.getElementById('button-mpdpause').onclick = function() {emitClientEvent('mpdPause', '');}
document.getElementById('button-mpdcurrentsong').onclick = function() {emitClientEvent('mpdCurrentSong', '');}
document.getElementById('button-mpdstatus').onclick = function() {emitClientEvent('mpdStatus', '');}
document.getElementById('button-mpdnext').onclick = function() {emitClientEvent('mpdNext', '');}
document.getElementById('button-mpdprev').onclick = function() {emitClientEvent('mpdPrevious', '');}
document.getElementById('button-mpdtest').onclick = function() {emitClientEvent('mpdTest', '');}
document.getElementById('button-spopplay').onclick = function() {emitClientEvent('spopPlay', '');}
document.getElementById('button-spopstop').onclick = function() {emitClientEvent('spopStop', '');}
document.getElementById('button-spoppause').onclick = function() {emitClientEvent('spopPause', '');}
document.getElementById('button-spopnext').onclick = function() {emitClientEvent('spopNext', '');}
document.getElementById('button-spopprev').onclick = function() {emitClientEvent('spopPrevious', '');}
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

	while (nodePlayQueue.firstChild) {
		nodePlayQueue.removeChild(nodePlayQueue.firstChild);
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

});

// Handle incoming interface events
function handleInterfaceEvent (interfaceEvent) {
	if (interfaceEvent.type === 'consoleMessage') {
		printConsoleMessage(interfaceEvent.data);

	} else if (interfaceEvent.type === 'playerQueueUpdate') {
		updatePlayerQueue(interfaceEvent.data);
		printConsoleMessage('playerQueueUpdate: ' + JSON.stringify(interfaceEvent.data));

	} else if (interfaceEvent.type === 'playerStateUpdate') {
		printConsoleMessage('playerStateUpdate: ' + JSON.stringify(interfaceEvent.data));

	} else if (interfaceEvent.type === 'responseError') {
		printConsoleMessage('responseError: ' + interfaceEvent.data);

	}

}

