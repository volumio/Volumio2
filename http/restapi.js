var express = require('express');
var libQ = require('kew');
var app = require('./index.js')
var bodyParser = require('body-parser');
var ip = require('ip');
var api = express.Router();
var ifconfig = require('wireless-tools/ifconfig');

function apiInterface(server, commandRouter) {

}

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
};

// All routes will be routed trough /api and encoded in json
api.use(allowCrossDomain);
api.use('/api', api);
api.use(bodyParser.urlencoded({ extended: true }));
api.use(bodyParser.json());
// Routes for Volumio API


//Welcome Message
api.get('/', function(req, res) {
    res.json({ message: 'Welcome to Volumio API' });
});

//Get hosts IP
api.get('/host', function(req, res) {
    var self =this;

        ifconfig.status('wlan0', function(err, status) {
            if (status != undefined) {
                if (status.ipv4_address != undefined) {
                    self.host = status.ipv4_address;
                } else self.host = ip.address();
            } }); self.host = ip.address();
        res.json({ host: 'http://'+self.host});
});

api.get('/host', function(req, res) {
    var self =this;

    ifconfig.status('wlan0', function(err, status) {
        if (status != undefined) {
            if (status.ipv4_address != undefined) {
                self.host = status.ipv4_address;
            } else self.host = ip.address();
        } }); self.host = ip.address();
    res.json({ host: 'http://'+self.host});
});


module.exports = api;
