#!/bin/sh

echo "Installing dependencies"
sudo apt-get update
sudo apt-get install -y build-essential libudev-dev

if [ -d "/volumio/node_modules/" ]; then
   echo "Cleaning node modules folder"
   rm -rf /volumio/node_modules/
fi

cd /volumio

echo "Installing node modules"
npm install

echo "Done"
