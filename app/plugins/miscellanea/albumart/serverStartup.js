var express = require('express');
var albumart=require(__dirname+'/albumart.js');
var app = express();

albumart.setFolder(process.argv[3]);

app.get('/:artist/:album/:resolution', albumart.processExpressRequest);
app.listen(process.argv[2]);