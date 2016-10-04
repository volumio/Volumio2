var express = require('express');
var compression = require('compression')
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var routes = require('./routes.js');
var restapi = require('./restapi.js');
var busboy = require('connect-busboy');
var path = require('path');
var fs = require('fs-extra');
var io=require('socket.io-client');


var app = express();
var dev = express();
var plugin = express();
var background = express();

var plugindir = '/tmp/plugins';
var backgrounddir = '/data/backgrounds';

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


// view engine setup
dev.set('views', path.join(__dirname, 'dev/views'));
dev.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
dev.use(bodyParser.json());
dev.use(bodyParser.urlencoded({ extended: false }));
dev.use(cookieParser());
dev.use(express.static(path.join(__dirname, 'dev')));

dev.use('/', routes);

app.use(compression())
app.use(express.static(path.join(__dirname, 'www')));
app.use(busboy());
app.use(allowCrossDomain);

app.use('/dev', dev);
app.use('/api', restapi);
app.use('/plugin-serve', plugin);


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



app.route('/plugin-upload')
    .post(function (req, res, next) {

        var fstream;
        req.pipe(req.busboy);
        req.busboy.on('file', function (fieldname, file, filename) {
            console.log("Uploading: " + filename);

            try {
                fs.ensureDirSync(plugindir)
            } catch (err) {
                console.log('Cannot Create Plugin DIR ')
            }
            //Path where image will be uploaded
            fstream = fs.createWriteStream('/tmp/plugins/' + filename);
            file.pipe(fstream);
            fstream.on('close', function () {
                console.log("Upload Finished of " + filename);
                var socket= io.connect('http://localhost:3000');
                var pluginurl= 'http://127.0.0.1:3000/plugin-serve/'+filename.replace(/'|\\/g, '\\$&');;
                socket.emit('installPlugin', { url:pluginurl});
                res.status(201);
                //res.redirect('/');
            });
        });
    });

app.route('/backgrounds-upload')
    .post(function (req, res, next) {

        var fstream;
        req.pipe(req.busboy);
        req.busboy.on('file', function (fieldname, file, filename) {
            console.log("Uploading: " + filename);

            try {
                fs.ensureDirSync(backgrounddir)
            } catch (err) {
                console.log('Cannot Create Background DIR ')
            }
            var properfilename = filename.replace(/ /g,'-');
            fstream = fs.createWriteStream('/data/backgrounds/' + properfilename);
            file.pipe(fstream);
            fstream.on('close', function () {
                console.log("Upload Finished of " + properfilename);
                var socket= io.connect('http://localhost:3000');
                socket.emit('regenerateThumbnails', '');
                res.status(201);
                //res.redirect('/');
            });
        });
    });

plugin.use(express.static(path.join(plugindir)));
background.use(express.static(path.join(backgrounddir)));
app.use('/backgrounds', express.static('/data/backgrounds/'));
app.use('/cover-art', express.static('/var/lib/mpd/music/'));


module.exports.app = app;
module.exports.dev = dev;
