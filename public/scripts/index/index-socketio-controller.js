var socket = io();

document.getElementById('button-mpdplay').onclick = function() {
	socket.emit('command', 'mpd/currentsong');
}

document.getElementById('button-mpdstop').onclick = function() {
	socket.emit('command', 'mpd/status');
}

document.getElementById('button-mpdnext').onclick = function() {
	socket.emit('command', 'mpd/next');
}

document.getElementById('button-mpdprev').onclick = function() {
	socket.emit('command', 'mpd/previous');
}

document.getElementById('button-spopplay').onclick = function() {
	socket.emit('command', 'spop/play');
}

document.getElementById('button-spopstop').onclick = function() {
	socket.emit('command', 'spop/stop');
}

document.getElementById('button-spopnext').onclick = function() {
	socket.emit('command', 'spop/next');
}

document.getElementById('button-spopprev').onclick = function() {
	socket.emit('command', 'spop/previous');
}

document.getElementById('button-clearconsole').onclick = function() {
	var nodeConsole = document.getElementById('console');

	while (nodeConsole.firstChild) {
		nodeConsole.removeChild(nodeConsole.firstChild);
	}

}

socket.on('consoleMessage', function(message){
	var nodeListItem = document.createElement("LI");
	var nodeText = document.createTextNode(message);

	nodeListItem.appendChild(nodeText);
	document.getElementById('console').appendChild(nodeListItem);

});