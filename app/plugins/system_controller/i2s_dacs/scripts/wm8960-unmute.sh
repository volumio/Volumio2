#!/bin/bash
CARD=wm8960soundcard

function level {
	for s in "${@:2}"; do
		amixer -c $CARD cset iface=MIXER,name="${s}" $1
	done
}

level on  "Right Output Mixer PCM Playback Switch" \
          "Left Output Mixer PCM Playback Switch"
level 255 "Playback Volume"
level 109 "Headphone Playback Volume" "Speaker Playback Volume"
level 4   "Speaker DC Volume" "Speaker AC Volume"

