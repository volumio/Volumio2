// Copyright 2016 the project authors as listed in the AUTHORS file.
// All rights reserved. Use of this source code is governed by the
// license that can be found in the LICENSE file.
"use strict";
const http = require('http');
const url = require('url');
const xmlbuilder = require('xmlbuilder');
const xmltojs = require('xml2js');

// function to build the xml required for the saop request to the DLNA server
const buildRequestXml = function(id, options) {
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
        .doc().end({ pretty: true, indent: '  '});
}

// function that allow you to browse a DLNA server
var browseServer = function(id, controlUrl, options, callback) {
  const requestUrl = url.parse(controlUrl);

  var requestXml;
  try {
    requestXml = buildRequestXml(id, options);
  } catch(err) {
    // something must have been wrong with the options specified
    callback(err);
    return;
  }

  const httpOptions =  {
    protocol: "http:",
    host: requestUrl.hostname,
    port: requestUrl.port,
    path: requestUrl.pathname,
    method: 'POST',
    headers: { 'SOAPACTION': '"urn:schemas-upnp-org:service:ContentDirectory:1#Browse"',
                "Content-Length": Buffer.byteLength(requestXml, 'utf8'),
                "Content-Type": "text/xml"}
  }

  const req = http.request(httpOptions, function(response) {
    var data = '';
    console.log(response.headers);
    response.on('data', function(newData) {
      data = data + newData;
    });

    response.on('err', function(err) {
      console.log(callback(err));
    });

    response.on('end', function() {
      var browseResult = new Object;
      xmltojs.parseString(data, function(err, result) {
        if (err) {
          // bailout on error
          callback(err);
          return;
        }

        // validate result included the expected entries
        if (result &&
            (result['s:Envelope']) &&
            (result['s:Envelope']['s:Body']) &&
            (result['s:Envelope']['s:Body'][0]) &&
            (result['s:Envelope']['s:Body'][0]['u:BrowseResponse']) &&
            (result['s:Envelope']['s:Body'][0]['u:BrowseResponse'][0]) &&
            (result['s:Envelope']['s:Body'][0]['u:BrowseResponse'][0]['Result']) &&
            (result['s:Envelope']['s:Body'][0]['u:BrowseResponse'][0]['Result'][0])
         ) {
          // this likely needs to be generalized to acount for the arrays. I don't have
          // a server that I've seen return more than one entry in the array, but I assume
          // the standard allows for that.  Will update when I have a server that I can
          // test that with
          xmltojs.parseString(result['s:Envelope']['s:Body'][0]['u:BrowseResponse'][0]['Result'][0], function(err, listResult) {
            if (err) {
              // bailout on error
              callback(err);
              return;
            }
            if (listResult['DIDL-Lite']) {
              const content = listResult['DIDL-Lite'];
              if (content.container) {
                browseResult.container = new Array();
                for (let i = 0; i < content.container.length; i++) {
                  browseResult.container[i] = { 'parentID': content.container[i].$.parentID,
                                                'id': content.container[i].$.id,
                                                'childCount': content.container[i].$.childCount,
                                                'searchable': content.container[i].$.searchable,
                                                'title': content.container[i]['dc:title'][0]
                                              }
                }
              }

              if (content.item) {
                browseResult.item = new Array();
                for (let i = 0; i < content.item.length; i++) {
                  browseResult.item[i] = content.item[i];
                }
              }
              callback(undefined, browseResult);
            } else {
              callback(new Error('Did not get expected listResult from server:' + result));
              return;
            }
          });
        } else {
          callback(new Error('Did not get expected response from server:' + JSON.stringify(result)));
          return;
        }
      });
    });
  });
  req.on('error', function(err) {
    callback(err);
    req.abort();
  });
  req.write(requestXml);
  req.end();
};

module.exports = browseServer;
