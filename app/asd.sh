#!/bin/bash


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
                echo "Positional parameter 1 is empty"
            fi
            ;;

        *)
            echo $"Usage: $0 {start|stop|restart|volume}"
            exit 1

esac


function start {
systemctl start volumio.service
}

function stop {
systemctl stop volumio.service
}

function status {
echo "Not Implemented yet"
}

function volume {
echo "reading volume"
}

function volumeset {
"echo setting volume $volumeval"
}

#!/bin/sh


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
                echo "Positional parameter 1 is empty"
            fi
            ;;

        *)
            echo $"Usage: $0 {start|stop|restart|volume}"
            exit 1

esac


function start {
systemctl start volumio.service
}

function stop {
systemctl stop volumio.service
}

function status {
echo "Not Implemented yet"
}

function volume {
echo "reading volume"
}

function volumeset {
"echo setting volume $volumeval"
}

