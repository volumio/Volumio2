var socket = io();
var playerState = {};
var timeLastStateUpdate = 0;
var timerPlayback = null;
var libraryHistory = new Array();
var playlistHistory = new Array();
var nLibraryHistoryPosition = 0;
var nPlaylistHistoryPosition = 0;

// Define button actions --------------------------------------------
document.getElementById('button-volumioplay').onclick = function() {emitPlayerCommand('play', '');}
document.getElementById('button-volumiopause').onclick = function() {emitPlayerCommand('pause', '');}
document.getElementById('button-volumiostop').onclick = function() {emitPlayerCommand('stop', '');}
document.getElementById('button-volumioprev').onclick = function() {emitPlayerCommand('previous', '');}
document.getElementById('button-volumionext').onclick = function() {emitPlayerCommand('next', '');}
document.getElementById('button-spopupdatetracklist').onclick = function() {emitServiceCommand('updateTracklist', 'spop');}
document.getElementById('button-volumiorebuildlibrary').onclick = function() {emitPlayerCommand('rebuildLibrary', '');}
document.getElementById('button-clearconsole').onclick = clearConsole;
document.getElementById('button-libraryback').onclick = libraryBack;
document.getElementById('button-libraryforward').onclick = libraryForward;
document.getElementById('button-playlistback').onclick = playlistBack;
document.getElementById('button-playlistforward').onclick = playlistForward;
document.getElementById('button-volumeup').onclick = function() {emitPlayerCommand('volume', '+');}
document.getElementById('button-volumedown').onclick = function() {emitPlayerCommand('volume', '-');}
document.getElementById('button-volumemute').onclick = function() {emitPlayerCommand('volume', 'mute');}
document.getElementById('button-volumeunmute').onclick = function() {emitPlayerCommand('volume', 'unmute');}
document.getElementById('button-volumioimportplaylists').onclick = function() {emitPlayerCommand('importServicePlaylists', '');}

// Socket.io form
var input1 = document.getElementById('form-ws-1');
var input2 = document.getElementById('form-ws-2');

document.querySelector('form.pure-form').addEventListener('submit', function (e) {

	//prevent the normal submission of the form
	e.preventDefault();
	// Emit first and second input value
	socket.emit(input1.value, input2.value);
	printConsoleMessage('WS Message '+ input1.value + ' ' + input2.value );
});

// Create listeners for websocket events--------------------------------
socket.on('connect', function() {
	printConsoleMessage('Websocket connected.');
	enableControls();
	updateLibraryHistoryButtons();

	// Get the state upon load
	emitPlayerCommand('getState', '');

	// Get the play queue
	emitPlayerCommand('getQueue', '');

	// Request the music library root
	emitPlayerCommand('getLibraryListing', {'uid': 'index:root', 'sortby': '', 'datapath': [], 'entries': 0, 'index': 0});

	emitPlayerCommand('getPlaylistRoot', '');
});

socket.on('disconnect', function() {
	printConsoleMessage('Websocket disconnected.');
	libraryHistory = new Array();
	nLibraryHistoryPosition = 0;
	updateLibraryHistoryButtons();

	disableControls();
	clearPlayQueue();
	clearBrowseView();
	clearPlayerStateDisplay();
	stopPlaybackTimer();
});

socket.on('pushState', function(state) {
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

socket.on('pushQueue', function(arrayQueue) {
	updatePlayerQueue(arrayQueue);
//	printConsoleMessage('volumioPushQueue: ' + JSON.stringify(arrayQueue));
});

socket.on('pushLibraryListing', function(objBrowseData) {
	libraryHistory.splice(nLibraryHistoryPosition + 1, libraryHistory.length - nLibraryHistoryPosition - 1, objBrowseData);
	libraryForward();
//	printConsoleMessage('volumioPushBrowseData: ' + JSON.stringify(objBrowseData));
});

socket.on('pushPlaylistRoot', function(objBrowseData) {
	playlistHistory.splice(nPlaylistHistoryPosition + 1, playlistHistory.length - nPlaylistHistoryPosition - 1, objBrowseData);
	playlistForward();
//	printConsoleMessage('volumioPushBrowseData: ' + JSON.stringify(objBrowseData));
});

socket.on('pushPlaylistListing', function(objBrowseData) {
	playlistHistory.splice(nPlaylistHistoryPosition + 1, playlistHistory.length - nPlaylistHistoryPosition - 1, objBrowseData);
	playlistForward();
//	printConsoleMessage('volumioPushBrowseData: ' + JSON.stringify(objBrowseData));
});

socket.on('printConsoleMessage', function(sMessage) {
	printConsoleMessage(sMessage);
});

// Define internal functions ----------------------------------------------
function clearConsole() {
	var nodeConsole = document.getElementById('console');

	while (nodeConsole.firstChild) {
		nodeConsole.removeChild(nodeConsole.firstChild);
	}
}

function enableControls() {
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

function printConsoleMessage(message) {
	var nodeListItem = document.createElement('li');
	var nodePre = document.createElement('PRE');
	nodePre.appendChild(document.createTextNode(message))

	nodeListItem.appendChild(nodePre);
	document.getElementById('console').appendChild(nodeListItem);

	var divConsole = document.getElementById('div-console');
	divConsole.scrollTop = divConsole.scrollHeight;
}

function updatePlayerStateDisplay() {
	clearPlayerStateDisplay();

	var nodeText = document.createTextNode(JSON.stringify(playerState));
	document.getElementById('playerstate').appendChild(nodeText);
}

function startPlaybackTimer(nStartTime) {
	window.clearInterval(timerPlayback);

	timerPlayback = window.setInterval(function() {
		playerState.seek = nStartTime + Date.now() - timeLastStateUpdate;
		updatePlayerStateDisplay();

	}, 500);
}

function stopPlaybackTimer() {
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

function updatePlayerQueue(arrayQueue) {
	clearPlayQueue();

	var nodePlayQueue = document.getElementById('div-playqueue');

	for (i = 0; i < arrayQueue.length; i++) {
		var curEntry = arrayQueue[i];

		var sText = curEntry.name;
		var sSubText = '';
		if ('service' in curEntry) {
			sSubText = sSubText.concat(' [Service]: ' + curEntry.service + '');
		}
		if ('uri' in curEntry) {
			sSubText = sSubText.concat(' [Uri]: ' + curEntry.uri + '');
		}
		if ('artists' in curEntry) {
			sSubText = sSubText.concat(' [Artists]: ' + JSON.stringify(curEntry.artists));
		}
		if ('albums' in curEntry) {
			sSubText = sSubText.concat(' [Albums]: ' + JSON.stringify(curEntry.albums) + '');
		}
		if ('tracknumber' in curEntry) {
			sSubText = sSubText.concat(' [Tracknumber]: ' + JSON.stringify(curEntry.tracknumber));
		}
		if ('date' in curEntry) {
			sSubText = sSubText.concat(' [Date]: ' + JSON.stringify(curEntry.date) + '');
		}

		var buttonRemove = document.createElement('button');
		buttonRemove.appendChild(document.createTextNode('Remove'));
		buttonRemove.className = 'button-itemaction';
		buttonRemove.onclick = removeQueueItem(i);

		var nodeSpan = document.createElement('span');
		nodeSpan.appendChild(document.createTextNode(sText));
		nodeSpan.appendChild(buttonRemove);
		nodeSpan.appendChild(document.createElement('br'));
		nodeSpan.appendChild(document.createTextNode(sSubText));

		var nodeListItem = document.createElement('li');
		nodeListItem.appendChild(nodeSpan);
		nodePlayQueue.appendChild(nodeListItem);
	}
}

function clearPlayQueue() {
	var nodePlayQueue = document.getElementById('div-playqueue');

	if (nodePlayQueue.firstChild) {
		while (nodePlayQueue.firstChild) {
			nodePlayQueue.removeChild(nodePlayQueue.firstChild);
		}
	}
}

function updateBrowseView(objBrowseData) {
	clearBrowseView();

	//printConsoleMessage(JSON.stringify(objBrowseData));

	var nodeBrowseView = document.getElementById('browseview');
	var arrayDataKeys = Object.keys(objBrowseData);
	for (i = 0; i < arrayDataKeys.length; i++) {
		var curEntry = objBrowseData[arrayDataKeys[i]];

		var sText = curEntry.name;
		var sSubText = '';
		if ('artists' in curEntry) {
			sSubText = sSubText.concat(' [Artists]: ' + JSON.stringify(curEntry.artists));
		}
		if ('albums' in curEntry) {
			sSubText = sSubText.concat(' [Albums]: ' + JSON.stringify(curEntry.albums) + '');
		}
		if ('tracknumber' in curEntry) {
			sSubText = sSubText.concat(' [Tracknumber]: ' + JSON.stringify(curEntry.tracknumber));
		}
		if ('date' in curEntry) {
			sSubText = sSubText.concat(' [Date]: ' + JSON.stringify(curEntry.date) + '');
		}
		if ('uris' in curEntry) {
			sSubText = sSubText.concat(' [Uris]: ' + JSON.stringify(curEntry.uris) + '');
		}

		var sBrowseField = '';
		var sSortBy = '';
		var arrayDataPath = [];
		if (curEntry.type === 'genre') {
			sSortBy = 'name';
			arrayDataPath = ['artistuids', '#', {'name': 'name', 'uid': 'uid', 'type': 'type', 'genres': ['genreuids', '#', {'name': 'name', 'uid': 'uid'}]}];
		} else if (curEntry.type === 'artist') {
			sSortBy = 'date';
			arrayDataPath = ['albumuids', '#', {'name': 'name', 'uid': 'uid', 'type': 'type', 'artists': ['artistuids', '#', {'name': 'name', 'uid': 'uid'}], 'date': 'date'}];
		} else if (curEntry.type === 'album') {
			sSortBy = 'tracknumber';
			arrayDataPath = ['trackuids', '#', {'name': 'name', 'uid': 'uid', 'type': 'type', 'albums': ['albumuids', '#', {'name': 'name', 'uid': 'uid'}], 'artists': ['artistuids', '#', {'name': 'name', 'uid': 'uid'}], 'tracknumber': 'tracknumber', 'date': 'date', 'uris': 'uris'}];
		}
		var objBrowseParameters = {'uid': curEntry['uid'], 'options': {'sortby': sSortBy, 'datapath': arrayDataPath, 'entries': 0, 'index': 0}};

		var buttonAdd = document.createElement('button');
		buttonAdd.appendChild(document.createTextNode('Add'));
		buttonAdd.className = 'button-itemaction';
		buttonAdd.onclick = addQueueUids([curEntry['uid']]);

		var nodeLink = document.createElement('a');
		nodeLink.setAttribute('href', '#');
		nodeLink.appendChild(document.createTextNode(sText));
		nodeLink.onclick = browseLibraryLink(objBrowseParameters);

		var nodeSpan = document.createElement('span');
		nodeSpan.appendChild(nodeLink);
		nodeSpan.appendChild(buttonAdd);
		nodeSpan.appendChild(document.createElement('br'));
		nodeSpan.appendChild(document.createTextNode(sSubText));

		var nodeListItem = document.createElement('LI');
		nodeListItem.appendChild(nodeSpan);
		nodeBrowseView.appendChild(nodeListItem);
	}
}

function browseLibraryLink(objBrowseParameters) {
	return function() {
		emitPlayerCommand('getLibraryListing', objBrowseParameters);
	}
}

function updatePlaylistView(objPlaylistData) {
	clearPlaylistView();

	//printConsoleMessage(JSON.stringify(objBrowseData));

	var nodePlaylistView = document.getElementById('playlistview');
	var arrayDataKeys = Object.keys(objPlaylistData);
	for (i = 0; i < arrayDataKeys.length; i++) {
		var curEntry = objPlaylistData[arrayDataKeys[i]];

		var sText = curEntry.name;
		var sSubText = '';
		if ('artists' in curEntry) {
			sSubText = sSubText.concat(' [Artists]: ' + JSON.stringify(curEntry.artists));
		}
		if ('albums' in curEntry) {
			sSubText = sSubText.concat(' [Albums]: ' + JSON.stringify(curEntry.albums) + '');
		}
		if ('tracknumber' in curEntry) {
			sSubText = sSubText.concat(' [Tracknumber]: ' + JSON.stringify(curEntry.tracknumber));
		}
		if ('date' in curEntry) {
			sSubText = sSubText.concat(' [Date]: ' + JSON.stringify(curEntry.date) + '');
		}
		if ('uris' in curEntry) {
			sSubText = sSubText.concat(' [Uris]: ' + JSON.stringify(curEntry.uris) + '');
		}

		var sPlaylistField = '';
		var sSortBy = '';
		var arrayDataPath = [];
		if (curEntry.type === 'genre') {
			sSortBy = 'name';
			arrayDataPath = ['artistuids', '#', {'name': 'name', 'uid': 'uid', 'type': 'type', 'genres': ['genreuids', '#', {'name': 'name', 'uid': 'uid'}]}];
		} else if (curEntry.type === 'artist') {
			sSortBy = 'date';
			arrayDataPath = ['albumuids', '#', {'name': 'name', 'uid': 'uid', 'type': 'type', 'artists': ['artistuids', '#', {'name': 'name', 'uid': 'uid'}], 'date': 'date'}];
		} else if (curEntry.type === 'album') {
			sSortBy = 'tracknumber';
			arrayDataPath = ['trackuids', '#', {'name': 'name', 'uid': 'uid', 'type': 'type', 'albums': ['albumuids', '#', {'name': 'name', 'uid': 'uid'}], 'artists': ['artistuids', '#', {'name': 'name', 'uid': 'uid'}], 'tracknumber': 'tracknumber', 'date': 'date', 'uris': 'uris'}];
		}

		var buttonAdd = document.createElement('button');
		buttonAdd.appendChild(document.createTextNode('Add'));
		buttonAdd.className = 'button-itemaction';
		buttonAdd.onclick = addQueueUids([curEntry['uid']]);

		var nodeLink = document.createElement('a');
		nodeLink.setAttribute('href', '#');
		nodeLink.appendChild(document.createTextNode(sText));
		nodeLink.onclick = playlistBrowseLink(curEntry['uid']);

		var nodeSpan = document.createElement('span');
		nodeSpan.appendChild(nodeLink);
		//nodeSpan.appendChild(buttonAdd);
		nodeSpan.appendChild(document.createElement('br'));
		nodeSpan.appendChild(document.createTextNode(sSubText));

		var nodeListItem = document.createElement('LI');
		nodeListItem.appendChild(nodeSpan);
		nodePlaylistView.appendChild(nodeListItem);
	}
}

function playlistBrowseLink(sUid) {
	return function() {
		emitPlayerCommand('getPlaylistListing', sUid);
	}
}

function addQueueUids(arrayUids) {
	return function() {
		emitPlayerCommand('addQueueUids', arrayUids);
	}
}

function removeQueueItem(nIndex) {
	return function() {
		emitPlayerCommand('removeQueueItem', nIndex);
	}
}

function clearBrowseView() {
	var nodeBrowseView = document.getElementById('browseview');

	if (nodeBrowseView.firstChild) {
		while (nodeBrowseView.firstChild) {
			nodeBrowseView.removeChild(nodeBrowseView.firstChild);
		}
	}
}

function clearPlaylistView() {
	var nodePlaylistView = document.getElementById('playlistview');

	if (nodePlaylistView.firstChild) {
		while (nodePlaylistView.firstChild) {
			nodePlaylistView.removeChild(nodePlaylistView.firstChild);
		}
	}
}

function updateLibraryHistoryButtons() {
	var nHistoryItems = libraryHistory.length;

	if (nHistoryItems <= 1) {
		document.getElementById('button-libraryback').disabled = true;
		document.getElementById('button-libraryforward').disabled = true;
	} else if (nLibraryHistoryPosition <= 0) {
		document.getElementById('button-libraryback').disabled = true;
		document.getElementById('button-libraryforward').disabled = false;
	} else if (nLibraryHistoryPosition >= nHistoryItems - 1) {
		document.getElementById('button-libraryback').disabled = false;
		document.getElementById('button-libraryforward').disabled = true;
	} else {
		document.getElementById('button-libraryback').disabled = false;
		document.getElementById('button-libraryforward').disabled = false;
	}
}

function libraryForward() {
	var nHistoryItems = libraryHistory.length;

	if (nHistoryItems <= 1) {
		nLibraryHistoryPosition = 0;
	} else if (nLibraryHistoryPosition <= 0) {
		nLibraryHistoryPosition = 1;
	} else if (nLibraryHistoryPosition >= nHistoryItems - 1) {
		nLibraryHistoryPosition = nHistoryItems - 1;
	} else {
		nLibraryHistoryPosition++;
	}

	updateBrowseView(libraryHistory[nLibraryHistoryPosition]);
	updateLibraryHistoryButtons();
}

function libraryBack() {
	var nHistoryItems = libraryHistory.length;

	if (nHistoryItems <= 1) {
		nLibraryHistoryPosition = 0;
	} else if (nLibraryHistoryPosition <= 0) {
		nLibraryHistoryPosition = 0;
	} else if (nLibraryHistoryPosition >= nHistoryItems - 1) {
		nLibraryHistoryPosition = nHistoryItems - 2;
	} else {
		nLibraryHistoryPosition--;
	}

	updateBrowseView(libraryHistory[nLibraryHistoryPosition]);
	updateLibraryHistoryButtons();
}

function updatePlaylistHistoryButtons() {
	var nHistoryItems = playlistHistory.length;

	if (nHistoryItems <= 1) {
		document.getElementById('button-playlistback').disabled = true;
		document.getElementById('button-playlistforward').disabled = true;
	} else if (nPlaylistHistoryPosition <= 0) {
		document.getElementById('button-playlistback').disabled = true;
		document.getElementById('button-playlistforward').disabled = false;
	} else if (nPlaylistHistoryPosition >= nHistoryItems - 1) {
		document.getElementById('button-playlistback').disabled = false;
		document.getElementById('button-playlistforward').disabled = true;
	} else {
		document.getElementById('button-playlistback').disabled = false;
		document.getElementById('button-playlistforward').disabled = false;
	}
}

function playlistForward() {
	var nHistoryItems = playlistHistory.length;

	if (nHistoryItems <= 1) {
		nPlaylistHistoryPosition = 0;
	} else if (nPlaylistHistoryPosition <= 0) {
		nPlaylistHistoryPosition = 1;
	} else if (nPlaylistHistoryPosition >= nHistoryItems - 1) {
		nPlaylistHistoryPosition = nHistoryItems - 1;
	} else {
		nPlaylistHistoryPosition++;
	}

	updatePlaylistView(playlistHistory[nPlaylistHistoryPosition]);
	updatePlaylistHistoryButtons();
}

function playlistBack() {
	var nHistoryItems = playlistHistory.length;

	if (nHistoryItems <= 1) {
		nPlaylistHistoryPosition = 0;
	} else if (nPlaylistHistoryPosition <= 0) {
		nPlaylistHistoryPosition = 0;
	} else if (nPlaylistHistoryPosition >= nHistoryItems - 1) {
		nPlaylistHistoryPosition = nHistoryItems - 2;
	} else {
		nPlaylistHistoryPosition--;
	}

	updatePlaylistView(playlistHistory[nPlaylistHistoryPosition]);
	updatePlaylistHistoryButtons();
}

function emitEvent(sEvent, sParam1, sParam2) {
	socket.emit(sEvent, sParam1, sParam2);
	printConsoleMessage('[Event]: ' + sEvent + ' [Parameters]:' + JSON.stringify(sParam1) + ', ' + JSON.stringify(sParam2));
}

function emitPlayerCommand(sCommand, sParam) {
	socket.emit('playerCommand', sCommand, sParam);
	printConsoleMessage('[Player Command]: ' + sCommand + ' [Parameters]:' + JSON.stringify(sParam));
}

function emitServiceCommand(sCommand, sParam) {
	socket.emit('serviceCommand', sCommand, sParam);
	printConsoleMessage('[Service Command]: ' + sCommand + ' [Parameters]:' + JSON.stringify(sParam));
}

function emitInterfaceCommand(sCommand, sParam) {
	socket.emit('interfaceCommand', sCommand, sParam);
	printConsoleMessage('[Interface Command]: ' + sCommand + ' [Parameters]:' + JSON.stringify(sParam));
}

function emitPluginCommand(sCommand, sParam) {
	socket.emit('pluginCommand', sCommand, sParam);
	printConsoleMessage('[Plugin Command]: ' + sCommand + ' [Parameters]:' + JSON.stringify(sParam));
}
