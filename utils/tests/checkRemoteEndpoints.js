var modulesFolder = modulesFolder = process.cwd() + '/node_modules'; // eslint-disable-line
var libQ = require('kew');
var unirest = require('unirest');

var endpointsToCheck = ['https://google.com',
    'https://www.googleapis.com',
    'https://securetoken.googleapis.com',
    'https://myvolumio.firebaseio.com',
    'https://functions.volumio.cloud',
    'https://oauth-performer.dfs.volumio.org',
    'https://browsing-performer.dfs.volumio.org',
    'http://cddb.volumio.org',
    'https://functions.volumio.cloud',
    'http://pushupdates.volumio.org',
    'http://plugins.volumio.org',
    'https://database.volumio.cloud',
    'https://radio-directory.firebaseapp.com'
];

var checkFunctions = [];
console.log('TESTING REMOTE ENDPOINTS');
for (var i in endpointsToCheck) {
    checkFunctions.push(checkEndpoint(endpointsToCheck[i]));
}

libQ.all(checkFunctions)
    .then(function (content) {
        var failedList = [];
        for (var j in content) {
            console.log((content[j].endpoint) + ', ' + content[j].elapsedTime + ' ms'  + ': ' + (content[j].success ? 'OK' : 'FAILED'));
            if (!content[j].success) { failedList.push(content[j].endpoint)};
        }
        console.log('----------')
        if (failedList.length) {
            console.log('WARNING!!! Some remote endpoints cannot be reached!');
            console.log('Failing endpoints: ');
            for (var k in failedList) {
                console.log(failedList[k] + ', ' + content[j].elapsedTime + ' ms');
            }

        } else {
            console.log('REMOTE ENDPOINTS TEST OK, all Endpoints are reachable');
        }
        console.log('----------');
    });

function checkEndpoint(endpoint) {
    var defer = libQ.defer();

    var start=Date.now()

    unirest
        .head(endpoint)
        .timeout(5000)
        .then((response) => {
            var elapsedTime=Date.now()-start
            if (response && response.headers) {
                defer.resolve({'endpoint': endpoint, 'success': true, 'elapsedTime':elapsedTime});
            } else {
                defer.resolve({'endpoint': endpoint, 'success': false, 'elapsedTime':elapsedTime});
            }
        })
        .catch(err => {
            var elapsedTime=Date.now()-start
            defer.resolve({'endpoint': endpoint, 'success': false, 'elapsedTime':elapsedTime});
        })

    return defer.promise;
}



