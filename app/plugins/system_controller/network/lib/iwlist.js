/*
 * Copyright (c) 2015 Christopher M. Baker
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

var child_process = require('child_process');

/**
 * The **iwlist** command is used to get detailed information from a
 * wireless interface.
 *
 * @static
 * @category iwlist
 *
 */
var iwlist = module.exports = {
  exec: child_process.exec,
  scan: scan
};

/**
 * Returns a truthy if the network has an ssid; falsy otherwise.
 *
 * @private
 * @static
 * @category iwlist
 * @param {object} network The scanned network object.
 * @returns {string} The ssid.
 *
 */
function has_ssid(network) {
  return network.ssid;
}

/**
 * A comparison function to sort networks ordered by signal strength.
 *
 * @private
 * @static
 * @category iwlist
 * @param {object} a A scanned network object.
 * @param {object} b Another scanned network object.
 * @returns {number} The comparison value.
 *
 */
function by_signal(a, b) {
  return b.signal - a.signal;
}

/**
 * Parses a scanned wireless network cell.
 *
 * @private
 * @static
 * @category iwlist
 * @param {string} cell The section of stdout for the cell.
 * @returns {object} The scanned network object.
 *
 */
function parse_cell(cell) {
  var parsed = { };

/*  if ((match = cell.match(/Address\s*[:|=]\s*([A-Fa-f0-9:]{17})/))) {
    parsed.address = match[1].toLowerCase();
  }

  if ((match = cell.match(/Channel\s*([0-9]+)/))) {
    parsed.channel = parseInt(match[1], 10);
  }

  if ((match = cell.match(/Frequency\s*[:|=]\s*([0-9\.]+)\s*GHz/))) {
    parsed.frequency = parseFloat(match[1]);
  }

  if ((match = cell.match(/Mode\s*[:|=]\s*([^\s]+)/))) {
    parsed.mode = match[1].toLowerCase();
  }
  
  if ((match = cell.match(/Quality\s*[:|=]\s*([0-9]+)/))) {
    parsed.quality = parseInt(match[1], 10);
  }
*/
  if ((match = cell.match(/Signal level\s*[:|=]\s*(-?[0-9]+)/))) {
    strength = parseInt(match[1], 10);
    if (strength < 0) {
      var rel = 100+strength;

      if (rel >= 45)
        parsed.signal = 5;
      else if (rel >= 40)
        parsed.signal = 4;
      else if (rel >= 30)
        parsed.signal = 3;
      else if (rel >= 20)
        parsed.signal = 2;
      else if (rel >= 1)
        parsed.signal = 1;
    } else {
    if (strength >= 45)
      parsed.signal = 5;
    else if (strength >= 40)
      parsed.signal = 4;
    else if (strength >= 30)
      parsed.signal = 3;
    else if (strength >= 20)
      parsed.signal = 2;
    else if (strength >= 1)
      parsed.signal = 1;
    }
  }

  if ((match = cell.match(/WPA2\s+Version/))) {
    parsed.security = 'wpa2';
  }
  else if ((match = cell.match(/WPA\s+Version/))) {
    parsed.security = 'wpa';
  }
  else if ((match = cell.match(/Encryption key\s*[:|=]\s*on/))) {
    parsed.security = 'wep';
  }
  else if ((match = cell.match(/Encryption key\s*[:|=]\s*off/))) {
    parsed.security = 'open';
  }

  if ((match = cell.match(/ESSID\s*[:|=]\s*"([^"]+)"/))) {
    parsed.ssid = match[1];
  }



  return parsed;
}

/**
 * Parses all scanned wireless network cells.
 *
 * @private
 * @static
 * @category iwlist
 * @param {function} callback The callback function.
 *
 */
function parse_scan(callback) {
  return function(error, stdout, stderr) {
    if (error) callback(error);
    else callback(error, stdout
      .split(/Cell [0-9]+ -/)
      .map(parse_cell)
      .filter(has_ssid)
      .sort(by_signal));
  };
}

/**
 * The **iwlist scan** command is used to scan for wireless networks
 * visible to a wireless interface. For convenience, the networks are
 * sorted by signal strength.
 *
 * @static
 * @category iwlist
 * @param {string} interface The wireless network interface.
 * @param {function} callback The callback function.
 * @example
 *
 * var iwlist = require('wireless-tools/iwlist');
 *
 * iwlist.scan('wlan0', function(err, networks) {
 *   console.log(networks);
 * });
 *
 * // =>
 * [
 *   {
 *     address: '00:0b:81:ab:14:22',
 *     ssid: 'BlueberryPi',
 *     mode: 'master',
 *     frequency: 2.437,
 *     channel: 6,
 *     security: 'wpa',
 *     quality: 48,
 *     signal: 87
 *   },
 *   {
 *     address: '00:0b:81:95:12:21',
 *     ssid: 'RaspberryPi',
 *     mode: 'master',
 *     frequency: 2.437,
 *     channel: 6,
 *     security: 'wpa2',
 *     quality: 58,
 *     signal: 83
 *   },
 *   {
 *     address: '00:0b:81:cd:f2:04',
 *     ssid: 'BlackberryPi',
 *     mode: 'master',
 *     frequency: 2.437,
 *     channel: 6,
 *     security: 'wep',
 *     quality: 48,
 *     signal: 80
 *   },
 *   {
 *     address: '00:0b:81:fd:42:14',
 *     ssid: 'CranberryPi',
 *     mode: 'master',
 *     frequency: 2.437,
 *     channel: 6,
 *     security: 'open',
 *     quality: 32,
 *     signal: 71
 *   }
 * ]
 *
 */
function scan(interface, callback) {
  this.exec('sudo /sbin/iwlist ' + interface + ' scan', parse_scan(callback));  
}
