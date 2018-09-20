const fs = require('fs');
const xml2js = require('xml2js');
const ShairportSyncReader = require('./shairport-sync-reader-base');

class ShairportSyncReaderPipe extends ShairportSyncReader {
  constructor (opts) {
    super();
    this._XML = '';
    this._source = fs.createReadStream(opts.path).on('data', this._readChunk.bind(this));
  }
  _readChunk (chunk) {
    var XMLPart,
      itemStart,
      itemEnd;

    this._XML += chunk;

    itemStart = this._XML.indexOf('<item>');
    this._XML = this._XML.substring(itemStart !== -1 ? itemStart : this._XML.length);

    // check if there is any full tag
    itemEnd = this._XML.lastIndexOf('</item>');

    // if no - skip
    if (itemStart === -1 || itemEnd === -1) {
      return;
    }

    itemEnd += '</item>'.length;

    XMLPart = this._XML.substring(0, itemEnd);
    this._XML = this._XML.slice(itemEnd);

    xml2js.parseString('<root>' + XMLPart + '</root>', {
      trim: true,
      explicitRoot: false,
      preserveChildrenOrder: true
    }, (err, result) => {
      if (err || !result || !result.item) {
        return;
      }
      result.item.forEach(item => {
        var data;

        if (!item.code || !item.type) {
          return;
        }

        data = {
          type: Buffer.from(item.type[0], 'hex').toString(),
          code: Buffer.from(item.code[0], 'hex').toString(),
          cont: Buffer.allocUnsafe(0)
        };

        if (item.data && item.data[0]._) {
          data.cont = Buffer.from(item.data[0]._, 'base64');
        }

        this.useData(data);
      });
    });
  }
}

module.exports = ShairportSyncReaderPipe;
