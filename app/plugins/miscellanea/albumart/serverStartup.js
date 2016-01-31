'use strict';

var express = require('express');
var albumart = require(__dirname + '/albumart.js');
var app = express();

albumart.setFolder(process.argv[3]);

app.get('/albumart', albumart.processExpressRequest);

app.use(function (err, req, res, next) {
	/**
	 * Replace with Winston logging
	 **/
	console.log('An internal error occurred while serving an albumart. Details: ' + err.stack);

	/**
	 * Sending back error code 500
	 **/
	res.sendFile(__dirname + '/default.png');
});

app.listen(process.argv[2]);
