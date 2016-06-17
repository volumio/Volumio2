'use strict';

var fs=require('fs-extra');
var config= new (require('v-conf'))();
var libQ = require('kew');
var path = require('path');
var lwip = require('lwip');

var backgroundPath = '/data/backgrounds';

// Define the volumioAppearance class
module.exports = volumioAppearance;

function volumioAppearance(context) {
    var self = this;

    // Save a reference to the parent commandRouter
    self.context=context;
    self.commandRouter = self.context.coreCommand;
    self.configManager = self.context.configManager;

    self.logger=self.context.logger;
}

volumioAppearance.prototype.getConfigurationFiles = function()
{
    var self = this;

    return ['config.json'];
};

volumioAppearance.prototype.onVolumioStart = function() {
    var self = this;
    //Perform startup tasks here
    self.configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');
    config.loadFile(self.configFile);

    this.commandRouter.sharedVars.addConfigValue('language_code','string',config.get('language_code'));
    self.createThumbnailPath();
};

volumioAppearance.prototype.onStart = function() {
    var self = this;
    return libQ.resolve();
};

volumioAppearance.prototype.onStop = function() {
    var self = this;
    //Perform startup tasks here
};

volumioAppearance.prototype.onRestart = function() {
    var self = this;
    //Perform startup tasks here
};

volumioAppearance.prototype.onInstall = function()
{
    var self = this;
    //Perform your installation tasks here
};

volumioAppearance.prototype.onUninstall = function()
{
    var self = this;
    //Perform your installation tasks here
};


volumioAppearance.prototype.setUIConfig = function(data)
{
    var self = this;

    var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

};

volumioAppearance.prototype.getConf = function()
{
    var self = this;
    var conf = [];
    try {
        var conf = JSON.parse(fs.readJsonSync(self.configFile));
    } catch (e) {}

    return  conf;
};

//Optional functions exposed for making development easier and more clear
volumioAppearance.prototype.getSystemConf = function(pluginName,varName)
{
    var self = this;
    //Perform your installation tasks here
};

volumioAppearance.prototype.setSystemConf = function(pluginName,varName)
{
    var self = this;
    //Perform your installation tasks here
};

volumioAppearance.prototype.getAdditionalConf = function()
{
    var self = this;
    //Perform your installation tasks here
};

volumioAppearance.prototype.setAdditionalConf = function()
{
    var self = this;
    //Perform your installation tasks here
};

volumioAppearance.prototype.getUIConfig = function () {
    var self = this;

    var uiconf = fs.readJsonSync(__dirname + '/UIConfig.json');
    var languagesdata = fs.readJsonSync(('/volumio/app/plugins/miscellanea/appearance/languages.json'),  'utf8', {throws: false});
    var language = config.get('language');
    var language_code = config.get('language_code');


    self.configManager.setUIConfigParam(uiconf, 'sections[0].content[0].value', {
        value: language_code,
        label: language
    });
    for (var n = 0; n < languagesdata.languages.length; n++){

        self.configManager.pushUIConfigParam(uiconf, 'sections[0].content[0].options', {
            value: languagesdata.languages[n].code,
            label: languagesdata.languages[n].name
        });
    }
    return uiconf;
};

volumioAppearance.prototype.getUiSettings = function()
{
    var self = this;
    var defer = libQ.defer();

    var language = config.get('language_code');
    var theme = config.get('theme');
    var background_type = config.get('background_type');

    if (background_type === 'background') {
        var background_title = config.get('background_title');
        var background_path = config.get('background_path');
        var UiSettings = {"background":{"title":background_title, "path":background_path},"language":language, "theme":theme}
    } else {
        var background_color = config.get('background_color');
        var UiSettings = {"color":background_color, "language":language, "theme":theme}
    }

    defer.resolve(UiSettings);
    return defer.promise;
};

volumioAppearance.prototype.getBackgrounds = function()
{
    var self = this;
    var defer = libQ.defer();

    var backgroundsArray = [];

    fs.readdir(backgroundPath, function(err, files) {
        if (err) {
            console.log(err);
        }
        files.forEach(function(f) {
            if (f.indexOf("thumbnail-") < 0) {
            backgroundsArray.push({"name":f.split('.')[0].capitalize(),"path":f,"thumbnail":"thumbnail-"+f});
            }
        });
        var background_title = config.get('background_title');
        var background_path = config.get('background_path');
        var backgrounds = {"current":{"name":background_title,"path":background_path},"available":backgroundsArray};
        defer.resolve(backgrounds);

    });

    return defer.promise;
};

volumioAppearance.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}



volumioAppearance.prototype.generateThumbnails = function(){
    var self=this;
    var defer = libQ.defer();
    fs.readdir(backgroundPath, function(err, files) {
        if (err) {
            console.log(err);
        }
        //console.log(files)
        //console.log('Found '+ files.length + ' images')
        var numberfile = 0;
        files.forEach(function(f) {
            numberfile++;
            if (f.indexOf("thumbnail-") >= 0) {
            } else  {

            //console.log('Processing file '+ numberfile + ' : '+ backgroundPath+'/thumbnail-'+f);
            try {
                fs.accessSync(backgroundPath+'/thumbnail-'+f, fs.F_OK);
                //console.log('Thumbnail for file '+ numberfile + ' : '+ backgroundPath+'/thumbnail-'+f+ ' exists');
            } catch (e) {
                console.log('Creating Thumbnail for file '+ numberfile + ' : '+ backgroundPath+'/thumbnail-'+f);
                lwip.open(backgroundPath+'/'+f, function(err, image) {
                    if (err) return console.log(err);
                    image.resize(300, 200 , function(err, imageres) {
                        if (err) return console.log(err);
                        imageres.writeFile(backgroundPath+'/thumbnail-'+f, function(err) {
                            if (err) return console.log(err);
                        });
                    });
                });
            }


            }
            if (numberfile===files.length){
                    //console.log('resolving')
                defer.resolve('Ok');
            }
        });

    });
    return defer.promise;
};

volumioAppearance.prototype.createThumbnailPath = function() {
    var self=this;
    if (!fs.existsSync(backgroundPath)) {
        fs.copy(__dirname+'/backgrounds', backgroundPath, function (err) {
            if (err) {
                console.error(err);
            } else {
                self.generateThumbnails();
                console.log("success!");
            }
        });
    }

}

volumioAppearance.prototype.setBackgrounds = function(data)
{
    var self = this;
    var defer = libQ.defer();

    if (data.color) {
        config.set('background_type', 'color');
        config.set('background_color', data.color);
    } else {
        config.set('background_type', 'background');
        config.set('background_title', data.name);
        config.set('background_path', data.path);
    }
    
    self.commandRouter.pushToastMessage('success',self.getI18NString('appearance_title'),
                                            self.getI18NString('new_background_applied'));

    return ('Done');
};

volumioAppearance.prototype.setLanguage = function(data)
{
    var self = this;
    var defer = libQ.defer();

    if (data.language) {
        config.set('language', data.language.label);
        config.set('language_code', data.language.value);
        this.commandRouter.sharedVars.set('language_code',data.language.value);
    }
    self.commandRouter.pushToastMessage('success',self.getI18NString('appearance_title'),
    self.getI18NString('new_language_set'));

    var data = self.getUiSettings();

    if (data != undefined) {
        data.then(function (data) {
            self.commandRouter.broadcastMessage('pushUiSettings', data);
        });
    }
    return ('Done');
};

volumioAppearance.prototype.deleteBackgrounds = function(data)
{
    var self = this;
    var defer = libQ.defer();
    var splitted = data.path.split('/').pop();
    var thumbpathdel = backgroundPath+'/thumbnail-'+splitted;
    var imgpathdel = backgroundPath+'/'+splitted;

    self.deleteFile(imgpathdel);
    var deleted = self.deleteFile(thumbpathdel);


    if (deleted != undefined) {
        deleted.then(function (data) {
            var backgrounds = self.getBackgrounds();
            if (backgrounds != undefined) {
                backgrounds.then(function (data) {
                  defer.resolve(data);
            });
            }
        });
    }

    return defer.promise;
};

volumioAppearance.prototype.deleteFile = function(filepath){
    var self = this;

    var defer = libQ.defer();
    fs.stat(filepath, function (err, stats) {
        if (err) {
            console.log(err);
        } else {
            fs.unlink(filepath,function(err){
                if(err) {
                    console.log(err);
                } else {
                    if (filepath.indexOf("thumbnail-") < 0) {
                        self.commandRouter.pushToastMessage('success', self.getI18NString('appearance_title'),
                            self.getI18NString('background_deleted'));
                    } defer.resolve('Done');
                }
            });
        }
    });

    return defer.promise;
}

volumioAppearance.prototype.loadI18NStrings = function (code) {
    this.logger.info('APPEARANCE I18N LOAD FOR LOCALE '+code);

    this.i18nString=fs.readJsonSync(__dirname+'/i18n/strings_'+code+".json");
}


volumioAppearance.prototype.getI18NString = function (key) {
    return this.i18nString[key];
}


