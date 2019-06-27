'use strict';

var libQ=require('kew');
var _=require('underscore');
var moment=require('moment');

module.exports = RESTApiBrowse;

function RESTApiBrowse(context) {
    var self = this;


    // Save a reference to the parent commandRouter
    self.context=context;
    self.logger=self.context.logger;
    self.commandRouter = self.context.coreCommand;
}

RESTApiBrowse.prototype.browseListing=function(req,res)
{
    var path;

    if(req.query && req.query.path)
        path=decodeURIComponent(req.query.path);
    else path='/';

    var defer;

    var ipAddress=this.commandRouter.sharedVars.get('ipAddress');

    if(path=='/')
    {
        var content={"navigation":{
            "lists":[{
                "items":[]
            }]
        }};

        var browseSourcesList=this.commandRouter.volumioGetBrowseSources()
        for(var sourceIndex in browseSourcesList)
        {
            content.navigation.lists[0].items.push({
                "title":browseSourcesList[sourceIndex].name,
                "uri":browseSourcesList[sourceIndex].uri,
                "type":"folder",
                "albumart":browseSourcesList[sourceIndex].albumart});
        }

        defer=libQ.resolve(content);
    }
    else
    {
        if(path.startsWith('/radio'))
        {
            defer=this.commandRouter.executeOnPlugin('music_service','webradio','handleBrowseUri',path.substring(1));
        }
        else if(path.startsWith('/music-library'))
        {
            defer=this.commandRouter.executeOnPlugin('music_service','mpd','handleBrowseUri',path.substring(1));
        }
        else if(path.startsWith('/artists'))
        {
            defer=this.commandRouter.executeOnPlugin('music_service','mpd','handleBrowseUri',"artists://"+path.substring(9));
        }
        else if(path.startsWith('/albums'))
        {
            defer=this.commandRouter.executeOnPlugin('music_service','mpd','handleBrowseUri',"albums://"+path.substring(8));
        }
        else if(path.startsWith('/genres'))
        {
            defer=this.commandRouter.executeOnPlugin('music_service','mpd','handleBrowseUri',"genres://"+path.substring(8));
        }
        else if(path.startsWith('/years'))
        {
            defer=this.commandRouter.executeOnPlugin('music_service','mpd','handleBrowseUri',"years://"+path.substring(7));
        }
        else
        {
            defer=libQ.reject(new Error("Path "+path+" not found"));
        }
    }


    defer.then(function(value)
    {
        if(value.navigation)
        {
            var content=[];

            for(var i in value.navigation.lists[0].items)
            {
                var item=value.navigation.lists[0].items[i];

                var uri;

                if(item.uri.startsWith('music-library'))
                {
                    uri="/"+item.uri;
                }
                else if(item.uri.startsWith('artists://'))
                {
                    uri="/artists/"+item.uri.substring(10);
                }
                else if(item.uri.startsWith('albums://'))
                {
                    uri="/albums/"+item.uri.substring(9);
                }
                else if(item.uri.startsWith('genres://'))
                {
                    uri="/genres/"+item.uri.substring(9);
                }
                else if(item.uri.startsWith('years://'))
                {
                    uri="/years/"+item.uri.substring(8);
                }
                else
                {
                    uri=item.uri;
                }


                var filetitle;
                if(item.uri && item.uri.lastIndexOf('/')>-1)
                    filetitle=item.uri.substring(item.uri.lastIndexOf('/')+1);

                var duration;
                if(item.duration)
                {
                    var minutes=Math.floor(item.duration/60);
                    if(minutes<10)
                    {
                        duration='0'+minutes;
                    }
                    else duration=minutes;

                    duration+=':';

                    var seconds= (item.duration %60);

                    if(seconds<10)
                    {
                        duration+='0';
                    }

                    duration+=seconds;
                }

                content.push({
                    "title":item.title,
                    "artist":item.artist,
                    "year":item.year,
                    "genre":item.genre,
                    "cover_url":'http://'+ipAddress+item.albumart,
                    "track_no":item.tracknumber,
                    "track_name":item.title,
                    "track_artist":item.artist,
                    "track_ext":item.track_ext,
                    "track_length":duration,
                    "id3_composer":item.artist,
                    "url":uri,
                    "isFolder":  (item.type=='mywebradio-category')||(item.type=='folder')
                });

            }

            if(req.query.beginIndex)
            {
                var beginIndex=parseInt(req.query.beginIndex);
                if(_.isNumber(beginIndex))
                {
                    var endIndex;

                    if(req.query.endIndex)
                    {

                        if(_.isNumber(parseInt(req.query.endIndex))) {
                            endIndex = parseInt(req.query.endIndex);
                        }
                        else
                        {
                            res.send({
                                success:false,
                                reason:"endIndex is not a number"
                            });
                        }
                    }
                    else
                    {
                        if(req.query.pageSize)
                        {
                            if(_.isNumber(parseInt(req.query.pageSize))) {
                                endIndex=beginIndex+parseInt(req.query.pageSize)-1;
                            }
                            else
                            {
                                res.send({
                                    success:false,
                                    reason:"pageSize is not a number"
                                });
                            }

                        }
                        else
                        {
                            endIndex=beginIndex+9;
                        }
                    }

                    var filteredQueue=[];

                    _.each(content,function(element, index, list){
                        if(index>= beginIndex && index<=endIndex)
                        {
                            filteredQueue.push(element);
                        }
                    });


                    var orderedFilteredQueue=_.sortBy(filteredQueue,'title');
                    var letters = _.groupBy(orderedFilteredQueue,function(val){ return val.title[0];});
                    var reducedLetters=[];

                    _.each(letters,function(element,index,list)
                    {
                        var obj={};

                        obj[index] = filteredQueue.findIndex(function(val){ return val.title[0]==index; });
                        reducedLetters.push(obj);
                    });

                    //creating response
                    var responseObj={
                        count:filteredQueue.length,
                        letters:reducedLetters,
                        items:filteredQueue
                    };

                    res.send({
                        success:true,
                        value: responseObj
                    });
                }
                else
                {
                    res.send({
                        success:false,
                        reason:"beginIndex is not a number"
                    });
                }


            }
            else
            {
                console.log("NOT DEFINED");
                res.send({
                    success:true,
                    value: content
                });
            }


        }
        else
        {
            res.send({
                success:false,
                reason:"Cannot browse"
            });
        }


    })
    .fail(function(reason){
        res.send({
            success:false,
            reason:reason
        });
    });
};

RESTApiBrowse.prototype.listingSearch=function(req,res)
{
    var query;

    if(req.query && req.query.query)
        query=decodeURIComponent(req.query.query);
    else query='/';

    console.log("QUERY= "+query);
    var defer;


    defer=this.commandRouter.volumioSearch({"value":query});

    defer.then(function(value)
    {



        if(value.navigation)
        {
            var content=[];

            for(var i in value.navigation.lists)
            {

                for(var j in value.navigation.lists[i].items)
                {
                    var item=value.navigation.lists[i].items[j];
                    var uri;

                    if(item.uri.startsWith('music-library'))
                    {
                        uri="/"+item.uri;
                    }
                    else uri=item.uri;
                    
                    item.name = item.title;
                    item.path = uri;
                    item.isFolder = (item.type=='mywebradio-category')||(item.type=='folder');
                    content.push(item)
                }

            }



            res.send({
                success:true,
                value: content
            });
        }
        else
        {
            res.send({
                success:false,
                reason:"Cannot browse"
            });
        }


    })
        .fail(function(reason){
            res.send({
                success:false,
                reason:reason
            });
        });
};

RESTApiBrowse.prototype.getCollectionStats=function(req,res) {
    var returnedData = this.commandRouter.executeOnPlugin('music_service', 'mpd', 'getMyCollectionStats', '');

    returnedData.then(function(stats) {
        if (stats) {
            res.send({
                success:true,
                value:stats
            });
        }
        else {
            res.send({
                success:false,
                reason:'We got an issue retrieving the Collection statistics'
            });
        }
    })
}

RESTApiBrowse.prototype.getZones=function(req,res) {

    var zones = this.commandRouter.executeOnPlugin('system_controller', 'volumiodiscovery', 'getDevices');
    if (zones && zones.list) {
        res.send({
            success:true,
            value: zones.list
        });
    }
    else {
        res.send({
            success:false,
            reason:'Error retrieving zones'
        });
    }

}
