var albumart=require('album-art');
var Q = require('kew');
var download = require('file-download');
var S=require('string');
var fs=require('fs-extra');
var uuid = require('node-uuid');
var nodetools=require('nodetools');

var albumArtRootFolder='/data/albumart';

var setFolder=function(newFolder)
{
	albumArtRootFolder=S(newFolder).ensureRight('/').s;
}
/**
*	This method searches for the album art, downloads it if needed
*	and returns its file path. The return value is a promise 
**/
var processRequest=function (web,path) {
 	var defer=Q.defer();

	if(web==undefined && path==undefined)
	{
		defer.reject(new Error(''));
		return defer.promise;
	}

	console.log(path);
	if(path!=undefined)
	{
		/**
		 * Trying to read albumart from file
		 */

		var covers=['cover.jpg' , 'Cover.jpg' , 'folder.jpg','Folder.jpg',
			'cover.png' , 'Cover.png' , 'folder.png','Folder.png'];
		var splitted=path.split('/');


		for(var i in covers)
		{
			var coverFile=path+'/'+covers[i];
			console.log("Searching for cover "+coverFile);
			if(fs.existsSync(coverFile))
			{
				defer.resolve(coverFile);
				return defer.promise;
			}
		}

		var files=fs.readdirSync(path);
		for(var j in files) {
			var fileName=S(files[j]);

			console.log(fileName.s);
			if(fileName.endsWith('.png') || fileName.endsWith('.jpg')) {
				defer.resolve(path+'/'+fileName.s);
				return defer.promise;
			}

		}


	}


	/**
	 * If we arrive to this point the file albumart has not been passed or doesn't exists
	 */

	var artist,album,resolution;

	if(web!=undefined)
	{
		var splitted=nodetools.urlDecode(web).split('/');

		if(splitted.length<3)
		{
			defer.reject(new Error('The web link '+web+' is malformed' ));
			return defer.promise;
		}

		if(splitted.length==3)
		{
			artist=splitted[0];
			album=splitted[1];
			resolution=splitted[2];
		}
		else if(splitted.length==4)
		{
			artist=splitted[1];
			album=splitted[2];
			resolution=splitted[3];
		}
	}
	else
	{
		defer.reject(new Error('No parameters defined'));
		return defer.promise;
	}

	/**
	 * Loading album art from network
	 */
	var folder=albumArtRootFolder+artist+'/'+album+'/';
	var fileName=resolution;
	
	fs.ensureDirSync(folder);
	var infoPath=folder+'info.json';

	var infoJson={};
	
	if(fs.existsSync(infoPath)==false)
	{
		fs.ensureFileSync(infoPath);
		fs.writeJsonSync(infoPath,infoJson);
	}

	var stats = fs.statSync(infoPath)
	var fileSizeInBytes = stats["size"]

	if(fileSizeInBytes>0)
	    infoJson = fs.readJsonSync(infoPath, {throws: false})
	
	if(infoJson[resolution]==undefined)
	{
		albumart(artist, album, resolution, function (err, url) {
			if(err)
			{
				albumart(artist, function (err, url) {
					if(err)
					{
						console.log("ERRORE: "+err);
						defer.reject(new Error(err));
					}
					else
					{
						if(url!=undefined && url!='')
						{
							var splitted=url.split('.');
							var fileExtension=splitted[splitted.length-1];
							var diskFileName=uuid.v4()+'.'+fileExtension;

							var options = {
								directory: folder,
								filename: diskFileName
							}

							console.log("URL: "+url);
							download(url, options, function(err){
								if (err) defer.reject(new Error(err));
								else defer.resolve(folder+diskFileName);
							});

							infoJson[resolution]=diskFileName;
						}
						else{
							defer.reject(new Error('No albumart URL'));
						}
					}

					fs.writeJsonSync(infoPath,infoJson);
				});
			}
			else
			{
				var splitted=url.split('.');
				var fileExtension=splitted[splitted.length-1];
				var diskFileName=uuid.v4()+'.'+fileExtension;
				
				var options = {
					directory: folder,
					filename: diskFileName
				}

				if(url!=undefined && url!='')
				{
					download(url, options, function(err){
						if (err) defer.reject(new Error(err));
						else defer.resolve(folder+diskFileName);
					});
				}
				else{
					defer.reject(new Error('No albumart URL'));
				}

				infoJson[resolution]=diskFileName;

			}

			fs.writeJsonSync(infoPath,infoJson);
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
	var web=req.query.web;
	var path=req.query.path;


  var promise=processRequest(web,path);
  promise.then(function(filePath){
	  console.log('Sending file '+filePath);
  		res.sendFile(filePath);
  })
  .fail(function()
  {
	  res.sendFile(__dirname+'/default.png');
  });
}


module.exports.processExpressRequest=processExpressRequest;
module.exports.processRequest=processRequest;
module.exports.setFolder=setFolder;
