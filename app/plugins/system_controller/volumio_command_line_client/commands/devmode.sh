#!/usr/bin/env bash 
set -eo pipefail

NODEMON_DIR=/volumio/node_modules/nodemon/
# ETH_IP=`/usr/bin/sudo /sbin/ifconfig eth0 | grep "inet addr" | cut -d ':' -f 2 | cut -d ' ' -f 1`
# Get address of all devices, with some PCRE magic 
# ETH_IP=($(ip -br a | grep -Po ' \K[\d.]+'))
# Or way simpler on our Debian system
# shellcheck disable=2207
ETH_IP=( $(hostname -I) )
PORT=9229
DEV_FILE=/data/devmode

echo "Stopping Volumio service"
/usr/bin/sudo /bin/systemctl stop volumio


if [ ! -d "$NODEMON_DIR" ]; then
  echo "Installing nodemon"
  cd /volumio || exit
  /usr/bin/npm install nodemon
fi

if [ ! -f "$DEV_FILE" ]; then
   touch $DEV_FILE
fi

echo "Starting Volumio with debugger at ${ETH_IP[0]}:${PORT}"
cd /volumio 
./node_modules/.bin/nodemon --inspect="${ETH_IP[0]}:${PORT}" index.js
