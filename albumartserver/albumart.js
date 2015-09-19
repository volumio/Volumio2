var albumart=require('album-art');
var Q = require('kew');
var download = require('file-download');
var S=require('string');
var fs=require('fs-extra');
var uuid=require('uuid');

/**
*	This method searches for the album art, downloads it if needed
*	and returns its file path. The return value is a promise 
**/
var processRequest=function (artist, album,resolution) {
 	var defer=Q.defer();
	
	var decodedArtist=S(artist).decodeHTMLEntities().s;
	var decodedAlbum=S(album).decodeHTMLEntities().s;
	var decodedResolution=S(resolution).decodeHTMLEntities().s;
	
	var folder='/tmp/'+decodedArtist+'/'+decodedAlbum+'/';
	var fileName=decodedResolution;
	
	fs.ensureDirSync(folder);
	var infoPath=folder+'info.json';

	var infoJson={};
	
	if(fs.existsSync(infoPath)==false)
	{
		fs.ensureFileSync(infoPath);
	}
	else infoJson = fs.readJsonSync(infoPath, {throws: false})
	
	if(infoJson[resolution]==undefined)
	{
		albumart(artist, album, resolution, function (err, url) {
			if(err)
				defer.reject(new Error(err));
			else
			{
				var splitted=url.split('.');
				var fileExtension=splitted[splitted.length-1];
				var diskFileName=uuid.v4()+'.'+fileExtension;
				
				var options = {
					directory: folder,
					filename: diskFileName
				}

				download(url, options, function(err){
					if (err) defer.reject(new Error(err));
					else defer.resolve(folder+diskFileName);
				});
				
				infoJson[resolution]=diskFileName;
				fs.writeJsonSync(infoPath,infoJson);
			}
		});
	}
	else
	{
		defer.resolve(folder+infoJson[resolution]);
	}
	
	
  return defer.promise; 
}


/**
*	This method processes incoming request from express. 
*	The following variables are needed to be in req.params
*   artist
*	album
*	resolution
*
*	To achieve this assign this function to a path like /:artist/:album/:resolution
**/
var processExpressRequest=function (req, res) {
  var promise=processRequest(req.params.artist,req.params.album,req.params.resolution);
  promise.then(function(filePath){
	  console.log('Sending file '+filePath);
  		res.sendFile(filePath);
  })
  .fail(function()
  {
	  res.sendFile('/tmp/error.png');
  });
}


module.exports.processExpressRequest=processExpressRequest;
module.exports.processRequest=processRequest;
