module.exports = DirBle;

function DirBle(commandRouter) {
	var self = this;

}


/*
 * This method can be defined by every plugin which needs to be informed of the startup of Volumio.
 * The Core controller checks if the method is defined and executes it on startup if it exists.
 */
DirBle.prototype.onVolumioStart = function() {
	//Perform startup tasks here
}

DirBle.prototype.onStart = function() {
    //Perform startup tasks here
}

DirBle.prototype.onStop = function() {
    //Perform startup tasks here
}

DirBle.prototype.onRestart = function() {
    //Perform startup tasks here
}

DirBle.prototype.onInstall = function()
{
    //Perform your installation tasks here
}

DirBle.prototype.onUninstall = function()
{
    //Perform your installation tasks here
}

DirBle.prototype.getUIConfig = function()
{
    //Perform your installation tasks here
}

DirBle.prototype.setUIConfig = function(data)
{
    //Perform your installation tasks here
}

DirBle.prototype.getConf = function(varName)
{
    //Perform your installation tasks here
}

DirBle.prototype.setConf = function(varName, varValue)
{
    //Perform your installation tasks here
}


//Optional functions exposed for making development easier and more clear
DirBle.prototype.getSystemConf = function(pluginName,varName)
{
    //Perform your installation tasks here
}

DirBle.prototype.setSystemConf = function(pluginName,varName)
{
    //Perform your installation tasks here
}

DirBle.prototype.getAdditionalConf = function()
{
    //Perform your installation tasks here
}

DirBle.prototype.setAdditionalConf = function()
{
    //Perform your installation tasks here
}
