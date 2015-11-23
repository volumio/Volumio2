var libQ = require('kew');
var libNet = require('net');
var libFast = require('fast.js');
var fs=require('fs-extra');
var exec = require('child_process').exec;
var Wireless = require('./lib/index.js');
var fs=require('fs-extra');
var config= new (require('v-conf'))();
var mountutil = require('linux-mountutils');
var libUUID=require('node-uuid');



// Define the ControllerNetworkfs class
module.exports = ControllerNetworkfs;

function ControllerNetworkfs(context) {
	var self = this;

	// Save a reference to the parent commandRouter
	self.context=context;
	self.commandRouter = self.context.coreCommand;
	self.logger=self.commandRouter.logger;

}

ControllerNetworkfs.prototype.getConfigurationFiles = function()
{
	var self = this;

	return ['config.json'];
}

ControllerNetworkfs.prototype.onVolumioStart = function() {
	var self = this;

	var configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');
	config.loadFile(configFile);

	self.initShares();
}

ControllerNetworkfs.prototype.onStart = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerNetworkfs.prototype.onStop = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerNetworkfs.prototype.onRestart = function() {
	var self = this;
	//Perform startup tasks here
}

ControllerNetworkfs.prototype.onInstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetworkfs.prototype.onUninstall = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetworkfs.prototype.getUIConfig = function()
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

	/*var name=config.get('NasMounts.Flac.name');
	var ip=config.get('NasMounts.Flac.ip');
	var fstype=config.get('NasMounts.Flac.fstype');

	uiconf.sections[0].content[0].value=name;
	uiconf.sections[0].content[1].value=ip;
	uiconf.sections[0].content[2].value.value=fstype;
	uiconf.sections[0].content[2].label.value=fstype;

	var user=config.get('NasMounts.Flac.user');
	if(user!=undefined)
		uiconf.sections[0].content[3].value=user;

	var password=config.get('NasMounts.Flac.password');
	if(password!=undefined)
		uiconf.sections[0].content[4].value=password;

	var options=config.get('NasMounts.Flac.options');
	if(options!=undefined)
		uiconf.sections[0].content[5].value=options;*/

	return uiconf;
}

ControllerNetworkfs.prototype.setUIConfig = function(data)
{
	var self = this;

	var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

}

ControllerNetworkfs.prototype.getConf = function(varName)
{
	var self = this;

	return self.config.get(varName);
}

ControllerNetworkfs.prototype.setConf = function(varName, varValue)
{
	var self = this;

	self.config.set(varName,varValue);
}

//Optional functions exposed for making development easier and more clear
ControllerNetworkfs.prototype.getSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetworkfs.prototype.setSystemConf = function(pluginName,varName)
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetworkfs.prototype.getAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}

ControllerNetworkfs.prototype.setAdditionalConf = function()
{
	var self = this;
	//Perform your installation tasks here
}



ControllerNetworkfs.prototype.initShares = function () {
	var self = this;

	var keys = config.getKeys('NasMounts');
	for(var i in keys) {
		var key=keys[i];
		self.mountShare(key);
	}
}

ControllerNetworkfs.prototype.mountShare = function (shareid) {
	var self= this;

	var defer=libQ.defer();

	var sharename= config.get('NasMounts.'+shareid+'.name');
	var pointer= '//' + config.get('NasMounts.'+shareid+'.ip') + '/' + config.get('NasMounts.'+shareid+'.name');
	var mountpoint= '/mnt/NAS/'+config.get('NasMounts.'+shareid+'.name');

	//Password-protected mount
	if (( typeof config.get('NasMounts.'+shareid+'.user') !== 'undefined' && config.get('NasMounts.'+shareid+'.user') ) || ( typeof config.get('NasMounts.'+shareid+'.password') !== 'undefined' && config.get('NasMounts.'+shareid+'.password') ))
	{
		var credentials='username='+config.get('NasMounts.'+shareid+'.user')+','+ 'password='+config.get('NasMounts.'+shareid+'.password');
		mountutil.mount(pointer,mountpoint, { "createDir": true,"fstype": "cifs","fsopts":credentials + ",dir_mode=0777,file_mode=0666"}, function(result) {
			if (result.error) {
				// Something went wrong!
				defer.reject(new Error("Cannot mount share"));
				self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Error Mounting Share'+ sharename +  ': '+result.error);
			} else {
				self.context.coreCommand.pushConsoleMessage('[' + Date.now() + ']'+ sharename + ' Share Mounted Successfully');
				self.context.coreCommand.pushToastMessage('success',"Music Library",'Network Share Successfully added ');
				defer.resolve({});
			}
		});
	} else
	//Access as guest (no password)
	{
		mountutil.mount(pointer,mountpoint, { "createDir": true,"fstype": "cifs","fsopts":"guest,dir_mode=0777,file_mode=0666" }, function(result) {
			if (result.error) {
				// Something went wrong!

				defer.reject(new Error("Cannot mount share"));
				self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Error Mounting Share'+ sharename +  ': '+result.error);
			} else {
				self.context.coreCommand.pushConsoleMessage('[' + Date.now() + ']'+ sharename + 'Share Mounted Successfully');
				self.context.coreCommand.pushToastMessage('success',"Music Library", 'Network Share Successfully added ');
				defer.resolve({});
			}
		});
	}

	return defer.promise;
}


ControllerNetworkfs.prototype.getConfigurationFiles = function()
{
	var self = this;

	return ['config.json'];
}

ControllerNetworkfs.prototype.saveShare = function(data)
{
	var self = this;

	var defer = libQ.defer();

	var name=data['Flac.name'];
	var ip=data['Flac.ip'];
	var fstype=data['Flac.fstype'].value;
	var username=data['Flac.username'];
	var password=data['Flac.password'];
	var options=data['Flac.options'];

	if(username==undefined) usenamer='';
	if(password==undefined) password='';
	if(options==undefined) options='';

	config.addConfigValue('NasMounts.Flac.name','string',name);
	config.addConfigValue('NasMounts.Flac.ip','string',ip);
	config.addConfigValue('NasMounts.Flac.fstype','string',fstype);
	config.addConfigValue('NasMounts.Flac.user','string',username);
	config.addConfigValue('NasMounts.Flac.password','string',password);
	config.addConfigValue('NasMounts.Flac.options','string',options);

	self.initShares();

	self.commandRouter.pushToastMessage('success',"Configuration update",'The configuration has been successfully updated');
	setTimeout(function () {
		self.scanDatabase();
		//Wait for share to be mounted before scanning
	}, 3000)
	defer.resolve({});
	return defer.promise;
}


ControllerNetworkfs.prototype.getShare = function(name,ip) {
	var self = this;

	var keys = config.getKeys('NasMounts');
	for(var i in keys) {
		var subKey='NasMounts.'+keys[i];
		self.logger.info("Checking key "+subKey);

		if(config.get(subKey+'.name')==name &&
			config.get(subKey+'.ip')==ip)
		{
			self.logger.info("Found correspondence in configuration");
			return keys[i];
		}

	}
}


ControllerNetworkfs.prototype.scanDatabase = function() {
	var self = this;

	exec("/usr/bin/mpc update", function (error, stdout, stderr) {
		if (error !== null) {
			self.commandRouter.pushToastMessage('warning',"My Music",'Error scanning Database: ' +error);
			self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Database scan error: ' + error);
		}
		else {
			self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Database update started');
			self.commandRouter.pushToastMessage('success',"My Music",'Music Database Update in Progress');
		}
	});
}

ControllerNetworkfs.prototype.listShares = function() {
	var mounts=config.getKeys();


}



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
ControllerNetworkfs.prototype.addShare = function(data) {
	var self=this;

	self.logger.info("Adding a new share");

	var defer = libQ.defer();

	var name=data['name'];
	var ip=data['ip'];
	var fstype=data['fstype'];
	var username=data['username'];
	var password=data['password'];
	var options=data['options'];

	if(username==undefined) usenamer='';
	if(password==undefined) password='';
	if(options==undefined) options='';

	var uuid=self.getShare(name,ip);
	var response;
	if(uuid==undefined)
	{
		self.logger.info("No correspondence found in configuration for share "+name+" on IP "+ip);
		uuid = libUUID.v4();
		var key="NasMounts."+uuid+".";
		config.addConfigValue(key+'name','string',name);
		config.addConfigValue(key+'ip','string',ip);
		config.addConfigValue(key+'fstype','string',fstype);
		config.addConfigValue(key+'user','string',username);
		config.addConfigValue(key+'password','string',password);
		config.addConfigValue(key+'options','string',options);

		setTimeout(function()
		{
			try
			{
				self.initShares();

				response={
					success:true,
					uuid:uuid
				};

				setTimeout(function () {
					self.commandRouter.pushToastMessage('success',"Configuration update",'The configuration has been successfully updated');
					self.scanDatabase();
				}, 3000);
				defer.resolve(response);
			}
			catch(err)
			{
				defer.resolve({
					success:false,
					reason:'An error occurred mounting your share'
				});
			}


		},500);
	}
	else
	{
		defer.resolve({
			success:false,
			reason:'This share has already been configured'
		});
	}

	return defer.promise;
}

ControllerNetworkfs.prototype.deleteShare = function(data) {
	var self=this;

	var defer = libQ.defer();
	var key="NasMounts."+data['id'];

	var response;
	if(config.has(key))

	{
		var mountpoint= '/mnt/NAS/'+config.get(key+'.name');
		console.log(mountpoint);

		setTimeout(function()
		{
			try
			{
				exec('/usr/bin/sudo /bin/umount -l ' + mountpoint + ' ',{ uid: 1000,gid:1000},	 function (error, stdout, stderr) {
					if (error !== null) {
						self.commandRouter.pushToastMessage('alert',"Configuration update",'The share cannot be deleted: '+error);
						self.logger.error("Mount point cannot be removed, won't appear next boot. Error: "+error);
					}
					else {
						exec('rm -rf ' + mountpoint + ' ',{ uid: 1000,gid:1000},	 function (error, stdout, stderr) {
							if (error !== null) {
								self.commandRouter.pushToastMessage('alert',"Configuration update",'The folder cannot be deleted: '+error);
								self.logger.error("Cannot Delete Folder. Error: "+error);
							}
							else {

								self.commandRouter.pushToastMessage('success',"Configuration update",'The share has been deleted');
							}
						});
					}
				});


				setTimeout(function () {

					self.scanDatabase();
				}, 3000);
				defer.resolve({success:true});
			}
			catch(err)
			{
				defer.resolve({
					success:false,
					reason:'An error occurred deleting your share'
				});
			}


		},500);

		config.delete(key);
	}
	else
	{
		defer.resolve({
			success:false,
			reason:'This share is not configured'
		});
	}

	return defer.promise;
}


ControllerNetworkfs.prototype.listShares = function(data) {
	var self=this;


	var defer = libQ.defer();

	var response=[];

	var shares=config.getKeys('NasMounts');

	if (shares.length > 0) {
		for (var i in shares) {
			var share = shares[i];
			var key = 'NasMounts.' + share + '.';

			var mountpoint = '/mnt/NAS/' + config.get(key + 'name');
			var mounted = mountutil.isMounted(mountpoint, false);

			var cmd="df -BM "+mountpoint+" | awk '{print $2}'";
			exec(cmd,function(error,stdout,stderr){
				if (error) {
					size = 'Unknown';
				}
				else {
					var splitted=stdout.split('\n');
					var sizeStr=splitted[1];

					var size=parseInt(sizeStr.substring(0,sizeStr.length-1));

					var unity = 'MB';
					if (size > 1024) {
						size = size / 1024;
						unity = 'GB';
						if (size > 1024) {
							size = size / 1024;
							unity = 'TB';
						}
					}
				}

				var respShare = {
					name: config.get(key + 'name') + ' on ' + config.get(key + 'ip'),
					id: share,
					mounted: mounted.mounted,
					size: size.toFixed(2) + ' ' + unity
				};

				response.push(respShare);
				defer.resolve(response);


			});

		}
	}
	else defer.resolve(response);


	return defer.promise;
}


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
ControllerNetworkfs.prototype.infoShare = function(data) {
	var self=this;

	var defer = libQ.defer();

	if(config.has('NasMounts.' + data['id']))
	{
		var key = 'NasMounts.' + data['id'] + '.';
		var response={
			name: config.get(key+'name')+ ' on '+config.get(key+'ip'),
			path: config.get(key+'name'),
			id: data['id'],
			ip: config.get(key+'ip'),
			fstype: config.get(key+'fstype'),
			username: config.get(key+'user'),
			password: config.get(key+'password'),
			options: config.get(key+'options')
		};

		defer.resolve(response);
	}
	else defer.resolve({});

	return defer.promise;
}

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
ControllerNetworkfs.prototype.editShare = function(data) {
	var self=this;

	var defer = libQ.defer();

	if(config.has('NasMounts.' + data['id']))
	{
		var mountpoint= '/mnt/NAS/'+config.has('NasMounts.' + data['id']+'.name');
		mountutil.umount(mountpoint, false, { "removeDir": true }, function(result){
			if (result.error) {
				defer.resolve({
					success:false,
					reason:'Cannot unmount share'
				});
			} else {
				self.logger.info("Share "+config.has('NasMounts.' + data['id']+'.name')+" successfully unmounted");
				var key = 'NasMounts.' + data['id'] + '.';

				var oldpath=config.get(key+'name');
				var oldip=config.get(key+'ip');
				var oldfstype=config.get(key+'fstype');
				var oldusername=config.get(key+'user');
				var oldpassword=config.get(key+'password');
				var oldoptions=config.get(key+'options');

				config.set(key+'name',data['name']);
				config.set(key+'ip',data['ip']);
				config.set(key+'fstype',data['fstype']);
				config.set(key+'username',data['username']);
				config.set(key+'password',data['password']);
				config.set(key+'options',data['options']);

				var mountDefer=self.mountShare(data['id']);
				mountDefer.then(function(value){
					self.logger.info("New share mounted");
					defer.resolve({
						success:true,
						reason:'Cannot unmount share'
					});
				})
				.fail(function()
				{

					self.logger.info("An error occurred mounting the new share. Rolling back configuration");
					config.set(key+'name',oldpath);
					config.set(key+'ip',oldip);
					config.set(key+'fstype',oldfstype);
					config.set(key+'username',oldusername);
					config.set(key+'password',oldpassword);
					config.set(key+'options',oldoptions);

					defer.resolve({
						success:true,
						reason:'Cannot unmount share'
					});
				});


			}
		});

	}
	else defer.resolve({
			success:false,
			reason:'Share not found'
	});

	return defer.promise;
}

