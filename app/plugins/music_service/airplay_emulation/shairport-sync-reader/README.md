# shairport-sync-reader
[shairport-sync](https://github.com/mikebrady/shairport-sync) metadata reader for nodejs

**WORK IN PROGESS**

## Usage

```javascript
// import the module
var ShairportReader = require('shairport-sync-reader');

// read from pipe
var pipeReader = new ShairportReader({ path: 'path/to/shairport-sync/metadata/pipe' });

// read from udp
var pipeReader = new ShairportReader({ address: '127.0.0.1', port: '255' });
```

returned object is an event emitter with following events:
event names are taken from [shairport-sync-metadata-reader](https://github.com/mikebrady/shairport-sync-metadata-reader)

event | description | data
----- | ----------- | ----
pbeg | play stream begin. `snam` is not always send | ```{ 'Client-IP': clip, 'User-Agent': snua, 'Active-Remote': acre, 'DACP-ID': daid, 'X-Apple-Client-Name': snam }```
pfls | play stream flush | -
prgr | progress, in second | ```{ start: 0, current: 17, end: 42 }```
pvol | play volume | -
meta | metadata | all metadata send between `mdst` and `mden`, parsed
PICT | artwork | either a JPEG or a PNG
error | when `snal` occurs | -