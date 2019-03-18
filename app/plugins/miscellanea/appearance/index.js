'use strict';

var fs=require('fs-extra');
var config= new (require('v-conf'))();
var libQ = require('kew');
var path = require('path');
var Jimp = require("jimp");

var backgroundPath = '/data/backgrounds';
var translationLanguage = '';
var totalWords = 0;
var totalTranslated = 0;

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

    return libQ.resolve();
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

    var defer=libQ.defer();
    self.commandRouter.i18nJson(__dirname+'/../../../i18n/strings_'+config.get('language_code')+'.json',
        __dirname+'/../../../i18n/strings_en.json',
        __dirname + '/UIConfig.json')
        .then(function(uiconf)
        {
            var languagesdata = fs.readJsonSync(('/volumio/app/plugins/miscellanea/appearance/languages.json'),  'utf8', {throws: false});
            var language = config.get('language');
            var language_code = config.get('language_code');
            var allLanguagesdata = fs.readJsonSync(('/volumio/app/plugins/miscellanea/appearance/allLanguages.json'),  'utf8', {throws: false});

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


            self.configManager.setUIConfigParam(uiconf, 'sections[1].content[0].value', {
              value: language_code,
              label: language
          });
          for (var n = 0; n < allLanguagesdata.languages.length; n++){

              self.configManager.pushUIConfigParam(uiconf, 'sections[1].content[0].options', {
                  value: allLanguagesdata.languages[n].code,
                  label: allLanguagesdata.languages[n].nativeName
              });
          }


            defer.resolve(uiconf);
        })
        .fail(function()
        {
            defer.reject(new Error());
        })
    return defer.promise;
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
            } else {

                //console.log('Processing file '+ numberfile + ' : '+ backgroundPath+'/thumbnail-'+f);
                try {
                    fs.accessSync(backgroundPath+'/thumbnail-'+f, fs.F_OK);
                    //console.log('Thumbnail for file '+ numberfile + ' : '+ backgroundPath+'/thumbnail-'+f+ ' exists');
                } catch (e) {
                    console.log('Creating Thumbnail for file '+ numberfile + ' : '+ backgroundPath+'/thumbnail-'+f);

                    Jimp.read(backgroundPath+'/'+f).then(function (image) {
                        image.resize(300, 200)
                            .quality(60)
                            .write(backgroundPath+'/thumbnail-'+f);
                    }).catch(function (err) {
                        console.error(err);
                    });
                }


            }
            if (numberfile===files.length){
                var background = config.get('background_title')
                if (background === 'Initial') {
                    self.selectRandomBacground();
                }
                defer.resolve('Ok');
            }
        });

    });
    return defer.promise;
};

volumioAppearance.prototype.createThumbnailPath = function() {
    var self=this;

    try {
        fs.statSync(backgroundPath);
    } catch(e) {
        fs.mkdirSync(backgroundPath);
    }
    fs.copy(__dirname+'/backgrounds', backgroundPath, function (err) {
        if (err) {
            console.error(err);
        } else {
            self.generateThumbnails();
        }
    });

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
        config.set('background_path', data.path.substring(data.path.lastIndexOf("/") + 1));
    }

    self.commandRouter.pushToastMessage('success',self.commandRouter.getI18nString('APPEARANCE.APPEARANCE'),
        self.commandRouter.getI18nString('APPEARANCE.NEW_BACKGROUND_APPLIED'));
    var data = self.getUiSettings();

    if (data != undefined) {
        data.then(function (settings) {
            self.commandRouter.broadcastMessage('pushUiSettings', settings);
        });
    }

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

        var menu = self.commandRouter.getMenuItems();
        if (menu != undefined) {
            menu.then(function (menu) {
                self.commandRouter.broadcastMessage('pushMenuItems', menu);
                self.commandRouter.updateBrowseSourcesLang();
            });
        }
    }

    if (!data.disallowReload) {
        self.commandRouter.pushToastMessage('success',self.commandRouter.getI18nString('APPEARANCE.APPEARANCE'),
            self.commandRouter.getI18nString('APPEARANCE.NEW_LANGUAGE_SET'));

        var data = self.getUiSettings();
        if (data != undefined) {
            data.then(function (data) {
                self.commandRouter.broadcastMessage('pushUiSettings', data);
            });
        }
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
                        self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('APPEARANCE.APPEARANCE'),
                            self.commandRouter.getI18nString('APPEARANCE.BACKGROUND_DELETED'));
                    } defer.resolve('Done');
                }
            });
        }
    });

    return defer.promise;
}

volumioAppearance.prototype.selectRandomBacground = function(){
    var self = this;

    var backgrounds = self.getBackgrounds();
    if (backgrounds != undefined) {
        backgrounds.then(function (result) {
            var max = result.available.length-1;
            var random = Math.floor(Math.random() * (max - 0 + 1) + 0);
            var randomBackground = result.available[random];
            var setting = {'name':randomBackground.name, 'path':randomBackground.path}

            return self.setBackgrounds(setting);
        })
            .fail(function () {
            });
    }


}

volumioAppearance.prototype.getAvailableLanguages = function() {

    var languagesdata = fs.readJsonSync(('/volumio/app/plugins/miscellanea/appearance/languages.json'), 'utf8', {throws: false});
    var defer = libQ.defer();
    var available = [];
    for (var n = 0; n < languagesdata.languages.length; n++) {
        var language = {"language":languagesdata.languages[n].name, "code":languagesdata.languages[n].code }
        available.push(language);
    }
    var languagearray = {'defaultLanguage':{'language': 'English', 'code': 'en'}, 'available':available};
    defer.resolve(languagearray);
    return defer.promise;
}


volumioAppearance.prototype.getConfigParam = function (key) {
    var self = this;
    return config.get(key);
};

volumioAppearance.prototype.showTranslation = function (data){
  var self = this;
  var fileName = '';
  totalWords = 0;
  totalTranslated = 0;
  var nsections = 1;
  if(data && data.translation_language && data.translation_language.value){
    translationLanguage = data.translation_language.value;
    var respconfig = self.commandRouter.getUIConfigOnPlugin('miscellanea', 'appearance', {});
    respconfig.then(function(configuration){
      var translations = fs.readJsonSync(('/volumio/app/i18n/strings_en.json'),  'utf8', {throws: false});
      fileName = 'strings_'+ translationLanguage;
      for(var category in translations)
      {
        var labelName = self.labelFormatting(category);
        nsections ++
        var sect = 'sections';
        var sectCon = 'sections['+ nsections +'].content'
        configuration.sections.splice(nsections,0,{
          id: 'translation_selector' + nsections,
          element: 'section',
          label: labelName,
          icon: 'fa-language',
          onSave: {type:'controller', endpoint:'miscellanea/appearance', method:'setTranslation'},
          saveButton: {
            label: self.commandRouter.getI18nString('COMMON.SAVE'),
            data: [
            ]
          },
          value:  {
            value: '0',
            label: 'Unknown'
          },
          content: [
            {
            }
          ]
        });
        for(var item in translations[category])
        {
          totalWords ++;
          var translate = self.readTranslation(category + '.' + item);
          configuration.sections[nsections].saveButton.data.push(fileName + '-' + category + '-' + item);
          self.configManager.pushUIConfigParam(configuration, sectCon, {
            id: fileName + '-' + category + '-' + item,
            element: 'input',
            type: 'text',
            label:translations[category][item],
            attributes: [
              {placeholder: translations[category][item]},
              {maxlength: 200}
            ],
            value: translate
          });
        }
      }
      self.logger.info('Total Words =', totalWords);
      self.logger.info('Total Words Translated =', totalTranslated);
      self.logger.info('Percentage translated =', (Math.trunc((totalTranslated/totalWords)*100))+'%');
      self.commandRouter.broadcastMessage('pushUiConfig', configuration);
    })
    .fail(function(e)
    {
      self.logger.info(e);
    })
  } else {
    self.logger.info('Error in receiving data');
  }
}

volumioAppearance.prototype.setTranslation = function (data){
  var self = this;
  var language = translationLanguage;
  var selectedLanguage;
  try {
    try{
      selectedLanguage = fs.readJsonSync(__dirname + '/../../../i18n/strings_' + language + '.json');
    }
    catch(err)
    {
      selectedLanguage = {};
    }
    for(var translationID in data)
    {
      if(data[translationID] !== ''){
        var idSplitted = translationID.split('-');
        if(selectedLanguage[idSplitted[1]] === undefined){
          selectedLanguage[idSplitted[1]] = {};
        }
        selectedLanguage[idSplitted[1]][idSplitted[2]] = data[translationID];
      }
    }
    fs.outputJsonSync('/data/strings_' + language + '.json', selectedLanguage, {spaces: 2});
    self.logger.info('Translation file saved');
	} catch(e) {
        self.logger.info("Error in saving the translation file");
        self.logger.error(e);
	}
}

volumioAppearance.prototype.readTranslation = function (key){
  var self = this;
  var splitted = key.split('.');
  try
  {
    var i18nStrings = fs.readJsonSync(__dirname + '/../../../i18n/strings_' + translationLanguage + '.json');
    if (i18nStrings) {
      if(splitted.length == 1){
        if(i18nStrings[key] !== undefined)
          return i18nStrings[key];
        else return ('');
      } else {
        if(i18nStrings[splitted[0]] !== undefined && i18nStrings[splitted[0]][splitted[1]] !== undefined){
            totalTranslated ++;
            return i18nStrings[splitted[0]][splitted[1]];
          }
        else return ('');
      }
    } else {
      var emptyString = '';
      return emptyString;
    }
  }
  catch(e) {
    var emptyString = '';
    return emptyString;
  }
}

volumioAppearance.prototype.labelFormatting = function (labelName){
    var label = '';
    var labelName = labelName.toLowerCase();
        if(labelName.indexOf('_') > -1)
        {
          var labelsplit = labelName.split('_');
          for(var i = 0; i < labelsplit.length; i++)
          {
            labelsplit[i] = labelsplit[i].charAt(0).toUpperCase() + labelsplit[i].slice(1);
            if(i < labelsplit.length-1){
                label = label+labelsplit[i]+' ';
            } else {
                label = label+labelsplit[i];
            }
          }
        } else {
            label = labelName.charAt(0).toUpperCase() + labelName.slice(1);
        }
    return label;
}
