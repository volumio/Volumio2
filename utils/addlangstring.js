/**
 * This little helper is written to make translations more streamlined
 * it is written in node to make it cross platform
 *
 * Useage:
 * addLangString rootKey langKey "String to add"
 * npm run addLangString -- ALARM TEST 'This is my test string'
 * npm run addLangString -- COMMON MYSETTING 'This is my setting string'
 * Could be as simple as:
 ───────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
        │ File: .\addnewstring.sh
 ───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    1   │ #!/bin/bash
    2   │
    3   │ ROOT="$1"
    4   │ KEY="$2"
    5   │ STRING="$3"
    6   │ printf -v jq_cmd ".%s += {%s:\"%s\"}" "${ROOT}" "${KEY}" "${STRING}"
    7   │ for filename in ./app/i18n/*.json; do
    8   │   jq "$jq_cmd" $filename | sponge $filename
    9   │ done
 */
const fs = require('fs');
const path = require('path');

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

const args = process.argv.slice(2);
const [rootKey, langKey, langString] = args;
readline.question('Beware, this assumes you know what your doing!\nContinue?[Y/n] ', (line) => {
  if (line.toUpperCase() !== 'Y' && line !== '') {
    console.log('Exiting!');
    process.exit();
  }
  readline.close();
  addLangString('./app/i18n/');
});

function addLangString (langDirPath) {
  const langENFile = fs.readFileSync(path.join(langDirPath, 'strings_en.json'));
  const langEN = JSON.parse(langENFile);

  if (Object.keys(langEN).includes(rootKey)) {
    console.log(`Adding ${rootKey}.${langKey} = ${langString}`);
    langEN[rootKey][langKey] = langString;
  } else {
    console.error(`${rootKey} not found! in strings_en`);
  }

  const files = fs.readdirSync(langDirPath);
  files.forEach((file) => {
    const fullFile = path.join(langDirPath, file);
    if (path.extname(file) === '.json' && path.basename(file, '.json') !== 'strings_en') {
      console.log(`Processing: ${file}`);
      const langJSON = JSON.parse(fs.readFileSync(fullFile));
      langJSON[rootKey][langKey] = '';
      langJSON[rootKey] = Object.fromEntries(Object.entries(langJSON[rootKey]).sort());
      fs.writeFileSync(fullFile, JSON.stringify(langJSON, null, 2));
    } else {
      console.warn('Skipping file: ', file);
    }
  });
  console.log('Finished');
}
