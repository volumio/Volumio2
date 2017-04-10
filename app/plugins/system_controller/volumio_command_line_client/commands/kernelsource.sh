#!/bin/bash


function kernelinstall {

echo " ---- VOLUMIO RASPBERRY PI KERNEL SOURCE DOWNLOADER ----"
echo " "
echo "This process might take a long time"
echo " "

ARCH=`/usr/bin/arch`

echo "Checking if build essential is installed"
if [ $(dpkg-query -W -f='${Status}' make 2>/dev/null | grep -c "ok installed") -eq 0 ];
then
  echo "Installing build essential"
  echo volumio | sudo -S apt-get update && apt-get install -y build-essential bc;
fi

cd /home/volumio
FIRMWARE_REV=`cat /boot/.firmware_revision`
echo "Firmware revision is"  $FIRMWARE_REV 

KERNEL_REV=`curl -L https://github.com/Hexxeh/rpi-firmware/raw/${FIRMWARE_REV}/git_hash`
echo "Kernel revision is "$FIRMWARE_REV

if [ "$ARCH" = armv7l ]; then
 echo "Getting modules symvers for V7 kernel"
 curl -L https://github.com/Hexxeh/rpi-firmware/raw/${FIRMWARE_REV}/Module7.symvers >Module7.symvers
 else
 echo "Getting modules symvers for V6 kernel"
 curl -L https://github.com/Hexxeh/rpi-firmware/raw/${FIRMWARE_REV}/Module.symvers >Module.symvers
fi

echo "Donwloading Kernel source tarball from " https://github.com/raspberrypi/linux/archive/${KERNEL_REV}.tar.gz
curl -L https://github.com/raspberrypi/linux/archive/${KERNEL_REV}.tar.gz >rpi-linux.tar.gz

echo "creating /usr/src/rpi-linux folder"
echo volumio | sudo -S mkdir /usr/src/rpi-linux

echo "Extracting Kernel"
echo volumio | sudo -S tar --strip-components 1 -xf rpi-linux.tar.gz -C /usr/src/rpi-linux
cd /usr/src/rpi-linux

echo "Cloning current config"
echo volumio | sudo -S /sbin/modprobe configs
echo volumio | sudo -S gunzip -c /proc/config.gz >.config

echo "Copying modules symverse"
if [ "$ARCH" = armv7l ]; then
 echo volumio | sudo -S cp /home/volumio/Module7.symvers Module.symvers
 else
 echo volumio | sudo -S cp /home/volumio/Module.symvers Module.symvers
fi
echo volumio | sudo -S make modules_prepare
echo "Linking Modules"
echo volumio | sudo -S ln -sv /usr/src/rpi-linux /lib/modules/$(uname -r)/build
echo Â" "
echo "Done, you can now build and install out of kernel modules"
}


if (cat /proc/cpuinfo | grep '^Hardware.*BCM2[78][013][05-9].*' > /dev/null); then
 kernelinstall
else
 echo "This tool is available only for Raspberry PI, exiting"
fi

