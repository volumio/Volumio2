// Ondevice test script to check and set time zones
const io = require('socket.io-client');
const socket = io.connect('http://localhost:3000');

const cmd = 'TimeZone';
const tz = { name: 'Europe/Rome' }; // Set by name
console.log(`Emitting get${cmd}`);
socket.emit(`get${cmd}`);
socket.on(`push${cmd}`, data => {
  console.log(`Response push${cmd}\n`, data);
});

socket.on(`pushset${cmd}`, res => {
  console.log(`Response pushset ${cmd}`);
  if (res !== 'success') {
    console.error(`Error setting time zone: ${res}`);
  } else {
    console.info(res);
  }
});

// TODO: Refactor out these timeouts for something more reliable
setTimeout(() => {
  console.log(`Emitting set${cmd} --> ${tz.name}`);
  socket.emit(`set${cmd}`, tz);
}, 2000);

// Attempt to Set by acronym, which will fail
const tzAcro = { name: 'CEST' };
setTimeout(() => {
  console.log(`Emitting set${cmd} --> ${tzAcro.name}`);
  socket.emit(`set${cmd}`, tzAcro);
}, 2000);

// Exit after 5 seconds
setTimeout(() => { console.log('Exiting'); process.exit(); }, 5000);
