#!/bin/bash


function doc {
echo "
Usage : volumio <argument1> <argument2>

[[PLAYBACK STATUS]]

status                             Gives Playback status information
volume                             Gives Current Volume Information
volume <desired volume>            Sets Volume at desired level 0-100
volume mute                        Mute
volume unmute                      Unmute
volume plus                        Increse Volume of one step
volume minus                       Decrease Volume of one step


[[PLAYBACK CONTROL]]

play
pause
next
previous
stop
clear


[[VOLUMIO SERVICE CONTROL]]

start                               Starts Volumio Service
vstop                               Stops Volumio Service
restart                             Restarts Volumio Service

[[VOLUMIO DEVELOPMENT]]

pull                               Pull latest github status on master
kernelsource                       Get Current Kernel source (Raspberry PI only)
"

}

#VOLUMIO SERVICE CONTROLS

function start {
echo volumio | sudo -S systemctl start volumio.service
}

function vstop {
echo volumio | sudo -S systemctl stop volumio.service
}

#VOLUMIO DEVELOPMENT

function pull {
echo "Stopping Volumio"
echo volumio | sudo -S systemctl stop volumio.service
echo volumio | sudo -S sh /volumio/app/plugins/system_controller/volumio_command_line_client/commands/pull.sh
echo "Pull completed, restarting Volumio"
echo volumio | sudo -S systemctl start volumio.service
echo "Done"
}

function kernelsource {
echo volumio | sudo -S sh /volumio/app/plugins/system_controller/volumio_command_line_client/commands/kernelsource.sh
}


case "$1" in
        play)
            /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=play"
            ;;
        pause)
            /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=pause"
            ;;
        next)
            /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=next"
            ;;
        previous)
            /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=prev"
            ;;
        stop)
            /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=stop"
            ;;
        clear)
            /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=clearQueue"
            ;;
        start)
            start
            ;;
        start)
            start
            ;;

        vstop)
            stop
            ;;

        restart)
            stop
            start
            ;;

        status)
            /usr/bin/curl -sS "http://127.0.0.1:3000/api/v1/getstate" | /usr/bin/jq -r '.'
            ;;
        volume)
            if [ "$2" != "" ]; then
               /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=volume&volume=$2"
            else
               /usr/bin/curl -sS "http://127.0.0.1:3000/api/v1/getstate" | /usr/bin/jq -r '.volume'
            fi
            ;;
	pull)
            pull
            ;;
	kernelsource)
	    kernelsource
            ;;
        *)
            doc
            exit 1

esac




