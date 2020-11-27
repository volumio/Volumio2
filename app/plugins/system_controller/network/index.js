'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var iwlist = require('./lib/iwlist.js');
var ifconfig = require('./lib/ifconfig.js');
var config = new (require('v-conf'))();
var os = require('os');
var crypto = require('crypto');
var wirelessNetworksScanCache;
var cachedEth0IPAddress;
var cachedWlan0IPAddress;

// Define the ControllerNetwork class
module.exports = ControllerNetwork;

function ControllerNetwork (context) {
  var self = this;

  // Save a reference to the parent commandRouter
  self.context = context;
  self.commandRouter = self.context.coreCommand;

  self.logger = self.context.logger;
}

ControllerNetwork.prototype.onVolumioStart = function () {
  var self = this;
  // Perform startup tasks here

  // getting configuration
  var configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');
  config.loadFile(configFile);
  self.refreshCachedPAddresses();

  if (!config.has('wirelessNetworksSSID') && config.has('wlanssid')) {
    config.addConfigValue('wirelessNetworksSSID', 'array', config.get('wlanssid'));
    config.addConfigValue('wirelessNetworksPASSWD', 'array', config.get('wlanpass'));

    config.delete('wlanssid');
    config.delete('wlanpass');
  }

  return libQ.resolve();
};

ControllerNetwork.prototype.onStop = function () {
  var self = this;
  // Perform startup tasks here
};

ControllerNetwork.prototype.onRestart = function () {
  var self = this;
  // Perform startup tasks here
};

ControllerNetwork.prototype.onInstall = function () {
  var self = this;
  // Perform your installation tasks here
};

ControllerNetwork.prototype.onUninstall = function () {
  var self = this;
  // Perform your installation tasks here
};

ControllerNetwork.prototype.getConfigurationFiles = function () {
  var self = this;

  return ['config.json'];
};

ControllerNetwork.prototype.getUIConfig = function () {
  var self = this;

  var lang_code = self.commandRouter.sharedVars.get('language_code');

  var defer = libQ.defer();
  self.commandRouter.i18nJson(__dirname + '/../../../i18n/strings_' + lang_code + '.json',
    __dirname + '/../../../i18n/strings_en.json',
    __dirname + '/UIConfig.json')
    .then(function (uiconf) {
      // dhcp
      uiconf.sections[1].content[0].value = config.get('dhcp');

      // static ip
      uiconf.sections[1].content[1].value = config.get('ethip');

      // static netmask
      uiconf.sections[1].content[2].value = config.get('ethnetmask');

      // static gateway
      uiconf.sections[1].content[3].value = config.get('ethgateway');

      // Wireless
      var wirelessenabled = self.getWirelessEnabled();
      uiconf.sections[2].content[0].value = wirelessenabled;

      // dhcp

      if (config.get('wirelessdhcp') == undefined) {
    	uiconf.sections[2].content[1].value = true;
      } else {
        uiconf.sections[2].content[1].value = config.get('wirelessdhcp');
      }

      // static ip
      uiconf.sections[2].content[2].value = config.get('wirelessip');

      // static netmask
      uiconf.sections[2].content[3].value = config.get('wirelessnetmask', '255.255.255.0');

      // static gateway
      uiconf.sections[2].content[4].value = config.get('wirelessgateway', '192.168.1.1');

      if (config.get('enable_hotspot') == undefined) {
        uiconf.sections[4].content[0].value = true;
      } else {
        uiconf.sections[4].content[0].value = config.get('enable_hotspot');
      }
      if (!wirelessenabled) {
        uiconf.sections[4].hidden = true;
        uiconf.sections[4].content[0].value = false;
      }

      uiconf.sections[4].content[1].value = config.get('hotspot_fallback', false);

      if (config.get('hotspot_name') == undefined) {
        uiconf.sections[4].content[2].value = 'Volumio';
      } else {
        uiconf.sections[4].content[2].value = config.get('hotspot_name');
      }

      if (config.get('hotspot_protection') == undefined) {
        uiconf.sections[4].content[3].value = true;
      } else {
        uiconf.sections[4].content[3].value = config.get('hotspot_protection');
      }

      if (config.get('hotspot_password') == undefined) {
        uiconf.sections[4].content[4].value = 'volumio2';
      } else {
        uiconf.sections[4].content[4].value = config.get('hotspot_password');
      }

      if (config.get('hotspot_channel') == undefined) {
        uiconf.sections[4].content[5].value.value = 4;
        uiconf.sections[4].content[5].value.label = '4';
      } else {
        uiconf.sections[4].content[5].value.value = Number(config.get('hotspot_channel'));
        uiconf.sections[4].content[5].value.label = config.get('hotspot_channel');
      }

      if (config.get('enable_custom_dns') == undefined) {
        uiconf.sections[5].content[0].value = false;
      } else {
        uiconf.sections[5].content[0].value = config.get('enable_custom_dns');
      }

      if (config.get('primary_dns') == undefined) {
        uiconf.sections[5].content[1].value = '208.67.222.222';
      } else {
        uiconf.sections[5].content[1].value = config.get('primary_dns');
      }

      if (config.get('secondary_dns') == undefined) {
        uiconf.sections[5].content[2].value = '208.67.220.220';
      } else {
        uiconf.sections[5].content[2].value = config.get('secondary_dns');
      }

      var advancedSettingsStatus = self.commandRouter.getAdvancedSettingsStatus();
      if (advancedSettingsStatus === false) {
        uiconf.sections[1].hidden = true;
        uiconf.sections[2].hidden = true;
        uiconf.sections[4].hidden = true;
        uiconf.sections[5].hidden = true;
      }
      // console.log(uiconf);
      defer.resolve(uiconf);
    })
    .fail(function () {
      defer.reject(new Error());
    });

  return defer.promise;
};

ControllerNetwork.prototype.setUIConfig = function (data) {
  var self = this;

  var uiconf = fs.readJsonSync(__dirname + '/UIConfig.json');
};

ControllerNetwork.prototype.getConf = function (varName) {
  var self = this;

  return config.get(varName);
};

ControllerNetwork.prototype.setConf = function (varName, varValue) {
  var self = this;

  config.set(varName, varValue);
};

// Optional functions exposed for making development easier and more clear
ControllerNetwork.prototype.getSystemConf = function (pluginName, varName) {
  var self = this;
  // Perform your installation tasks here
};

ControllerNetwork.prototype.setSystemConf = function (pluginName, varName) {
  var self = this;
  // Perform your installation tasks here
};

ControllerNetwork.prototype.getAdditionalConf = function () {
  var self = this;
  // Perform your installation tasks here
};

ControllerNetwork.prototype.setAdditionalConf = function () {
  var self = this;
  // Perform your installation tasks here
};

ControllerNetwork.prototype.getWirelessNetworks = function (defer) {
  var exself = this;
  var defer = libQ.defer();

  var wireless_enabled_setting = config.get('wireless_enabled', true);
  if (wireless_enabled_setting) {
    iwlist.scan('wlan0', function (err, networks) {
      var self = this;

      if (err) {
        exself.logger.error('An error occurred while scanning: ' + err);
        exself.logger.info('Cannot use regular scanning, forcing with ap-force');
        var networksarray = [];
        var arraynumber = 0;

        try {
          var wirelessnets = execSync('/usr/bin/sudo /sbin/iw dev wlan0 scan ap-force', {encoding: 'utf8'});

          var wirelessnets2 = wirelessnets.split('(on wlan0)');
          for (var i = 0; i < wirelessnets2.length; i++) {
            var network = {};
            var wirelessnets3 = wirelessnets2[i].split('\n');
            for (var e = 0; e < wirelessnets3.length; e++) {
              var scanResults = wirelessnets3[e].replace('\t', '').replace(' ', '').split(':');
              // console.log(scanResults);

              if (scanResults[1]) {
                if ((scanResults[1].indexOf('CCMP') || scanResults[1].indexOf('TKIP')) >= 0) {
                  network.security = 'wpa2';
                }
              }

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
                  if (rel >= 45) { signal = 5; } else if (rel >= 40) { signal = 4; } else if (rel >= 30) { signal = 3; } else if (rel >= 20) { signal = 2; } else if (rel >= 1) { signal = 1; }

                  network.signal = signal;

                  break;
                default:
                  break;
              }
            }

            if (network.ssid) {
              // console.log(network)
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

          var networkresults = {'available': networksarray};

          // exself.enrichNetworks(networksarray);
          wirelessNetworksScanCache = networkresults;
          defer.resolve(networkresults);
        } catch (e) {
          exself.logger.error('Cannot use fallback scanning method: ' + e);
        }
      } else {
        var networksarray = networks;
        var networkresults = {'available': networksarray};

        // exself.enrichNetworks(networksarray);
        wirelessNetworksScanCache = networkresults;
        defer.resolve(networkresults);
      }
    });
  } 

  return defer.promise;
};

ControllerNetwork.prototype.enrichNetworks = function (networks) {
  if (networks != undefined) {
    for (var i in networks) {
      var ssid = networks[i].ssid;

      var index = this.searchNetworkInConfig(ssid);
      if (index > -1) {
        networks[i].password = config.get('wirelessNetworksPASSWD[' + index + ']');
      }
    }
  }
};

ControllerNetwork.prototype.searchNetworkInConfig = function (ssid) {
  var j = 0;

  while (config.has('wirelessNetworksSSID[' + j + ']')) {
    var configuredSSID = config.get('wirelessNetworksSSID[' + j + ']');

    if (configuredSSID == ssid) {
      return j;
    } else j++;
  }

  return -1;
};

ControllerNetwork.prototype.saveWiredNet = function (data) {
  var self = this;

  var defer = libQ.defer();
  if ((data.confirm) || (data.dhcp != false)) {
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
  } else {
    var responseData = {
      title: self.commandRouter.getI18nString('NETWORK.STATIC_IP'),
      message: self.commandRouter.getI18nString('NETWORK.STATIC_IP_WARNING'),
      size: 'lg',
      buttons: [
        {
          name: self.commandRouter.getI18nString('COMMON.CANCEL'),
          class: 'btn btn-cancel',
          emit: '',
          payload: ''
        },
        {
          name: self.commandRouter.getI18nString('COMMON.CONTINUE'),
          class: 'btn btn-info',
          emit: 'callMethod',
          payload: {'endpoint': 'system_controller/network', 'method': 'saveWiredNet', 'data': {'confirm': true, 'dhcp': data.dhcp, 'static_ip': data.static_ip, 'static_netmask': data.static_netmask, 'static_gateway': data.static_gateway}}
        }
      ]
    };

    self.commandRouter.broadcastMessage('openModal', responseData);
  }
};

ControllerNetwork.prototype.saveWirelessNet = function (data) {
  var self = this;

  var defer = libQ.defer();
  var wireless_enabled = data['wireless_enabled'];

  var wireless_enabled_setting = config.get('wireless_enabled');
  if (wireless_enabled_setting == undefined) {
    config.addConfigValue('wireless_enabled', 'boolean', wireless_enabled);
  } else {
    config.set('wireless_enabled', wireless_enabled);
  }

  var dhcp = data['wireless_dhcp'];
  var static_ip = data['wireless_static_ip'];
  var static_netmask = data['wireless_static_netmask'];
  var static_gateway = data['wireless_static_gateway'];

  if ((data.confirm) || (dhcp != false)) {
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
  } else {
    var responseData = {
      title: self.commandRouter.getI18nString('NETWORK.STATIC_IP'),
      message: self.commandRouter.getI18nString('NETWORK.STATIC_IP_WARNING'),
      size: 'lg',
      buttons: [
        {
          name: self.commandRouter.getI18nString('COMMON.CANCEL'),
          class: 'btn btn-cancel',
          emit: '',
          payload: ''
        },
        {
          name: self.commandRouter.getI18nString('COMMON.CONTINUE'),
          class: 'btn btn-info',
          emit: 'callMethod',
          payload: {'endpoint': 'system_controller/network', 'method': 'saveWirelessNet', 'data': {'confirm': true, 'wireless_dhcp': dhcp, 'wireless_static_ip': static_ip, 'wireless_static_netmask': static_netmask, 'wireless_static_gateway': static_gateway, 'wireless_enabled': wireless_enabled}}
        }
      ]
    };

    self.commandRouter.broadcastMessage('openModal', responseData);
  }
};

ControllerNetwork.prototype.getData = function (data, key) {
  var self = this;

  for (var i in data) {
    var ithdata = data[i];

    if (ithdata[key] != undefined) { return ithdata[key]; }
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

  if (!data['ssid']) {
    self.logger.error('Could not save Wifi Network, no SSID specified');
    return;
  }
  self.logger.info('Saving new wireless network');

  var network_ssid = data['ssid'];
  var network_pass = data['password'];

  if (data && data.security && data.security.includes('wpa') && network_pass) {
    network_pass = self.getHashedWPAPassphrase(network_ssid, network_pass);
  }
  var index = this.searchNetworkInConfig(network_ssid);

  if (index > -1) {
    config.set('wirelessNetworksPASSWD[' + index + ']', network_pass);
  } else {
    config.addConfigValue('wirelessNetworksSSID', 'array', network_ssid);
    config.addConfigValue('wirelessNetworksPASSWD', 'array', network_pass);
  }

  self.wirelessConnect({ssid: network_ssid, pass: network_pass});

  self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('NETWORK.WIRELESS_RESTART_TITLE'), self.commandRouter.getI18nString('NETWORK.WIRELESS_RESTART_SUCCESS'));
  fs.writeFile('/data/configuration/netconfigured', ' ', function (err) {
    if (err) {
      self.logger.error('Cannot write netconfigured ' + error);
    }
  });
};

ControllerNetwork.prototype.saveHotspotSettings = function (data) {
  var self = this;

  if (data.hotspot_protection && data.hotspot_password.length < 8) {
    self.commandRouter.pushToastMessage('error', self.commandRouter.getI18nString('NETWORK.HOTSPOT_CONF_ERROR'), self.commandRouter.getI18nString('NETWORK.HOTSPOT_PW_LENGTH'));
  } else {
    var hotspot = config.get('enable_hotspot');
    if (hotspot == undefined) {
      config.addConfigValue('enable_hotspot', 'boolean', data.enable_hotspot);
      config.addConfigValue('hotspot_fallback', 'boolean', data.hotspot_fallback);
      config.addConfigValue('hotspot_name', 'string', data.hotspot_name);
      config.addConfigValue('hotspot_protection', 'boolean', data.hotspot_protection);
      config.addConfigValue('hotspot_password', 'string', data.hotspot_password);
      config.addConfigValue('hotspot_channel', 'string', data.hotspot_channel.label);
    } else {
      config.set('enable_hotspot', data.enable_hotspot);
      config.set('hotspot_fallback', data.hotspot_fallback);
      config.set('hotspot_name', data.hotspot_name);
      config.set('hotspot_protection', data.hotspot_protection);
      config.set('hotspot_password', data.hotspot_password);
      config.set('hotspot_channel', data.hotspot_channel.label);
    }
    setTimeout(function () {
      self.rebuildHotspotConfig();
    }, 1000);

    self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('NETWORK.NETWORK_RESTART_TITLE'), self.commandRouter.getI18nString('NETWORK.NETWORK_RESTART_SUCCESS'));
  }
};

ControllerNetwork.prototype.rebuildHotspotConfig = function (forceHotspotConfiguration) {
  var self = this;
  var hostapdedimax = '/etc/hostapd/hostapd-edimax.conf';
  var hostapd = '/etc/hostapd/hostapd.conf';
  var hotspotname = config.get('hotspot_name', 'Volumio');
  var hotspotchannel = config.get('hotspot_channel', '4');
  var hotspotpassword = config.get('hotspot_password', 'volumio2');

  try {
    fs.accessSync(hostapdedimax, fs.F_OK);
    exec('/usr/bin/sudo /bin/chmod 777 ' + hostapdedimax, {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
      if (error !== null) {
        self.logger.error('Cannot set permissions for /etc/hostapd/hostapd-edimax.conf: ' + error);
      } else {
        self.logger.info('Permissions for /etc/hostapd/hostapd-edimax.conf');

        try {
          var ws = fs.createWriteStream(hostapdedimax);
          ws.cork();

          if (config.get('enable_hotspot') == true || config.get('enable_hotspot') == 'true' || forceHotspotConfiguration === true) {
            ws.write('interface=wlan0\n');
            ws.write('ssid=' + hotspotname + '\n');
            ws.write('channel=' + hotspotchannel + '\n');
            ws.write('driver=rtl871xdrv\n');
            ws.write('hw_mode=g\n');
            if (config.get('hotspot_protection') == true || config.get('hotspot_protection') == 'true') {
              ws.write('auth_algs=1\n');
              ws.write('wpa=2\n');
              ws.write('wpa_key_mgmt=WPA-PSK\n');
              ws.write('rsn_pairwise=CCMP\n');
              ws.write('wpa_passphrase=' + hotspotpassword + '\n');
            }
          } else {
            ws.write('# hotspot disabled\n');
          }

          ws.end();
        } catch (err) {

        }
      }
    });
  } catch (e) {
    // No /etd/hostapd/hostapd-edimax.conf
  }

  exec('/usr/bin/sudo /bin/chmod 777 ' + hostapd, {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
    if (error !== null) {
      self.logger.error('Cannot set permissions for /etc/hostapd/hostapd.conf: ' + error);
    } else {
      self.logger.info('Permissions for /etc/hostapd/hostapd.conf');

      try {
        var hs = fs.createWriteStream(hostapd);
        hs.cork();

        if (config.get('enable_hotspot') == true || config.get('enable_hotspot') == 'true' || forceHotspotConfiguration === true) {
          hs.write('interface=wlan0\n');
          hs.write('ssid=' + hotspotname + '\n');
          hs.write('channel=' + hotspotchannel + '\n');
          hs.write('driver=nl80211\n');
          hs.write('hw_mode=g\n');
          if (config.get('hotspot_protection') == true || config.get('hotspot_protection') == 'true') {
            hs.write('auth_algs=1\n');
            hs.write('wpa=2\n');
            hs.write('wpa_key_mgmt=WPA-PSK\n');
            hs.write('rsn_pairwise=CCMP\n');
            hs.write('wpa_passphrase=' + hotspotpassword + '\n');
          }
        } else {
          hs.write('# hotspot disabled\n');
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

  // cycling through configured network in config file
  var index = 0;

  var netstring = 'ctrl_interface=/var/run/wpa_supplicant' + os.EOL;

  // searching network
  if (data.pass === undefined) {
    netstring += 'network={' + os.EOL + 'scan_ssid=1' + os.EOL + 'ssid="' + data.ssid + '"' + os.EOL + 'key_mgmt=NONE' + os.EOL + 'priority=1' + os.EOL + '}' + os.EOL;
  } else {
    if (self.isWEPHEX(data.pass)) {
      netstring += 'network={' + os.EOL + 'ssid="' + data.ssid + '"' + os.EOL + 'key_mgmt=NONE' + os.EOL + 'wep_key0=' + data.pass + os.EOL + 'wep_tx_keyidx=0' + os.EOL + 'priority=1' + os.EOL + '}' + os.EOL;
    }
    if (self.isWEPASCII(data.pass)) {
      netstring += 'network={' + os.EOL + 'ssid="' + data.ssid + '"' + os.EOL + 'key_mgmt=NONE' + os.EOL + 'wep_key0="' + data.pass + '"' + os.EOL + 'wep_tx_keyidx=0' + os.EOL + 'priority=1' + os.EOL + '}' + os.EOL;
    }
    if (self.isWPA(data.pass)) {
      netstring += 'network={' + os.EOL + 'scan_ssid=1' + os.EOL + 'ssid="' + data.ssid + '"' + os.EOL + 'psk="' + data.pass + '"' + os.EOL + 'priority=1' + os.EOL + '}' + os.EOL;
    }
    if (self.isWPAHashed(data.pass)) {
      netstring += 'network={' + os.EOL + 'scan_ssid=1' + os.EOL + 'ssid="' + data.ssid + '"' + os.EOL + 'psk=' + data.pass.replace('hash::', '') + os.EOL + 'priority=1' + os.EOL + '}' + os.EOL;
    } else {
      self.logger.error('Not saving Password for network ' + data.ssid + ': shorter than 8 chars');
    }
  }

  while (config.has('wirelessNetworksSSID[' + index + ']')) {
    var configuredSSID = config.get('wirelessNetworksSSID[' + index + ']');

    if (data.ssid != configuredSSID && configuredSSID !== undefined && configuredSSID.length > 0) {
      var configuredPASS = config.get('wirelessNetworksPASSWD[' + index + ']');

      if (configuredPASS === undefined) {
        netstring += 'network={' + os.EOL + 'scan_ssid=1' + os.EOL + 'ssid="' + configuredSSID + '"' + os.EOL + 'key_mgmt=NONE' + os.EOL + 'priority=0' + os.EOL + '}' + os.EOL;
      } else {
        if (self.isWEPHEX(configuredPASS)) {
          netstring += 'network={' + os.EOL + 'ssid="' + configuredSSID + '"' + os.EOL + 'key_mgmt=NONE' + os.EOL + 'wep_key0=' + configuredPASS + os.EOL + 'wep_tx_keyidx=0' + os.EOL + 'priority=0' + os.EOL + '}' + os.EOL;
        }
        if (self.isWEPASCII(configuredPASS)) {
          netstring += 'network={' + os.EOL + 'ssid="' + configuredSSID + '"' + os.EOL + 'key_mgmt=NONE' + os.EOL + 'wep_key0="' + configuredPASS + '"' + os.EOL + 'wep_tx_keyidx=0' + os.EOL + 'priority=0' + os.EOL + '}' + os.EOL;
        }
        if (self.isWPA(configuredPASS)) {
          netstring += 'network={' + os.EOL + 'scan_ssid=1' + os.EOL + 'ssid="' + configuredSSID + '"' + os.EOL + 'psk="' + configuredPASS + '"' + os.EOL + 'priority=0' + os.EOL + '}' + os.EOL;
        }
        if (self.isWPAHashed(data.pass)) {
          netstring += 'network={' + os.EOL + 'scan_ssid=1' + os.EOL + 'ssid="' + data.ssid + '"' + os.EOL + 'psk=' + data.pass.replace('hash::', '') + os.EOL + 'priority=1' + os.EOL + '}' + os.EOL;
        } else {
          self.logger.error('Not saving Password for network ' + configuredSSID + ': shorter than 8 chars');
        }
      }
    }

    index++;
  }

  fs.writeFile('/etc/wpa_supplicant/wpa_supplicant.conf', netstring, function (err) {
    if (err) {
      self.logger.error('Cannot write wpasupplicant.conf ' + error);
    }

    self.commandRouter.wirelessRestart();
  });
};

ControllerNetwork.prototype.rebuildNetworkConfig = function () {
  var self = this;
  var staticfile = '/etc/dhcpcd.conf';

  exec('/usr/bin/sudo /bin/chmod 777 /etc/network/interfaces && /usr/bin/sudo /bin/chmod 777 /etc/dhcpcd.conf', {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
    if (error !== null) {
      self.logger.error('Cannot set permissions for /etc/network/interfaces: ' + error);
    } else {
      self.logger.info('Permissions for /etc/network/interfaces set');

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
        } else {
          ws.write('iface eth0 inet manual\n');
          staticconf.write('interface eth0\n');
          staticconf.write('static ip_address=' + config.get('ethip') + '/24\n');
          staticconf.write('static routers=' + config.get('ethgateway') + '\n');
          staticconf.write('static domain_name_servers=' + config.get('ethgateway') + ' 208.67.222.222\n');
          staticconf.write('\n');
        }

        ws.write('\n');

        ws.write('allow-hotplug wlan0\n');
        ws.write('iface wlan0 inet manual\n');

        if (config.get('wirelessdhcp') == true || config.get('wirelessdhcp') == 'true') {
        } else if (config.get('wirelessdhcp') == false || config.get('wirelessdhcp') == 'false') {
          staticconf.write('interface wlan0\n');
          staticconf.write('static ip_address=' + config.get('wirelessip') + '/24\n');
          staticconf.write('static routers=' + config.get('wirelessgateway') + '\n');
          staticconf.write('static domain_name_servers=' + config.get('wirelessgateway') + ' 208.67.222.222\n');
          staticconf.write('\n');
        }

        ws.end();
        staticconf.end();
        // console.log("Restarting networking layer");
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
  var responseObject = [];
  var defers = [
    self.getEthernetSpeed(),
    self.getWirelessSpeed(),
    self.getWirelessSSID(),
    self.getWirelessQuality(),
    self.getEthernetIPAddress(),
    self.getWirelessIPAddress()
  ];

  libQ.all(defers)
    .then(function (result) {
      defer.resolve(self.parseInfoNetworkResults(result));
    })
    .fail(function (err) {
      self.logger.error('Cannot get all networks infos: ' + err);
      defer.resolve('');
    });

  return defer.promise;
};

ControllerNetwork.prototype.saveDnsSettings = function (data) {
  var self = this;
  var customdnsfile = '';

  if ((data.enable_custom_dns) && ((data.primary_dns.length < 7 || data.secondary_dns.length < 7))) {
    self.commandRouter.pushToastMessage('error', self.commandRouter.getI18nString('NETWORK.DNS_SETTINGS'), self.commandRouter.getI18nString('NETWORK.DNS_ERROR_INFO'));
    return;
  }

  if (data.enable_custom_dns) { customdnsfile = 'nameserver ' + data.primary_dns + os.EOL + 'nameserver ' + data.secondary_dns + os.EOL; }

  fs.writeFile('/etc/resolv.conf.head', customdnsfile, function (err) {
    if (err) {
      self.logger.error('Cannot write custom DNS File' + error);
    } else {
      if (data.enable_custom_dns) { exec('/usr/bin/sudo /usr/bin/unlink /etc/resolv.conf.tail', {uid: 1000, gid: 1000}, function (error, stdout, stderr) {}); } else { exec('/usr/bin/sudo /bin/ln -s /etc/resolv.conf.tail.tmpl /etc/resolv.conf.tail', {uid: 1000, gid: 1000}, function (error, stdout, stderr) {}); }

      config.set('enable_custom_dns', data.enable_custom_dns);
      config.set('primary_dns', data.primary_dns);
      config.set('secondary_dns', data.secondary_dns);
      self.commandRouter.wirelessRestart();
      self.commandRouter.networkRestart();
      self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('NETWORK.DNS_SETTINGS'), self.commandRouter.getI18nString('COMMON.SETTINGS_SAVED_SUCCESSFULLY'));
    }
  });
};

ControllerNetwork.prototype.isHex = function (data) {
  var self = this;

  return /^[0-9A-Fa-f]+$/i.test(data);
};

ControllerNetwork.prototype.isWEPHEX = function (data) {
  var self = this;

  if (self.isHex(data)) {
    	if ((data.length === 10) || (data.length === 26) || (data.length === 32)) {
    		return true;
    } else {
    		return false;
    }
  } else {
    	return false;
  }
};

ControllerNetwork.prototype.isWEPASCII = function (data) {
  var self = this;

  if (!self.isHex(data)) {
    if ((data.length === 5) || (data.length === 13) || (data.length === 16)) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
};

ControllerNetwork.prototype.isWPA = function (data) {
  var self = this;

  if ((data.length >= 8) && (data.length <= 63)) {
     	return true;
	 } else {
     	return false;
	 }
};

ControllerNetwork.prototype.isWPAHashed = function (data) {
  var self = this;

  if (data && data.length === 70 && data.includes('hash::')) {
    return true;
  } else {
    return false;
  }
};

ControllerNetwork.prototype.getWirelessInfo = function () {
  var self = this;
  var defer = libQ.defer();
  var response = {'connected': false, 'ssid': ''};

  ifconfig.status('wlan0', function (err, status) {
    if (status != undefined) {
      if (status.ipv4_address != undefined) {
        cachedWlan0IPAddress = status.ipv4_address;
        if (status.ipv4_address != '192.168.211.1') {
          response.connected = true;
          response.ssid = execSync('/usr/bin/sudo /sbin/iwconfig wlan0 | grep ESSID | cut -d\\" -f2', { encoding: 'utf8' });
        } else {

        }
        defer.resolve(response);
      } else {
        defer.resolve(response);
      }
    } else {
      defer.resolve(response);
    }
  });

  return defer.promise;
};

ControllerNetwork.prototype.getWiredInfo = function () {
  var self = this;
  var defer = libQ.defer();
  var response = {'connected': false, 'ip': ''};

  ifconfig.status('eth0', function (err, status) {
    if (status != undefined) {
      if (status.ipv4_address != undefined) {
        cachedEth0IPAddress = status.ipv4_address;
        response.connected = true;
        response.ip = status.ipv4_address;
        defer.resolve(response);
      } else {
        defer.resolve(response);
      }
    } else {
      defer.resolve(response);
    }
  });

  return defer.promise;
};

ControllerNetwork.prototype.wirelessEnable = function () {
  var self = this;

  config.set('wireless_enabled', true);

  setTimeout(() => {
    self.commandRouter.wirelessRestart();
  }, 500);
};

ControllerNetwork.prototype.wirelessDisable = function () {
  var self = this;

  config.set('wireless_enabled', false);

  setTimeout(() => {
    self.commandRouter.wirelessRestart();
  }, 500);
};

ControllerNetwork.prototype.getHashedWPAPassphrase = function (ssid, passphrase) {
  var self = this;

  try {
    var hashedWPAPassphrase = 'hash::' + crypto.pbkdf2Sync(passphrase, ssid, 4096, 32, 'sha1').toString('hex');
  } catch (e) {
    	self.logger.error('Could not hash passphrase: ' + e);
    	self.logger.info('Using clear passphrase');
    var hashedWPAPassphrase = passphrase;
  }

  return hashedWPAPassphrase;
};

ControllerNetwork.prototype.getWirelessEnabled = function () {
  var self = this;

  var wirelessenabled = false;
  try {
    var wirelessstatusraw = execSync('/bin/cat /sys/class/net/wlan0/flags', { uid: 1000, gid: 1000, encoding: 'utf8'});
    var wirelessstatus = wirelessstatusraw.replace(/\r?\n/g, '');
    if (wirelessstatus == '0x1003') {
      wirelessenabled = true;
    }
  } catch (e) {}

  return wirelessenabled;
};

ControllerNetwork.prototype.getEthernetSpeed = function () {
  var self = this;
  var defer = libQ.defer();

  exec("/usr/bin/sudo /sbin/ethtool eth0 | grep -i speed | tr -d 'Speed:' | xargs", { encoding: 'utf8' }, function (error, data) {
    	if (error) {
    		self.logger.error('Could not parse Etherned Speed: ' + error);
    		defer.resolve('');
    } else {
      if (data.replace('\n', '') == '1000Mb/s') {
        data = '1Gb/s';
      }
      defer.resolve(data);
    }
  });
  return defer.promise;
};

ControllerNetwork.prototype.getWirelessSpeed = function () {
  var self = this;
  var defer = libQ.defer();

  exec("/usr/bin/sudo /sbin/iwconfig wlan0 | grep 'Bit Rate' | awk '{print $2,$3}' | tr -d 'Rate:' | xargs", { encoding: 'utf8' }, function (error, data) {
    if (error) {
      self.logger.error('Could not parse Wireless Speed: ' + error);
      defer.resolve('');
    } else {
      defer.resolve(data.replace('=', ''));
    }
  });
  return defer.promise;
};

ControllerNetwork.prototype.getWirelessSSID = function () {
  var self = this;
  var defer = libQ.defer();

  exec('/usr/bin/sudo /sbin/iwconfig wlan0 | grep ESSID | cut -d\\" -f2', { encoding: 'utf8' }, function (error, data) {
    if (error) {
      self.logger.error('Could not parse Wireless SSID: ' + error);
      defer.resolve('');
    } else {
      defer.resolve(data);
    }
  });
  return defer.promise;
};

ControllerNetwork.prototype.getWirelessQuality = function () {
  var self = this;
  var defer = libQ.defer();

  exec("/usr/bin/sudo /sbin/iwconfig wlan0 | awk '{if ($1==\"Link\"){split($2,A,\"Signal\");print A[1]}}' | sed 's/Quality=//g' | tr -d '\n'", { encoding: 'utf8' }, function (error, data) {
    if (error) {
      self.logger.error('Could not parse Wireless Quality: ' + error);
      defer.resolve('');
    } else {
      var wirelessquality = 0;
      try {
        var wirelessQualityPercentage = (parseInt(data.split('/')[0]) / parseInt(data.split('/')[1])) * 100;
      } catch (e) {
        var wirelessQualityPercentage = 0;
      }

      if (wirelessQualityPercentage >= 65) { wirelessquality = 5; } else if (wirelessQualityPercentage >= 50) { wirelessquality = 4; } else if (wirelessQualityPercentage >= 40) { wirelessquality = 3; } else if (wirelessQualityPercentage >= 30) { wirelessquality = 2; } else if (wirelessQualityPercentage >= 1) { wirelessquality = 1; }

      defer.resolve(wirelessquality);
    }
  });

  return defer.promise;
};

ControllerNetwork.prototype.getEthernetIPAddress = function () {
  var self = this;
  var defer = libQ.defer();

  ifconfig.status('eth0', function (err, status) {
    if (!err && status != undefined && status.ipv4_address != undefined) {
      cachedEth0IPAddress = status.ipv4_address;
        	defer.resolve(status.ipv4_address);
    } else {
      defer.resolve('');
    }
  });
  return defer.promise;
};

ControllerNetwork.prototype.getWirelessIPAddress = function () {
  var self = this;
  var defer = libQ.defer();

  ifconfig.status('wlan0', function (err, status) {
    if (!err && status != undefined && status.ipv4_address != undefined) {
      cachedWlan0IPAddress = status.ipv4_address;
      defer.resolve(status.ipv4_address);
    } else {
      defer.resolve('');
    }
  });
  return defer.promise;
};

ControllerNetwork.prototype.parseInfoNetworkResults = function (data) {
  var self = this;

  var response = [];
  var hotspotIP = '192.168.211.1';
  var ethSpeed = data[0];
  var wirelessSpeed = data[1];
  var wirelessSSID = data[2];
  var wirelessQuality = data[3];
  var ethIP = data[4];
  var wirelessIP = data[5];

  if (ethIP) {
    response.push({type: 'Wired', ip: ethIP, status: 'connected', speed: ethSpeed});
  }

  if (wirelessIP && wirelessIP === hotspotIP) {
    response.push({type: 'Wireless', ip: wirelessIP, ssid: 'Hotspot', signal: 5});
  } else if (wirelessIP) {
    response.push({type: 'Wireless', ip: wirelessIP, ssid: wirelessSSID, signal: wirelessQuality, status: 'connected', speed: wirelessSpeed});
  }

  return response;
};

ControllerNetwork.prototype.onNetworkingRestart = function () {
  var self = this;

  self.refreshCachedPAddresses();
  return self.commandRouter.broadcastMessage('pushInfoNetworkReload', '');
};

ControllerNetwork.prototype.getWirelessNetworksScanCache = function () {
  var self = this;

  var wireless_enabled_setting = config.get('wireless_enabled', true);
  if (wireless_enabled_setting) {
    return wirelessNetworksScanCache;
  }
};

ControllerNetwork.prototype.forceHotspot = function () {
  var self = this;

  fs.writeFile('/tmp/forcehotspot', '', function (err) {
    if (err) {
      self.logger.error('Cannot write /tmp/forcehotspot ' + error);
    } else {
      self.logger.error('Forcing Hotspot mode');
      self.rebuildHotspotConfig(true);
    }
  });
};

ControllerNetwork.prototype.getCurrentIPAddresses = function () {
  var self = this;
  var defer = libQ.defer();
  var defers = [
    	self.getEthernetIPAddress(),
    self.getWirelessIPAddress()
  ];

  libQ.all(defers)
    .then(function (result) {
        	defer.resolve({'eth0': result[0], 'wlan0': result[1]});
    })
    .fail(function (err) {
      defer.resolve({'eth0': '', 'wlan0': ''});
    });

  return defer.promise;
};

ControllerNetwork.prototype.getCachedPAddresses = function () {
  var self = this;
  var defer = libQ.defer();

  // The purpose of this function is to quickly return the last known IP Addresses
  // Useful for plugins which require this information very often
  var response = {
    	'eth0': cachedEth0IPAddress,
    'wlan0': cachedWlan0IPAddress
  };
  return response;
};

ControllerNetwork.prototype.refreshCachedPAddresses = function () {
  var self = this;

  self.logger.info('Refreshing Cached IP Addresses');

  self.getEthernetIPAddress();
  self.getWirelessIPAddress();
};
