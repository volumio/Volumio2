// A simple metrics/benchmarking framework

class Metrics {
  constructor () {
    this.start = {};
    this.end = {};

    this.log = (label) => {
      if (this.check(label)) {
        this.end[label] = process.hrtime(this.start[label]);
        console.log(`\u001b[34m [Metrics] \u001b[39m ${label}: \u001b[31m ${this.end[label][0]}s ${(this.end[label][1] / 1000000).toFixed(2)}ms \u001b[39m`);
      } else {
        throw Error(`Timer for ${label} not found`);
      }
    };

    this.time = (label) => {
      if (!this.check(label)) {
        this.start[label] = process.hrtime();
      } else {
        throw Error(`Timer for ${label} already exists`);
      }
    };

    this.check = (label) => {
      if (typeof this.start[label] === 'undefined') {
        return false;
      } else {
        return true;
      }
    };
  }

  dump () {
    return this.end;
  }
}

module.exports = Metrics;
