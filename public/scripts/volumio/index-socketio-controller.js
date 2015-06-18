var socket = io();
var playerState = {};
var timeLastStateUpdate = 0;
var timerPlayback = null;
var libraryHistory = new Array();
var nLibraryHistoryPosition = 0;

// Define button actions --------------------------------------------
document.getElementById('button-volumioplay').onclick = function() {emitClientEvent('volumioPlay', '');}
document.getElementById('button-volumiopause').onclick = function() {emitClientEvent('volumioPause', '');}
document.getElementById('button-volumiostop').onclick = function() {emitClientEvent('volumioStop', '');}
document.getElementById('button-volumioprev').onclick = function() {emitClientEvent('volumioPrevious', '');}
document.getElementById('button-volumionext').onclick = function() {emitClientEvent('volumioNext', '');}
document.getElementById('button-spopupdatetracklist').onclick = function() {emitClientEvent('spopUpdateTracklist', '');}
document.getElementById('button-volumiorebuildlibrary').onclick = function() {emitClientEvent('volumioRebuildLibrary', '');}
document.getElementById('button-clearconsole').onclick = clearConsole;
document.getElementById('button-libraryback').onclick = libraryBack;
document.getElementById('button-libraryforward').onclick = libraryForward;

// Create listeners for websocket events--------------------------------

socket.on('connect', function() {
	printConsoleMessage('Websocket connected.');
	enableControls();
	updateLibraryHistoryButtons();

	// Get the state upon load
	emitClientEvent('volumioGetState', '');

	// Get the play queue
	emitClientEvent('volumioGetQueue', '');

	// Request the music library root
	emitClientEvent('volumioBrowseLibrary', {'uid': 'index:root', 'sortby': '', 'datapath': [], 'entries': 0, 'index': 0});
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

socket.on('volumioPushState', function(state) {
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

socket.on('volumioPushQueue', function(arrayQueue) {
	updatePlayerQueue(arrayQueue);
//	printConsoleMessage('volumioPushQueue: ' + JSON.stringify(arrayQueue));
});

socket.on('volumioPushBrowseData', function(objBrowseData) {
	libraryHistory.splice(nLibraryHistoryPosition + 1, libraryHistory.length - nLibraryHistoryPosition - 1, objBrowseData);
	libraryForward();
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
			sSubText = sSubText.concat(' [Albums]: ' + JSON.stringify(curEntry.album) + '');
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
			sSubText = sSubText.concat(' [Albums]: ' + JSON.stringify(curEntry.album) + '');
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
		var objBrowseParameters = {'uid': curEntry['uid'], 'sortby': sSortBy, 'datapath': arrayDataPath, 'entries': 0, 'index': 0};

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
		emitClientEvent('volumioBrowseLibrary', objBrowseParameters);
	}
}

function addQueueUids(arrayUids) {
	return function() {
		emitClientEvent('volumioAddQueueUids', arrayUids);
	}
}

function removeQueueItem(nIndex) {
	return function() {
		emitClientEvent('volumioRemoveQueueItem', nIndex);
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

function emitClientEvent(sEvent, sData) {
	socket.emit(sEvent, sData);
	printConsoleMessage('[Client Event]: ' + sEvent + ' [Parameters]:' + JSON.stringify(sData));
}

