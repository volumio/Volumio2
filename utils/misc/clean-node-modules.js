const modclean = require('modclean');
const execSync = require('child_process').execSync;
const modulesFolder = process.cwd() + '/node_modules';

console.log('Cleaning node modules in folder ' + modulesFolder);

try {
    const preCleanSize = execSync('du -sbm ' + modulesFolder + '  | cut -f1');
    console.log('Pre-clean size is ' + preCleanSize);
} catch (e) {
    console.log('Error, cannot determine size for ' + modulesFolder);
}

modclean(function(err, results) {
    if(err) {
        console.error('Error, cannot clean: ' + err);
        return;
    } else {
        const postCleanSize = execSync('du -sbm ' + modulesFolder + '  | cut -f1');
        console.log(results.length + ' files removed, Post-clean size is ' + postCleanSize);
    }
});