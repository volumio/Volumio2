module.exports = ExamplePlugin;

function ExamplePlugin(commandRouter) {
	var self = this;

}


/*
 * This method can be defined by every plugin which needs to be informed of the startup of Volumio.
 * The Core controller checks if the method is defined and executes it on startup if it exists.
 */
ExamplePlugin.prototype.onVolumioStart = function() {
    var self = this;
	//Perform startup tasks here
}

ExamplePlugin.prototype.onStop = function() {
    var self = this;
    //Perform startup tasks here
}

ExamplePlugin.prototype.onRestart = function() {
    var self = this;
    //Perform startup tasks here
}

ExamplePlugin.prototype.onInstall = function()
{
    var self = this;
    //Perform your installation tasks here
}

ExamplePlugin.prototype.onUninstall = function()
{
    var self = this;
    //Perform your installation tasks here
}

ExamplePlugin.prototype.getUIConfig = function()
{
    var self = this;

    return {success:true,plugin:"example_plugin"};
}

ExamplePlugin.prototype.setUIConfig = function(data)
{
    var self = this;
    //Perform your installation tasks here
}

ExamplePlugin.prototype.getConf = function(varName)
{
    var self = this;
    //Perform your installation tasks here
}

ExamplePlugin.prototype.setConf = function(varName, varValue)
{
    var self = this;
    //Perform your installation tasks here
}

//Optional functions exposed for making development easier and more clear
ExamplePlugin.prototype.getSystemConf = function(pluginName,varName)
{
    var self = this;
    //Perform your installation tasks here
}

ExamplePlugin.prototype.setSystemConf = function(pluginName,varName)
{
    var self = this;
    //Perform your installation tasks here
}

ExamplePlugin.prototype.getAdditionalConf = function()
{
    var self = this;
    //Perform your installation tasks here
}

ExamplePlugin.prototype.setAdditionalConf = function()
{
    var self = this;
    //Perform your installation tasks here
}
