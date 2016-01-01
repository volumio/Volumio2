var libQ = require('kew');
var unirest=require('unirest');
var S=require('string');
//var internetradio = require('node-internet-radio');

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
				uri: 'radio/byGenre/'+data[i].id
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
				uri: 'radio/byGenre'
			},
			list: []
		}
	};

	var id=uri.split('/')[2];



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



ControllerDirble.prototype.listFirstLevelRadioSections = function(callback) {
	var self=this;

	var defer=libQ.defer();

	var response={
		navigation: {
			prev: {
				uri: ''
			},
			list: [{
					service: 'dirble',
					type: 'folder',
					title: 'My Web Radios',
					artist: '',
					album: '',
					icon: 'fa fa-folder-open-o',
					uri:'radio/myWebRadio'
				},
				{
					service: 'dirble',
					type: 'folder',
					title: 'Favourites',
					artist: '',
					album: '',
					icon: 'fa fa-folder-open-o',
					uri: 'radio/favourites'
				},
				{
					service: 'dirble',
					type: 'folder',
					title: 'By Genre',
					artist: '',
					album: '',
					icon: 'fa fa-folder-open-o',
					uri:'radio/byGenre'
				},
				{
					service: 'dirble',
					type: 'folder',
					title: 'By Country',
					artist: '',
					album: '',
					icon: 'fa fa-folder-open-o',
					uri:'radio/byCountry'
				}

			]
		}
	};

	defer.resolve(response);
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




ControllerDirble.prototype.listRadioCountries = function() {
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
	self.getCountries(dirbleDefer.makeNodeResolver());
	dirbleDefer.promise.then(function(data)
	{
		for(var i in data)
		{
			var category={
				type: 'folder',
				title: data[i].name,
				icon: 'fa fa-folder-open-o',
				uri: 'radio/byCountry/'+data[i].country_code
			};

			response.navigation.list.push(category);
		}

		defer.resolve(response);
	});


	return defer.promise;
};

ControllerDirble.prototype.getCountries = function(callback) {
	var self=this;

	var Request = unirest.get(self.config.get('url_countries'));
	Request.query({
		token: self.config.get('api_token')
	}).end(function (response) {
		callback(null,response.body);
	});

};

ControllerDirble.prototype.listRadioForCountry = function(uri) {
	var self=this;

	var defer=libQ.defer();

	var response={
		navigation: {
			prev: {
				uri: 'radio/byCountry'
			},
			list: []
		}
	};

	var id=uri.split('/')[2];



	var paginationPromises=[];

	for(var i=0;i<1;i++)
	{
		var dirbleDefer=libQ.defer();
		self.getStationsForCountry(id,30,i,dirbleDefer.makeNodeResolver());

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

ControllerDirble.prototype.getStationsForCountry = function(id,per_page,page,callback) {
	var self=this;

	var Request = unirest.get('http://api.dirble.com/v2/countries/'+id+'/stations');
	Request.query({
		token: self.config.get('api_token'),
		page:page,
		per_page:per_page
	}).end(function (response) {
		callback(null,response.body);
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
					uri: 'radio'
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



ControllerDirble.prototype.listMyWebRadio = function (uri) {
	var self = this;

	var defer = libQ.defer();

	var promise=self.commandRouter.playListManager.getMyWebRadioContent()
	promise.then(function(data)
		{
			console.log(data);
			var response={
				navigation: {
					prev: {
						uri: 'radio'
					},
					list:[]
				}
			};

			for(var i in data)
			{
				var ithdata=data[i];
				var song={service: ithdata.service, type: 'song',  title: ithdata.name,  uri: ithdata.uri,icon: '/albumart'};

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

/*
	Let the user add a web radio. The given name is a key to the array
 */
ControllerDirble.prototype.addMyWebRadio = function (data) {
	var self = this;

	var defer = libQ.defer();
	var name=data.name;
	var uri=S(data.uri);
	var uriToSave;

	if(uri.endsWith('.m3u') || uri.endsWith('.M3U'))
	{
		uriToSave=self.extractFromM3u(uri);
	}
	else if(uri.endsWith('.pls') || uri.endsWith('.PLS'))
	{
		uriToSave=self.extractFromPls(uri);
	}
	else uriToSave=uri.s;

	//check if uri is ok,
	/*internetradio.getStationInfo(uriToSave, function(error, station) {
		if(error)
			defer.reject(new Error('Uri seems not to be a radio station'));
		else
		{
			console.log("RADIO ADDED");
			defer.resolve(station);
		}
	},internetradio.StreamSource.STREAM);*/
	self.commandRouter.playListManager.addToMyWebRadio('dirble',name,uriToSave);
	defer.resolve({});

	return defer.promise;
}

ControllerDirble.prototype.removeMyWebRadio = function (data) {
	var self = this;

	var defer = libQ.defer();
	var name=data.name;

	self.commandRouter.playListManager.removeFromMyWebRadio(name);
	defer.resolve({});

	return defer.promise;
}





ControllerDirble.prototype.extractFromPls = function (data) {
	var self = this;



	return defer.promise;
}

ControllerDirble.prototype.extractFromM3u = function (uri) {
	var self = this;


}