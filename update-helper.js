var fs = require('fs-extra');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var io = require('socket.io-client');
var inquirer = require('inquirer');

var errorMessage = 'Error, please provide the required updater action: force-update | factory | userdata';
if (process.argv[2]) {
    var argument = process.argv[2];

    switch (argument){
        case "forceupdate":
            forceUpdate()
            break;
        case "factory":
            factoryReset()
            break;
        case "userdata":
            deleteUserData()
            break;
        case "testmode":
            testMode()
            break;
        default:
            console.log(errorMessage);
    }
} else {
    console.log(errorMessage)
}

function forceUpdate() {
    var socket = io.connect('http://localhost:3000');

    console.log('Checking for new Updates');
    socket.emit('updateCheck');

    socket.on('updateReady', function(data) {
        if (data.updateavailable) {
            var question = [
                {
                    type: 'confirm',
                    name: 'executeUpdate',
                    message: data.title + ' is available. Do you want to Update?'
                }
            ];
            inquirer.prompt(question).then((answer) => {
                if (answer.executeUpdate) {
                    executeUpdate(socket);
                } else {
                    console.log('Exiting...');
                    return process.exit(0);
            }
            })
        } else {
            console.log('No update available');
            return process.exit(0);
        }
        //
    });
}

function executeUpdate(socket) {
    console.log('Starting Update...');
    socket.emit('update');

    socket.on('updateProgress', function(data) {
        if (data.progress && data.status) {
            console.log('Updating: ' + data.progress + '% : ' + data.status);
        }
    });

    socket.on('updateDone', function(data) {
        if (data.status === 'Error') {
            console.log('Cannot complete update, error')
        } else {
            console.log('Update completed successfully, restarting');
            return reboot()
        }
    });
}


function factoryReset() {
    console.log('Factory reset initiated, the system will restart now.')
    //execSync('/usr/bin/sudo /bin/touch /boot/factory_reset', {uid: 1000, gid: 1000});
    return reboot()
}

function deleteUserData() {
    console.log('User data reset initiated, the system will restart now.')
    //execSync('/usr/bin/sudo /bin/touch /boot/user_data', {uid: 1000, gid: 1000});
    return reboot()
}

function testMode() {
    try {
        fs.statSync('/data/test');
        execSync('/bin/rm /data/test', {uid: 1000, gid: 1000});
        console.log('Test mode DISABLED');
    } catch (e) {
        execSync('/bin/touch /data/test', {uid: 1000, gid: 1000});
        console.log('Test mode ENABLED');
    }
}

function reboot() {
    console.log('Restarting');
    execSync('/bin/sync', {uid: 1000, gid: 1000});
    //execSync('/usr/bin/sudo /sbin/reboot', {uid: 1000, gid: 1000});
}