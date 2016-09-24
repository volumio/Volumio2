'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var iwlist = require('./lib/iwlist.js');
var ifconfig = require('./lib/ifconfig.js');
var config = new (require('v-conf'))();
var ip = require('ip');
var isOnline = require('is-online');
var os = require('os');


// Define the ControllerNetwork class
module.exports = ControllerNetwork;

function ControllerNetwork(context) {
	var self = this;

	// Save a reference to the parent commandRouter
	self.context = context;
	self.commandRouter = self.context.coreCommand;

	self.logger = self.context.logger;
}

ControllerNetwork.prototype.onVolumioStart = function () {
	var self = this;
	//Perform startup tasks here

	//getting configuration
	var configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');
	config.loadFile(configFile);

    return libQ.resolve();
};

ControllerNetwork.prototype.onStop = function () {
	var self = this;
	//Perform startup tasks here
};

ControllerNetwork.prototype.onRestart = function () {
	var self = this;
	//Perform startup tasks here
};

ControllerNetwork.prototype.onInstall = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetwork.prototype.onUninstall = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetwork.prototype.getConfigurationFiles = function () {
	var self = this;

	return ['config.json'];
};

ControllerNetwork.prototype.getUIConfig = function () {
	var self = this;

	var lang_code = self.commandRouter.sharedVars.get('language_code');

	var defer=libQ.defer();
	self.commandRouter.i18nJson(__dirname+'/../../../i18n/strings_'+lang_code+'.json',
		__dirname+'/../../../i18n/strings_en.json',
		__dirname + '/UIConfig.json')
		.then(function(uiconf)
		{


	//dhcp
	uiconf.sections[1].content[0].value = config.get('dhcp');

	//static ip
	uiconf.sections[1].content[1].value = config.get('ethip');

	//static netmask
	uiconf.sections[1].content[2].value = config.get('ethnetmask');

	//static gateway
	uiconf.sections[1].content[3].value = config.get('ethgateway');


	//Wireless

	//dhcp
	  //dhcp
        if (config.get('wirelessdhcp') == undefined) {
            uiconf.sections[2].content[0].value = true;
        } else {
            uiconf.sections[2].content[0].value = config.get('wirelessdhcp');
        }

	//static ip
	uiconf.sections[2].content[1].value = config.get('wirelessip');

	//static netmask
	uiconf.sections[2].content[2].value = config.get('wirelessnetmask');

	//static gateway
	uiconf.sections[2].content[3].value = config.get('wirelessgateway');

			if (config.get('enable_hotspot') == undefined) {
				uiconf.sections[4].content[0].value = true;
			} else {
				uiconf.sections[4].content[0].value = config.get('enable_hotspot');
			}

			if (config.get('hotspot_name') == undefined) {
				uiconf.sections[4].content[1].value = 'Volumio';
			} else {
				uiconf.sections[4].content[1].value = config.get('hotspot_name');
			}

			if (config.get('hotspot_protection') == undefined) {
				uiconf.sections[4].content[2].value = false;
			} else {
				uiconf.sections[4].content[2].value = config.get('hotspot_protection');
			}

			if (config.get('hotspot_password') == undefined) {
				uiconf.sections[4].content[3].value = '';
			} else {
				uiconf.sections[4].content[3].value = config.get('hotspot_password');
			}

			if (config.get('hotspot_channel') == undefined) {
				uiconf.sections[4].content[4].value.value = 4;
				uiconf.sections[4].content[4].value.label = '4';
			} else {
				uiconf.sections[4].content[4].value.value = Number(config.get('hotspot_channel'));
				uiconf.sections[4].content[4].value.label = config.get('hotspot_channel');
			}

			//console.log(uiconf);

			defer.resolve(uiconf);
		})
		.fail(function()
		{
			defer.reject(new Error());
		})

	return defer.promise
};

ControllerNetwork.prototype.setUIConfig = function (data) {
	var self = this;

	var uiconf = fs.readJsonSync(__dirname + '/UIConfig.json');

};

ControllerNetwork.prototype.getConf = function (varName) {
	var self = this;

	return self.config.get(varName);
};

ControllerNetwork.prototype.setConf = function (varName, varValue) {
	var self = this;

	self.config.set(varName, varValue);
};

//Optional functions exposed for making development easier and more clear
ControllerNetwork.prototype.getSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetwork.prototype.setSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetwork.prototype.getAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetwork.prototype.setAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};


ControllerNetwork.prototype.getWirelessNetworks = function (defer) {
	var self = this;
	var defer = libQ.defer();



	 iwlist.scan('wlan0', function (err, networks) {
		 var self = this;

		 if (err) {
		 	console.log('An error occurred while scanning: '+err)
		 	console.log('Cannot use regular scanning, forcing with ap-force')
			 var networksarray = [];
			 var arraynumber = 0;


			 try {
				 var wirelessnets = execSync("/usr/bin/sudo /sbin/iw dev wlan0 scan ap-force", {encoding: 'utf8'});

				 var wirelessnets2 = wirelessnets.split('BSS');
				 for (var i = 0; i < wirelessnets2.length; i++) {
					 var network = {};
					 var wirelessnets3 = wirelessnets2[i].split("\n")
					 for (var e = 0; e < wirelessnets3.length; e++) {
						 var scanResults = wirelessnets3[e].replace('\t', '').replace(' ', '').split(":");
						 //console.log(scanResults);

						 switch (scanResults[0]) {
							 case 'SSID':

								 network.ssid = scanResults[1].toString();

								 break;
							 case 'WPA':

								 network.security = 'wpa2';

								 break;
							 case 'signal':

								 var signal = '';
								 var dbmraw = scanResults[1].split('.');
								 var dbm = Number(dbmraw[0]);
								 var rel = 100 + dbm;

								 if (rel >= 65)
									 signal = 5;
								 else if (rel >= 50)
									 signal = 4;
								 else if (rel >= 40)
									 signal = 3;
								 else if (rel >= 30)
									 signal = 2;
								 else if (rel >= 1)
									 signal = 1;

								 network.signal = signal;

								 break;
							 default:
								 break;
						 }

					 }

					 if (network.ssid) {
						 //console.log(network)
						 if (networksarray.length > 0) {
							 var found = false;
							 for (var o = 0; o < networksarray.length; o++) {
								 if (network.ssid == networksarray[o].ssid) {
									 found = true;
								 }
							 }
							 if (found === false) {
								 networksarray.push(network);
							 }
						 } else {
							 networksarray.push(network);
						 }
					 }
				 }

				 var networkresults = {"available": networksarray}
				 defer.resolve(networkresults);
			 } catch (e)
			 {console.log('Cannot use fallback scanning method: '+e)}
		 } else {
			 var networksarray = networks;
			 var networkresults = {"available": networksarray}
			 defer.resolve(networkresults);
		 }

	 });

	return defer.promise;
};


ControllerNetwork.prototype.saveWiredNet = function (data) {
	var self = this;

	var defer = libQ.defer();

	var dhcp = data['dhcp'];
	var static_ip = data['static_ip'];
	var static_netmask = data['static_netmask'];
	var static_gateway = data['static_gateway'];

	//	fs.copySync(__dirname + '/config.json', __dirname + '/config.json.orig');

	config.set('dhcp', dhcp);
	config.set('ethip', static_ip);
	config.set('ethnetmask', static_netmask);
	config.set('ethgateway', static_gateway);


	self.rebuildNetworkConfig();
	self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('NETWORK.NETWORK_RESTART_TITLE'), self.commandRouter.getI18nString('NETWORK.NETWORK_RESTART_SUCCESS'));


	defer.resolve({});
	return defer.promise;
};

ControllerNetwork.prototype.saveWirelessNet = function (data) {
	var self = this;

	var defer = libQ.defer();

	var dhcp = data['wireless_dhcp'];
	var static_ip = data['wireless_static_ip'];
	var static_netmask = data['wireless_static_netmask'];
	var static_gateway = data['wireless_static_gateway'];

	//	fs.copySync(__dirname + '/config.json', __dirname + '/config.json.orig');
	var wirelessdhcp = config.get('wirelessdhcp');
	if (wirelessdhcp == undefined) {
		config.addConfigValue('wirelessdhcp', 'boolean', dhcp);
		config.addConfigValue('wirelessip', 'string', static_ip);
		config.addConfigValue('wirelessnetmask', 'string', static_netmask);
		config.addConfigValue('wirelessgateway', 'string', static_gateway);
	} else {
		config.set('wirelessdhcp', dhcp);
		config.set('wirelessip', static_ip);
		config.set('wirelessnetmask', static_netmask);
		config.set('wirelessgateway', static_gateway);
	}

	self.rebuildNetworkConfig();
	self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('NETWORK.NETWORK_RESTART_TITLE'), self.commandRouter.getI18nString('NETWORK.NETWORK_RESTART_SUCCESS'));


	defer.resolve({});
	return defer.promise;
};


ControllerNetwork.prototype.getData = function (data, key) {
	var self = this;

	for (var i in data) {
		var ithdata = data[i];

		if (ithdata[key] != undefined)
			return ithdata[key];
	}

	return null;
};

/**
 *
 * @param data {ssid:’miarete’, encryption:wpa,password:’’}
 * @returns {*}
 */
ControllerNetwork.prototype.saveWirelessNetworkSettings = function (data) {
	var self = this;

	self.logger.info("Saving new wireless network");

	var network_ssid = data['ssid'];
	var network_pass = data['password'];

	config.set('wlanssid', network_ssid);
	config.set('wlanpass', network_pass);

	self.wirelessConnect({ssid: network_ssid, pass: network_pass});

	self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('NETWORK.WIRELESS_RESTART_TITLE'), self.commandRouter.getI18nString('NETWORK.WIRELESS_RESTART_SUCCESS'));
	fs.writeFile('/data/configuration/netconfigured', ' ', function (err) {
		if (err) {
			self.logger.error('Cannot write netconfigured '+error);
		}
	});
};

ControllerNetwork.prototype.saveHotspotSettings = function (data) {
	var self = this;
	
	if(data.hotspot_protection && data.hotspot_password.length < 8) {
		self.commandRouter.pushToastMessage('error', self.commandRouter.getI18nString('NETWORK.HOTSPOT_CONF_ERROR'), self.commandRouter.getI18nString('NETWORK.HOTSPOT_PW_LENGTH'));
	} else {

	var hotspot = config.get('enable_hotspot');
	if (hotspot == undefined) {
		config.addConfigValue('enable_hotspot', 'boolean', data.enable_hotspot);
		config.addConfigValue('hotspot_name', 'string', data.hotspot_name);
		config.addConfigValue('hotspot_protection', 'boolean', data.hotspot_protection);
		config.addConfigValue('hotspot_password', 'string', data.hotspot_password);
		config.addConfigValue('hotspot_channel', 'string', data.hotspot_channel.label);
		self.rebuildHotspotConfig();
	} else {
		config.set('enable_hotspot', data.enable_hotspot);
		config.set('hotspot_name', data.hotspot_name);
		config.set('hotspot_protection', data.hotspot_protection);
		config.set('hotspot_password', data.hotspot_password);
		config.set('hotspot_channel', data.hotspot_channel.label);
		self.rebuildHotspotConfig();
	}



	self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('NETWORK.NETWORK_RESTART_TITLE'), self.commandRouter.getI18nString('NETWORK.NETWORK_RESTART_SUCCESS'));
	}
};

ControllerNetwork.prototype.rebuildHotspotConfig = function () {
	var self = this;
	var hostapdedimax = '/etc/hostapd/hostapd-edimax.conf';
	var hostapd = '/etc/hostapd/hostapd.conf';
	var hotspotname = config.get('hotspot_name');
	var hotspotchannel = config.get('hotspot_channel');
	var hotspotpassword = config.get('hotspot_password');

	try {
		fs.accessSync(hostapdedimax, fs.F_OK);
		exec("/usr/bin/sudo /bin/chmod 777 "+ hostapdedimax, {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
			if (error !== null) {
				console.log('Canot set permissions for /etc/hostapd/hostapd-edimax.conf: ' + error);

			} else {
				self.logger.info('Permissions for /etc/hostapd/hostapd-edimax.conf')

				try {
					var ws = fs.createWriteStream(hostapdedimax);
					ws.cork();

					if (config.get('enable_hotspot') == true || config.get('enable_hotspot') == 'true') {
						ws.write('interface=wlan0\n');
						ws.write('ssid='+hotspotname+'\n');
						ws.write('channel='+hotspotchannel+'\n');
						ws.write('driver=rtl871xdrv\n');
						ws.write('hw_mode=g\n');
						if (config.get('hotspot_protection') == true || config.get('hotspot_protection') == 'true') {
							ws.write('auth_algs=1\n');
							ws.write('wpa=2\n');
							ws.write('wpa_key_mgmt=WPA-PSK\n');
							ws.write('rsn_pairwise=CCMP\n');
							ws.write('wpa_passphrase='+hotspotpassword+'\n');
						}
					}
					else {
						ws.write(' ');
					}

					ws.end();

				} catch (err) {

				}
			}
		});
	} catch (e) {
		//No /etd/hostapd/hostapd-edimax.conf
	}

	exec("/usr/bin/sudo /bin/chmod 777 " + hostapd, {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
		if (error !== null) {
			console.log('Canot set permissions for /etc/hostapd/hostapd.conf: ' + error);

		} else {
			self.logger.info('Permissions for /etc/hostapd/hostapd.conf')

			try {
				var hs = fs.createWriteStream(hostapd);
				hs.cork();

				if (config.get('enable_hotspot') == true || config.get('enable_hotspot') == 'true') {
					hs.write('interface=wlan0\n');
					hs.write('ssid=' + hotspotname + '\n');
					hs.write('channel=' + hotspotchannel + '\n');
					hs.write('hw_mode=g\n');
					if (config.get('hotspot_protection') == true || config.get('hotspot_protection') == 'true') {
						hs.write('auth_algs=1\n');
						hs.write('wpa=2\n');
						hs.write('wpa_key_mgmt=WPA-PSK\n');
						hs.write('rsn_pairwise=CCMP\n');
						hs.write('wpa_passphrase=' + hotspotpassword + '\n');
					}
				}
				else {
					hs.write(' ');
				}

				hs.end();
				self.commandRouter.wirelessRestart();

			} catch (err) {

			}
		}
	});

};

ControllerNetwork.prototype.wirelessConnect = function (data) {
	var self = this;

	if (data.pass) {
		if (data.pass.length <= 13) {
			var netstring = 'ctrl_interface=/var/run/wpa_supplicant' + os.EOL + 'network={' + os.EOL + 'scan_ssid=1' + os.EOL + 'ssid="' + data.ssid + '"' + os.EOL + 'psk="' + data.pass + '"' + os.EOL + '}' + os.EOL + 'network={' + os.EOL + 'ssid="' + data.ssid + '"' + os.EOL + 'key_mgmt=NONE' + os.EOL + 'wep_key0="' + data.pass + '"' + os.EOL + 'wep_tx_keyidx=0' + os.EOL + '}';
		} else {
			var netstring = 'ctrl_interface=/var/run/wpa_supplicant' + os.EOL + 'network={' + os.EOL + 'scan_ssid=1' + os.EOL + 'ssid="' + data.ssid + '"' + os.EOL + 'psk="' + data.pass + '"' + os.EOL + '}' + os.EOL ;
		}
	} else {
		var netstring = 'ctrl_interface=/var/run/wpa_supplicant' + os.EOL + 'network={' + os.EOL + 'scan_ssid=1' + os.EOL + 'ssid="' + data.ssid + '"' + os.EOL + 'key_mgmt=NONE' + os.EOL + '}';
	}
	fs.writeFile('/etc/wpa_supplicant/wpa_supplicant.conf', netstring, function (err) {
		if (err) {
			self.logger.error('Cannot write wpasupplicant.conf '+error);
		}

		self.commandRouter.wirelessRestart();
	});

};

ControllerNetwork.prototype.rebuildNetworkConfig = function () {
	var self = this;
	var staticfile = '/etc/dhcpcd.conf';

	exec("/usr/bin/sudo /bin/chmod 777 /etc/network/interfaces && /usr/bin/sudo /bin/chmod 777 /etc/dhcpcd.conf", {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
		if (error !== null) {
			console.log('Canot set permissions for /etc/network/interfaces: ' + error);

		} else {
			self.logger.info('Permissions for /etc/network/interfaces set')

			try {
				var ws = fs.createWriteStream('/etc/network/interfaces');
				var staticconf = fs.createWriteStream(staticfile);

				ws.cork();
				staticconf.cork();
				ws.write('auto wlan0\n');
				ws.write('auto lo\n');
				ws.write('iface lo inet loopback\n');
				ws.write('\n');


				staticconf.write('hostname\n');
				staticconf.write('duid\n');
				staticconf.write('option rapid_commit\n');
				staticconf.write('option domain_name_servers, domain_name, domain_search, host_name\n');
				staticconf.write('option classless_static_routes\n');
				staticconf.write('option ntp_servers\n');
				staticconf.write('require dhcp_server_identifier\n');
				staticconf.write('nohook lookup-hostname\n');
				staticconf.write('\n');

				ws.write('allow-hotplug eth0\n');
				if (config.get('dhcp') == true || config.get('dhcp') == 'true') {
					ws.write('iface eth0 inet dhcp\n');
				}
				else {
					ws.write('iface eth0 inet manual\n');
					staticconf.write('interface eth0\n');
					staticconf.write('static ip_address=' + config.get('ethip') + '/24\n');
					staticconf.write('static routers=' + config.get('ethgateway') + '\n');
					staticconf.write('static domain_name_servers=' + config.get('ethgateway') + ' 8.8.8.8\n');
					staticconf.write('\n');
				}

				ws.write('\n');

				ws.write('allow-hotplug wlan0\n');
				ws.write('iface wlan0 inet manual\n');

				if (config.get('wirelessdhcp') == true || config.get('wirelessdhcp') == 'true') {
				} else {
					staticconf.write('interface wlan0\n');
					staticconf.write('static ip_address=' + config.get('wirelessip') + '/24\n');
					staticconf.write('static routers=' + config.get('wirelessgateway') + '\n');
					staticconf.write('static domain_name_servers=' + config.get('wirelessgateway') + ' 8.8.8.8\n');
					staticconf.write('\n');
				}

				ws.end();
				staticconf.end();
					//console.log("Restarting networking layer");
					self.commandRouter.wirelessRestart();
					self.commandRouter.networkRestart();


			} catch (err) {
				self.commandRouter.pushToastMessage('error', self.commandRouter.getI18nString('NETWORK.NETWORK_RESTART_ERROR'), self.getI18NString('NETWORK.NETWORK_RESTART_ERROR') + err);
			}
		}
	});

};


ControllerNetwork.prototype.getInfoNetwork = function () {
	var self = this;

	var defer = libQ.defer();
	var response = [];
	var ethspeed = execSync("/usr/bin/sudo /sbin/ethtool eth0 | grep -i speed | tr -d 'Speed:' | xargs", { encoding: 'utf8' });
	var wirelessspeedraw = execSync("/usr/bin/sudo /sbin/iwconfig wlan0 | grep 'Bit Rate' | awk '{print $2,$3}' | tr -d 'Rate:' | xargs", { encoding: 'utf8' });
	var wirelessspeed = wirelessspeedraw.replace('=', '');
	var ssid = execSync('/usr/bin/sudo /sbin/iwconfig wlan0 | grep ESSID | cut -d\\" -f2', { encoding: 'utf8' });
	var wirelessqualityraw1 = execSync("/usr/bin/sudo /sbin/iwconfig wlan0 | awk '{if ($1==\"Link\"){split($2,A,\"/\");print A[1]}}' | sed 's/Quality=//g'", { encoding: 'utf8' });
	var wirelessqualityraw2 = wirelessqualityraw1.split('/')[0];
	var wirelessquality = 0;

	if (wirelessqualityraw2 >= 65)
		wirelessquality = 5;
	else if (wirelessqualityraw2 >= 50)
		wirelessquality = 4;
	else if (wirelessqualityraw2 >= 40)
		wirelessquality = 3;
	else if (wirelessqualityraw2 >= 30)
		wirelessquality = 2;
	else if (wirelessqualityraw2 >= 1)
		wirelessquality = 1;

	var ethip = ''
	var wlanip = ''
	var oll = 'no';
	isOnline(function (err, online) {
		if (online) oll = 'yes';
	});

	ifconfig.status('eth0', function (err, status) {
		if (status != undefined) {
			if (status.ipv4_address != undefined) {
				ethip = status.ipv4_address
				var ethstatus = {type: "Wired", ip: ethip, status: "connected", speed: ethspeed, online: oll}
				response.push(ethstatus);
			}
		}
	});

	ifconfig.status('wlan0', function (err, status) {
		if (status != undefined) {
			if (status.ipv4_address != undefined) {
				if (status.ipv4_address == '192.168.211.1') {
					var wlanstatus = {type: "Wireless", ssid: 'Volumio Hotspot', signal: 5, ip:'192.168.211.1', online: oll}
				} else {
					wlanip = status.ipv4_address;
					var wlanstatus = {type: "Wireless", ssid: ssid, signal: wirelessquality,ip: wlanip, status: "connected", speed: wirelessspeed, online: oll}
				}

				response.push(wlanstatus);
				//console.log(wlanstatus);

			}
		}
		defer.resolve(response);
	});
//console.log(response);
	return defer.promise;
};

