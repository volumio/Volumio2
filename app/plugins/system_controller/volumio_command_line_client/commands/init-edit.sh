#!/bin/bash
TMPWORK="/home/volumio/tmpwork"
HELP() {
  echo "

Basic usage: volumio init-editor <initramfs filename>

Example: volumio init-editor uIinitrd

Notes:
The script will determine how the initrd has been compressed and unpack/ repack accordingly

"
  exit 1
}

EXISTS=`which nano`
if [ "x" = "x$EXISTS" ]; then
    echo "This script requires text editor 'nano'"
    echo "Please install 'nano'"
    exit 1
fi

NUMARGS=$#
if [ "$NUMARGS" -eq 0 ]; then
  HELP
fi

while getopts d:f: FLAG; do
  case $FLAG in
    f)
      INITRDNAME="/boot/$OPTARG"
      ;;

    h)  #show help
      HELP
      ;;
    /?) #unrecognized option - show help
      echo -e \\n"Option -${BOLD}$OPTARG${NORM} not allowed."
      HELP
      ;;
  esac
done

if [ -z $INITRDNAME ]; then
	echo ""
	echo "$0: missing argument(s)"
	HELP
	exit 1
fi

if [ ! -f $INITRDNAME ]; then
	echo ""
	echo "$0: $INITRDNAME does not exist"
	HELP
	exit 1
fi

if [ -d $TMPWORK ]; then
	echo "Workarea exists, cleaning it..." 
	rm -r $TMPWORK/* > /dev/null 2>&1 
else
	mkdir $TMPWORK
fi


echo "Making $INITRDNAME backup copy..."
cp $INITRDNAME $INITRDNAME".bak"
FORMAT=`file $INITRDNAME | grep -o "RAMDisk Image"`
cd $TMPWORK
if [ "x$FORMAT" = "xRAMDisk Image" ]; then
	echo "Unpacking RAMDisk image $INITRDNAME..."
	dd if=$INITRDNAME bs=64 skip=1 | gzip -dc | cpio -div
	nano init
	echo "Creating a new $INITRDNAME, please wait..."
	find . -print0 | cpio --quiet -o -0 --format=newc | gzip -9 > $INITRDNAME.new
	mkimage -A arm64 -O linux -T ramdisk -C none -a 0 -e 0 -n uInitrd -d $INITRDNAME.new $INITRDNAME
	rm $INITRDNAME.new
else
	echo "Unpacking gzip compressed $INITRDNAME..."
	zcat $INITRDNAME | cpio -idmv > /dev/null 2>&1
	nano init
	echo "Creating a new $INITRDNAME, please wait..."
	find . -print0 | cpio --quiet -o -0 --format=newc | gzip -9 > $INITRDNAME
fi

echo "Done."
sync
popd > /dev/null 2>&1

rm -r $TMPWORK

