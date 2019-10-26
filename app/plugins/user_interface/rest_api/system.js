'use strict';

var libQ=require('kew');
var _=require('underscore');
var moment=require('moment');

module.exports = RESTApiSystem;

function RESTApiSystem(context) {
    var self = this;
    
    // Save a reference to the parent commandRouter
    self.context=context;
    self.logger=self.context.logger;
    self.commandRouter = self.context.coreCommand;
}

RESTApiSystem.prototype.ping=function(req, res) {
    res.send('pong');
};

RESTApiSystem.prototype.getSystemVersion=function(req, res) {
    var self = this;
    var returnedData = self.commandRouter.executeOnPlugin('system_controller', 'system', 'getSystemVersion');

    if (returnedData != undefined) {
        returnedData.then(function (data) {
            if (data != undefined) {
                res.send(data);
            }
        });
    }
};


