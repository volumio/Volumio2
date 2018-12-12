var dotenv = require('dotenv').config({ path: __dirname + '/.env' });
var execSync = require('child_process').execSync;
var fs = require('fs-extra');
var expressInstance = require('./http/index.js');
var expressApp = expressInstance.app;
// Using port 3000 for the debug interface
expressApp.set('port', 3000);

var httpServer = expressApp.listen(expressApp.get('port'), function () {
  console.log('Express server listening on port ' + httpServer.address().port);
});

var albumart = require(__dirname + '/app/plugins/miscellanea/albumart/albumart.js');

albumart.setFolder('/data/albumart');

expressApp.get('/albumart', albumart.processExpressRequest);

expressApp.use(function (err, req, res, next) {
  /**
   * Replace with Winston logging
 **/
  console.log('An internal error occurred while serving an albumart. Details: ' + err.stack);

  /**
    * Sending back error code 500
  **/
  res.sendFile(__dirname + '/app/plugins/miscellanea/albumart/default.png');
});

var commandRouter = new (require('./app/index.js'))(httpServer);

expressApp.get('/?*', function (req, res) {
  res.redirect('/');
});

process.on('uncaughtException', (error) => {
  console.log('|||||||||||||||||||||||| WARNING: FATAL ERROR |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||');
  console.log(error);
  console.log('|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||');
  if (error.message != undefined) {
    var errorMessage = error.message;
  } else {
    var errorMessage = 'Unknown';
  }
  execSync('/usr/local/bin/node /volumio/crashreport.js "' + errorMessage + '"');
  if (process.env.EXIT_ON_EXCEPTION === "true") {
    process.exit(1);
  }
});