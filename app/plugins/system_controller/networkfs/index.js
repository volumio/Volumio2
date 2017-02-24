'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var config = new (require('v-conf'))();
var mountutil = require('linux-mountutils');
var libUUID = require('node-uuid');
var S = require('string');

// Define the ControllerNetworkfs class
module.exports = ControllerNetworkfs;

function ControllerNetworkfs(context) {
	var self = this;

	// Save a reference to the parent commandRouter
	self.context = context;
	self.commandRouter = self.context.coreCommand;
	self.logger = self.commandRouter.logger;
	self.configManager = self.context.configManager;


}

ControllerNetworkfs.prototype.getConfigurationFiles = function () {
	var self = this;

	return ['config.json'];
};

ControllerNetworkfs.prototype.onVolumioStart = function () {
	var self = this;

	var configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');
	config.loadFile(configFile);

	self.initShares();

    return libQ.resolve();
};

ControllerNetworkfs.prototype.languageCallback = function (data) {
	var self = this;
	console.log(data);
};


ControllerNetworkfs.prototype.onStop = function () {
	var self = this;
	//Perform startup tasks here
};

ControllerNetworkfs.prototype.onRestart = function () {
	var self = this;
	//Perform startup tasks here
};

ControllerNetworkfs.prototype.onInstall = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetworkfs.prototype.onUninstall = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetworkfs.prototype.getUIConfig = function () {
	var self = this;

	var self = this;
	var lang_code = self.commandRouter.sharedVars.get('language_code');

	var defer=libQ.defer();
	self.commandRouter.i18nJson(__dirname+'/../../../i18n/strings_'+lang_code+'.json',
		__dirname+'/../../../i18n/strings_en.json',
		__dirname + '/UIConfig.json')
		.then(function(uiconf)
		{
			var enableweb = self.getAdditionalConf('miscellanea', 'albumart', 'enableweb', true);
			self.configManager.setUIConfigParam(uiconf, 'sections[2].content[0].value', enableweb);
			self.configManager.setUIConfigParam(uiconf, 'sections[2].content[0].value.label', self.getLabelForSelect(self.configManager.getValue(uiconf, 'sections[2].content[0].options'), enableweb));

			var websize = self.getAdditionalConf('miscellanea', 'albumart', 'defaultwebsize', 'large');
			self.configManager.setUIConfigParam(uiconf, 'sections[2].content[1].value.value', websize);
			self.configManager.setUIConfigParam(uiconf, 'sections[2].content[1].value.label', self.getLabelForSelect(self.configManager.getValue(uiconf, 'sections[2].content[1].options'), websize));

			defer.resolve(uiconf);
		})
		.fail(function()
		{
			defer.reject(new Error());
		})

	return defer.promise;
};

ControllerNetworkfs.prototype.setUIConfig = function (data) {
	var self = this;

	var uiconf = fs.readJsonSync(__dirname + '/UIConfig.json');

};

ControllerNetworkfs.prototype.getConf = function (varName) {
	var self = this;

	return self.config.get(varName);
};

ControllerNetworkfs.prototype.setConf = function (varName, varValue) {
	var self = this;

	self.config.set(varName, varValue);
};

//Optional functions exposed for making development easier and more clear
ControllerNetworkfs.prototype.getSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetworkfs.prototype.setSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetworkfs.prototype.getAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetworkfs.prototype.setAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetworkfs.prototype.initShares = function () {
	var self = this;

	var keys = config.getKeys('NasMounts');
	for (var i in keys) {
		var key = keys[i];
		self.mountShare({init:true, key:key});
	}
};

ControllerNetworkfs.prototype.mountShare = function (data) {
	var self = this;

	var defer = libQ.defer();
	var shareid = data.key;
	if (data.trial) {
		trial = data.trial;
	} else {
		var trial = 0;
	}

	var fstype = config.get('NasMounts.' + shareid + '.fstype');
	var options = config.get('NasMounts.' + shareid + '.options');
	var pathraw = config.get('NasMounts.' + shareid + '.path');
	var mountidraw = config.get('NasMounts.' + shareid + '.name');
	// Check we have sane data - operating on undefined values will crash us
	if (fstype === 'undefined' || pathraw === 'undefined') {
		console.log('Unable to retrieve config for share '  + shareid + ', returning early');
		return defer.promise;
	}
	var pointer;
	var fsopts;
	var credentials;
	var responsemessage = {status:""};
	var path = pathraw.replace(/ /g,"\\ ");
	// The local mountpoint path must not contain these characters, because
	// they get specially encoded in /etc/mtab and cause mount/umount failures.
	// See getmntent(7).
	var mountid = mountidraw.replace(/[\s\n\\]/g,"_");

	if (fstype == "cifs") {
		pointer = '//' + config.get('NasMounts.' + shareid + '.ip') + '/' + path.replace(' ', '\ ');;
		//Password-protected mount
		if (config.get('NasMounts.' + shareid + '.user') !== 'undefined' && config.get('NasMounts.' + shareid + '.user') !== '') {
			credentials = 'username=' + config.get('NasMounts.' + shareid + '.user') + ',' + 'password=' + config.get('NasMounts.' + shareid + '.password') + ",";
		} else {
			credentials = 'guest,';
		}
		if (options) {
			fsopts = credentials + "ro,dir_mode=0777,file_mode=0666,iocharset=utf8,noauto,"+options;
		} else {
			fsopts = credentials + "ro,dir_mode=0777,file_mode=0666,iocharset=utf8,noauto";
		}

	} else { // nfs
		pointer = config.get('NasMounts.' + shareid + '.ip') + ':' + path.replace(' ', '\ ');;
		if (options) {
			fsopts ="ro,soft,noauto,"+options;
		} else {
			fsopts ="ro,soft,noauto";
		}
	}

	var mountpoint = '/mnt/NAS/' +  mountid;

	mountutil.mount(pointer, mountpoint, {"createDir": true, "fstype": fstype, "fsopts": fsopts}, function (result) {
		if (result.error) {
			console.log(result.error)
			if (result.error.indexOf('Permission denied') >= 0) {
				result.error = 'Permission denied';
			} else {
				var splitreason = result.error.split('mount error');
				result.error = splitreason[1]
			}
			responsemessage = {status:"fail", reason:result.error}
			defer.resolve(responsemessage);
			if (data.init) {
			if (trial < 4) {
				trial++
				self.logger.info("Cannot mount NAS "+mountid+" at system boot, trial number "+trial+" ,retrying in 5 seconds");
				setTimeout(function () {
				self.mountShare({init:true, key:data.key, trial:trial});
				}, 5000);
			} else {
				self.logger.info("Cannot mount NAS at system boot, trial number "+trial+" ,stopping");
			}
			}
		} else {
			responsemessage = {status:"success"}
			defer.resolve(responsemessage);

		}
	});

	return defer.promise;
};

ControllerNetworkfs.prototype.getConfigurationFiles = function () {
	var self = this;

	return ['config.json'];
};

ControllerNetworkfs.prototype.getShare = function (name, ip, path) {
	var self = this;

	var keys = config.getKeys('NasMounts');
	for (var i in keys) {
		var subKey = 'NasMounts.' + keys[i];
		self.logger.info("Checking key " + subKey);

		if (config.get(subKey + '.name') == name &&
			config.get(subKey + '.ip') == ip && config.get(subKey + '.path') == path) {
			self.logger.info("Found correspondence in configuration");
			return keys[i];
		}

	}
};


ControllerNetworkfs.prototype.scanDatabase = function () {
	var self = this;

	exec("/usr/bin/mpc update", function (error, stdout, stderr) {
		if (error !== null) {
			self.commandRouter.pushToastMessage('error', self.commandRouter.getI18nString('COMMON.MY_MUSIC'), self.commandRouter.getI18nString('COMMON.SCAN_DB_ERROR') + error);
			self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Database scan error: ' + error);
		}
		else {
			self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Database update started');
			self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('COMMON.MY_MUSIC'), self.commandRouter.getI18nString('COMMON.SCAN_DB'));
		}
	});
};

ControllerNetworkfs.prototype.listShares = function () {
	var mounts = config.getKeys();


};


/*
 New APIs
 ###############################
 */

/**
 * This method adds a new share into the configuration
 * @param data {
  name:’SHARE’,
  ip:’192.168.10.1’,
  fstype:’’,
  username:’’,
  password:’’,
  options:’’
}

 */
ControllerNetworkfs.prototype.addShare = function (data) {
	var self = this;


	self.logger.info("Adding a new share");

	var defer = libQ.defer();

	var name = data['name'];
	/*
	 * A name is required. In the ui this field is called 'alias'.
	 */
	if (name == undefined) name = '';
	var blankname_regex = /^\s*$/;
	var matches = blankname_regex.exec(name);
	if (matches) {
		self.logger.info("Share alias is blank");
		self.commandRouter.pushToastMessage('warning', self.commandRouter.getI18nString('COMMON.MY_MUSIC'), self.commandRouter.getI18nString('NETWORKFS.ALIAS_DOC'));
		defer.reject(new Error('Shares must have an alias'));
		return defer.promise;
	}

	var nameStr = S(name);

	/**
	 * Check special characters
	 */
	if (nameStr.contains('/')) {
		self.commandRouter.pushToastMessage('warning', self.commandRouter.getI18nString('COMMON.MY_MUSIC'), self.commandRouter.getI18nString('COMMON.ILLEGAL_CHARACTER_/'));
		defer.reject(new Error('Share names cannot contain /'));
		return defer.promise;
	}

	var ip = data['ip'];
	var path = data['path'];
	var fstype = data['fstype'];
	var username = data['username'];
	var password = data['password'];
	var options = data['options'];

	if (username == undefined) username = '';
	if (password == undefined) password = '';
	if (options == undefined) options = '';

	if (fstype == 'cifs') {
		/* when the share is mounted the ip and path are joined with '/'.
		 * mount.cifs can fail if given '//server//path', so let's avoid that.
		 */
		path = path.replace(/\/+/g,'/');
		path = path.replace(/^\//,'');
	}

	var uuid = self.getShare(name, ip, path);
	var response;
	if (uuid != undefined) {
		defer.resolve({
			success: false,
			reason: 'This share has already been configured'
		});
	}

	uuid = libUUID.v4();
	var key = "NasMounts." + uuid + ".";
	self.logger.info("No correspondence found in configuration for share " + name + " on IP " + ip);

	var saveshare = self.saveShareConf(key, uuid, name, ip, path, fstype, username, password, options);

	saveshare.then(function () {
		var mountshare = self.mountShare({key:uuid});
		if (mountshare != undefined) {
			mountshare.then(function (data) {
				var responsemessage = {};
				if (data.status == 'success') {
					responsemessage = {emit: 'pushToastMessage', data:{ type: 'success', title: 'Success', message: name + ' mounted successfully'}};
					defer.resolve(responsemessage);
					self.scanDatabase();
				} else if (data.status === 'fail') {
					if(data.reason) {
						if (data.reason == 'Permission denied') {
							responsemessage = {emit: 'nasCredentialsCheck', data:{ 'id': uuid, 'title': 'Network Drive Authentication', 'message': 'This drive requires password', 'name': name, 'username': username, 'password':password }};
							self.logger.info("Permission denied for " + name + " on IP " + ip);
							defer.resolve(responsemessage);
						} else {
							responsemessage = {emit: 'pushToastMessage', data:{ type: 'error', title: 'Error in mounting share '+name, message: data.reason}};
							self.logger.info("Error mounting  " + name + " on IP " + ip + ' : ' + data.reason);
							defer.resolve(responsemessage);
						}


					} else {
						responsemessage = {emit: 'pushToastMessage', data:{ type: 'error', title: 'Error in mounting share '+name, message: 'Unknown error'}};
						self.logger.info("Unknown error mounting  " + name + " on IP " + ip);
						defer.resolve(responsemessage);
					}
				}


			});
		}
	});

	return defer.promise;
};

ControllerNetworkfs.prototype.saveShareConf = function (key, uuid, name, ip, path, fstype, username, password, options) {
	var self = this;

	var defer = libQ.defer();
	config.addConfigValue(key + 'name', 'string', name);
	config.addConfigValue(key + 'ip', 'string', ip);
	config.addConfigValue(key + 'path', 'string', path);
	config.addConfigValue(key + 'fstype', 'string', fstype);
	config.addConfigValue(key + 'user', 'string', username);
	config.addConfigValue(key + 'password', 'string', password);
	config.addConfigValue(key + 'options', 'string', options);

	defer.resolve('ok')
	return defer.promise;
}

ControllerNetworkfs.prototype.deleteShare = function (data) {
	var self = this;

	var defer = libQ.defer();
	var key = "NasMounts." + data['id'];

	var responsemessage;

	if (config.has(key)) {

		var mountidraw = config.get(key + '.name');
		var mountid = mountidraw.replace(/[\s\n\\]/g,"_");
		var mountpoint = '/mnt/NAS/' + mountid;
		var mountedshare = mountutil.isMounted(mountpoint, false);
		if (mountedshare.mounted) {


			mountutil.umount(mountpoint, false, {"removeDir": true}, function (result) {
				if (result.error) {
					responsemessage = {emit: 'pushToastMessage', data:{ type: 'error', title: self.commandRouter.getI18nString('COMMON.ERROR'), message: self.commandRouter.getI18nString('NETWORKFS.ERROR_UMOUNT')}};
					self.logger.error("Mount point '" + mountpoint + "' cannot be removed. Error: " + result.error);
					defer.resolve(responsemessage);
				}
				else {
					responsemessage = {emit: 'pushToastMessage', data:{ type: 'success', title: self.commandRouter.getI18nString('NETWORKFS.NETWORK_DRIVE'), message: self.commandRouter.getI18nString('NETWORKFS.REMOVED')}};
					self.logger.info("Share " + mountid + " successfully unmounted");
					defer.resolve(responsemessage);
					config.delete(key);
				}
			});

			setTimeout(function () {
				self.scanDatabase();
			}, 3000);

		} else {
			exec('rm -rf ' + mountpoint + ' ', {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
				if (error !== null) {
					responsemessage = {emit: 'pushToastMessage', data:{ type: 'error', title: self.commandRouter.getI18nString('COMMON.ERROR'), message: self.commandRouter.getI18nString('NETWORKFS.ERROR_UMOUNT')}};
					self.logger.error("Cannot Delete Folder. Error: " + error);
					defer.resolve(responsemessage);
				} else {
					responsemessage = {emit: 'pushToastMessage', data:{ type: 'success', title: self.commandRouter.getI18nString('NETWORKFS.NETWORK_DRIVE'), message: self.commandRouter.getI18nString('NETWORKFS.REMOVED')}};
					defer.resolve(responsemessage);
					config.delete(key);
				}
			});
		}
	} else {
		responsemessage = {emit: 'pushToastMessage', data:{ type: 'error', title: self.commandRouter.getI18nString('COMMON.ERROR'), message: self.commandRouter.getI18nString('NETWORKFS.SHARE_NOT_CONFIGURED')}};
		defer.resolve(responsemessage);
	}

	return defer.promise;
};


ControllerNetworkfs.prototype.listShares = function (data) {
	var self = this;

	var response = [];
	var size = '';
	var unity = '';
	var defer = libQ.defer();

	var shares = config.getKeys('NasMounts');
	var nShares = shares.length;

	if (nShares > 0) {
		response = [];

		var promises = [];

		for (var i = 0; i < nShares; i++) {
			promises.push(this.getMountSize(shares[i]));
		}
		libQ.all(promises).then(function (d) {
			defer.resolve(d);
		}).fail(function (e) {
			console.log("Failed getting mounts size", e)
		});
	}
	else {
		response = [];
		defer.resolve(response);

	}
	return defer.promise;
};

ControllerNetworkfs.prototype.getMountSize = function (share) {
	return new Promise(function (resolve, reject) {
		var key = 'NasMounts.' + share + '.';
		var name = config.get(key + 'name');
		var mountidraw = name;
		var mountid    = mountidraw.replace(/[\s\n\\]/g,"_");
		var mountpoint = '/mnt/NAS/' + mountid;
		var mounted = mountutil.isMounted(mountpoint, false);
		var respShare = {
			path: config.get(key + 'path'),
			ip: config.get(key + 'ip'),
			id: share,
			name: name,
			fstype: config.get(key + 'fstype'),
			username: config.get(key + 'user'),
			password: config.get(key + 'password'),
			options: config.get(key + 'options'),
			mounted: mounted.mounted,
			size: ''
		};
		// cmd returns size in bytes with no units and no header line
		var cmd="df -B1 --output=used '"+mountpoint+"' | tail -1";
		var promise = libQ.ncall(exec,respShare,cmd).then(function (stdout){


			var splitted=stdout.split('\n');
			var sizeStr=splitted[0];

			var size=parseInt(sizeStr) / 1024 / 1024;
			var unity = 'MB';
			if (size > 1024) {
				size = size / 1024;
				unity = 'GB';
				if (size > 1024) {
					size = size / 1024;
					unity = 'TB';
				}
			}
			respShare.size = size.toFixed(2) + " " + unity ;
			resolve(respShare);

		}).fail(function (e){
			console.log("fail...." + e);
			reject(respShare);
		});
	});
};

/**
 * {
 name:’SHARE su 192.168.10.135’
  path:’SHARE’,
  id:’dsdsd’,
  ip:’192.168.10.1’,
  fstype:’’,
  username:’’,
  password:’’,
  options:’’
}

 * @param data
 * @returns {*}
 */
ControllerNetworkfs.prototype.infoShare = function (data) {
	var self = this;

	var defer = libQ.defer();

	if (config.has('NasMounts.' + data['id'])) {
		var key = 'NasMounts.' + data['id'] + '.';
		var response = {
			path: config.get(key + 'path'),
			name: config.get(key + 'name'),
			id: data['id'],
			ip: config.get(key + 'ip'),
			fstype: config.get(key + 'fstype'),
			username: config.get(key + 'user'),
			password: config.get(key + 'password'),
			options: config.get(key + 'options')
		};

		defer.resolve(response);
	}
	else defer.resolve({});

	return defer.promise;
};

/**
 * {
  id:’fdfdvoeo’,
  name:’SHARE’,
  ip:’192.168.10.1’,
  fstype:’’,
  username:’’,
  password:’’,
  options:’’
}

 * @param data
 * @returns {*}
 */
ControllerNetworkfs.prototype.editShare = function (data) {
	var self = this;

	console.log(data)
	var responsemessageedit = {};
	var defer = libQ.defer();
	if (data.id){
		var id= data['id'];
	}
	if (data.name){
		var name= data['name'];
	}
	if (data.user){
		var user= data['user'];
	}
	if (data.password){
		var password= data['password'];
	}

	if (config.has('NasMounts.' + data['id'])) {

		var mountidraw = config.get('NasMounts.' + data['id'] + '.name');
		var mountid    = mountidraw.replace(/[\s\n\\]/g,"_");
		var mountpoint = '/mnt/NAS/' + mountid;
		mountutil.umount(mountpoint, false, {"removeDir": true}, function (result) {
			if (result.error) {
				defer.resolve({
					success: false,
					reason: 'Cannot unmount share'
				});
			} else {
				self.logger.info("Share " + mountidraw + " successfully unmounted");
				var key = 'NasMounts.' + data['id'] + '.';

				var oldpath = config.get(key + 'path');
				var oldname = config.get(key + 'name');
				var oldip = config.get(key + 'ip');
				var oldfstype = config.get(key + 'fstype');
				var oldusername = config.get(key + 'user');
				var oldpassword = config.get(key + 'password');
				var oldoptions = config.get(key + 'options');


				if (data['name']) {
				config.set(key + 'name', data['name']);
				}
				if(data['path']){
				config.set(key + 'path', data['path']);
				}
				if(data['ip']) {
					config.set(key + 'ip', data['ip']);
				}
				if (data['fstype']) {
				config.set(key + 'fstype', data['fstype']);
				}
				if (data['username']) {
					config.set(key + 'user', data['username']);
				}
				if (data['password']) {
					config.set(key + 'password', data['password']);
				}
				if (data['options']) {
					config.set(key + 'options', data['options']);
				}


				var mountshare = self.mountShare({key:id});
				if (mountshare != undefined) {
					mountshare.then(function (data) {
						console.log(data)
						console.log(data.status);
						if (data.status == 'success') {
							self.scanDatabase();
							responsemessageedit = {emit: 'pushToastMessage', data:{ type: 'success', title: self.commandRouter.getI18nString('NETWORKFS.NETWORK_DRIVE'), message: self.commandRouter.getI18nString('NETWORKFS.SHARE_MOUNT_SUCCESS')}};
							defer.resolve(responsemessageedit);

						} else if (data.status === 'fail') {
							if(data.reason) {

								self.logger.info("An error occurred mounting the new share. Rolling back configuration");
								config.set(key + 'name', oldname);
								config.set(key + 'path', oldpath);
								config.set(key + 'ip', oldip);
								config.set(key + 'fstype', oldfstype);
								config.set(key + 'user', oldusername);
								config.set(key + 'password', oldpassword);
								config.set(key + 'options', oldoptions);
								if (data.reason === 'Permission denied') {
									responsemessageedit = {emit: 'nasCredentialsCheck', data:{ 'id': id, 'name': name, 'username': username, 'password':password }};
									defer.resolve(responsemessageedit);
								} else {
									responsemessageedit = {emit: 'pushToastMessage', data:{ type: 'warning', title: self.commandRouter.getI18nString('NETWORKFS.MOUNT_SHARE_ERROR'), message: data.reason}};
									defer.resolve(responsemessageedit);
								}


							}
						}


					});
				}
			}
		});

	}
	else defer.resolve({
		success: false,
		reason: 'Share not found'
	});

	return defer.promise;
};

ControllerNetworkfs.prototype.discoverShares = function () {
	var self = this;

	var defer = libQ.defer();
	var sharesjson = {"nas":[]};
	try {
		var shares = execSync("/usr/bin/smbtree -N -b", { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
	} catch (err) {
		var shares = err.stdout;
	}
	//console.log(shares);
	var allshares = shares.split("\n");
	var num = allshares.length;
	var progress = 0;

	try {
	for (var i = 0; i < allshares.length; i++) {
		progress++
		var asd = allshares[i];
		var asd2 = asd.replace('\t\t\\\\','');
		if (asd2.indexOf('\t\\\\') >= 0) {
			var cleaned = asd.split(' ');
			var final1 = cleaned[0].replace('\t\\\\','');
			var final2 = final1.split('\t');
			var final = final2[0];
			if (final != 'VOLUMIO') {
				sharesjson.nas.push({"name":final,"shares":[]});
			}
		} else  {
			var clean2 = asd2.split(' ');
			for (var e = 0; e < sharesjson.nas.length; e++) {
				if (asd2.indexOf(sharesjson.nas[e].name) >= 0) {
					var sharenamearray = clean2[0].split("\\");
					var sharename = sharenamearray[1];
					if(sharename.indexOf('$') < 0) {
						sharesjson.nas[e].shares.push({"sharename": sharename, "path": sharename});
					}
				}
			}
		}
		if (progress === num) {
			defer.resolve(sharesjson);
		}
	}
	} catch (e) {
		sharesjson = {"nas":[]};
		defer.resolve(sharesjson);
	}


	return defer.promise;
};


ControllerNetworkfs.prototype.getAdditionalConf = function (type, controller, data, def) {
	var self = this;
	var setting = self.commandRouter.executeOnPlugin(type, controller, 'getConfigParam', data);

	if (setting == undefined) {
		setting = def;
	}
	return setting
};

ControllerNetworkfs.prototype.getLabelForSelect = function (options, key) {
	var self=this;
	var n = options.length;
	for (var i = 0; i < n; i++) {
		if (options[i].value == key)
			return options[i].label;
	}

	return 'Error';
};
