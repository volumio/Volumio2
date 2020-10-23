var fs = require('fs-extra');
var execSync = require('child_process').execSync;
var io = require('socket.io-client');
var inquirer = require('inquirer');

var args = [];

var errorMessage = 'Error, please provide the required updater action: forceupdate | factory | userdata | testmode | cleanupdate | restorevolumio';
if (process.argv[3]) {
  var argument = process.argv[3];
  if (process.argv.length >= 4) {
    args = process.argv.slice(4);
  }

  switch (argument) {
    case 'forceupdate':
      forceUpdate();
      break;
    case 'factory':
      factoryReset();
      break;
    case 'userdata':
      deleteUserData();
      break;
    case 'testmode':
      testMode();
      break;
    case 'cleanupdate':
      cleanUpdate();
      break;
    case 'restorevolumio':
      restoreVolumio();
      break;
    default:
      console.log(errorMessage);
  }
} else {
  console.log(errorMessage);
}

function forceUpdate (data) {
  var clean = false;
  var socket = io.connect('http://localhost:3000');

  console.log('Checking for new Updates');
  socket.emit('updateCheck');

  if (data && data.clean) {
    clean = true;
  }

  function handleUpdate() {
    if (clean) {
      console.log('Executing a clean update');
      execSync('/bin/touch /boot/user_data', {uid: 1000, gid: 1000});
    }
    executeUpdate(socket);
  }

  socket.on('updateReady', function (data) {
    if (data.updateavailable) {
      var question = [
        {
          type: 'confirm',
          name: 'executeUpdate',
          message: data.title + ' is available. Do you want to Update?'
        }
      ];

      if (args.includes('--yes') || args.includes('-y')) {
        handleUpdate();
      }

      inquirer.prompt(question).then((answer) => {
        if (answer.executeUpdate) {
          handleUpdate();
        } else {
          console.log('Exiting...');
          return process.exit(0);
        }
      });
    } else {
      console.log('No update available');
      return process.exit(0);
    }
    //
  });
}

function cleanUpdate () {
  forceUpdate({'clean': true});
}

function executeUpdate (socket) {
  console.log('Starting Update...');
  var payload = {'ignoreIntegrityCheck': true};
  socket.emit('update', payload);

  socket.on('updateProgress', function (data) {
    if (data.progress && data.status) {
      console.log('Updating: ' + data.progress + '% : ' + data.status);
    }
  });

  socket.on('updateDone', function (data) {
    if (data.status === 'Error') {
      console.log('Cannot complete update, error');
    } else {
      console.log('Update completed successfully, restarting');
      return reboot(socket);
    }
  });
}

function factoryReset () {
  console.log('Factory reset initiated, the system will restart now.');
  execSync('/bin/touch /boot/factory_reset', {uid: 1000, gid: 1000});
  return reboot();
}

function deleteUserData () {
  console.log('User data reset initiated, the system will restart now.');
  execSync('/bin/touch /boot/user_data', {uid: 1000, gid: 1000});
  return reboot();
}

function testMode () {
  try {
    fs.statSync('/data/test');
    execSync('/bin/rm /data/test', {uid: 1000, gid: 1000});
    console.log('Test mode DISABLED');
  } catch (e) {
    execSync('/bin/touch /data/test', {uid: 1000, gid: 1000});
    console.log('Test mode ENABLED');
  }
}

function reboot (socket) {
  console.log('Restarting');
  if (socket) {
    socket.emit('closeModals');
  }
  execSync('/bin/sync', {uid: 1000, gid: 1000});
  execSync('/usr/bin/sudo /sbin/reboot', {uid: 1000, gid: 1000});
}

function restoreVolumio () {
  console.log('Deleting Overlay content of /volumio folder');
  try {
    console.log('Mounting overlay partition');
    if (!fs.existsSync('/mnt/overlay')) {
      execSync('/bin/mkdir /mnt/overlay', {uid: 1000, gid: 1000});
    }
    execSync('/usr/bin/sudo /bin/mount /dev/mmcblk0p3 /mnt/overlay', {uid: 1000, gid: 1000});
    console.log('Overlay partition mounted, deleting /volumio folder on overlay');
    execSync('/bin/rm -rf /mnt/overlay/dyn/volumio', {uid: 1000, gid: 1000});
    console.log('Cleaning environment');
    execSync('/usr/bin/sudo /bin/umount /mnt/overlay', {uid: 1000, gid: 1000});
    execSync('/bin/rm -rf /mnt/overlay', {uid: 1000, gid: 1000});
    execSync('/bin/sync', {uid: 1000, gid: 1000});
    console.log('Done, restarting system');
    return reboot();
  } catch (e) {
    console.log('Could not restore /volumio folder: ' + e);
  }
}
