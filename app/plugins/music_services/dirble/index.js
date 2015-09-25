var libQ = require('kew');
var unirest=require('unirest');

module.exports = ControllerDirble;
function ControllerDirble(context) {
	var self = this;

	self.context=context;

	self.config=new (require('v-conf'))();

	self.commandRouter = self.context.coreCommand;
}

/*
 * This method can be defined by every plugin which needs to be informed of the startup of Volumio.
 * The Core controller checks if the method is defined and executes it on startup if it exists.
 */
ControllerDirble.prototype.onVolumioStart = function() {
	var self=this;

	var configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');
	self.config.loadFile(configFile);

}

ControllerDirble.prototype.getConfigurationFiles = function()
{
	var self = this;

	return ['config.json'];
}

ControllerDirble.prototype.onStop = function() {
    //Perform startup tasks here
}

ControllerDirble.prototype.onRestart = function() {
    //Perform startup tasks here
}

ControllerDirble.prototype.onInstall = function()
{
    //Perform your installation tasks here
}

ControllerDirble.prototype.onUninstall = function()
{
    //Perform your installation tasks here
}

ControllerDirble.prototype.getUIConfig = function()
{
	return {success:true,plugin:"dirble"};
}

ControllerDirble.prototype.setUIConfig = function(data)
{
    //Perform your installation tasks here
}

ControllerDirble.prototype.getConf = function(varName)
{
    //Perform your installation tasks here
}

ControllerDirble.prototype.setConf = function(varName, varValue)
{
    //Perform your installation tasks here
}


//Optional functions exposed for making development easier and more clear
ControllerDirble.prototype.getSystemConf = function(pluginName,varName)
{
    //Perform your installation tasks here
}

ControllerDirble.prototype.setSystemConf = function(pluginName,varName)
{
    //Perform your installation tasks here
}

ControllerDirble.prototype.getAdditionalConf = function()
{
    //Perform your installation tasks here
}

ControllerDirble.prototype.setAdditionalConf = function()
{
    //Perform your installation tasks here
}

// Load the tracklist from database on disk
ControllerDirble.prototype.loadTracklistFromDB = function() {
	return libQ.resolve();
};

// Rebuild a library of user's playlisted Dirble tracks
ControllerDirble.prototype.rebuildTracklist = function() {
	return libQ.resolve();
};

// Define a method to clear, add, and play an array of tracks
ControllerDirble.prototype.clearAddPlayTracks = function(arrayTrackUris) {
	return libQ.resolve();
};

// Dirble stop
ControllerDirble.prototype.stop = function() {
	return libQ.resolve();
};

// Dirble pause
ControllerDirble.prototype.pause = function() {
	return libQ.resolve();
};

// Dirble resume
ControllerDirble.prototype.resume = function() {
	return libQ.resolve();
};

// Dirble music library
ControllerDirble.prototype.getTracklist = function() {
	return libQ.resolve([]);
};

ControllerDirble.prototype.listRadioCategories = function() {
	var self=this;

	var defer=libQ.defer();

	var response={
		navigation: {
			prev: {
				uri: 'radio'
			},
			list: []
		}
	};

	var dirbleDefer=libQ.defer();
	self.getPrimariesCategories(dirbleDefer.makeNodeResolver());
	dirbleDefer.promise.then(function(data)
	{
		for(var i in data)
		{
			var category={
				type: 'folder',
				title: data[i].title,
				icon: 'fa fa-folder-open-o',
				uri: 'radio/'+data[i].id
			};

			response.navigation.list.push(category);
		}

		defer.resolve(response);
	});


	return defer.promise;
};

ControllerDirble.prototype.listRadioForCategory = function(uri) {
	var self=this;

	var defer=libQ.defer();

	var response={
		navigation: {
			prev: {
				uri: 'radio'
			},
			list: []
		}
	};

	var id=uri.split('/')[1];



	var paginationPromises=[];

	for(var i=0;i<1;i++)
	{
		var dirbleDefer=libQ.defer();
		self.getRadioForCategory(id,30,i,dirbleDefer.makeNodeResolver());

		paginationPromises.push(dirbleDefer);
	}

	libQ.all(paginationPromises)
		.then(function(results){
			console.log(results);
			for(var j in results)
			{
				var pageData=results[j];
				//console.log(pageData);

				for(var k in pageData)
				{
					var category={
						service: 'dirble',
						type: 'song',
						title: pageData[k].name,
						artist: '',
						album: '',
						icon: 'fa fa-music',
						uri:pageData[k].streams[0].stream
					};

					response.navigation.list.push(category);
				}
			}

			defer.resolve(response);
		});

	return defer.promise;
};



ControllerDirble.prototype.getPrimariesCategories = function(callback) {
	var self=this;

	var Request = unirest.get(self.config.get('url_categories_primary'));
	Request.query({
		token: self.config.get('api_token')
	}).end(function (response) {
		callback(null,response.body);
	});

};

ControllerDirble.prototype.getRadioForCategory = function(id,per_page,page,callback) {
	var self=this;

	var Request = unirest.get(self.config.get('url_category_stations')+id+'/stations');
	Request.query({
		token: self.config.get('api_token')
	}).query({
		page:page,
		per_page: per_page
	}).end(function (response) {
		callback(null,response.body);
	});

};

ControllerDirble.prototype.getCountries = function() {
	var Request = unirest.get(self.config.get('url_countries'));
	Request.query({
		token: self.config.get('api_token')
	}).end(function (response) {
		console.log(response.body);
	});

};

ControllerDirble.prototype.getStationsForCountry = function(id,page) {
	var Request = unirest.get(self.config.get('url_countries'));
	Request.query({
		token: config.get('api_token'),
		page:page,
		per_page:config.get('per_page'),
		offset:0
	}).end(function (response) {
		console.log(response.body);
	});

};

ControllerDirble.prototype.listRadioFavourites = function (uri) {
	var self = this;

	var defer = libQ.defer();

	var promise=self.commandRouter.playListManager.getRadioFavouritesContent();
	promise.then(function(data)
	{
		console.log(data);
		var response={
			navigation: {
				prev: {
					uri: '/'
				},
				list:[]
			}
		};

		for(var i in data)
		{
			var ithdata=data[i];
			var song={service: ithdata.service, type: 'song',  title: ithdata.title, artist: ithdata.artist, album: ithdata.album, icon: ithdata.albumart, uri: ithdata.uri};

			response.navigation.list.push(song);
		}

		defer.resolve(response);

	})
		.fail(function()
		{
			defer.reject(new Error("Cannot list Favourites"));
		});

	return defer.promise;
}