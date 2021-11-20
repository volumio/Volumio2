#!/bin/sh

if [ ! -f /data/gateway ]; then
   GATEWAY=`ip route | sed -n '1p' | awk '{print $3}' | tr -d '\n'`
   echo $GATEWAY > /data/gateway
else
   GATEWAY=`cat /data/gateway`
fi

if [ "$2" = "on" ]; then
     echo "Enabling internet"
     sudo route add default gw $GATEWAY
fi

if [ "$2" = "off" ]; then
    echo "Disabling internet"
    sudo route del default
    sudo route del default
fi

