'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var firebase = require("firebase");
var unirest = require('unirest');
var config = new (require('v-conf'))();
var io=require('socket.io-client');
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var socket= io.connect('http://localhost:3000');
var endpointdomain = 'https://us-central1-myvolumio.cloudfunctions.net/';
var remoteJsonConf = '/tmp/myvolumio-remote.json'
var uid = '';
var userLoggedIn = false;
var crypto = require('crypto');
var algorithm = 'aes-256-ctr';
var uuid = '';
var name = '';
var hwuuid = '';
var geo = 'eu1';
var lastMyVolumioState = {};

module.exports = myVolumio;

function myVolumio(context)
{
    var self = this;

    self.context = context;
    self.commandRouter = self.context.coreCommand;
    self.configManager=self.context.configManager;
    self.logger = self.context.logger;
}

myVolumio.prototype.onVolumioStart = function ()
{
    var self = this;

    //getting configuration
    var configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
    this.config = new (require('v-conf'))();
    this.config.loadFile(configFile);
    this.commandRouter.sharedVars.registerCallback('system.name', this.playerNameCallback.bind(this));



    return libQ.resolve();
};


myVolumio.prototype.onStart = function ()
{
    var self = this;
    var defer = libQ.defer();


    var config = {
        apiKey: "AIzaSyDzEZmwJZS4KZtG9pEXOxlm1XcZikP0KbA",
        authDomain: "myvolumio.firebaseapp.com",
        databaseURL: "https://myvolumio.firebaseio.com/",
        storageBucket: "gs://myvolumio.appspot.com"
    };

    var systemController = self.commandRouter.pluginManager.getPlugin('system_controller', 'system');
    name = systemController.getConf('playerName');
    uuid = systemController.getConf('uuid');
    hwuuid = self.getHwuuid();
    firebase.initializeApp(config);
    self.remotePrepare();
    self.myVolumioLogin();
    self.updateMyVolumioDeviceState();



    return defer.promise;
}

myVolumio.prototype.onStop = function () {
    var self = this;
    //Perform startup tasks here
};

myVolumio.prototype.onRestart = function () {
    var self = this;
    //Perform startup tasks here
};

myVolumio.prototype.onInstall = function () {
    var self = this;
    //Perform your installation tasks here
};

myVolumio.prototype.onUninstall = function () {
    var self = this;
    //Perform your installation tasks here
};

myVolumio.prototype.getUIConfig = function () {
    var self = this;
    var defer = libQ.defer();
    var lang_code = this.commandRouter.sharedVars.get("language_code");
    self.commandRouter.i18nJson(__dirname+'/../../../i18n/strings_'+lang_code+'.json',
        __dirname+'/../../../i18n/strings_en.json',
        __dirname + '/UIConfig.json')
        .then(function(uiconf) {

            //uiconf.sections[0].content[0].value = self.config.get('username');
            //uiconf.sections[0].content[1].value = self.config.get('password');

            defer.resolve(uiconf);
        })
        .fail(function () {
            defer.reject(new Error());
        });

    return defer.promise;
};

//manage parameters from config.json file of every plugin
myVolumio.prototype.retrievePlugConfig = function () {
    var self = this;

    return self.commandRouter.getPluginsConf();
}

myVolumio.prototype.login = function () {
    var self = this;
}

myVolumio.prototype.setUIConfig = function (data) {
    var self = this;
    //Perform your installation tasks here
};

myVolumio.prototype.getConf = function (varName) {
    var self = this;
    //Perform your installation tasks here
};

myVolumio.prototype.setConf = function (varName, varValue) {
    var self = this;
    //Perform your installation tasks here
};

//Optional functions exposed for making development easier and more clear
myVolumio.prototype.getSystemConf = function (pluginName, varName) {
    var self = this;
    //Perform your installation tasks here
};

myVolumio.prototype.setSystemConf = function (pluginName, varName) {
    var self = this;
    //Perform your installation tasks here
};

myVolumio.prototype.getAdditionalConf = function () {
    var self = this;
    //Perform your installation tasks here
};

myVolumio.prototype.setAdditionalConf = function () {
    var self = this;
    //Perform your installation tasks here
};


myVolumio.prototype.getConfigurationFiles = function () {
    var self = this;

    return ['config.json'];
};

myVolumio.prototype.myVolumioLogin = function () {
    var self = this;

    //var token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJMSmd3SUhjQ2ZOYURma0F5V1JJUlF2SW11VlMyIiwiaWF0IjoxNTA5MzY3NzM0LCJleHAiOjE1MDkzNzEzMzQsImF1ZCI6Imh0dHBzOi8vaWRlbnRpdHl0b29sa2l0Lmdvb2dsZWFwaXMuY29tL2dvb2dsZS5pZGVudGl0eS5pZGVudGl0eXRvb2xraXQudjEuSWRlbnRpdHlUb29sa2l0IiwiaXNzIjoiZmlyZWJhc2UtYWRtaW5zZGstamlhNzFAbXl2b2x1bWlvLmlhbS5nc2VydmljZWFjY291bnQuY29tIiwic3ViIjoiZmlyZWJhc2UtYWRtaW5zZGstamlhNzFAbXl2b2x1bWlvLmlhbS5nc2VydmljZWFjY291bnQuY29tIn0.HUWMT0YkA4QBUC77yh_FISbyPhSHWvVzoOKkup9zxqHGEgY4lBvVMDnsP3HOe_3_JMT3ILY3Gde13Q3HH5rdW0ElNrgf2l7LE4ynWvdKx1PHn52MC06PUdgDsTS0lQxDcRK1x6-SrDFyIJaJaWzE2kUSVrWmtmlz4Zi9MESoIYT1s1SvGlI44PIOg6POCWxbYKffKEFbI-Gk_XYkXa-ibbpP5p0w8-RYxR__GGmeil32f5JYE6vqTD9y8MqSNXUkJdKxE3yQf898S8KRTRSmV_iOj1krmEcTlSIYC7xtRjbtjRSOjljeNmZ_f-W_s9ZFZenUQbtCscdGlNdS7IxOEg'
    //self.saveMyVolumioData({"token":token})
    var data = self.getMyVolumioData();
    var token = data.token;
    var username = data.username;
    var password = data.password;

    if (token != undefined && token.length > 0) {
        firebase.auth().signInWithCustomToken(token).catch(function(error) {
            if (error) {
                self.logger.error('MyVolumio FAILED LOGIN: ' + error.message);
                userLoggedIn = false;
            }
        });
    } else if (username != undefined && username.length > 0 && password != undefined && password.length > 0){
        firebase.auth().signInWithEmailAndPassword(username, password).catch(function(error) {
            if (error) {
                self.logger.error('MyVolumio FAILED LOGIN: ' + error.message);
                userLoggedIn = false;
            }
        });

    } else {
        self.logger.info('MyVolumio not started');
    }

    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            userLoggedIn = true;
            uid = user.uid;

            self.logger.info('MYVOLUMIO SUCCESSFULLY LOGGED IN');
            if (uid != undefined && uid.length > 0 && uid != self.config.get('uid', '')) {
                self.config.set('uid', uid)
            }
            self.addMyVolumioDevice();
            firebase.database().ref('/users/' + user.uid).once('value').then(function(snapshot) {

            });
            setTimeout(function(){
                self.startRemoteDaemon();
            },4000)


            
            firebase.database().ref(".info/connected")
                .on("value", function (snap) {
                        if (snap.val()) {
                            //ONLINE
                            firebase.database().ref('user_devices/' + uid + '/' + hwuuid + '/online').set(true);
                            firebase.database().ref('user_devices/' + uid + '/' + hwuuid + '/lastSeen').set(null);
                        } else {
                            // If client offline
                        }
                    }
                );

            //just set it offline
            firebase.database().ref('user_devices/' + uid + '/' + hwuuid + '/online').onDisconnect().set(false);

            //otherwise, we could store the timestamp of last online presence
            firebase.database().ref('user_devices/' + uid + '/' + hwuuid + '/lastSeen').onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
        } else {
            userLoggedIn = false;
            self.logger.info('MYVOLUMIO LOGGED OUT');
            self.stopRemoteDaemon();
        }
    });
};



myVolumio.prototype.getMyVolumioStatus = function () {
    var self = this;
    var defer = libQ.defer();

    if (userLoggedIn) {
        var jsonobject = {"loggedIn":true, "uid":uid};
        defer.resolve(jsonobject)
    } else {
        var jsonobject = {"loggedIn":false}
        defer.resolve(jsonobject)
    }

    return defer.promise;
};

myVolumio.prototype.getMyVolumioToken = function (data) {
    var self = this;
    var defer = libQ.defer();

    if (userLoggedIn) {

        firebase.auth().currentUser.getIdToken(false)
            .then(function (idToken) {
                var endpoint = endpointdomain+'api/v1/getCustomToken?idToken='+idToken;
                unirest.get(endpoint)
                    .end(function (response) {
                        if (response.body === 'Error: could not handle the request') {
                            var jsonobject = {"tokenAvailable":false}
                            defer.resolve(jsonobject)
                        } else if (response.status === 200) {
                            var token = response.body;
                            var jsonobject = {"tokenAvailable":true, "token":token}
                            defer.resolve(jsonobject)
                        } else {
                            var jsonobject = {"tokenAvailable":false}
                            defer.resolve(jsonobject)
                        }
                    });
            });
    } else {
        var jsonobject = {"tokenAvailable":false}
        defer.resolve(jsonobject)
    }

    return defer.promise;
};

myVolumio.prototype.setMyVolumioToken = function (data) {
    var self = this;
    var defer = libQ.defer();

    if (data.token != undefined && data.token.length > 0 ){
        var token = data.token;
        defer.resolve(token)
    }

    if (userLoggedIn) {

    } else {
        self.saveMyVolumioData({"token":data.token})
    }

    return defer.promise;
};

myVolumio.prototype.encrypt = function (data) {
    var cipher = crypto.createCipher(algorithm,uuid)
    var crypted = cipher.update(data,'utf8','hex')
    crypted += cipher.final('hex');
    return crypted;
};

myVolumio.prototype.decrypt = function (data) {
    var decipher = crypto.createDecipher(algorithm,uuid)
    var dec = decipher.update(data,'hex','utf8')
    dec += decipher.final('utf8');
    return dec;
};

myVolumio.prototype.saveMyVolumioData = function (data) {
    var self = this;

    if (data.username != undefined && data.username.length > 0) {
        var username = self.encrypt(data.username)
        self.config.set('username', username)
    }

    if (data.password != undefined && data.password.length > 0) {
        var password = self.encrypt(data.password)
        self.config.set('password', password)
    }

    if (data.token != undefined && data.token.length > 0) {
        //var token = self.encrypt(data.token)
        var token = data.token
        self.config.set('token', token)
    }

    self.myVolumioLogin();
};

myVolumio.prototype.getMyVolumioData = function () {
    var self = this;
    var data = {};

    try {
        var username = self.config.get('username')
        if (username != undefined && username.length > 0) {
            data.username = self.decrypt(username);
        }

        var password = self.config.get('password')
        if (password != undefined && password.length > 0) {
            data.password = self.decrypt(password);
        }

        var token = self.config.get('token')
        if (token != undefined && token.length > 0) {
            //data.token = self.decrypt(token);
            data.token = token;
        }
    } catch(e) {
        self.logger.error('Cannot get login credentials')
    }



    return data
};

myVolumio.prototype.getValueFromDB = function (data) {
    var self = this;


    if (userLoggedIn) {
        firebase.database().ref('/users/' + uid).once('value').then(function(snapshot) {

        });
    } else {

    }

};

myVolumio.prototype.myVolumioLogout = function () {
    var self = this;

    self.config.set('username', '')
    self.config.set('password', '')
    self.config.set('token', '')
    firebase.auth().signOut();
    setTimeout(function(){
        self.myVolumioLogin();
    },2000)


};


myVolumio.prototype.addMyVolumioDevice = function () {
    var self = this;
    self.logger.info('MYVOLUMIO: Adding device');

    var request = {};
    var token = self.config.get('token', '');
    request.endpoint = endpointdomain+'/api/v1/addMyVolumioDevice' + '?uid=' + uid + '&token='+token;
    console.log('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
    console.log(request.endpoint)
    var name = self.commandRouter.executeOnPlugin('system_controller', 'system', 'getConfigParam', 'playerName');
    var uuid = self.commandRouter.executeOnPlugin('system_controller', 'system', 'getConfigParam', 'uuid');
    var device = self.commandRouter.executeOnPlugin('system_controller', 'system', 'getConfigParam', 'device');
    var hwuuid = self.getHwuuid();
    request.body = {'name': name, 'uuid': uuid, 'device': device, 'hwuuid': hwuuid};
    console.log(request.body)
    var response=self.restPost(request)

    //TODO: Dirty fix for non working API
    setTimeout(function(){
        self.updateMyVolumioDevice();
    },1000)

    if (response != undefined) {
        response.then(function (result) {

        })
    }
};

myVolumio.prototype.updateMyVolumioDevice = function () {
    var self = this;

    self.logger.info('Updating MyVolumio device info')
    var request = {};
    var token = self.config.get('token', '');
    request.endpoint = endpointdomain+'/api/v1/updateMyVolumioDevice' + '?uid=' + uid + '&token='+token;
    var name = self.commandRouter.executeOnPlugin('system_controller', 'system', 'getConfigParam', 'playerName');
    var uuid = self.commandRouter.executeOnPlugin('system_controller', 'system', 'getConfigParam', 'uuid');
    var device = self.commandRouter.executeOnPlugin('system_controller', 'system', 'getConfigParam', 'device');
    var hwuuid = self.getHwuuid();
    request.body = {'name': name, 'uuid': uuid, 'device': device, 'hwuuid': hwuuid};
    var response=self.restPost(request)

    if (response != undefined) {
        response.then(function (result) {
            //console.log(result)
        })
    }
};

myVolumio.prototype.deleteMyVolumioDevice = function (device) {
    var self = this;

    var request = {};
    var token = self.config.get('token', '');
    request.endpoint = endpointdomain+'/api/v1/deleteMyVolumioDevice' + '?uid=' + uid + '&token='+token + '&hwuuid=' + device.hwuuid;

    var response=self.restPost(request)

    if (response != undefined) {
        response.then(function (result) {
            //console.log(result)
        })
    }

};

myVolumio.prototype.enableMyVolumioDevice = function (device) {
    var self = this;

    var request = {};
    var token = self.config.get('token', '');
    request.endpoint = endpointdomain+'/api/v1/enableMyVolumioDevice' + '?uid=' + uid + '&token='+token + '&hwuuid=' + device.hwuuid;

    var response=self.restPost(request)

    if (response != undefined) {
        response.then(function (result) {
            //console.log(result)
        })
    }

};

myVolumio.prototype.disableMyVolumioDevice = function (device) {
    var self = this;

    var request = {};
    var token = self.config.get('token', '');
    request.endpoint = endpointdomain+'/api/v1/enableMyVolumioDevice' + '?uid=' + uid + '&token=' + token + '&hwuuid=' + device.hwuuid;

    var response=self.restPost(request)

    if (response != undefined) {
        response.then(function (result) {
            //console.log(result)
        })
    }
};

myVolumio.prototype.getMyVolumioDevices = function () {
    var self = this;

    var token = self.config.get('token', '');
    var endpoint = endpointdomain+'/api/v1/getMyVolumioDevices' + '?uid=' + uid + '&token='+token;

    if (userLoggedIn) {
        unirest.get(endpoint)
            .end(function (response) {
                if (response.body === 'Error: could not handle the request') {
                    defer.resolve('')
                } else {
                    var token = response.body;
                    var jsonobject = {"tokenAvailable":true, "token":token}
                    defer.resolve(jsonobject)
                }
            });
    } else {
        var jsonobject = {"tokenAvailable":false}
        defer.resolve(jsonobject)
    }

    return defer.promise;
};

myVolumio.prototype.restPost = function (request) {
    var self = this;
    var defer = libQ.defer();

    //console.log(JSON.stringify(request))

    unirest.post(request.endpoint)
        .send(request.body)
        .end(function (response) {
            if (response.body === 'Error: could not handle the request') {
                defer.resolve('error')
            } else if (response.status === 200){
                defer.resolve(response.body)
            } else {
                defer.resolve('error')
            }
        });
};

myVolumio.prototype.getHwuuid = function () {
    var self = this;
    var defer = libQ.defer();

    try {
        var macaddr = fs.readFileSync('/sys/class/net/eth0/address', "utf8");
        var anonid = macaddr.toString().replace(':','');
    } catch (e) {
        console.log(e)
        var anonid = self.commandRouter.executeOnPlugin('system_controller', 'system', 'getConfigParam', 'uuid');
    }

    return crypto.createHash('md5').update(anonid).digest("hex");
};



myVolumio.prototype.playerNameCallback = function () {
    var self = this;

    if (userLoggedIn) {
        self.updateMyVolumioDevice()
    }
}

myVolumio.prototype.updateMyVolumioDeviceState = function () {
    var self = this;


    socket.on('pushState', function (data) {
        if (userLoggedIn) {
            var currentMyVolumioState = {"albumart": data.albumart, "artist": data.artist, "mute": data.mute, "status": data.status, "track": data.title, "volume":data.volume }
            if (currentMyVolumioState != lastMyVolumioState) {
                lastMyVolumioState = currentMyVolumioState;
                firebase.database().ref('user_devices/' + uid + '/' + hwuuid + '/state').set(currentMyVolumioState)
            }
        }

    })
}

myVolumio.prototype.remotePrepare = function () {
    var self = this;
    var certsPath = '/data/certs'
    if (!fs.existsSync(certsPath)) {
        execSync('/bin/mkdir ' + certsPath, { uid: 1000, gid: 1000, encoding: 'utf8'});
        exec('/usr/bin/openssl req -x509 -nodes -newkey rsa:2048 -sha256 -keyout ' + certsPath + '/client.key -out ' + certsPath + '/client.crt -subj "/C=/ST=/L=/O=/OU=/CN=*"', {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
            if (error !== null) {
                self.logger.error('Cannot create cert: ' + error);
            } else {
                self.logger.info('Cert properly created')
            }
        });
    }

}

myVolumio.prototype.writeRemoteConf = function () {
    var self = this;
    var defer = libQ.defer();

    fs.outputJson(remoteJsonConf, {"hwuuid": hwuuid, "geo": geo}, function(err) {
      if (err) {
          self.logger.error('Cannot write remote configuration');
          defer.reject('')
      } else {
          self.logger.info('Remote config written successfully');
          defer.resolve('')
      }
    })

    return defer.promise
}

myVolumio.prototype.startRemoteDaemon = function () {
    var self = this;

    var conf = self.writeRemoteConf();

    conf.then(function () {
        exec("/usr/bin/sudo /bin/systemctl restart tunnel.service", {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
            if (error !== null) {
                self.logger.error('Cannot start Remote Daemon: '+error)
            } else {
                self.logger.info('Remote Daemon Started')
            }
        });
    }).fail(function () {
        self.printToastMessage('error', "Browse error", 'An error occurred while browsing the folder.');
    });



}

myVolumio.prototype.stopRemoteDaemon = function () {
    var self = this;

    exec("/usr/bin/sudo /bin/systemctl restart tunnel.service", {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
        if (error !== null) {
            self.logger.error('Cannot stop Remote Daemon: '+error)
        } else {
            self.logger.info('Remote Daemon Stopped')
        }
    });

}