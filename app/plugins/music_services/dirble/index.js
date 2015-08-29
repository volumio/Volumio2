var libQ = require('kew');
var unirest=require('unirest');

module.exports = ControllerDirble;
function ControllerDirble(context) {
	var self = this;

	self.config=new (require('v-conf'))();
	self.config.loadFile(__dirname+'/config.json');

}

/*
 * This method can be defined by every plugin which needs to be informed of the startup of Volumio.
 * The Core controller checks if the method is defined and executes it on startup if it exists.
 */
ControllerDirble.prototype.onVolumioStart = function() {
	var self=this;

	self.getPrimariesCategories();
	self.getCountries();
	self.getStationsForCountry('',0);
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

ControllerDirble.prototype.getPrimariesCategories = function() {
	var Request = unirest.get(config.get('url_categories_primary'));
	Request.query({
		token: config.get('api_token')
	}).end(function (response) {
		console.log(response.body);
	});

};

ControllerDirble.prototype.getCountries = function() {
	var Request = unirest.get(config.get('url_countries'));
	Request.query({
		token: config.get('api_token')
	}).end(function (response) {
		console.log(response.body);
	});

};

ControllerDirble.prototype.getStationsForCountry = function(id,page) {
	var Request = unirest.get(config.get('url_countries'));
	Request.query({
		token: config.get('api_token'),
		page:page,
		per_page:config.get('per_page'),
		offset:0
	}).end(function (response) {
		console.log(response.body);
	});

};