#!/bin/bash


function doc {
echo "
Usage : volumio <argument1> <argument2>

[[PLAYBACK STATUS]]

status                             Gives Playback status information
volume                             Gives Current Volume Information
volume <desired volume>            Sets Volume at desired level 0-100


[[PLAYBACK CONTROL]]

play
pause
next
previous


[[VOLUMIO SERVICE CONTROL]]

start                               Starts Volumio Service
stop                                Stops Volumio Service
restart                             Restarts Volumio Service
"

}

volumeval="0"
playbackcommand="play"


#PLAYBACK STATUS CONTROLS

function status {
var=$ node /volumio/app/plugins/user_interface/volumio_command_line_client/commands/status.js
echo $var
}

function volumeget {
var=$ node /volumio/app/plugins/user_interface/volumio_command_line_client/commands/getvolume.js
echo $var
}

function volumeset {
echo "Setting Volume "$volumeval""
var=$ node /volumio/app/plugins/user_interface/volumio_command_line_client/commands/setvolume.js "$volumeval"
echo $var
}

#PLAYBACK CONTROLS

function playback {
echo "Sending "$playbackcommand" "
var=$ node /volumio/app/plugins/user_interface/volumio_command_line_client/commands/playback.js "$playbackcommand"
echo $var
}


#VOLUMIO SERVICE CONTROLS

function start {
systemctl start volumio.service
}

function stop {
systemctl stop volumio.service
}




case "$1" in
        play)
            playbackcommand=$1
            playback
            ;;
        pause)
            playbackcommand=$1
            playback
            ;;
        next)
            playbackcommand=$1
            playback
            ;;
        previous)
            playbackcommand=$1
            playback
            ;;
        start)
            start
            ;;
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
                volumeval=$2
                volumeset
            else
                volumeget
            fi
            ;;

        *)
            doc
            exit 1

esac




