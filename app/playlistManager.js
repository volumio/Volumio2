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
	var filePath=self.playlistFolder+name;

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

PlaylistManager.prototype.deletePlaylist = function(name) {
	var self = this;

	var defer=libQ.defer();

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Deleting playlist '+name);

	var playlist=[];
	var filePath=self.playlistFolder+name;

	fs.exists(filePath, function (exists) {
		if(!exists)
			defer.resolve({success:false,reason:'Playlist does not exist'});
		else
		{
			fs.unlink(filePath, function (err) {
				if(err)
					defer.resolve({success:false});
				else defer.resolve({success:true});
			});
		}

	});

	return defer.promise;
}

PlaylistManager.prototype.addToPlaylist = function(name,service,uri) {
	var self = this;

	var defer=libQ.defer();

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Adding uri '+uri+' to playlist '+name);

	var playlist=[];
	var filePath=self.playlistFolder+name;

	fs.exists(filePath, function (exists) {
		if(!exists)
			defer.resolve({success:false,reason:'Playlist does not exist'});
		else
		{
			fs.readJson(filePath, function (err, data) {
				if(err)
					defer.resolve({success:false});
				else
				{
					data.push({service:service,uri:uri});
					fs.writeJson(filePath, data, function (err) {
						if(err)
							defer.resolve({success:false});
						else defer.resolve({success:true});
					})
				}
			});
		}

	});

	return defer.promise;
}


PlaylistManager.prototype.removeFromPlaylist = function(name,service,uri) {
	var self = this;

	var defer=libQ.defer();

	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'Removing uri '+uri+' to playlist '+name);

	var playlist=[];
	var filePath=self.playlistFolder+name;

	fs.exists(filePath, function (exists) {
		if(!exists)
			defer.resolve({success:false,reason:'Playlist does not exist'});
		else
		{
			fs.readJson(filePath, function (err, data) {
				if(err)
					defer.resolve({success:false});
				else
				{
					var newData=[];

					for(var i=0;i<data.length;i++)
					{
						if(!(data[i].service== service &&
						   data[i].uri==uri))
						{
							newData.push(data[i]);
						}

					}

					fs.writeJson(filePath, newData, function (err) {
						if(err)
							defer.resolve({success:false});
						else defer.resolve({success:true});
					})
				}
			});
		}

	});

	return defer.promise;
}