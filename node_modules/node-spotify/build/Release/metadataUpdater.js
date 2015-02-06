/**
 * Saves collections of objects that should be checked for their isLoaded flag in the metadata_updated
 * callback along with a callback to use on them.
 * {
 *   objects: [],
 *   callback: function(object)... 
 * }
 **/
var notLoadedObjects = [];

/**
 * This method will be attached to the metadata_updated callback. It will
 * iterate over all objects in the notLoadedObjects array and check of they have been loaded with this call.
 * If so the provided callback is called. All objects that are not loaded will be saved to notLoadedObjects again.
 **/
function metadataUpdated() {
    var length = notLoadedObjects.length;
    for(var i = 0; i < length; i++) {
        var toUpdate = notLoadedObjects.shift();
        var newQueueItem = { objects: [], callback: toUpdate.callback };
        toUpdate.objects.forEach(function(object) {
        if(object.isLoaded) {
            toUpdate.callback(object);
        } else {
            newQueueItem.objects.push(object);
        }
      });
      if(newQueueItem.objects.length > 0) {
        notLoadedObjects.push(newQueueItem);
      }
    }
}

/**
 * Creates a new entry in notLoadedObjects containing all objects in the parameter objects along with the callback.
 **/
function waitForLoaded(objects, callback) {
    var notLoaded = {
        objects: objects,
        callback: callback
    };
    if(notLoaded.objects.length > 0) {
        notLoadedObjects.push(notLoaded);
    }
}

module.exports = {
    waitForLoaded: waitForLoaded,
    metadataUpdated: metadataUpdated
};