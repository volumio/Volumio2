var libQ = require('kew');
var libNet = require('net');
var libFast = require('fast.js');
var fs=require('fs-extra');
var exec = require('child_process').exec;
var Wireless = require('./lib/index.js');
var iwconfig = require('./lib/iwconfig.js');
var iwlist = require('./lib/iwlist.js');
var ifconfig = require('./lib/ifconfig.js');
var config= new (require('v-conf'))();
var ip=require('ip');
var S=require('string');
var isOnline = require('is-online');
var os = require('os');


var connected = false;
var iface = 'wlan0';

var wireless = new Wireless({
	iface: iface,
	updateFrequency: 13,
	vanishThreshold: 7
});

// Define the ControllerNetwork class
module.exports = ControllerNetwork;

function ControllerNetwork(context) {
	var self = this;

	// Save a reference to the parent commandRouter
	self.context=context;
	self.commandRouter = self.context.coreCommand;

	self.logger=self.context.logger;
}

ControllerNetwork.prototype.onVolumioStart = function() {
	var self = this;
	//Perform startup tasks here

	//getting configuration
	var configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');
	config.loadFile(configFile);
}

ControllerNetwork.prototype.onStart = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerNetwork.prototype.onStop = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerNetwork.prototype.onRestart = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerNetwork.prototype.onInstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetwork.prototype.onUninstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetwork.prototype.getConfigurationFiles = function()
{
	var self = this;

	return ['config.json'];
}

ControllerNetwork.prototype.getUIConfig = function()
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

	//dhcp
	uiconf.sections[0].content[0].value=config.get('dhcp');

	//static ip
	uiconf.sections[0].content[1].value=config.get('ethip');

	//static netmask
	uiconf.sections[0].content[2].value=config.get('ethnetmask');

	//static gateway
	uiconf.sections[0].content[3].value=config.get('ethgateway');



	//

	console.log(uiconf);

	return uiconf;
}

ControllerNetwork.prototype.setUIConfig = function(data)
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

}

ControllerNetwork.prototype.getConf = function(varName)
{
	var self = this;

	return self.config.get(varName);
}

ControllerNetwork.prototype.setConf = function(varName, varValue)
{
	var self = this;

	self.config.set(varName,varValue);
}

//Optional functions exposed for making development easier and more clear
ControllerNetwork.prototype.getSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetwork.prototype.setSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetwork.prototype.getAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetwork.prototype.setAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}


ControllerNetwork.prototype.getWirelessNetworks = function(defer)
{
	var self = this;
	var networksarray = [];

	var defer=libQ.defer();
	iwlist.scan('wlan0', function(err, networks) {
		var self = this;
		self.networksarray = networks;
		self.networkresults = {"available":self.networksarray}
		defer.resolve(self.networkresults);
	});
	return defer.promise;
}


ControllerNetwork.prototype.saveWiredNet=function(data)
{
	var self = this;

	var defer = libQ.defer();

	var dhcp=data['dhcp'];
	var static_ip=data['static_ip'];
	var static_netmask=data['static_netmask'];
	var static_gateway=data['static_gateway'];

	//	fs.copySync(__dirname + '/config.json', __dirname + '/config.json.orig');

	config.set('dhcp', dhcp);
	config.set('ethip', static_ip);
	config.set('ethnetmask', static_netmask);
	config.set('ethgateway', static_gateway);

	self.rebuildNetworkConfig();
	self.commandRouter.pushToastMessage('success',"Configuration update", 'The configuration has been successfully updated');


	defer.resolve({});
	return defer.promise;
}


ControllerNetwork.prototype.getData = function(data,key)
{
	var self = this;

	for(var i in data)
	{
		var ithdata=data[i];

		if(ithdata[key]!=undefined)
			return ithdata[key];
	}

	return null;
}

/**
 *
 * @param data {ssid:’miarete’, encryption:wpa,password:’’}
 * @returns {*}
 */
ControllerNetwork.prototype.saveWirelessNetworkSettings = function(data)
{
	var self = this;

	self.logger.info("Saving new wireless network");

	var network_ssid=data['ssid'];
	var network_pass=data['password'];

	config.set('wlanssid',network_ssid);
	config.set('wlanpass',network_pass);

	self.wirelessConnect({ssid:network_ssid, pass:network_pass});

	self.commandRouter.pushToastMessage('success',"Configuration update",'The configuration has been successfully updated');
	fs.writeFile('/data/configuration/netconfigured', ' ', function (err) {
		if (err) {
			console.log(error);
		}});
}

ControllerNetwork.prototype.wirelessConnect = function(data) {
	var self = this;

	if (data.pass){
	var netstring = 'ctrl_interface=/var/run/wpa_supplicant'+ os.EOL + 'network={' + os.EOL + 'ssid="' + data.ssid + '"' + os.EOL + 'psk="' + data.pass + '"' + os.EOL + '}'+ os.EOL + 'network={' + os.EOL + 'ssid="' + data.ssid + '"' + os.EOL + 'key_mgmt=NONE' + os.EOL +'wep_key0="' + data.pass + '"'+ os.EOL + 'wep_tx_keyidx=0' + os.EOL + '}';
	} else {
		var netstring = 'ctrl_interface=/var/run/wpa_supplicant'+ os.EOL + 'network={' + os.EOL + 'ssid="' + data.ssid + '"' + os.EOL + 'key_mgmt = NONE' + os.EOL + '}'
	}
	fs.writeFile('/etc/wpa_supplicant/wpa_supplicant.conf', netstring, function (err) {
		if (err) {
			console.log(err);
		}


		exec('sudo /etc/init.d/netplug restart',
			function (error, stdout, stderr) {

				if (error !== null) {
					self.commandRouter.pushToastMessage('error',"Network restart",'Error while restarting network: '+error);
				} else

				 self.commandRouter.pushToastMessage('success',"Network restart",'Network successfully restarted');

			});
	});

}

ControllerNetwork.prototype.rebuildNetworkConfig = function()
{
	var self=this;

	try{
		var ws=fs.createOutputStream('/etc/network/interfaces');

		ws.cork();
		ws.write('auto lo\n');
		ws.write('iface lo inet loopback\n');
		ws.write('\n');

		ws.write('auto eth0\n');
		if(config.get('dhcp')==true || config.get('dhcp')=='true')
		{
			ws.write('iface eth0 inet dhcp\n');
		}
		else
		{
			ws.write('iface eth0 inet static\n');

			ws.write('address '+config.get('ethip')+'\n');
			ws.write('netmask '+config.get('ethnetmask')+'\n');
			ws.write('gateway '+config.get('ethgateway')+'\n');
		}

		ws.write('\n');

		ws.uncork();
		ws.end();

		console.log("Restarting networking layer");
		exec('sudo /bin/systemctl restart networking.service',
			function (error, stdout, stderr) {

				if (error !== null) {
					self.commandRouter.pushToastMessage('error',"Network restart",'Error while restarting network: '+error);
				}
				else self.commandRouter.pushToastMessage('success',"Network restart",'Network successfully restarted');

			});
	}
	catch(err)
	{
		self.commandRouter.pushToastMessage('error',"Network setup",'Error while setting network: '+err);
	}

}

ControllerNetwork.prototype.getInfoNetwork=function()
{
	var self=this;

	var defer=libQ.defer();
	var response= [];
	var oll;

	var ethip = ''
	var wlanip = ''
	isOnline(function(err, online) {
		if(online) oll='yes';
		else oll='no';
		});

	ifconfig.status('eth0', function(err, status) {
  if (status != undefined){
		if (status.ipv4_address!= undefined){
		ethip = status.ipv4_address
		var ethstatus = {type:"Wired", ip:ethip,status:"connected",speed:" ",online:oll}
		response.push(ethstatus);
		}
	}
});

ifconfig.status('wlan0', function(err, status) {
if (status != undefined){
	if (status.ipv4_address!= undefined){
	wlanip = status.ipv4_address
	var wlanstatus = {type:"Wireless", ip:wlanip,status:"connected",speed:"",online:oll}
	response.push(wlanstatus);
	console.log(wlanstatus);
	defer.resolve(response);
}	
}
});



console.log(response);
		return defer.promise;

/*

	exec("ethtool eth0", function (error, stdout, stderr) {
		if (error !== null) {
				defer.resolve({status:"Not Connected",online:"no"});
			}
			else
			{
				//var lines=stdout.split('\n');
				self.logger.info(stdout);
				var connected=false;
				var speed='';
				var address='';

				/*for(var i in lines)
				{
					self.logger.info("LINE");
					var line=lines[i];

					self.logger.info(line);

					if(line.contains("Link detected:"))
						connected=line.trim().endsWith("yes");
					else if(line.contains("Speed:"))
						speed=line.strip("Speed:").trim();
				}

				address=ip.address();

				isOnline(function(err, online) {
					var oll;

					if(online) oll='yes';
					else oll='no';

					var response=[{
						type:"wired",
						status:"connected",
						ip:address,
						speed:speed,
						online:oll}];

					defer.resolve(response);
			});
			}

		});
*/

}
