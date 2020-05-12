
// const winston = require('winston');
// const VolumeControl = require('../app/volumecontrol');
const { execSync } = require('child_process');

class VolumeControlTester {
  constructor (context) {
    // Regex to capture Volume [%] and possible mute status[on|off]
    /*
      /
      \w+\s?\w+:(?:\s|\sPlayback\s)[-0-9]+\s\[([0-9]+)%\](?:[\n\r]|\s(?:[[0-9.-]+dB\]\s)?\[(on|off)\])
      \w+
      matches any word character (equal to [a-zA-Z0-9_])
      \s?
      matches any whitespace character (equal to [\r\n\t\f\v ])
      \w+
      matches any word character (equal to [a-zA-Z0-9_])
      : matches the character : literally (case sensitive)
      Non-capturing group (?:\s|\sPlayback\s)
      Match a single character present in the list below [-0-9]+
      \s matches any whitespace character (equal to [\r\n\t\f\v ])
      \[ matches the character [ literally (case sensitive)
      1st Capturing Group ([0-9]+)
      % matches the character % literally (case sensitive)
      \] matches the character ] literally (case sensitive)
      Non-capturing group (?:[\n\r]|\s(?:[[0-9.-]+dB\]\s)?\[(on|off)\])
      1st Alternative [\n\r]
      2nd Alternative \s(?:[[0-9.-]+dB\]\s)?\[(on|off)\]
      \s matches any whitespace character (equal to [\r\n\t\f\v ])
      Non-capturing group (?:[[0-9.-]+dB\]\s)?
      \[ matches the character [ literally (case sensitive)
      2nd Capturing Group (on|off)
      \] matches the character ] literally (case sensitive)
     */
    this.volRegx = new RegExp(/\w+\s?\w+:(?:\s|\sPlayback\s)[-0-9]+\s\[([0-9]+)%\](?:[\n\r]|\s(?:[[0-9.-]+dB\]\s)?\[(on|off)\])/);
  }

  /**
   * [parseVolumeString description]
   * @param  {[String]} string
   * @return {[{ volume: String, mute: String }]}
   */
  parseVolumeString (string) {
    const res = this.volRegx.exec(string);
    if (res) {
      return { volume: res[1], mute: res[2] };
    }
    return { volume: null, mute: null };
  }

  /**
   * [getVolume description]
   * @param  {[String]} string
   * @return {[{ volume: Int, mute: Bool }]}
   */
  getVolume (string) {
    let { volume, mute } = this.parseVolumeString(string);
    volume = parseInt(volume, 10);
    if (isNaN(volume)) {
      volume = 0; // Safe defualt
    }
    console.log('mute: ', mute);
    if (!mute) { // No mute parsed, check volume
      mute = volume === 0;
    } else {
      mute = mute === 'on';
    }
    return { volume, mute };
  }
}

const vc = new VolumeControlTester();

const testSimple = () => {
  // Load examples from a file?
  const amixerDataString = `Simple mixer control 'SoftMaster',0
    Capabilities: volume
    Playback channels: Front Left - Front Right
    Capture channels: Front Left - Front Right
    Limits: 0 - 99
    Front Left: 10 [10%]
    Front Right: 10 [10%]`;
  console.log('\n:::Input:::\n', amixerDataString);
  console.log(vc.getVolume(amixerDataString));
};

const testAmixer = (device, mixer) => {
  // Read amxier directly
  const amixerParams = ['-M', 'get', '-c', device, mixer];
  const amixerDataString = execSync(`amixer ${amixerParams.join(' ')}`).toString();
  console.log('\n:::Input:::\n', amixerDataString);
  console.log(vc.getVolume(amixerDataString));
};

testSimple();
testAmixer('1', 'PCM');
