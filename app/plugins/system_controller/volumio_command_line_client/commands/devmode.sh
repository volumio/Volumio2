#!/bin/bash

NODEMON_DIR=/volumio/node_modules/nodemon/
ETH_IP=`/usr/bin/sudo /sbin/ifconfig eth0 | grep "inet addr" | cut -d ':' -f 2 | cut -d ' ' -f 1`
PORT=9229
DEV_FILE=/data/devmode

echo "Stopping Volumio service"
/usr/bin/sudo /bin/systemctl stop volumio


if [ ! -d "$NODEMON_DIR" ]; then
  echo "Installing nodemon"
  cd /volumio
  /bin/npm install nodemon
fi

if [ ! -f "$DEV_FILE" ]; then
   touch $DEV_FILE
fi

echo 'Starting Volumio with debugger at' $ETH_IP:$PORT
cd /volumio
./node_modules/.bin/nodemon --inspect="$ETH_IP":"$PORT" index.js


