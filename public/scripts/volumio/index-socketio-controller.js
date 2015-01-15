var socket = io();
var nPlayQueuePosition = 0;

// Get the state upon load
socket.emit('clientEvent', 'volumioGetState', '');
socket.emit('clientEvent', 'volumioGetQueue', '');

document.getElementById('button-volumioplay').onclick = function() {
	socket.emit('clientEvent', 'volumioPlay', '');
}

document.getElementById('button-volumiopause').onclick = function() {
	socket.emit('clientEvent', 'volumioPause', '');
}

document.getElementById('button-volumiostop').onclick = function() {
	socket.emit('clientEvent', 'volumioStop', '');
}

document.getElementById('button-volumioprev').onclick = function() {
	socket.emit('clientEvent', 'volumioPrevious', '');
}

document.getElementById('button-volumionext').onclick = function() {
	socket.emit('clientEvent', 'volumioNext', '');
}

document.getElementById('button-mpdplay').onclick = function() {
	socket.emit('clientEvent', 'mpdPlay', '');
}

document.getElementById('button-mpdstop').onclick = function() {
	socket.emit('clientEvent', 'mpdStop', '');
}

document.getElementById('button-mpdcurrentsong').onclick = function() {
	socket.emit('clientEvent', 'mpdCurrentSong', '');
}

document.getElementById('button-mpdstatus').onclick = function() {
	socket.emit('clientEvent', 'mpdStatus', '');
}
document.getElementById('button-mpdnext').onclick = function() {
	socket.emit('clientEvent', 'mpdNext', '');
}

document.getElementById('button-mpdprev').onclick = function() {
	socket.emit('clientEvent', 'mpdPrevious', '');
}

document.getElementById('button-spopplay').onclick = function() {
	socket.emit('clientEvent', 'spopPlay', '');
}

document.getElementById('button-spopstop').onclick = function() {
	socket.emit('clientEvent', 'spopStop', '');
}

document.getElementById('button-spopnext').onclick = function() {
	socket.emit('clientEvent', 'spopNext', '');
}

document.getElementById('button-spopprev').onclick = function() {
	socket.emit('clientEvent', 'spopPrevious', '');
}

document.getElementById('button-clearconsole').onclick = function() {
	var nodeConsole = document.getElementById('console');

	while (nodeConsole.firstChild) {
		nodeConsole.removeChild(nodeConsole.firstChild);
	}

}

socket.on('consoleMessage', function(message) {
	var nodeListItem = document.createElement('LI');
	var nodeText = document.createTextNode(message);

	nodeListItem.appendChild(nodeText);
	document.getElementById('console').appendChild(nodeListItem);

	var divConsole = document.getElementById('div-console');
	divConsole.scrollTop = divConsole.scrollHeight;

});

socket.on('playerQueue', function (arrayQueue) {
	var nodePlayQueue = document.getElementById('playqueue');

	while (nodePlayQueue.firstChild) {
		nodePlayQueue.removeChild(nodePlayQueue.firstChild);
	}

	var nodeListItem = null;
	var nodeText = null;
	for (i = 0; i < arrayQueue.length; i++) {
		nodeListItem = document.createElement('LI');
		nodeText = document.createTextNode(JSON.stringify(arrayQueue[i]));

		nodeListItem.appendChild(nodeText);
		document.getElementById('playqueue').appendChild(nodeListItem);

	}

});
