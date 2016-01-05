/**
 * Created by massi on 05/01/16.
 */

var exec = require('child_process').exec;

module.exports = PlatformSpecific;
function PlatformSpecific (coreCommand) {
    var self=this;

    self.coreCommand=coreCommand;
}

PlatformSpecific.prototype.shutdown = function() {
    var self = this;
    exec("sudo /sbin/halt", function (error, stdout, stderr) {
        if (error !== null) {
            self.coreCommand.pushConsoleMessage(error);
        } else self.coreCommand.pushConsoleMessage('Shutting Down');
    });
}