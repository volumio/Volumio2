var socket = io();
var playerState = {};
var timeLastStateUpdate = 0;
var timerPlayback = null;
var libraryHistory = new Array();
var playlistHistory = new Array();
var nLibraryHistoryPosition = 0;
var nPlaylistHistoryPosition = 0;

// Define button actions --------------------------------------------
document.getElementById('button-testtrue').onclick = function() {socket.emit('callMethod',  {endpoint:'system_controller/system',method:'setTestSystem',data:'true'})};
document.getElementById('button-testfalse').onclick = function() {socket.emit('callMethod',  {endpoint:'system_controller/system',method:'setTestSystem',data:'false'})};
document.getElementById('button-sshenable').onclick = function() {socket.emit('callMethod',  {endpoint:'system_controller/system',method:'enableSSH',data:'true'})};
document.getElementById('button-sshdisable').onclick = function() {socket.emit('callMethod',  {endpoint:'system_controller/system',method:'enableSSH',data:'false'})};





// Create listeners for websocket events--------------------------------
socket.on('connect', function() {
	enableControls();
	//updateLibraryHistoryButtons();

	// Get the state upon load
	emitEvent('getState', '');

	// Get the play queue
	emitEvent('getQueue', '');

	// Get the HW UUID
    socket.emit('getDeviceHWUUID', '');
  
	// Get app metrics
	socket.emit('getMetrics', '');

	// Request the music library root
	//emitEvent('getLibraryFilters', 'root');

	//emitEvent('getPlaylistIndex', 'root');
});

socket.on('disconnect', function() {


	libraryHistory = new Array();
	nLibraryHistoryPosition = 0;
	playlistHistory = new Array();
	nPlaylistHistoryPosition = 0;
	clearPlayQueue();
	clearBrowseView();
	clearPlaylistView();
	clearPlayerStateDisplay();
});

socket.on('pushState', function(state) {
	playerState = state;
	timeLastStateUpdate = Date.now();
	updatePlayerStateDisplay();

	if (state.status === 'play') {
		startPlaybackTimer(state.seek);
	} else {
	}

});

socket.on('pushQueue', function(arrayQueue) {
	updatePlayerQueue(arrayQueue);
});

socket.on('pushSendBugReport', function(data) {

	// defensive: make sure data has no junk prefixed or suffixed
	var str = data;
	str = str.replace('^[^{]*{','{');
	str = str.replace('}[^{]*$','}');
	var json = JSON.parse(data);
	document.getElementById('bug-form-description').value = json.link;
	var btn = document.getElementById('bug-form-button');
	document.getElementById("bug-form-button").style.display = "none";
	document.getElementById("copy-button").style.display = "inline";
	document.getElementById("log-message").innerHTML = "Log successfully sent, this is the link to your log file";

});

socket.on('pushDeviceHWUUID', function(data) {

    document.getElementById('hwuuid-text').value = data;
    document.getElementById("hwuuid-copy-button").style.display = "inline";
});

socket.on('pushMetrics', function (data) {
  let table = '<table>';
  table += '<tr><td>Module</td><td>Seconds</td><td>Millisecond</td></tr>';
  for (const met in data) {
    table += `<tr><td> ${met} </td><td> ${data[met][0]} </td><td> ${(data[met][1] / 1000000).toFixed(2)} </td></tr>`;
  }
  table += '</table>';
  document.getElementById('metrics-text').innerHTML = table;
  console.log(table);
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
			sSubText = sSubText.concat(' Service: ' + curEntry.service + '');
		}
		if ('uri' in curEntry) {
			sSubText = sSubText.concat(' Uri: ' + curEntry.uri + '');
		}
		if ('artist' in curEntry) {
			sSubText = sSubText.concat(' Artist: ' + curEntry.artist);
		}
		if ('album' in curEntry) {
			sSubText = sSubText.concat(' Album: ' + curEntry.album + '');
		}
		if ('albumart' in curEntry) {
			sSubText = sSubText.concat(' Albumart: ' + curEntry.albumart + '');
		}


		var buttonRemove = document.createElement('button');
		buttonRemove.appendChild(document.createTextNode('Remove'));
		buttonRemove.className = 'button-itemaction';

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


function emitEvent(sEvent, sParam1, sParam2) {
	socket.emit(sEvent, sParam1, sParam2);
}

document.querySelector('form.bug-form').addEventListener('submit', function (e) {
	//prevent the normal submission of the form
	var inputBugDesc = document.getElementById('bug-form-description');
	e.preventDefault();
	// Emit first and second input value
	var obj = {
		text : inputBugDesc.value
	};
	socket.emit('callMethod',  {endpoint:'system_controller/system',method:'sendBugReport',data:obj});
    document.getElementById('bug-form-description').value = 'Sending log report, please wait';

});

var clipboardDemos = new Clipboard('[data-clipboard-demo]');
clipboardDemos.on('success', function(e) {
	e.clearSelection();
});

var btns = document.querySelectorAll('.btn');
for (var i = 0; i < btns.length; i++) {
	btns[i].addEventListener('mouseleave', function(e) {
		e.currentTarget.setAttribute('class', 'btn');
		e.currentTarget.removeAttribute('aria-label');
	});
}
