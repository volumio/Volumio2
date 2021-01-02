#!/usr/bin/env bash
set -eu pipefail

# Define defaults 
REPO='https://github.com/volumio/Volumio2.git'
BRANCH=''
while getopts ":b:r:" ARG; do
  case ${ARG} in
  b)
    [[ -n ${OPTARG} ]] && BRANCH=${OPTARG}
    ;;
  r)
    [[ -n ${OPTARG} ]] && REPO=${OPTARG}
    ;;
  \?)
    echo "[pull] Unknown option ${OPTARG}"
    volumio doc
    exit 1
    ;;
  esac
done

cd /home/volumio
echo "Backing Up current Volumio folder in /volumio-current"
[[ -d /volumio-current ]] && rm -rf /volumio-current
if ! mv /volumio /volumio-current; then
    echo " Backup failed, aborting"
    exit 1
fi

echo "Cloning Volumio Backend repo"
if [[ -n "${BRANCH}" ]]; then
    echo "Cloning branch ${BRANCH} from repository ${REPO}"
    git clone -b "${BRANCH}" "${REPO}" /volumio
else
    echo "Cloning master from repository ${REPO}"
    git clone "${REPO}" /volumio
fi
echo "Copying Modules"
cp -rp /volumio-current/node_modules /volumio/node_modules
echo "Copying Classic UI"
cp -rp /volumio-current/http/www /volumio/http/www
if [[ -d "/volumio-current/http/www3" ]]; then
  echo "Copying Volumio Contemporary UI"
  cp -rp /volumio-current/http/www3 /volumio/http/www3
fi

echo "Getting Network Manager from Build scripts"
wget https://raw.githubusercontent.com/volumio/Build/master/volumio/bin/wireless.js -O /volumio/app/plugins/system_controller/network/wireless.js
if [ -d "/volumio-current/app/myvolumio-pluginmanager/" ]; then
  echo "Copying MyVolumio plugin manager"
  cp -rp /volumio-current/app/myvolumio-pluginmanager/ /volumio/app/myvolumio-pluginmanager/
fi

echo "Setting Proper permissions"
chown -R volumio:volumio /volumio
chmod a+x /volumio/app/plugins/system_controller/network/wireless.js
