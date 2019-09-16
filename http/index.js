var express = require('express');
var compression = require('compression')
var path = require('path');
var bodyParser = require('body-parser');
var routes = require('./routes.js');
var restapi = require('./restapi.js');
var busboy = require('connect-busboy');
var path = require('path');
var fs = require('fs-extra');
var io=require('socket.io-client');
var libUUID = require('node-uuid');

var app = express();
var dev = express();
var plugin = express();
var background = express();

var plugindir = '/tmp/plugins';
var backgrounddir = '/data/backgrounds';
var volumio3UIFlagFile = '/data/volumio3ui';

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.sendStatus(200);
    }
    else {
        next();
    }
};


// view engine setup
dev.set('views', path.join(__dirname, 'dev/views'));
dev.set('view engine', 'ejs');

dev.use(bodyParser.json());
dev.use(bodyParser.urlencoded({ extended: false }));
dev.use(express.static(path.join(__dirname, 'dev')));

dev.use('/', routes);

app.use(compression())

// Serving Volumio3 UI
// Checking if we use Volumio3 UI
if (fs.existsSync(volumio3UIFlagFile)) {
    process.env.VOLUMIO_3_UI = 'true';
}

if (process.env.VOLUMIO_3_UI === 'true') {
    app.use(express.static(path.join(__dirname, 'www3')));
} else {
    app.use(express.static(path.join(__dirname, 'www')));
}

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
            var uniquename = libUUID.v4() + '.zip';
            console.log("Created safe filename as '"+uniquename+"'");

            try {
                fs.ensureDirSync(plugindir)
            } catch (err) {
                console.log('Cannot Create Plugin Dir ' + plugindir)
            }
            //Path where image will be uploaded
            fstream = fs.createWriteStream(plugindir + '/' + uniquename);
            file.pipe(fstream);
            fstream.on('close', function () {
                console.log("Upload Finished of " + filename + " as " + uniquename);
                var socket= io.connect('http://localhost:3000');
                var pluginurl= 'http://127.0.0.1:3000/plugin-serve/' + uniquename;
                socket.emit('installPlugin', { url:pluginurl});
                res.sendStatus(200);
                //res.redirect('/');
            });
        });
    });
// TODO CHECK INCOMING SIZE LESS THAN 500KB
app.route('/backgrounds-upload')
    .post(function (req, res, next) {

        var fstream;
        req.pipe(req.busboy);
        req.busboy.on('file', function (fieldname, file, filename) {
            var allowedExtensions = ['jpg', 'jpeg', 'png'];
            var extension = filename.split('.').pop().toLowerCase();

            if (allowedExtensions.indexOf(extension) > -1) {
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
            } else {
                console.log("Background file format not allowed " + filename);
            }


        });
    });
// TODO CHECK INCOMING SIZE LESS THAN 500KB
app.route('/albumart-upload')
    .post(function (req, res, next) {
        var artist;
        var album;
        var filePath;
        var fstream;

        req.pipe(req.busboy);
        req.busboy.on('field', (fieldName, value) => {
            if (fieldName === 'artist' && value !== undefined) {
                this.artist = value;
            }
            if (fieldName === 'album' && value !== undefined) {
                this.album = value;
            }
            if (fieldName === 'filePath' && value !== undefined) {
                this.filePath = value;
            }
        });

        req.busboy.on('file', (fieldname, file, filename) => {
            console.log("Uploading albumart: " + filename);
            extension = filename.split('.').pop().toLowerCase();
            var allowedExtensions = ['jpg', 'jpeg', 'png'];
            if (allowedExtensions.indexOf(extension) > -1) {
                filename = 'cover' + '.' + extension;
                var albumartDir = '/data/albumart';
                if (this.filePath !== undefined) {
                    var customAlbumartPath = path.join(albumartDir, 'personal', 'path', this.filePath);
                } else if (this.artist !== undefined && this.album !== undefined) {
                    var customAlbumartPath = path.join(albumartDir, 'personal', 'album', this.artist, this.album);
                } else if (this.artist !== undefined) {
                    var customAlbumartPath = path.join(albumartDir, 'personal', 'artist', this.artist);
                } else {
                    console.log('Error: no path, artist or album specified');
                    return res.status(500);
                }

                try {
                    fs.ensureDirSync(customAlbumartPath);
                } catch (err) {
                    console.log('Cannot Create Personal Albumart DIR : ' + err);
                    return res.status(500);
                }

                try {
                    fs.emptyDirSync(customAlbumartPath);
                } catch(e) {
                    console.log('Could not clear personal albumart folder: ' + e);
                }

                var personalCoverPath = path.join(customAlbumartPath, filename);
                fstream = fs.createWriteStream(personalCoverPath);
                file.pipe(fstream);
                fstream.on('close', function () {
                    console.log("Custom Albumart Upload Finished");
                    res.status(200)
                });
            } else {
                console.log("Albumart file format not allowed " + filename);
            }
        });
 });

plugin.use(express.static(path.join(plugindir)));
background.use(express.static(path.join(backgrounddir)));
app.use('/backgrounds', express.static('/data/backgrounds/'));
app.use('/cover-art', express.static('/var/lib/mpd/music/'));
app.use('/music', express.static('/'));


module.exports.app = app;
module.exports.dev = dev;
