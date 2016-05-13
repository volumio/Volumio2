#!/bin/bash


function doc {
echo "
Usage : volumio

start :
stop :
restart :
volume
"

}
function start {
systemctl start volumio.service
}

function stop {
systemctl stop volumio.service
}

function status {
echo "Not Implemented yet"
}

function volumeget {
var=$(/path/to/command arg1 arg2)
}

function volumeset {
echo "Setting Volume $volumeval"
/volumio/wsclient.js volume $volumeval
}

case "$1" in
        start)
            start
            ;;

        stop)
            stop
            ;;

        restart)
            stop
            start
            ;;

        status)
            status
            ;;
        volume)
            if [ "$2" != "" ]; then
                volumeval = "$2"
                volumeset
            else
                volumeget
            fi
            ;;

        *)
            doc
            exit 1

esac




