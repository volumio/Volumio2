#!/bin/bash

REPO='https://github.com/volumio/Volumio2.git'
BRANCH=''

if [ $# -eq 3 ]; then
    BRANCH="$2"
    REPO="$3"
elif [ $# -eq 2 ]; then
    BRANCH="$2"
fi

cd /home/volumio
echo "Backing Up current Volumio folder in /volumio-current"
[ -d /volumio-current ] && rm -rf /volumio-current
mv /volumio /volumio-current
if [ 0 -ne $? ] ; then
    echo " Backup failed, aborting"
    exit 1
fi

echo "Cloning Volumio Backend repo"
if [ -n "$BRANCH" ]; then
    echo "Cloning branch $BRANCH from repository $REPO"
    git clone -b "$BRANCH" "$REPO" /volumio
else
    echo "Cloning master from repository $REPO"
    git clone "$REPO" /volumio
fi
echo "Copying Modules"
cp -rp /volumio-current/node_modules /volumio/node_modules
echo "Copying UI"
cp -rp /volumio-current/http/www /volumio/http/www
echo "Getting Network Manager"
wget https://raw.githubusercontent.com/volumio/Build/master/volumio/bin/wireless.js -O /volumio/app/plugins/system_controller/network/wireless.js
if [ -d "/volumio-current/app/myvolumio-pluginmanager/" ]; then
  echo "Copying MyVolumio plugin manager"
  cp -rp /volumio-current/app/myvolumio-pluginmanager/ /volumio/app/myvolumio-pluginmanager/
fi

echo "Setting Proper permissions"
chown -R volumio:volumio /volumio
chmod a+x /volumio/app/plugins/system_controller/network/wireless.js
