// Copyright 2016 the project authors as listed in the AUTHORS file.
// All rights reserved. Use of this source code is governed by the
// license that can be found in the LICENSE file.
'use strict';
const http = require('http');
const url = require('url');
const xmlbuilder = require('xmlbuilder');
const xmltojs = require('xml2js');
const stripPrefix = require('xml2js').processors.stripPrefix;
const xmlDecode = (arg) => require('html-entities').decode(arg, { level: 'xml' } );


var debug = false;

// function to build the xml required for the saop request to the DLNA server
const buildRequestXml = function (id, options) {
  // fill in the defaults
  if (!options.browseFlag) {
    options.browseFlag = 'BrowseDirectChildren';
  }

  if (!options.filter) {
    options.filter = '*';
  }

  if (!options.startIndex) {
    options.startIndex = 0;
  }

  if (!options.requestCount) {
    options.requestCount = 1000;
  }

  if (!options.sort) {
    options.sort = '';
  }

  // build the required xml
  return xmlbuilder.create('s:Envelope', { version: '1.0', encoding: 'utf-8' })
    .att('s:encodingStyle', 'http://schemas.xmlsoap.org/soap/encoding/')
    .att('xmlns:s', 'http://schemas.xmlsoap.org/soap/envelope/')
    .ele('s:Body')
    .ele('u:Browse', { 'xmlns:u': 'urn:schemas-upnp-org:service:ContentDirectory:1'})
    .ele('ObjectID', id)
    .up().ele('BrowseFlag', options.browseFlag)
    .up().ele('Filter', options.filter)
    .up().ele('StartingIndex', options.startIndex)
    .up().ele('RequestedCount', options.requestCount)
    .up().ele('SortCriteria', options.sort)
    .doc().end({ pretty: false, indent: '', allowEmpty: true });
};

// function that allow you to browse a DLNA server
var browseServer = function (id, controlUrl, options, callback) {
  var parser = new xmltojs.Parser({explicitCharKey: true});
  const requestUrl = url.parse(controlUrl);

  var requestXml;
  try {
    requestXml = buildRequestXml(id, options);
  } catch (err) {
    // something must have been wrong with the options specified
    callback(err);
    return;
  }

  const httpOptions = {
    protocol: 'http:',
    host: requestUrl.hostname,
    port: requestUrl.port,
    path: requestUrl.path,
    method: 'POST',
    headers: { 'SOAPACTION': '"urn:schemas-upnp-org:service:ContentDirectory:1#Browse"',
      'Content-Length': Buffer.byteLength(requestXml, 'utf8'),
      'Content-Type': 'text/xml',
      'User-Agent': 'Android UPnP/1.0 DLNADOC/1.50'}
  };

  const req = http.request(httpOptions, function (response) {
    var data = '';
    response.on('data', function (newData) {
      data = data + newData;
    });

    response.on('err', function (err) {
      log(callback(err));
    });

    response.on('end', function () {
      var browseResult = new Object();
      xmltojs.parseString(xmlDecode(data), {tagNameProcessors: [stripPrefix], explicitArray: true, explicitCharkey: true}, function (err, result) {
        if (err) {
          log(err);
          // bailout on error
          callback(err);
          return;
        }

        // validate result included the expected entries
        if ((result != undefined) &&
            (result['Envelope']) &&
            (result['Envelope']['Body']) &&
            (result['Envelope']['Body'][0]) &&
            (result['Envelope']['Body'][0]['BrowseResponse']) &&
            (result['Envelope']['Body'][0]['BrowseResponse'][0]) &&
            (result['Envelope']['Body'][0]['BrowseResponse'][0]['Result']) &&
            (result['Envelope']['Body'][0]['BrowseResponse'][0]['Result'][0])
        ) {
          var listResult = result['Envelope']['Body'][0]['BrowseResponse'][0]['Result'][0];
          // this likely needs to be generalized to acount for the arrays. I don't have
          // a server that I've seen return more than one entry in the array, but I assume
          // the standard allows for that.  Will update when I have a server that I can
          // test that with

          if (listResult['DIDL-Lite']) {
            const content = listResult['DIDL-Lite'][0];
            if (content.container) {
              browseResult.container = new Array();
              for (let i = 0; i < content.container.length; i++) {
                browseResult.container[i] = parseContainer(content.container[i]);
              }
            }

            if (content.item) {
              browseResult.item = new Array();
              for (let i = 0; i < content.item.length; i++) {
                browseResult.item[i] = parseItem(content.item[i]);
              }
            }
            callback(undefined, browseResult);
          } else {
            callback(new Error('Did not get expected listResult from server:' + result));
          }
        } else {
          if (result != undefined) {
            callback(new Error('Did not get expected response from server:' + JSON.stringify(result)));
          } else {
            callback(new Error('Did not get any response from server:'));
          }
        }
      });
    });
  });
  req.on('error', function (err) {
    callback(err);
    req.abort();
  });
  req.write(requestXml);
  req.end();
};

function parseContainer (metadata) {
  var container = {
    'class': '',
    'title': '',
    'id': '',
    'parentId': '',
    'children': ''
  };
  try {
    if (metadata) {
      if (metadata.title) {
        container.title = metadata.title[0]['_'];
      }
      if (metadata.artist) {
        container.artist = metadata.artist[0]['_'];
      }
      if (metadata.class) {
        container.class = metadata.class[0]['_'];
      }
      if (metadata['$']) {
        if (metadata['$'].id) {
          container.id = metadata['$'].id;
        }
        if (metadata['$'].parentID) {
          container.parentId = metadata['$'].parentID;
        }
        if (metadata['$'].childCount) {
          container.children = metadata['$'].childCount;
        }
      }
    }
  } catch (e) {
    log(e);
  }
  return container;
}

function parseItem (metadata) {
  var item = {
    'class': '',
    'id': '',
    'title': '',
    'artist': '',
    'album': '',
    'parentId': '',
    'duration': '',
    'source': '',
    'image': ''};
  if (metadata) {
    if (metadata.class) {
      item.class = metadata.class[0]['_'];
    }
    if (metadata.title) {
      item.title = metadata.title[0]['_'];
    }
    if (metadata.artist) {
      item.artist = metadata.artist[0]['_'];
    }
    if (metadata.album) {
      item.album = metadata.album[0]['_'];
    }
    if (metadata.res) {
      item.source = metadata.res[0]['_'];
      if (metadata.res[0]['$'].duration) {
        var dur = metadata.res[0]['$'].duration;
        var time = dur.split(':');
        item.duration = parseInt(parseFloat(time[0]) * 3600 + parseFloat(time[1]) * 60 + parseFloat(time[2]));
      }
    }
    if (metadata.albumArtURI) {
      item.image = metadata.albumArtURI[0]['_'];
    }
    if (metadata['$']) {
      if (metadata['$'].id) {
        item.id = metadata['$'].id;
      }
      if (metadata['$'].parentID) {
        item.parentId = metadata['$'].parentID;
      }
    }
  }
  return item;
}

function log (message) {
  if (debug) {
    console.log(message);
  }
}

module.exports = browseServer;
