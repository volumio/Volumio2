#!/bin/bash
LOGDUMP="/var/tmp/logondemand"
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin


doc() {
echo "
Usage : volumio <argument1> <argument2>

[[PLAYBACK STATUS]]

status                             Gives Playback status information
volume                             Gives Current Volume Information
volume <desired volume>            Sets Volume at desired level 0-100
volume mute                        Mutes
volume unmute                      Unmutes
volume toggle                      Mutes/Unmutes
volume plus                        Increases Volume of one step
volume minus                       Decreases Volume of one step
seek plus                          Forwards 10 seconds in the song
seek minus                         Backwards 10 seconds in the song
seek <seconds>                     Plays song from selected time
repeat                             Toggles repetition of queue
random                             Toggles randomization of queue


[[PLAYBACK CONTROL]]

play
pause
toggle                             Toggles between play/pause
next
previous
stop
clear


[[VOLUMIO SERVICE CONTROL]]

vstart                             Starts Volumio Service
vstop                              Stops Volumio Service
vrestart                           Restarts Volumio Service

[[VOLUMIO DEVELOPMENT]]

pull                               Pulls latest github status on master from https://github.com/volumio/Volumio2.git
pull -b <branch>                   Pulls branch <branch> from https://github.com/volumio/Volumio2.git
pull -b <branch> <repository>      Pulls branch <branch> from git repository <repository>
dev                                Start Volumio in develpment mode, with Nodemon and Remote Debugger
kernelsource                       Gets Current Kernel source (Raspberry PI only)
plugin init                        Creates a new plugin
plugin refresh                     updates plugin in the system
plugin package                     compresses the plugin
plugin publish                     publishes the plugin on git
plugin install                     installs the plugin locally
plugin update                      updates the plugin
logdump <description>              dump logs to $LOGDUMP instead of uploading
init-edit <initramfs filename>     unpacks the initramfs, feeds nano with the init script and upon nano exit, rebuilds initramfs


[[VOLUMIO UPDATER]]
updater forceupdate                Updates to latest version
updater factory                    Restores factory version and wipes all user data
updater userdata                   Wipes all user data
updater testmode                   Enables or disables Test mode, allowing to receive beta builds
updater cleanupdate                Updates to latest version and cleans user data, allowing a start like a newly flashed image
updater restorevolumio             Delete all manually edited files from /volumio folder, restoring a pristine volumio core system
internet                           Enables or disbles internet access, accepted commands: on | off
"

}

#VOLUMIO SERVICE CONTROLS

vstart() {
sudo systemctl start volumio.service
}

vstop() {
sudo systemctl stop volumio.service
}

#VOLUMIO DEVELOPMENT

pull() {
cd /
echo "Stopping Volumio"
sudo systemctl stop volumio.service
sudo /bin/sh /volumio/app/plugins/system_controller/volumio_command_line_client/commands/pull.sh "$@"

echo "Pull completed, restarting Volumio"
sudo systemctl start volumio.service
echo "Done"
}

dev() {
sh /volumio/app/plugins/system_controller/volumio_command_line_client/commands/devmode.sh
}

kernelsource() {
sudo /bin/sh /volumio/app/plugins/system_controller/volumio_command_line_client/commands/kernelsource.sh
}

internet() {
/volumio/app/plugins/system_controller/volumio_command_line_client/commands/internet.sh "$@"
}

init-edit() {
sudo /bin/sh /volumio/app/plugins/system_controller/volumio_command_line_client/commands/init-edit.sh -f $1
}

case "$1" in
        play)
            /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=play"
            ;;
        toggle)
            /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=toggle"
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
        seek)
            if [ "$2" != "" ]; then
                /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=seek&position=$2"
            else
               /usr/bin/curl -sS "http://127.0.0.1:3000/api/v1/getstate" | /usr/bin/jq -r '.seek'
            fi
            ;;
        repeat)
            if [ "$2" != "" ]; then
                /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=repeat&value=$2"
            else
               /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=repeat"
            fi
            ;;
        random)
            if [ "$2" != "" ]; then
                /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=random&value=$2"
            else
               /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=random"
            fi
            ;;
        startairplayplayback)
           /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=startAirplayPlayback"
        ;;
        stopairplayplayback)
           /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=stopAirplayPlayback"
        ;;
        airplayactive)
           /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=airplayActive"
        ;;
        airplayinactive)
           /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=airplayInactive"
        ;;
        usbattach)
           /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=usbAudioAttach"
        ;;
        usbdetach)
           /usr/bin/curl "http://127.0.0.1:3000/api/v1/commands/?cmd=usbAudioDetach"
        ;;
        scanaudioinputs)
           /usr/bin/curl "http://127.0.0.1:3000/api/pluginEndpoint?endpoint=scanAudioInputs"
        ;;
        vstart)
            vstart
            ;;

        vstop)
            vstop
            ;;

        vrestart)
            vstop
            vstart
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
            pull "$2" "$3" "$4"
            ;;
        dev)
        	dev
            ;;
	    kernelsource)
	        kernelsource
            ;;
            internet)
                internet "$@"
            ;;
	    logdump)
	        /usr/local/bin/node /volumio/logsubmit.js "$2" nosubmit
            ;;
	    init-edit)
		init-edit $2
	    ;;
	    plugin)
            if [ "$2" != "" ]; then
                if [ "$2" == "init" ]; then
                    echo ""
                    echo "Welcome to the Volumio Plugin Creator!"
                    echo "You have to decide which category your plugin belongs to, \
then you have to select a name for it, leave us the rest ;)"
                    echo "Warning: make meaningful choices, you cannot change them later!"
                    echo ""
                elif [ "$2" == "refresh" ]; then
                    echo ""
                    echo "This command will copy all your plugin's file in the \
correspondent folder in data"
                    echo ""
                elif [ "$2" == "package" ]; then
                    echo ""
                    echo "This command will create a package with your plugin"
                    echo ""
                elif [ "$2" == "publish" ]; then
                    echo ""
                    echo "This command will publish the plugin on volumio plugins store"
                    echo ""
                elif [ "$2" == "install" ]; then
                    echo ""
                    echo "This command will install the plugin on your device"
                    echo ""
                elif [ "$2" == "update" ]; then
                    echo ""
                    echo "This command will update the plugin on your device"
                    echo ""
                fi
               /usr/local/bin/node /volumio/pluginhelper.js "$2"
            else
                echo ""
                echo "---- VOLUMIO PLUGIN HELPER ----"
                echo ""
                echo "This utility helps you creating new plugins for Volumio."
                echo "Options:"
                echo "init      creates a new plugin"
                echo "refresh   copies the plugin in the system"
                echo "package   compresses the plugin"
                echo "publish   publishes the plugin on git"
                echo "install   installs the plugin locally"
                echo "update    updates the plugin"
                echo ""
            fi
            ;;
            updater)
                /usr/local/bin/node /volumio/update-helper.js "$@"
            ;;
        *)
            doc
            exit 1

esac




