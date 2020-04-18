'use strict';

var fs = require('fs-extra');
var languageFolder = './app/i18n/';
var languageList = fs.readJsonSync('./app/plugins/miscellanea/appearance/languages.json');
/* eslint-disable */
describe('language files', function () {
  it('Checks language files are proper json files', function (done) {
    for (var i = 0; i < languageList.languages.length; i++) {
      var languageFile = languageFolder + 'strings_' + languageList.languages[i].code + '.json';
      try {
        var json = fs.readJsonSync(languageFile, { throws: true });
      } catch (e) {
        console.log('Error in ' + languageList.languages[i].name + ' language file');
        throw e;
      }
      if (i === languageList.languages.length - 1) {
        done();
      }
    }
  });
});
