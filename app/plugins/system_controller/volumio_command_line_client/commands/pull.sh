#!/bin/bash

echo "Backing Up current Volumio folder in /volumio-current"
mv /volumio /volumio-current
echo "Cloning Volumio Backend repo"
git clone https://github.com/volumio/Volumio2.git /volumio
echo "Copying Modules"
cp -rp /volumio-current/node_modules /volumio/node_modules
echo "Copying UI"
cp -rp /volumio-current/http/www /volumio/http/www
echo "Setting Proper permissions"
chown -R volumio:volumio /volumio
