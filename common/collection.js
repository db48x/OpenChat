// collection class for active users
function Collection(initial) {
    this.count = 0;
    var collection = Object.create(null);    
    
    if (initial) {
        Object.keys(initial).forEach(function (k) { collection[k] = initial[k]; });
    }
    
    this.has = function (prop) {
        return Object.hasOwnProperty.call(collection, prop);
    };
    this.add = function (key, item) {
        collection[key] = item;
        return ++this.count;
    };
    this.remove = function (key) {
        if (!this.has(key)) 
            return undefined;
        delete collection[key];
        return --this.count;
    };
    this.item = function (key) {
        return collection[key];
    };
    this.forEach = function (callback) {
        if (!callback || typeof callback != 'function')
            return;
        this.keys()
            .forEach(function (k) {
                         callback(k, collection[k]);
                     });
    };
    this.keys = function () {
        return Object.keys(collection);
    };
};

if (typeof module !== 'undefined')
  module.exports = Collection;
