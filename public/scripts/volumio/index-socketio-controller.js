var socket = io();
var nPlayQueuePosition = 0;

// Get the state upon load
socket.emit('command', 'volumioGetState');
socket.emit('command', 'volumioGetQueue');

document.getElementById('button-volumioplay').onclick = function() {
	socket.emit('command', 'volumioPlay');
}

document.getElementById('button-volumiopause').onclick = function() {
	socket.emit('command', 'volumioPause');
}

document.getElementById('button-volumiostop').onclick = function() {
	socket.emit('command', 'volumioStop');
}

document.getElementById('button-volumioprev').onclick = function() {
	socket.emit('command', 'volumioPrevious');
}

document.getElementById('button-volumionext').onclick = function() {
	socket.emit('command', 'volumioNext');
}

document.getElementById('button-mpdplay').onclick = function() {
	socket.emit('command', 'mpdPlay');
}

document.getElementById('button-mpdstop').onclick = function() {
	socket.emit('command', 'mpdStop');
}

document.getElementById('button-mpdcurrentsong').onclick = function() {
	socket.emit('command', 'mpdCurrentSong');
}

document.getElementById('button-mpdstatus').onclick = function() {
	socket.emit('command', 'mpdStatus');
}
document.getElementById('button-mpdnext').onclick = function() {
	socket.emit('command', 'mpdNext');
}

document.getElementById('button-mpdprev').onclick = function() {
	socket.emit('command', 'mpdPrevious');
}

document.getElementById('button-spopplay').onclick = function() {
	socket.emit('command', 'spopPlay');
}

document.getElementById('button-spopstop').onclick = function() {
	socket.emit('command', 'spopStop');
}

document.getElementById('button-spopnext').onclick = function() {
	socket.emit('command', 'spopNext');
}

document.getElementById('button-spopprev').onclick = function() {
	socket.emit('command', 'spopPrevious');
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

socket.on('updateQueue', function (arrayQueue) {
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
