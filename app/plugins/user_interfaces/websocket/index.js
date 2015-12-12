var libQ = require('kew');
var libFast = require('fast.js');
var fs=require('fs-extra');
var s=require('string');


/** Define the InterfaceWebUI class (Used by DEV UI)
 *
 * @type {InterfaceWebUI}
 */
module.exports = InterfaceWebUI;
function InterfaceWebUI (context) {
	var self = this;

	self.context=context;
	self.commandRouter = self.context.coreCommand;
	self.logger=self.commandRouter.logger;

	/** Init SocketIO listener */
	self.libSocketIO = require('socket.io')(self.context.websocketServer);

	/** On Client Connection, listen for various types of clients requests */
	self.libSocketIO.on('connection', function (connWebSocket) {
		try {






			/** Request Volumio State
			 * It returns an array definining the Playback state, Volume and other amenities
			 * @example {"status":"stop","position":0,"dynamictitle":null,"seek":0,"duration":0,"samplerate":null,"bitdepth":null,"channels":null,"volume":82,"mute":false,"service":null}
			 *
			 * where
			 * @status is the status of the player
			 * @position is the position in the play queue of current playing track (if any)
			 * @dynamictitle is the title
			 * @seek is track's current elapsed play time
			 * @duration track's duration
			 * @samplerate current samplerate
			 * @bitdepth bitdepth
			 * @channels mono or stereo
			 * @volume current Volume
			 * @mute if true, Volumio is muted
			 * @service current playback service (mpd, spop...)
			 */
			connWebSocket.on('getState', function () {
				selfConnWebSocket = this;

				var timeStart = Date.now();
				self.logStart('Client requests Volumio state')
					.then(libFast.bind(self.commandRouter.volumioGetState, self.commandRouter))
					.then(function (state) {
						return self.pushState.call(self, state, selfConnWebSocket);
					})
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});
/* Error handling: causes  Maximum call stack size exceeded
 connWebSocket.on('error', function () {
				selfConnWebSocket = this;

				selfConnWebSocket.emit('error', '');

			});
			*/
			connWebSocket.on('getQueue', function () {
				selfConnWebSocket = this;

				var timeStart = Date.now();
				self.logStart('Client requests Volumio queue')
					.then(libFast.bind(self.commandRouter.volumioGetQueue, self.commandRouter))
					.then(function (queue) {
						return self.pushQueue.call(self, queue, selfConnWebSocket);
					})
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('removeQueueItem', function (nIndex) {
				selfConnWebSocket = this;

				var timeStart = Date.now();
				self.logStart('Client requests remove Volumio queue item')
					.then(function () {
						return self.commandRouter.volumioRemoveQueueItem.call(self.commandRouter, nIndex);
					})
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('addQueueUids', function (arrayUids) {
				selfConnWebSocket = this;

				var timeStart = Date.now();
				self.logStart('Client requests add Volumio queue items')
					.then(function () {
						return self.commandRouter.volumioAddQueueUids.call(self.commandRouter, arrayUids);
					})
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('addToQueue', function (data) {
				selfConnWebSocket = this;
				//var queuedata = JSON.parse(data);
				if (data.service == undefined || data.service == 'mpd') {
					var uri = data.uri;
					var arr = uri.split("/");
					arr.shift();
					str = arr.join('/');
				}
				else str = data.uri;
				//TODO add proper service handler
				var timeStart = Date.now();
				self.logStart('Client requests add Volumio queue items')
					.then(function () {
						return self.commandRouter.executeOnPlugin('music_service', 'mpd', 'add', str);
					})
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.commandRouter.pushToastMessage('success', "Added", str);
					});
			});

			connWebSocket.on('addPlay', function (data) {
				selfConnWebSocket = this;

				if (data.service == undefined || data.service == 'mpd') {
					var uri = data.uri;
					var arr = uri.split("/");
					arr.shift();
					str = arr.join('/');
				}
				else str = data.uri;

				console.log("DATA: " + str);
				//TODO add proper service handler
				var timeStart = Date.now();
				self.logStart('Client requests add and Play Volumio queue items')
					.then(function () {
						return self.commandRouter.executeOnPlugin('music_service', 'mpd', 'addPlay', str);
					})
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.commandRouter.pushToastMessage('success', "Play", str);
					});
			});

			connWebSocket.on('removeFromQueue', function (positionN) {
				selfConnWebSocket = this;
				//TODO add proper service handler
				var timeStart = Date.now();
				var position = positionN.value;
				self.logStart('Client requests remove Volumio queue items')
					.then(function () {
						return self.commandRouter.executeOnPlugin('music_service', 'mpd', 'remove', position);
					})
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('seek', function (position) {
				selfConnWebSocket = this;
				//TODO add proper service handler
				var timeStart = Date.now();
				self.logStart('Client requests Seek to ' + position)
					.then(function () {
						return self.commandRouter.executeOnPlugin('music_service', 'mpd', 'seek', position);
					})
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('getLibraryListing', function (objParams) {
				selfConnWebSocket = this;

				var timeStart = Date.now();
				self.logStart('Client requests get library listing')
					.then(function () {
						return self.commandRouter.volumioGetLibraryListing.call(self.commandRouter, objParams.uid, objParams.options);
					})
					.then(function (objBrowseData) {
						if (objBrowseData) {
							return self.pushLibraryListing.call(self, objBrowseData, selfConnWebSocket);
						}
					})
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('getLibraryFilters', function (sUid) {
				selfConnWebSocket = this;

				var timeStart = Date.now();
				self.logStart('Client requests get library index')
					.then(function () {
						return self.commandRouter.volumioGetLibraryFilters.call(self.commandRouter, sUid);
					})
					.then(function (objBrowseData) {
						if (objBrowseData) {
							return self.pushLibraryFilters.call(self, objBrowseData, selfConnWebSocket);
						}
					})
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('getPlaylistIndex', function (sUid) {
				selfConnWebSocket = this;

				var timeStart = Date.now();
				self.logStart('Client requests get playlist index')
					.then(function () {
						return self.commandRouter.volumioGetPlaylistIndex.call(self.commandRouter, sUid);
					})
					.then(function (objBrowseData) {
						if (objBrowseData) {
							return self.pushPlaylistIndex.call(self, objBrowseData, selfConnWebSocket);
						}
					})
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('play', function (N) {
				var timeStart = Date.now();
				if (N == null) {
					self.logStart('Client requests Volumio play')
						.then(libFast.bind(self.commandRouter.volumioPlay, self.commandRouter))
						.fail(libFast.bind(self.pushError, self))
						.done(function () {
							return self.logDone(timeStart);
						});
				} else if (N.value != undefined) {
					return self.commandRouter.executeOnPlugin('music_service', 'mpd', 'play', N.value);
				}
			});

			connWebSocket.on('pause', function () {
				var timeStart = Date.now();
				self.logStart('Client requests Volumio pause')
					.then(libFast.bind(self.commandRouter.volumioPause, self.commandRouter))
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('stop', function () {
				var timeStart = Date.now();
				self.logStart('Client requests Volumio stop')
					.then(libFast.bind(self.commandRouter.volumioStop, self.commandRouter))
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('clearQueue', function () {
				var timeStart = Date.now();
				self.logStart('Client requests Volumio Clear Queue')
					.then(libFast.bind(self.commandRouter.volumioClearQueue, self.commandRouter))
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('previous', function () {
				var timeStart = Date.now();
				self.logStart('Client requests Volumio previous')
					.then(libFast.bind(self.commandRouter.volumioPrevious, self.commandRouter))
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('next', function () {
				var timeStart = Date.now();
				self.logStart('Client requests Volumio next')
					.then(libFast.bind(self.commandRouter.volumioNext, self.commandRouter))
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('setRandom', function (data) {
				selfConnWebSocket = this;
				//TODO add proper service handler
				var timeStart = Date.now();
				self.logStart('Client requests Volumio Random ' + data.value)
					.then(function () {
						return self.commandRouter.executeOnPlugin('music_service', 'mpd', 'random', data.value);
					})
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('setRepeat', function (data) {
				selfConnWebSocket = this;
				//TODO add proper service handler
				var timeStart = Date.now();
				self.logStart('Client requests Volumio Repeat ' + data.value)
					.then(function () {
						return self.commandRouter.executeOnPlugin('music_service', 'mpd', 'repeat', data.value);
					})
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('serviceUpdateTracklist', function (sService) {
				var timeStart = Date.now();
				self.logStart('Client requests Update Tracklist')
					.then(function () {
						self.commandRouter.serviceUpdateTracklist.call(self.commandRouter, sService);
					})
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('rebuildLibrary', function () {
				var timeStart = Date.now();
				self.logStart('Client requests Volumio Rebuild Library')
					.then(libFast.bind(self.commandRouter.volumioRebuildLibrary, self.commandRouter))
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('updateAllMetadata', function () {
				var timeStart = Date.now();
				self.logStart('Client requests update metadata cache')
					.then(libFast.bind(self.commandRouter.updateAllMetadata, self.commandRouter))
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('volume', function (VolumeInteger) {
				selfConnWebSocket = this;

				var timeStart = Date.now();
				self.logStart('Client requests Volume ' + VolumeInteger)
					.then(function () {
						return self.commandRouter.volumiosetvolume.call(self.commandRouter, VolumeInteger);
					})
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('importServicePlaylists', function () {
				var timeStart = Date.now();
				self.logStart('Client requests import of playlists')
					.then(libFast.bind(self.commandRouter.volumioImportServicePlaylists, self.commandRouter))
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('getMenuItems', function () {
				selfConnWebSocket = this;

				var timeStart = Date.now();
				self.logStart('Client requests Menu Items')
					.then(function () {
						var menuitems = fs.readJsonSync(__dirname + '/../../../config.json');

						console.log(JSON.stringify(menuitems['menuItems']));

						self.libSocketIO.emit('printConsoleMessage', menuitems['menuItems']);
						return self.libSocketIO.emit('pushMenuItems', menuitems['menuItems']);
					})
					.fail(libFast.bind(self.pushError, self))
					.done(function () {
						return self.logDone(timeStart);
					});
			});

			connWebSocket.on('callMethod', function (dataJson) {
				selfConnWebSocket = this;

				var promise;

				var category = dataJson.endpoint.substring(0, dataJson.endpoint.indexOf('/'));
				var name = dataJson.endpoint.substring(dataJson.endpoint.indexOf('/') + 1);
				promise = self.commandRouter.executeOnPlugin(category, name, dataJson.method, dataJson.data);
				if (promise != undefined) {
					promise.then(function (result) {
						connWebSocket.emit("pushMethod", result);
					})
						.fail(function () {
							connWebSocket.emit("pushMethod", {"ERRORE": "MESSAGGIO DI ERRRORE"});
						});
				} else {
				}
			});

			connWebSocket.on('getUiConfig', function (data) {
				selfConnWebSocket = this;

				var splitted = data.page.split('/');

				var response;

				if (splitted.length > 1)
					response = self.commandRouter.getUIConfigOnPlugin(splitted[0], splitted[1], {});
				else response = self.commandRouter.getUIConfigOnPlugin('system_controller', splitted[0], {});

				selfConnWebSocket.emit('pushUiConfig', response);
			});

			connWebSocket.on('getMultiRoomDevices', function (data) {
				selfConnWebSocket = this;

				self.pushMultiroom(selfConnWebSocket);
			});

			connWebSocket.on('getBrowseSources', function (data) {
				selfConnWebSocket = this;

				var returnedData = [{name: 'Favourites', uri: 'favourites'},
					{name: 'Playlists', uri: 'playlists'},
					{name: 'Music Library', uri: 'music-library'},
					{name: 'Radio', uri: 'radio'},
					{name: 'Radio Favourites', uri: 'radio-favourites'}];


				selfConnWebSocket.emit('pushBrowseSources', returnedData);
			});

			connWebSocket.on('browseLibrary', function (data) {
				selfConnWebSocket = this;

				var curUri = s(data.uri);

				var response;

				console.log("CURURI: " + curUri);

				if (curUri.startsWith('favourites')) {
					response = self.commandRouter.executeOnPlugin('music_service', 'mpd', 'listFavourites', curUri);
				}
				else if (curUri.startsWith('playlists')) {
					if (curUri == 'playlists')
						response = self.commandRouter.executeOnPlugin('music_service', 'mpd', 'listPlaylists', curUri);
					else response = self.commandRouter.executeOnPlugin('music_service', 'mpd', 'browsePlaylist', curUri);
				}
				else if (curUri.startsWith('music-library')) {
					response = self.commandRouter.executeOnPlugin('music_service', 'mpd', 'lsInfo', curUri);
				}
				else if (curUri.startsWith('radio-favourites')) {
					response = self.commandRouter.executeOnPlugin('music_service', 'dirble', 'listRadioFavourites');
				}
				else if (curUri.startsWith('radio')) {
					if (curUri == 'radio')
						response = self.commandRouter.executeOnPlugin('music_service', 'dirble', 'listRadioCategories', curUri);
					else response = self.commandRouter.executeOnPlugin('music_service', 'dirble', 'listRadioForCategory', curUri);
				}


				if (response != undefined) {
					response.then(function (result) {
						selfConnWebSocket.emit('pushBrowseLibrary', result);
					})
						.fail(function () {
							self.printToastMessage('error', "Browse error", 'An error occurred while browsing the folder.');
						});
				}

			});

			connWebSocket.on('search', function (data) {
				selfConnWebSocket = this;

				var query = data.value;

				var response;

				response = self.commandRouter.executeOnPlugin('music_service', 'mpd', 'search', query);

				if (response != undefined) {
					response.then(function (result) {
						selfConnWebSocket.emit('pushBrowseLibrary', result);
					})
						.fail(function () {
							self.printToastMessage('error', "Search error", 'An error occurred while Searching');
						});
				}
			});

			connWebSocket.on('GetTrackInfo', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.stateMachine.getState();
				returnedData.then(function (data) {
					selfConnWebSocket.emit('pushGetTrackInfo', data);
				});


			});


			// PLAYLIST MANAGEMENT
			connWebSocket.on('createPlaylist', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.playListManager.createPlaylist(data.name);
				returnedData.then(function (data) {
					selfConnWebSocket.emit('pushCreatePlaylist', data);
				});


			});

			connWebSocket.on('deletePlaylist', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.playListManager.deletePlaylist(data.value);
				returnedData.then(function (data) {
					selfConnWebSocket.emit('pushDeletePlaylist', data);
				});


			});

			connWebSocket.on('listPlaylist', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.playListManager.listPlaylist();
				returnedData.then(function (data) {
					selfConnWebSocket.emit('pushListPlaylist', data);
				});


			});

			connWebSocket.on('addToPlaylist', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.playListManager.addToPlaylist(data.name, 'mpd', data.uri);
				returnedData.then(function (data) {
					selfConnWebSocket.emit('pushAddToPlaylist', data);
				});

			});

			connWebSocket.on('removeFromPlaylist', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.playListManager.removeFromPlaylist(data.name, 'mpd', data.uri);
				returnedData.then(function (data) {
					selfConnWebSocket.emit('pushRemoveFromPlaylist', data);
				});


			});

			connWebSocket.on('playPlaylist', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.playListManager.playPlaylist(data.name);
				returnedData.then(function (data) {
					selfConnWebSocket.emit('pushPlayPlaylist', data);
				});


			});

			connWebSocket.on('enqueue', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.playListManager.enqueue(data.name);
				returnedData.then(function (data) {
					selfConnWebSocket.emit('pushEnqueue', data);
				});


			});

			//Favourites

			connWebSocket.on('addToFavourites', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.playListManager.addToFavourites('mpd', data.uri);
				returnedData.then(function (data) {
					selfConnWebSocket.emit('pushAddToFavourites', data);
				});

			});

			connWebSocket.on('removeFromFavourites', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.playListManager.removeFromFavourites(data.name, 'mpd', data.uri);
				returnedData.then(function (data) {
					selfConnWebSocket.emit('pushRemoveFromFavourites', data);
				});


			});

			connWebSocket.on('playFavourites', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.playListManager.playFavourites(data.name);
				returnedData.then(function (data) {
					selfConnWebSocket.emit('pushPlayFavourites', data);
				});


			});

			// Radio Favourites

			connWebSocket.on('addToRadioFavourites', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.playListManager.addToRadioFavourites('dirble', data.uri);
				returnedData.then(function (data) {
					selfConnWebSocket.emit('pushAddToRadioFavourites', data);
				});

			});

			connWebSocket.on('removeFromRadioFavourites', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.playListManager.removeFromRadioFavourites(data.name, 'dirble', data.uri);
				returnedData.then(function (data) {
					selfConnWebSocket.emit('pushRemoveFromRadioFavourites', data);
				});


			});

			connWebSocket.on('playRadioFavourites', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.playListManager.playRadioFavourites();
				returnedData.then(function (data) {
					selfConnWebSocket.emit('pushPlayRadioFavourites', data);
				});


			});


			connWebSocket.on('getSleep', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.executeOnPlugin('miscellanea', 'alarm-clock', 'getSleep', data);
				returnedData.then(function (data) {
					selfConnWebSocket.emit('pushSleep', data);
				});


			});


			connWebSocket.on('setSleep', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.executeOnPlugin('miscellanea', 'alarm-clock', 'setSleep', data);
				returnedData.then(function (data) {
					selfConnWebSocket.emit('pushSleep', data);
				});


			});

			connWebSocket.on('getMultiroom', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.executeOnPlugin('audio_interface', 'multiroom', 'getMultiroom', data);

				if (returnedData != undefined) {
					returnedData.then(function (data) {
						if (data != undefined){
						selfConnWebSocket.emit('pushMultiroom', data);
						}
					});
				}
				else console.log("Plugin multiroom or method getMultiroom not found");


			});


			connWebSocket.on('setMultiroom', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.executeOnPlugin('audio_interface', 'multiroom', 'setMultiroom', data);
				returnedData.then(function (data) {
					selfConnWebSocket.emit('pushMultiroom', data);
				});


			});

			connWebSocket.on('writeMultiroom', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.executeOnPlugin('audio_interface', 'multiroom', 'writeMultiRoom', data);

			});


			connWebSocket.on('setAsMultiroomSingle', function (data) {
				selfConnWebSocket = this;

				console.log("Setting as multiroomSingle");
				var returnedData = self.commandRouter.executeOnPlugin('audio_interface', 'multiroom', 'setSingle', data);

			});
			connWebSocket.on('setAsMultiroomServer', function (data) {
				selfConnWebSocket = this;


				console.log("Setting as multiroomServer");
				var returnedData = self.commandRouter.executeOnPlugin('audio_interface', 'multiroom', 'setServer', data);
				//selfConnWebSocket.emit('pushWriteMultiroom',data);

			});
			connWebSocket.on('setAsMultiroomClient', function (data) {
				selfConnWebSocket = this;

				console.log("Setting as multiroomClient");
				var returnedData = self.commandRouter.executeOnPlugin('audio_interface', 'multiroom', 'setClient', data);
				//selfConnWebSocket.emit('pushWriteMultiroom',data);

			});

			connWebSocket.on('shutdown', function () {
				selfConnWebSocket = this;
				console.log('Received Shutdown Command');

				return self.commandRouter.shutdown();

			});

			connWebSocket.on('reboot', function () {
				selfConnWebSocket = this;
				console.log('Received Reboot Command');
				return self.commandRouter.reboot();

			});

			connWebSocket.on('getWirelessNetworks', function () {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.executeOnPlugin('system_controller', 'network', 'getWirelessNetworks', '');

				if (returnedData != undefined) {
					returnedData.then(function (data) {
						selfConnWebSocket.emit('pushWirelessNetworks', data);
					});
				}
				else console.log("Error on returning wireless networks");


			});

			connWebSocket.on('saveWirelessNetworkSettings', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.executeOnPlugin('system_controller', 'network', 'saveWirelessNetworkSettings', data);

				/*if (returnedData != undefined) {
					returnedData.then(function (data) {
						selfConnWebSocket.emit('pushSaveWirelessNetworkSettings', data);
					});
				}
				else console.log("Error on returning wireless networks");*/
			});

			connWebSocket.on('getInfoNetwork', function () {
				selfConnWebSocket = this;

				var defer= self.commandRouter.executeOnPlugin('system_controller', 'network', 'getInfoNetwork', '');

				defer.then(function(data){
					selfConnWebSocket.emit('pushInfoNetwork', data);
				})
				.fail(function(){
					selfConnWebSocket.emit('pushInfoNetwork', {status:"Not Connected",online:"no"});
				});
			});



			//Updater
			connWebSocket.on('updateCheck', function () {
				selfConnWebSocket = this;

				self.logger.info("Sending updateCheck to server");

				var socketURL = 'http://localhost:3005';
				var options = {
					transports: ['websocket'],
					'force new connection': true
				}

				var io 	= require('socket.io-client');
				var client = io.connect(socketURL, options);
				client.emit('updateCheck','search-for-upgrade');

				client.on('updateReady', function(message){
					self.logger.info("Update Ready: "+message);
					selfConnWebSocket.emit('updateReady',message);
				});

				client.on('updateCheck-error', function(message){
					self.logger.info("Update Check error: "+message);
					selfConnWebSocket.emit('updateCheck-error',message);
				});
			});


			connWebSocket.on('update', function (data) {
				selfConnWebSocket = this;
				self.logger.info("Update: "+data);

				var socketURL = 'http://localhost:3005';
				var options = {
					transports: ['websocket'],
					'force new connection': true
				}

				var io 	= require('socket.io-client');
				var client = io.connect(socketURL, options);
				client.emit('update',data);

				client.on('updateProgress', function(message){
					self.logger.info("Update Progress: "+message);
					selfConnWebSocket.emit('updateProgress',message);
				});

				client.on('updateDone', function(message){
					self.logger.info("Update Done: "+message);
					selfConnWebSocket.emit('updateDone',message);
				});
			});

			connWebSocket.on('factoryReset', function () {
				selfConnWebSocket = this;
				self.logger.info("Command Factory Reset Received");

				var socketURL = 'http://localhost:3005';
				var options = {
					transports: ['websocket'],
					'force new connection': true
				}

				var io 	= require('socket.io-client');
				var client = io.connect(socketURL, options);
				client.emit('factoryReset', '');

				client.on('updateProgress', function(message){
					self.logger.info("Update Progress: "+message);
					selfConnWebSocket.emit('updateProgress',message);
				});

				client.on('updateDone', function(message){
					self.logger.info("Update Done: "+message);
					selfConnWebSocket.emit('updateDone',message);
				});
			});

			//factory reset

			connWebSocket.on('getSystemVersion', function () {
				selfConnWebSocket = this;
				self.logger.info("Received Get System Version");
				var returnedData = self.commandRouter.executeOnPlugin('system_controller', 'system', 'getSystemVersion');

				if (returnedData != undefined) {
					returnedData.then(function (data) {
						if (data != undefined){
						selfConnWebSocket.emit('pushSystemVersion', data);
						}
					});
				}
				else console.log("Plugin multiroom or method getMultiroom not found");


			});

			/**
			 * Executes the getMyCollectionStats method on the MPD plugin
			 */
			connWebSocket.on('getMyCollectionStats', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.executeOnPlugin('music_service', 'mpd', 'getMyCollectionStats', '');

				if (returnedData != undefined) {
					returnedData.then(function (data) {
						selfConnWebSocket.emit('pushMyCollectionStats', data);
					});
				}
				else console.log("Error on Wireless Scan");
			});


			/**
			 * Executes the rescanDb method on the MPD plugin. No response is foreseen
			 */
			connWebSocket.on('rescanDb', function (data) {
				selfConnWebSocket = this;

				self.commandRouter.executeOnPlugin('music_service', 'mpd', 'rescanDb', '');
			});


			/**
			 * New share APIs
			 */
			connWebSocket.on('addShare', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.executeOnPlugin('system_controller', 'networkfs', 'addShare', data);

				if (returnedData != undefined) {
					returnedData.then(function (data) {
						selfConnWebSocket.emit('pushAddShare', data);
					});
				}
				else self.logger.error("Error on adding share");
			});

			connWebSocket.on('deleteShare', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.executeOnPlugin('system_controller', 'networkfs', 'deleteShare', data);

				if (returnedData != undefined) {
					returnedData.then(function (data) {
						selfConnWebSocket.emit('pushDeleteShare', data);
					});
				}
				else self.logger.error("Error on deleting share");
			});

			connWebSocket.on('getListShares', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.executeOnPlugin('system_controller', 'networkfs', 'listShares', data);

				if (returnedData != undefined) {
					returnedData.then(function (data) {
						selfConnWebSocket.emit('pushListShares', data);
					});
				}
				else self.logger.error("Error on deleting share");
			});

			connWebSocket.on('getInfoShare', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.executeOnPlugin('system_controller', 'networkfs', 'infoShare', data);

				if (returnedData != undefined) {
					returnedData.then(function (data) {
						selfConnWebSocket.emit('pushInfoShare', data);
					});
				}
				else self.logger.error("Error on getting information on share");
			});

			connWebSocket.on('editShare', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.executeOnPlugin('system_controller', 'networkfs', 'editShare', data);

				if (returnedData != undefined) {
					returnedData.then(function (data) {
						selfConnWebSocket.emit('pushEditShare', data);
					});
				}
				else self.logger.error("Error on storing on share");
			});


			connWebSocket.on('listUsbDrives', function (data) {
				selfConnWebSocket = this;

				var returnedData = self.commandRouter.executeOnPlugin('system_controller', 'networkfs', 'listUsbDrives', data);

				if (returnedData != undefined) {
					returnedData.then(function (data) {
						selfConnWebSocket.emit('pushListUsbDrives', data);
					});
				}
				else self.logger.error("Error on listing USB devices");
			});




		}
		catch(ex)
		{
			self.logger.error("Catched an error in socketio. Details: "+ex);
		}
	});
}

// Receive console messages from commandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.printConsoleMessage = function(message) {
	var self = this;

	// Push the message all clients
	self.libSocketIO.emit('printConsoleMessage', message);

	// Return a resolved empty promise to represent completion
	return libQ.resolve();
}

// Receive player queue updates from commandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.pushQueue = function(queue, connWebSocket) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'InterfaceWebUI::pushQueue');

	// If a specific client is given, push to just that client
	if (connWebSocket) {
		return libQ.fcall(libFast.bind(connWebSocket.emit, connWebSocket), 'pushQueue', queue);
	// Else push to all connected clients
	} else {
		return libQ.fcall(libFast.bind(self.libSocketIO.emit, self.libSocketIO), 'pushQueue', queue);
	}
}

// Push the library root
InterfaceWebUI.prototype.pushLibraryFilters = function(browsedata, connWebSocket) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'InterfaceWebUI::pushLibraryFilters');

	// If a specific client is given, push to just that client
	if (connWebSocket) {
		return libQ.fcall(libFast.bind(connWebSocket.emit, connWebSocket), 'pushLibraryFilters', browsedata);
	}
}

// Receive music library data from commandRouter and send to requester
InterfaceWebUI.prototype.pushLibraryListing = function(browsedata, connWebSocket) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'InterfaceWebUI::pushLibraryListing');

	// If a specific client is given, push to just that client
	if (connWebSocket) {
		return libQ.fcall(libFast.bind(connWebSocket.emit, connWebSocket), 'pushLibraryListing', browsedata);
	}
}

// Push the playlist view
InterfaceWebUI.prototype.pushPlaylistIndex = function(browsedata, connWebSocket) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'InterfaceWebUI::pushPlaylistIndex');

	// If a specific client is given, push to just that client
	if (connWebSocket) {
		return libQ.fcall(libFast.bind(connWebSocket.emit, connWebSocket), 'pushPlaylistIndex', browsedata);
	}
}

InterfaceWebUI.prototype.pushMultiroom = function(selfConnWebSocket) {
	var self = this;

	var volumiodiscovery=self.commandRouter.pluginManager.getPlugin('system_controller','volumiodiscovery');
	var response=volumiodiscovery.getDevices();

	selfConnWebSocket.emit('pushMultiRoomDevices',response);
}



// Receive player state updates from commandRouter and broadcast to all connected clients
InterfaceWebUI.prototype.pushState = function(state, connWebSocket) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'InterfaceWebUI::pushState');
	if (connWebSocket) {
		self.pushMultiroom(connWebSocket);
		return libQ.fcall(libFast.bind(connWebSocket.emit, connWebSocket), 'pushState', state);

	} else {
		// Push the updated state to all clients
		self.pushMultiroom(self.libSocketIO);
		return libQ.fcall(libFast.bind(self.libSocketIO.emit, self.libSocketIO), 'pushState', state);
	}
}

InterfaceWebUI.prototype.printToastMessage = function(type,title,message) {
	var self = this;

	// Push the message all clients
	self.libSocketIO.emit('pushToastMessage', {
		type:type,
		title:title,
		message:message
	});
}

InterfaceWebUI.prototype.broadcastToastMessage = function(type,title,message) {
	var self = this;

	// Push the message all clients
	self.libSocketIO.broadcast.emit('pushToastMessage', {
		type:type,
		title:title,
		message:message
	});
}

InterfaceWebUI.prototype.pushMultiroomDevices = function(msg) {
	var self = this;

	self.libSocketIO.emit('pushMultiRoomDevices', msg);
}

InterfaceWebUI.prototype.logDone = function(timeStart) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + '------------------------------ ' + (Date.now() - timeStart) + 'ms');
	return libQ.resolve();
}

InterfaceWebUI.prototype.logStart = function(sCommand) {
	var self = this;
	self.commandRouter.pushConsoleMessage('\n' + '[' + Date.now() + '] ' + '---------------------------- ' + sCommand);
	return libQ.resolve();
}

// Pass the error if we don't want to handle it
InterfaceWebUI.prototype.pushError = function(error) {
	var self = this;

	if ((typeof error) === 'string') {
		return self.commandRouter.pushConsoleMessage.call(self.commandRouter, 'Error: ' + error);
	} else if ((typeof error) === 'object') {
		return self.commandRouter.pushConsoleMessage.call(self.commandRouter, 'Error:\n' + error.stack);
	}

	// Return a resolved empty promise to represent completion
	return libQ.resolve();
};

InterfaceWebUI.prototype.pushAirplay = function(value) {
	var self = this;

	self.logger.debug("Pushing airplay mode: s"+value);
	self.libSocketIO.sockets.emit('pushAirplay', value);
};
