'use strict';

var fs=require('fs-extra');
var config= new (require('v-conf'))();
var libQ = require('kew');
var path = require('path');
var Jimp = require('jimp');
var unirest = require('unirest');

var translationLanguage = '';
var totalWords = 0;
var totalTranslated = 0;
var pluginsTranslationPath = [];

// Define the translationManager class
module.exports = translationManager;

function translationManager(context) {
    var self = this;

    // Save a reference to the parent commandRouter
    self.context=context;
    self.commandRouter = self.context.coreCommand;
    self.configManager = self.context.configManager;

    self.logger=self.context.logger;
}

translationManager.prototype.getConfigurationFiles = function()
{
    var self = this;

    return ['config.json'];
};

translationManager.prototype.onVolumioStart = function() {
    var self = this;
    //Perform startup tasks here
    self.configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');
    config.loadFile(self.configFile);

    return libQ.resolve();
};

translationManager.prototype.onStart = function() {
    var self = this;
    return libQ.resolve();
};

translationManager.prototype.onStop = function() {
    var self = this;
    //Perform startup tasks here
};

translationManager.prototype.onRestart = function() {
    var self = this;
    //Perform startup tasks here
};

translationManager.prototype.onInstall = function()
{
    var self = this;
    //Perform your installation tasks here
};

translationManager.prototype.onUninstall = function()
{
    var self = this;
    //Perform your installation tasks here
};


translationManager.prototype.setUIConfig = function(data)
{
    var self = this;

    var uiconf=fs.readJsonSync(__dirname+'/UIConfig.json');

};

translationManager.prototype.getConf = function()
{
    var self = this;
    var conf = [];
    try {
        var conf = JSON.parse(fs.readJsonSync(self.configFile));
    } catch (e) {}

    return  conf;
};

//Optional functions exposed for making development easier and more clear
translationManager.prototype.getSystemConf = function(pluginName,varName)
{
    var self = this;
    //Perform your installation tasks here
};

translationManager.prototype.setSystemConf = function(pluginName,varName)
{
    var self = this;
    //Perform your installation tasks here
};

translationManager.prototype.getAdditionalConf = function()
{
    var self = this;
    //Perform your installation tasks here
};

translationManager.prototype.setAdditionalConf = function()
{
    var self = this;
    //Perform your installation tasks here
};

translationManager.prototype.getUIConfig = function () {
    var self = this;

    var defer=libQ.defer();
    var lang_code = this.commandRouter.sharedVars.get('language_code');
    self.commandRouter.i18nJson(__dirname+'/../../../i18n/strings_' + lang_code + '.json',
        __dirname+'/../../../i18n/strings_en.json',
        __dirname + '/UIConfig.json')
        .then(function(uiconf)
        {
            defer.resolve(uiconf);
        })
        .fail(function()
        {
            defer.reject(new Error());
        })
    return defer.promise;
};


translationManager.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

translationManager.prototype.getAvailableLanguages = function() {

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

translationManager.prototype.getConfigParam = function (key) {
    var self = this;
    return config.get(key);
};

translationManager.prototype.getAllLanguages = function (){
  var defer = libQ.defer();
  var allLanguagesData = fs.readJsonSync(('/volumio/app/plugins/miscellanea/translation_manager/allLanguages.json'),  'utf8', {throws: false});
  defer.resolve(allLanguagesData);
  return defer.promise;
}

translationManager.prototype.showTranslation = function (data){
  var self = this;
  var defer = libQ.defer();
  pluginsTranslationPath = [];
  self.searchPluginTranslations('/myvolumio/plugins');
  self.searchPluginTranslations('/data/plugins');
  var fileName = '';
  totalWords = 0;
  totalTranslated = 0;
  var nsections = 0;
  if(data && data.translation_language && data.translation_language.value){
    translationLanguage = data.translation_language.value;
    var respconfig = self.commandRouter.getUIConfigOnPlugin('miscellanea', 'translation_manager', {});
    respconfig.then(function(configuration){
      var translations = fs.readJsonSync(('/volumio/app/i18n/strings_en.json'),  'utf8', {throws: false});
      fileName = 'strings_'+ translationLanguage;
      self.getTranslation('strings','strings_'+ translationLanguage + '.json')
      .then((i18nStrings)=>{
        for(var category in translations){
          var labelName = self.labelFormatting(category);
          nsections ++;
          var sectCon = 'sections['+ nsections +'].content';
          configuration.sections.splice(nsections,0,{
            id: 'translation_selector' + nsections,
            element: 'section',
            label: labelName,
            icon: 'fa-language',
            onSave: {type:'controller', endpoint:'miscellanea/translation_manager', method:'setTranslation'},
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
          for(var item in translations[category]){
            if(translations[category][item] !== ""){
              totalWords ++;
              var translate;
              if(i18nStrings === ''){
                translate = self.readTranslation(category + '.' + item, 'strings',"");
              } else {
                if(i18nStrings[category] !== undefined && i18nStrings[category][item] !== undefined){
                  totalTranslated ++;
                  translate = i18nStrings[category][item];
                } else {
                  translate = '';
                }
              }
              configuration.sections[nsections].saveButton.data.push(fileName + '-' + category + '-' + item);
              self.configManager.pushUIConfigParam(configuration, sectCon, {
                id: fileName + '-' + category + '-' + item,
                element: 'input',
                type: 'text',
                label:translations[category][item],
                style: {
                  'width':'100%',
                  'text-align': 'left'
                },
                attributes: [
                  {placeholder: translations[category][item]},
                  {maxlength: 200}
                ],
                value: translate
              });
            }
          }
        }
        self.getTranslation('locale','locale-'+ translationLanguage + '.json')
        .then((i18nLocale)=>{
          translations = fs.readJsonSync(('/volumio/http/www/app/i18n/locale-en.json'),  'utf8', {throws: false});
          fileName = 'locale-'+ translationLanguage;
          for(var category in translations)
          {
            var labelName = self.labelFormatting(category);
            nsections ++;
            var sectCon = 'sections['+ nsections +'].content';
            configuration.sections.splice(nsections,0,{
              id: 'translation_selector' + nsections,
              element: 'section',
              label: labelName,
              icon: 'fa-language',
              onSave: {type:'controller', endpoint:'miscellanea/translation_manager', method:'setTranslation'},
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
              if(translations[category][item] !== ""){
                totalWords ++;
                var translate;
                if(i18nLocale === ''){
                  translate = self.readTranslation(category + '.' + item, 'locale',"");
                } else {
                  if(i18nLocale[category] !== undefined && i18nLocale[category][item] !== undefined){
                    totalTranslated ++;
                    translate = i18nLocale[category][item];
                  } else {
                    translate = '';
                  }
                }
                configuration.sections[nsections].saveButton.data.push(fileName + '-' + category + '-' + item);
                self.configManager.pushUIConfigParam(configuration, sectCon, {
                  id: fileName + '-' + category + '-' + item,
                  element: 'input',
                  type: 'text',
                  label:translations[category][item],
                  style: {
                    'width':'100%',
                    'text-align': 'left'
                  },
                  attributes: [
                    {placeholder: translations[category][item]}
                  ],
                  value: translate
                });
              }
            }
          }
          if(pluginsTranslationPath.length > 0){
            var translations;
            var promises = pluginsTranslationPath.map(path =>{
              var pluginName;
              pluginName = path.replace('/','');
              pluginName = pluginName.replace(/\//g, '-');
              return self.getTranslation('plugin',pluginName+'-strings_'+ translationLanguage + '.json')
              .then((i18nPlugin)=>{
                
                translations = fs.readJsonSync((path+'/strings_en.json'),  'utf8', {throws: false});
                fileName = path;
                for(var category in translations){
                  var labelName = self.labelFormatting(category);
                  nsections ++;
                  var sectCon = 'sections['+ nsections +'].content';
                  configuration.sections.splice(nsections,0,{
                    id: 'translation_selector' + nsections,
                    element: 'section',
                    label: labelName,
                    icon: 'fa-language',
                    onSave: {type:'controller', endpoint:'miscellanea/translation_manager', method:'setTranslation'},
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
                  for(var item in translations[category]){
                    if(translations[category][item] !== ""){
                      var translate;
                      if(i18nPlugin === ''){
                        translate = self.readTranslation(category + '.' + item, 'plugin', path);
                      } else {
                        if(i18nPlugin[category] !== undefined && i18nPlugin[category][item] !== undefined){
                          translate = i18nPlugin[category][item];
                        } else {
                          translate = '';
                        }
                      }
                      configuration.sections[nsections].saveButton.data.push(fileName + '-' + category + '-' + item);
                      self.configManager.pushUIConfigParam(configuration, sectCon, {
                        id: fileName + '-' + category + '-' + item,
                        element: 'input',
                        type: 'text',
                        label:translations[category][item],
                        style: {
                          'width':'100%',
                          'text-align': 'left'
                        },
                        attributes: [
                          {placeholder: translations[category][item]}
                        ],
                        value: translate
                      });
                    }
                  }
                }
                return (i18nPlugin);
              }); 
            });
           Promise.all(promises).then((conf)=>
            {
              self.logger.info('Total Words =', totalWords);
              self.logger.info('Total Words Translated =', totalTranslated);
              self.logger.info('Percentage translated =', (Math.trunc((totalTranslated/totalWords)*100))+'%');
              self.commandRouter.broadcastMessage('pushUiConfig', configuration);
              defer.resolve(Math.trunc((totalTranslated/totalWords)*100)+'%');
              
            });
          } else {
            self.logger.info('Total Words =', totalWords);
            self.logger.info('Total Words Translated =', totalTranslated);
            self.logger.info('Percentage translated =', (Math.trunc((totalTranslated/totalWords)*100))+'%');
            self.commandRouter.broadcastMessage('pushUiConfig', configuration);
            defer.resolve(Math.trunc((totalTranslated/totalWords)*100)+'%');
          }
        })
      })
    })
    .fail(function(e)
    {
      self.logger.info(e);
      defer.resolve(e);
    })
  } else {
    self.logger.info('Error in receiving data');
  }
  return(defer.promise);
}

translationManager.prototype.setTranslation = function (data){
  var self = this;
  var language = translationLanguage;
  var selectedLanguage;
  var pluginPath;
  var pluginName;
  if(Object.keys(data)[0].includes('strings_')){
    var file = 'strings';
  } else if(Object.keys(data)[0].includes('locale-')){
    var file = 'locale';
  } else {
    var file = 'plugin';
    pluginPath = Object.keys(data)[0];
    var pluginPathSplit = pluginPath.split('i18n');
    for(var path in pluginsTranslationPath){
      if(pluginsTranslationPath[path].includes(pluginPathSplit[0])){
        pluginPath = pluginsTranslationPath[path];
      }
    }
  }
  try {
    if(file === 'strings'){
      try {
        selectedLanguage = fs.readJsonSync(__dirname + '/../../../i18n/strings_' + language + '.json');
      }
      catch(err){
        selectedLanguage = {};
      }
      for(var translationID in data){
        if(data[translationID] !== ''){
          var idSplitted = translationID.split('-');
          if(selectedLanguage[idSplitted[1]] === undefined){
            selectedLanguage[idSplitted[1]] = {};
          }
          selectedLanguage[idSplitted[1]][idSplitted[2]] = data[translationID];
        }
      }
    } else if (file === 'locale'){
        try {
          selectedLanguage = fs.readJsonSync('volumio/http/www/app/i18n/locale-' + language + '.json');
        }
        catch(err){
          selectedLanguage = {};
        }
        for(var translationID in data){
          if(data[translationID] !== ''){
            var idSplitted = translationID.split('-');
            if(selectedLanguage[idSplitted[2]] === undefined){
              selectedLanguage[idSplitted[2]] = {};
          }
          selectedLanguage[idSplitted[2]][idSplitted[3]] = data[translationID];
        }
      }
    }else if (file === 'plugin'){
      try {
        selectedLanguage = fs.readJsonSync(pluginPath+'/strings_' + language + '.json');
      }
      catch(err){
        selectedLanguage = {};
      }
      for(var translationID in data){
        var idSplitted = translationID.split('-');
        pluginName = idSplitted[0].replace('/','');
        pluginName = pluginName.replace(/\//g, '-');
        if(data[translationID] !== ''){
          if(selectedLanguage[idSplitted[1]] === undefined){
            selectedLanguage[idSplitted[1]] = {};
          }
          selectedLanguage[idSplitted[1]][idSplitted[2]] = data[translationID];
        }
      }
    }
    if(file === 'strings'){
      fs.outputJsonSync('/data/custom_translation/strings_' + language + '.json', selectedLanguage, {spaces: 2});
      unirest.post('http://192.168.1.204:8000/uploadTranslation')
      .headers({'Content-Type': 'multipart/form-data'})
      .attach('file', '/data/custom_translation/strings_' + language + '.json')
      .end(function (response) {
        if(response.body){
          self.logger.info(response.body);
          self.logger.info('Translation file saved');
          self.showPercentage();
        }else {
          self.logger.error('Error in saving the translation file: server body unavailable');
        }
      });
    } else if (file === 'locale'){
      fs.outputJsonSync('/data/custom_translation/locale-' + language + '.json', selectedLanguage, {spaces: 2});
      unirest.post('http://192.168.1.204:8000/uploadTranslation')
      .headers({'Content-Type': 'multipart/form-data'})
      .attach('file', '/data/custom_translation/locale-' + language + '.json') 
      .end(function (response) {
        if(response.body){
          self.logger.info(response.body);
          self.logger.info('Translation file saved');
          self.showPercentage();
        }else {
          self.logger.error('Error in saving the translation file: server body unavailable');
        }
      });
    } else if (file === 'plugin'){
      fs.outputJsonSync('/data/custom_translation/'+pluginName+'-strings_' + language + '.json', selectedLanguage, {spaces: 2});
      unirest.post('http://192.168.1.204:8000/uploadTranslation')
      .headers({'Content-Type': 'multipart/form-data'})
      .attach('file', '/data/custom_translation/'+pluginName+'-strings_' + language + '.json') 
      .end(function (response) {
        if(response.body){
          self.logger.info('Translation file saved');
          self.logger.info(response.body);
          self.showPercentage();
        } else {
          self.logger.error('Error in saving the translation file: server body unavailable');
        }
      });
    }

	} catch(e) {
      self.logger.info('Error in saving the translation file');
      self.logger.error(e);
	}
}

translationManager.prototype.readTranslation = function (key, location, pluginPath){
  var self = this;
  var splitted = key.split('.');
  try {
    if(location === 'strings'){
      var i18nStrings = fs.readJsonSync(__dirname + '/../../../i18n/strings_' + translationLanguage + '.json');
    } else if(location === 'locale'){
      var i18nStrings = fs.readJsonSync('/volumio/http/www/app/i18n/locale-' + translationLanguage + '.json');
    } else if(location === 'plugin'){
    var i18nStrings = fs.readJsonSync(pluginPath+'/strings_' + translationLanguage + '.json');
    }
    if (i18nStrings !== '') {
      if(splitted.length == 1){
        if(i18nStrings[key] !== undefined)
          return i18nStrings[key];
        else return ('');
      } else {
        if(i18nStrings[splitted[0]] !== undefined && i18nStrings[splitted[0]][splitted[1]] !== undefined){
          if(location !== 'plugin'){
            totalTranslated ++;
          }
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

translationManager.prototype.labelFormatting = function (labelName){
  var label = '';
  var labelName = labelName.toLowerCase();
  if(labelName.indexOf('_') > -1){
    var labelsplit = labelName.split('_');
    for(var i = 0; i < labelsplit.length; i++){
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

translationManager.prototype.searchPluginTranslations = function (path){
  var self = this;
  try {
    fs.readdirSync(path).forEach(file => {
      if(file.indexOf('.') === -1){
        if(file.indexOf('i18n')>-1){
          pluginsTranslationPath.push(path+'/'+file);
        }
        else self.searchPluginTranslations(path+'/'+file);
      }
    });
  }catch (e){
    return false;
  }
}

translationManager.prototype.getTranslation = function (fileType,fileName)
{
  var self = this;
  var defer = libQ.defer();
  try {
    var response = fs.readJsonSync(('/data/custom_translation/'+fileName),  'utf8', {throws: false});
    defer.resolve(response);
  } catch (e){
    self.logger.info(fileType, 'Translation file not found');
    defer.resolve('');
  }
  return defer.promise;
}

translationManager.prototype.showPercentage = function (){
  let self = this;
  totalWords = 0;
  totalTranslated = 0 ;
  var i18nStrings;
  try{
    var stringsDefault = fs.readJsonSync(('/volumio/app/i18n/strings_en.json'),  'utf8', {throws: false});
    i18nStrings = fs.readJsonSync(__dirname + '/../../../i18n/strings_' + translationLanguage + '.json');
    self.getTranslation('strings','strings_'+ translationLanguage + '.json')
    .then((stringsCustom)=>{
      for(var category in stringsDefault){
        for(var item in stringsDefault[category]){
          if(stringsDefault[category][item] !== ''){
            totalWords ++;
            if(stringsCustom !== ''){
              if(stringsCustom[category] !== undefined && stringsCustom[category][item] !== undefined){
                totalTranslated ++;
              } 
            }  else {
              if(i18nStrings[category] !== undefined && i18nStrings[category][item] !== undefined){
                totalTranslated ++;
              }
            }
          }
        }
      }
      var localeDefault = fs.readJsonSync(('/volumio/http/www/app/i18n/locale-en.json'),  'utf8', {throws: false});
      i18nStrings = fs.readJsonSync('/volumio/http/www/app/i18n/locale-' + translationLanguage + '.json');
      self.getTranslation('locale','locale-'+ translationLanguage + '.json')
      .then((localeCustom)=>{
        for(var category in localeDefault){
          for(var item in localeDefault[category]){
            if(localeDefault[category][item] !== ''){
              totalWords ++;
              if(localeCustom !== ''){
                if(localeCustom[category] !== undefined && localeCustom[category][item] !== undefined){
                  totalTranslated ++;
                }
              } else { 
                if(i18nStrings[category] !== undefined && i18nStrings[category][item] !== undefined){
                  totalTranslated ++;
                }
              }
            }
          }
        }
        self.commandRouter.broadcastMessage('pushPercentage', Math.trunc((totalTranslated/totalWords)*100)+'%');
      });
    });
  } catch (e){
      self.logger.error('Failed to send percentage translated');
  }
}