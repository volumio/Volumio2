var express = require('express');
var albumart=require(__dirname+'/albumart.js');
var app = express();
 
app.get('/:artist/:album/:resolution', albumart.processExpressRequest);
app.listen(3000);