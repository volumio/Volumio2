const modclean = require('modclean');
const execSync = require('child_process').execSync;
var modulesFolder = modulesFolder = process.cwd() + '/node_modules'; // eslint-disable-line
var folder = process.cwd();

if (process.argv[2]) {
  modulesFolder = process.argv[2] + '/node_modules';
  folder = process.argv[2];
}

console.log('Cleaning node modules in folder ' + modulesFolder);

try {
  const preCleanSize = execSync('du -sbm ' + modulesFolder + '  | cut -f1');
  console.log('Pre-clean size is ' + preCleanSize);
} catch (e) {
  console.log('Error, cannot determine size for ' + modulesFolder);
}

modclean({'cwd': folder}, function (err, results) {
  if (err) {
    console.error('Error, cannot clean: ' + err);
  } else {
    const postCleanSize = execSync('du -sbm ' + modulesFolder + '  | cut -f1');
    console.log(results.length + ' files removed, Post-clean size is ' + postCleanSize);
  }
});
