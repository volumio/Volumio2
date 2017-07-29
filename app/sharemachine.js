'use strict';

var libQ = require('kew');

module.exports = CoreShareMachine;
function CoreShareMachine(commandRouter){
  var self=this;

  this.commandRouter = commandRouter;
  this.handlers = [];
}

//The handler object should have this format: {serviceName: "Youtube", plugin: "music_service/youtube", handlerMethod:"add", platform_android:"*://*.youtube.com"}
CoreShareMachine.prototype.addShareHandler = function(shareHandler){
  this.handlers = this.handlers.concat([shareHandler]);
  return libQ.resolve();
}
