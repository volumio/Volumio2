module.exports = ExamplePlugin;

function ExamplePlugin(commandRouter) {
	var self = this;

}


/*
 * This method can be defined by every plugin which needs to be informed of the startup of Volumio.
 * The Core controller checks if the method is defined and executes it on startup if it exists.
 */
ExamplePlugin.prototype.onVolumioStart = function() {
	//Perform startup tasks here
}

ExamplePlugin.prototype.onInstall = function()
{
    //Perform your installation tasks here
}

ExamplePlugin.prototype.getUIConfigurationSection = function()
{
    //Perform your installation tasks here
}
