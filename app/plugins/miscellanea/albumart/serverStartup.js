#!/usr/local/bin/node
'use strict';

var cluster = require('cluster');


if (cluster.isMaster) {

    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    if(cpuCount>1)
        cpuCount=cpuCount-1;
    
    console.log("Forking "+cpuCount+" albumart workers");
    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }

}
else {

    var express = require('express');
    console.log("Starting albumart workers");

    var albumart = require(__dirname + '/albumart.js');
    var app = express();

    albumart.setFolder(process.argv[3]);

    app.get('/albumart', albumart.processExpressRequest);
    app.get('/tinyart/*', albumart.processExpressRequestTinyArt);
    app.get('/albumartd', albumart.processExpressRequestDirect);

    app.use(function (err, req, res, next) {
        /**
         * Replace with Winston logging
         **/
        console.log('An internal error occurred while serving an albumart. Details: ' + err.stack);

        /**
         * Sending back error code 500
         **/
        try{
            res.sendFile(__dirname + '/default.jpg');
        } catch(e) {
            res.sendFile(__dirname + '/default.png');
        }
    });

    app.listen(process.argv[2]);
}

cluster.on('exit', function (worker) {

    // Replace the dead worker,
    // we're not sentimental
    console.log('Worker %d died :(', worker.id);
    cluster.fork();

});





