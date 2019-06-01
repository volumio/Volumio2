'use strict';

var libQ=require('kew');
var _=require('underscore');
var volumeDeltaArray = [];
var muteToggleArray = [];

module.exports = RESTApiPlayback;

function RESTApiPlayback(context) {
    var self = this;


    // Save a reference to the parent commandRouter
    self.context=context;
    self.logger=self.context.logger;
    self.commandRouter = self.context.coreCommand;
}

RESTApiPlayback.prototype.playbackPlay=function(req, res)
{
    var self=this;
    var input=req.body;

    if(input.clear)
    {
        this.commandRouter.stateMachine.clearQueue();
    }

    var promise;

    if(input.items)
    {
        var queue=[];

        for(var i in input.items)
        {
            var newUri;
            var service = 'mpd';
            // When new services are added, we need this function updated for parsing proper service
            if(input.items[i].startsWith('/music-library')) {
                newUri=input.items[i].substring(15);
            } else if(input.items[i].startsWith('spotify:')) {
                newUri=input.items[i];
                service = 'spop';
            } else {
                newUri=input.items[i];
            }

            queue.push({
                "service":service,
                "uri":newUri
            });
        }

        promise=this.commandRouter.stateMachine.addQueueItems(queue);
    }
    else promise=libQ.resolve();

    promise.then(
        function()
        {
           var index=0;
           if(input.index && input.index<self.commandRouter.stateMachine.getQueue().length)
           {
               index=input.index;
           }
           return self.commandRouter.volumioPlay(index);
        }
    )
        .then(function()
        {
            res.send({
                "success":true
            });
        })
        .fail(function(err)
        {
            res.send({
                "success":false,
                "reason":err
            });
        })



};

RESTApiPlayback.prototype.playbackStop=function(req, res)
{
    this.commandRouter.volumioStop();
    res.send({
        "success":true
    });
};

RESTApiPlayback.prototype.playbackPause=function(req, res)
{
    this.commandRouter.volumioPause();
    res.send({
        "success":true
    });
};

RESTApiPlayback.prototype.playbackResume=function(req, res)
{
    this.commandRouter.volumioPlay();
    res.send({
        "success":true
    });
};

RESTApiPlayback.prototype.playbackNext=function(req, res)
{
    this.commandRouter.volumioNext();
    res.send({
        "success":true
    });
};

RESTApiPlayback.prototype.playbackPrevious=function(req, res)
{
    this.commandRouter.volumioPrevious();
    res.send({
        "success":true
    });
};

RESTApiPlayback.prototype.playbackSeek=function(req, res)
{
    var input=req.body;
    var seek=0;

    try
    {
        seek=parseInt(input.seek)/1000;

        this.commandRouter.volumioSeek(seek);

        //Cannot put a promise here, Volumio method doesn't return it
        res.send({
            "success":true
        });
    }
    catch(e)
    {
        res.send({
            "success":false,
            "reason":e
        });
    }
};

RESTApiPlayback.prototype.playbackRandom=function(req, res)
{
    var input=req.body;

    if(input.random!==undefined)
    {
        this.commandRouter.volumioRandom(input.random);
        res.send({
            "success":true
        });
    }
    else if(input.toggle)
    {
        var state=this.commandRouter.stateMachine.getState();
        var random=state.random;

        this.commandRouter.volumioRandom(!random);
        res.send({
            "success":true
        });
    }
    else res.send({
        "success":false,
        "reason":"No random value in request"
    });
};

RESTApiPlayback.prototype.playbackGetRandom=function(req, res)
{
    var state=this.commandRouter.stateMachine.getState();
    var random=state.random;

    if(random==undefined)
        random=false;

    res.send({
        "success":true,
        "value":{
            "random":random
        }
    });
};

RESTApiPlayback.prototype.playbackRepeat=function(req, res)
{
    var input=req.body;

    if(input.repeat!==undefined)
    {
        this.commandRouter.volumioRepeat(input.repeat,input.repeatSingle);
        res.send({
            "success":true
        });
    }
    if(input.cycle)
    {
        var state=this.commandRouter.stateMachine.getState();

        var repeat=state.repeat;
        var repeatSingle=state.repeatSingle;

        if(repeat==undefined || repeat==null)
            repeat=false;

        if(repeatSingle==undefined || repeatSingle==null)
            repeatSingle=false;

        //off -> track -> list

        if(repeat)
        {
            if(repeatSingle)
            {

                console.log("SETTING true,false");
                this.commandRouter.volumioRepeat(true,false);
            }
            else
            {

                console.log("SETTING false,false");
                this.commandRouter.volumioRepeat(false,false);
            }
        }
        else
        {
            console.log("SETTING true,true");
            this.commandRouter.volumioRepeat(true,true);
        }

        res.send({
            "success":true
        });
    }
    else res.send({
        "success":false,
        "reason":"No repeat value in request"
    });
};

RESTApiPlayback.prototype.playbackGetRepeat=function(req, res)
{
    var state=this.commandRouter.stateMachine.getState();

    var repeat=state.repeat;
    var repeatSingle=state.repeatSingle;


    if(repeat==undefined || repeat==null)
        repeat=false;

    if(repeatSingle==undefined || repeatSingle==null)
        repeatSingle=false;

    var repeatStr="off";

    if(repeat)
    {
        if(repeatSingle)
        {
            repeatStr="track";
        }
        else
        {
            repeatStr="list";
        }

    }

    res.send({
        "success":true,
        "value":repeatStr
    });
};

RESTApiPlayback.prototype.playbackConsume=function(req, res)
{
    var input=req.body;

    if(input.consume!==undefined)
    {
        this.commandRouter.volumioConsume(input.consume);
        res.send({
            "success":true
        });
    }
    else res.send({
        "success":false,
        "reason":"No consume value in request"
    });
};

RESTApiPlayback.prototype.playbackGetConsume=function(req, res)
{
    var state=this.commandRouter.stateMachine.getState();
    var consume=state.consume;

    if(consume==undefined)
        consume=false;

    res.send({
        "success":true,
        "value":{
            "consume":consume
        }
    });
};


RESTApiPlayback.prototype.playbackGetStatus=function(req, res)
{
    var state=this.commandRouter.stateMachine.getState();

    var random=state.random!==null?state.random:false;
    var repeat=state.repeat!==null?state.repeat:false;
    var repeatSingle=state.repeatSingle!==null?state.repeatSingle:false;
    var consume=state.consume!==null?state.consume:false;

    var repeatStatus="off";
    if(repeat)
    {
        if(repeatSingle)
        {
            repeatStatus="track";
        }
        else
        {
            repeatStatus="list";
        }
    }

    res.send({
        "success":true,
        "value":{
            "status":state.status,
            "index":state.position,
            "title":state.title,
            "artist":state.artist,
            "album":state.album,
            "albumart":state.albumart,
            "trackType":state.trackType,
            "seek":state.seek,
            "duration":state.duration*1000,
            "random":random,
            "repeat":repeatStatus,
            "consume":consume,
            "volume":state.volume
        }
    });
};

RESTApiPlayback.prototype.playbackVolume=function(req, res)
{
    var input=req.body;

    if(input.volume!==undefined)
    {
        if(_.isNumber(input.volume))
        {
            this.commandRouter.volumiosetvolume(input.volume);
            var setVolume = this.setVolume(input.volume);
            setVolume.then((volume)=>{
                this.commandRouter.volumioupdatevolume(volume);
            return res.send({
                "success":true})
        })
            res.send({
                "success":true
            });
        }
        else
        {
            res.send({
                "success":false,
                "reason":"Volume is not an integer"
            });
        }

    }
    else if(input.delta!==undefined)
    {
        if(_.isNumber(input.delta))
        {
            volumeDeltaArray.push(input.delta);
            var setVolume = this.setDeltaVolume(volumeDeltaArray[0]);
            setVolume.then((volume)=>{
                this.commandRouter.volumioupdatevolume(volume);
                volumeDeltaArray.splice(0, 1);
                return res.send({
                "success":true})
            })

        }
        else
        {
            res.send({
                "success":false,
                "reason":"Delta is not an integer"
            });
        }

    }
    else {
        res.send({
            "success":false,
            "reason":"No volume value in request"
        });
    }
};

RESTApiPlayback.prototype.setDeltaVolume=function(deltaVolume)
{
    var defer = libQ.defer();
    var volume=this.commandRouter.stateMachine.currentVolume;
    volume+=deltaVolume;
    var execVolume = this.commandRouter.volumeControl.alsavolume(volume);
    execVolume.then(function(result){
        defer.resolve(result);
    })
    return defer.promise
};

RESTApiPlayback.prototype.setVolume=function(volume)
{
    var defer = libQ.defer();
    var execVolume = this.commandRouter.volumeControl.alsavolume(volume);
    execVolume.then(function(result){
        defer.resolve(result);
    })
    return defer.promise
};

RESTApiPlayback.prototype.playbackGetVolume=function(req, res)
{
    this.commandRouter.volumeControl.getVolume(function(vol)
    {
        res.send({
            "success":true,
            "value":{
                "volume":vol
            }
        });
    });
};

RESTApiPlayback.prototype.playbackMute=function(req, res)
{
    var self=this;
    var input=req.body;
    var promise;

    if(input.mute!==undefined)
    {
        if(input.mute=='toggle')
        {
            muteToggleArray.push('toggle');
            var setMute = this.setMuteToggle();
            setMute.then((result)=>{
                this.commandRouter.volumioupdatevolume(result);
                muteToggleArray.splice(0, 1);
                res.send({
                "success":true,
                "value":{
                    "mute":result.mute
                    }
                });
            });

        }
        else
        {
            if(input.mute=='true') {
                var setMute = this.setMuteToggle('mute');
                setMute.then((result)=> {
                    this.commandRouter.volumioupdatevolume(result);
                    res.send({
                    "success":true,
                    "value":{
                        "mute":result.mute
                        }
                    });
                });
            } else  {
                var setMute = this.setMuteToggle('unmute');
                setMute.then((result)=>{
                    this.commandRouter.volumioupdatevolume(result);
                    res.send({
                    "success":true,
                    "value":{
                        "mute":result.mute
                        }
                    });
                });
            }
        }
    }
    else { res.send({
            "success":false,
            "reason":"No volume value in request"
        });
    }
};

RESTApiPlayback.prototype.setMuteToggle=function(value)
{
    var defer = libQ.defer();
    if (value !== undefined) {
        var state=this.commandRouter.stateMachine.getState();
        var execMute = this.setVolume(value);
        execMute.then((result)=>{
            defer.resolve(result);
        })
    } else {
        var state=this.commandRouter.stateMachine.getState();
        console.log("MUTED: "+state.mute);

        if(state.mute){
            var execMute = this.setVolume('unmute');
            execMute.then((result)=>{
                defer.resolve(result);
            })

        } else {
            var execMute = this.setVolume('mute');
            execMute.then((result)=>{
                defer.resolve(result);
            })
        }
    }

    return defer.promise
};

RESTApiPlayback.prototype.playbackGetMute=function(req, res)
{
    var self=this;

    var state=this.commandRouter.stateMachine.getState();

    console.log("VOLUME: "+state.mute);

    res.send({
        "success":true,
        "value":{
            "mute":state.mute
        }
    });


};

RESTApiPlayback.prototype.ffwdRew=function(req, res)
{
    var self=this;
    var input=req.body;

    if(input.value)
    {
        self.commandRouter.volumioFFWDRew(input.value).then(function()
        {
            res.send({
                "success":true
            });
        })
        .fail(function(err)
        {
            res.send({
                "success":true,
                "reason":err
            });
        });
    }
    else
    {
        res.send({
            "success":false,
            "reason":"Cannot seek"
        });
    }
};

RESTApiPlayback.prototype.playbackGetQueue=function(req, res)
{
    var self=this;

    var queue=this.commandRouter.volumioGetQueue();
    var apiQueue=[];

    _.each(queue,function(element, index, list){
        var uri;

        if(element.uri.startsWith('mnt'))
        {
            uri='/music-library'+element.uri.substring(3);
        }
        else
        {
            uri=element.uri;
        }

        apiQueue.push({
            name:element.name,
            title:element.name,
            filetitle:element.uri.substring(element.uri.lastIndexOf('/')+1),
            path:uri,
            artist:element.artist,
            album:element.album
        });
    });


    res.send({
        "success":true,
        "value":apiQueue

    });


};