#!/bin/bash

if [ "0" != "$(id -u)" ]; then
    echo "You must be root to run $0." 1>&2;
    logger "$0 : called by $(id -un), not root"
    exit 1;
fi

kernelinstall() {

  echo " ---- VOLUMIO RASPBERRY PI KERNEL SOURCE DOWNLOADER ----"
  echo " "
  echo "This process might take a long time"
  echo " "

  ARCH=`/usr/bin/arch`

  echo "Checking if build essential is installed"
  if [ $(dpkg-query -W -f='${Status}' make 2>/dev/null | grep -c "ok installed") -eq 0 ];
  then
    echo "Installing build essential"
    apt-get update && apt-get install -y build-essential bc;
  fi

  cd /home/volumio
  if [ -f "/boot/.firmware_revision_kernel" ]; then
    FIRMWARE_REV=`cat /boot/.firmware_revision_kernel`
  else
    FIRMWARE_REV=`cat /boot/.firmware_revision`
  fi

  echo "Firmware revision is"  $FIRMWARE_REV

  KERNEL_REV=`curl -L https://github.com/Hexxeh/rpi-firmware/raw/${FIRMWARE_REV}/git_hash`
  echo "Kernel revision is "$KERNEL_REV

  if [ "$ARCH" = armv7l ]; then
    echo "Getting modules symvers for V7 kernel"
    curl -L https://github.com/Hexxeh/rpi-firmware/raw/${FIRMWARE_REV}/Module7.symvers >Module7.symvers
    else
    echo "Getting modules symvers for V6 kernel"
    curl -L https://github.com/Hexxeh/rpi-firmware/raw/${FIRMWARE_REV}/Module.symvers >Module.symvers
  fi

  echo "Downloading Kernel source tarball from " https://github.com/raspberrypi/linux/archive/${KERNEL_REV}.tar.gz
  curl -L https://github.com/raspberrypi/linux/archive/${KERNEL_REV}.tar.gz >rpi-linux.tar.gz

  echo "creating /usr/src/rpi-linux folder"
  mkdir /usr/src/rpi-linux

  echo "Extracting Kernel"
  tar --strip-components 1 -xf rpi-linux.tar.gz -C /usr/src/rpi-linux
  cd /usr/src/rpi-linux

  echo "Cloning current config"
  /sbin/modprobe configs
  gunzip -c /proc/config.gz >.config

  echo "Copying modules symverse"
  if [ "$ARCH" = armv7l ]; then
    cp /home/volumio/Module7.symvers Module.symvers
    else
    cp /home/volumio/Module.symvers Module.symvers
  fi
  make LOCALVERSION=+ modules_prepare
  echo "Linking Modules"
  ln -sv /usr/src/rpi-linux /lib/modules/$(uname -r)/build
  echo " "
  echo "Done, you can now build and install out of kernel modules"
}

if (cat /proc/cpuinfo | grep '^Hardware.*BCM2[78][013][05-9].*' > /dev/null); then
  kernelinstall
else
  echo "This tool is available only for Raspberry PI, exiting"
fi

