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

    modifyQueueLength(index = 0) {
        var mapping = this.stateMachine.playQueue.arrayQueue.map((_, i) => i);
        var shuffled = false;

        if (index) {
            shuffled = true;
            this.queueMap = underscore.shuffle(mapping);
        } else if (this.queueMap.length < this.stateMachine.playQueue.arrayQueue.length) {
            shuffled = true;
            this.queueMap = underscore.shuffle(mapping);
        } else if (this.queueMap.length > this.stateMachine.playQueue.arrayQueue.length) {
            shuffled = true;
            this.queueMap = underscore.shuffle(mapping);
        }

        if (shuffled) {
            var mappedIndex = this.queueMap.indexOf(index);
            this.queueMap.splice(mappedIndex, 1);
            this.queueMap.unshift(index);
        }
    }

    getRandomListPosition(index) {
        return this.queueMap[index || 0];
    }

    next() {
        this.modifyQueueLength();
        this.position++;

        if (this.position > this.queueMap.length - 1 && this.stateMachine.currentRepeat) {
            this.position = 0;
        } else if (this.position > this.queueMap.length - 1) {
            this.queueMap = [];
        }

        var nextIndex = this.getRandomListPosition(this.position);
        if (nextIndex === undefined) {
          this.position = 0;
        }
        return nextIndex !== undefined ? nextIndex : this.stateMachine.playQueue.arrayQueue.length;
    }

    prev() {
        this.modifyQueueLength();
        this.position--;

        if (this.position < 0 && this.stateMachine.currentRepeat) {
            this.position = this.queueMap.length-1;
        } else  if (this.position < 0) {
            this.queueMap = [];
        }

        var prevIndex = this.getRandomListPosition(this.position);
        if (prevIndex === undefined) {
          this.position = 0;
        }
        return prevIndex !== undefined ? prevIndex : this.stateMachine.playQueue.arrayQueue.length;
    }

    reset() {
        this.position = 0;
    }

}

module.exports = RandomQueue;
