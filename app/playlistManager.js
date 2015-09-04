var libQ = require('kew');
var libFast = require('fast.js');
var fs=require('fs-extra');

module.exports = PlaylistManager;

function PlaylistManager(commandRouter) {
	var self = this;

	self.commandRouter=commandRouter;

	self.playlistFolder='/data/playlist/';
}

PlaylistManager.prototype.createPlaylist = function(name) {
	var self = this;

	var defer=libQ.defer();

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Creating playlist '+name);

	var playlist=[];
	var filePath=self.playlistFolder+name,playlist;

	fs.exists(filePath, function (exists) {
		if(exists)
			defer.resolve({success:false,reason:'Playlist already exists'});
		else
		{
			fs.writeJson(filePath,playlist, function (err) {
				if(err)
					defer.resolve({success:false});
				else defer.resolve({success:true});
			});
		}

	});

	return defer.promise;
}
