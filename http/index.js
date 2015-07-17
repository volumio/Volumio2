var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes.js');

var app = express();
var dev = express();

// view engine setup
dev.set('views', path.join(__dirname, 'dev/views'));
dev.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
dev.use(logger('dev'));
dev.use(bodyParser.json());
dev.use(bodyParser.urlencoded({ extended: false }));
dev.use(cookieParser());
dev.use(express.static(path.join(__dirname, 'dev')));

dev.use('/', routes);


app.use(express.static(path.join(__dirname, 'www')));
app.use('/dev', dev);

// catch 404 and forward to error handler
dev.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (dev.get('env') === 'development') {
    dev.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
dev.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});
module.exports.app = app;
module.exports.dev = dev;