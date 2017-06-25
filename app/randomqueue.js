'use strict';


// Credit to Underscore.js for the shuffle function
// Avoid requiring the whole library for the one function, so using the source.
var underscore = {};
underscore.random = function (min, max) {
    if (max == null) {
        max = min;
        min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
};
underscore.shuffle = function (set) {
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
        rand = underscore.random(0, index);
        if (rand !== index) shuffled[index] = shuffled[rand];
        shuffled[rand] = set[index];
    }
    return shuffled;
};

class RandomQueue {
    constructor(stateMachine) {
        this.stateMachine = stateMachine;

        this.queueMap = [];
        this.position = 0;
    }

    _modifyQueueLength(playQueue) {
        const mapping = playQueue.map((_, i) => i);

        if (this.queueMap.length < playQueue.length) {
            this.queueMap = underscore.shuffle(mapping);
        } else if (this.queueMap.length < playQueue.length) {
            this.queueMap = underscore.shuffle(mapping);
        }
    }

    getRandomListPosition(index) {
        if (!this.queueMap.length) {
            this._modifyQueueLength(this.stateMachine.playQueue.arrayQueue);
        }
        return this.queueMap[index || 0];
    }

    next(playQueue) {
        this._modifyQueueLength(playQueue);
        this.position++;

        if (this.position > this.queueMap.length-1) {
            this.position = 0;
        }

        return this.getRandomListPosition(this.position);
    }

    prev(playQueue) {
        this._modifyQueueLength(playQueue);
        this.position--;

        if (this.position < 0 ) {
            this.position = this.queueMap.length-1;
        }

        return this.getRandomListPosition(this.position);
    }

}

module.exports = RandomQueue;
