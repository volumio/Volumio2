const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// const VolumeControl = require('../app/volumecontrol');
// const volContorller = new VolumeControl(new MockCommandRouter());

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
    this.volRegx = new RegExp(
      /\w+\s?\w+:(?:\s|\sPlayback\s)[-0-9]+\s\[([0-9]+)%\](?:[\n\r]|\s(?:[[0-9.-]+dB\]\s)?\[(on|off)\])/
    );
  }

  /**
   * [parseVolumeString description]
   * @param  {[String]} string
   * @return {[{ volume: String, mute: String }]}
   */
  parseVolumeString (string) {
    const res = this.volRegx.exec(string);
    if (res) {
      return {
        volume: res[1],
        mute: res[2]
      };
    }
    return {
      volume: '',
      mute: ''
    };
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
    if (!mute) {
      // No mute parsed, check volume
      mute = volume === 0;
    } else {
      mute = mute === 'off';
    }
    return {
      volume,
      mute
    };
  }

  async readConfigFile (fileName) {
    console.log(`Parsing config file ${path.basename(fileName)}`);
    try {
      const alsaConfigParsed = await fs.readJson(fileName);
      const alsaConfig = {};
      Object.keys(alsaConfigParsed).map(key => {
        // We can do this, cause interestingly all parameters are stored as
        // strings, so we don't need to bother doing any type coercetion.
        alsaConfig[key] = alsaConfigParsed[key].value;
      });
      return alsaConfig;
    } catch (err) {
      console.error('readConfigFile error: ', err);
    }
  }

  // Read amxier directly
  probeamixer (device, mixer) {
    const amixerParams = ['-M', 'get', '-c', device, mixer];
    try {
      const amixerDataString = execSync(
        `amixer ${amixerParams.join(' ')}`
      ).toString();
      console.log(
        `\n:::Input:::\n{ device: ${device}, mixer: ${mixer}}\n:::amixer:::\n`,
        amixerDataString
      );
      const volume = this.getVolume(amixerDataString);
      console.log('\n:::Output:::\n', volume);
      console.log('\n');
      return volume;
    } catch (e) {
      console.error('Error Probing amixer: ', e);
    }
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
  console.log('\n:::Input:::\n From String\n', amixerDataString);
  console.log('\n:::Output:::\n', vc.getVolume(amixerDataString));
  console.log('\n');
};

const testFromConfig = async configFile => {
  const { outputdevice, mixer, softvolumenumber } = await vc.readConfigFile(configFile);
  const device = outputdevice === 'softvolume' ? softvolumenumber : outputdevice;
  vc.probeamixer(device, mixer);
};

const testOnDevice = async () => {
  console.log('Testing on Device');
  const configFile = '/data/configuration/audio_interface/alsa_controller/config.json';
  if (await fs.pathExists(configFile)) {
    testFromConfig(configFile);
  } else {
    console.error('Cannot run this test on non Volumio device');
  }
};
// Predefined string
testSimple();

// Probe amixer directly
// vc.probeamixer('1', 'SoftMaster');
// From a config file
// testFromConfig('alsa_config.json');
testOnDevice();

// On the fly
const [device, mixer] = process.argv.slice(2);
if (device && mixer) {
  console.log('On the Fly:');
  vc.probeamixer(device, mixer);
}
