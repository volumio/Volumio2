/* eslint-disable */
var fs = require('fs-extra');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var inquirer = require('inquirer');
var websocket = require('socket.io-client');
var os = require('os');
var semver = require('semver');
var unirest = require('unirest');
const { v4: uuidv4 } = require('uuid');

// ============================== CREATE PLUGIN ===============================

/**
 * This function starts the creation of a new plugin, it downloads volumio-plugins
 * repository, then prepares questions for the user
 */
function init() {
    var self = this;
    console.log("Creating a new plugin");

    if(!fs.existsSync("/home/volumio/volumio-plugins")){
        var question = [
            {
                type: 'input',
                name: 'user',
                message: 'volumio plugins folder non existent, please type ' +
                'your github username'
            }
        ];
        inquirer.prompt(question).then(function (answer) {
            var name = answer.user;
            console.log("cloning repo:\ngit clone https://github.com/" + name +
                "/volumio-plugins.git");
            try {
                execSync("/usr/bin/git clone --depth 5 --no-single-branch https://github.com/" + name +
                    "/volumio-plugins.git /home/volumio/volumio-plugins");
                console.log("Done, please run command again");
            }catch(e){
                console.log("Unable to find repo, are you sure you forked it?")
                process.exitCode = 1;
            }
        });
    }
    else {
        process.chdir("/home/volumio/volumio-plugins");
        exec("git config --get remote.origin.url", function (error, stdout, stderr) {
            if (error) {
                console.error('exec error: ${error}');
                process.exitCode = 1;
                return;
            }
            var url = stdout;
            if (url == "https://github.com/volumio/volumio-plugins.git\n") {
                exec("git config user.name", function (error, stdout, stderr) {
                    if (error) {
                        console.error('exec error: ${error}');
                        process.exitCode = 1;
                        return;
                    }
                    var user = stdout;
                    if (user != 'volumio\n'){
                        console.log("Error, your repo is the original one, please " +
                            "fork it as suggested in the documentation!");
                        process.exitCode = 1;
                        return;
                    }
                    else{
                        ask_category();
                    }
                });
            }
            else {
                ask_category();
            }
        });
    }
}

/**
 * This function asks the user to specify a category for his plugin, then
 * proceeds to the one for the name
 */
function ask_category() {
    var categories = [
        "audio_interface",
        "miscellanea",
        "music_service",
        "system_controller",
        "user_interface"
    ];

    var questions = [
        {
            type: 'rawlist',
            name: 'category',
            message: 'Please select the Plugin Category',
            choices: categories
        }];

    inquirer.prompt(questions).then(function (answer) {
        ask_name(categories, answer);
    });
}

/**
 * This function asks the user to specify name for his plugin, then
 * calls for the creation
 * @param categories = list of available categories
 * @param answer = previous selected category
 */
function ask_name(categories, answer) {
    var category = answer.category;
    var prettyName = "";
    questions = [
        {
            type: 'input',
            name: 'name',
            message: 'Please insert a name for your plugin',
            filter: function (name) {
                prettyName = name;
                name = name.replace(/ /g, '_');
                return name.toLowerCase();
            },
            validate: function (name) {
                if(name == "")
                    return "insert a proper name";
                for(var i in categories){
                    if(fs.existsSync("/home/volumio/volumio-plugins/plugins/" +
                            categories[i] + "/" + name) || fs.existsSync("/data/plugins/"+
                            categories[i] + "/" + name) || fs.existsSync("/volumio/app/plugins/"+
                            categories[i] + "/" + name)) {
                        return "Error: this plugin already exists";
                    }
                }
                return true;
            }
        }
    ];
    inquirer.prompt(questions).then(function (answer) {
        create_plugin(answer, category, prettyName);
    });
}

/**
 * This function creates the directories for the custom plugin, using
 * information provided by the user, then calls for customization of files
 * @param answer = name of the plugin
 * @param category = category of the plugin
 */
function create_plugin(answer, category, prettyName) {
    var name = {};
    name.sysName = answer.name;
    name.prettyName = prettyName;
    var path = "/home/volumio/volumio-plugins/plugins/" + category;
    console.log("NAME: " + name.sysName + " CATEGORY: " + category);
    if(!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    path = path + "/" + name.sysName;
    fs.mkdirSync(path);

    console.log("Copying sample files");

    execSync("/bin/cp -rp /home/volumio/volumio-plugins/example_plugin/* " +
        path);

    fs.readFile(path + '/index.js', 'utf8', function (err, data) {
        if (err){
            console.log("Error reading index.js " + err);
        }
        else {
            customize_index(data, name, path, category);
        }
    });
}

/**
 * changes index file, according to the name inserted by the user
 * @param data = the content of index.js
 * @param name = name of the plugin
 * @param path = path of the plugin in volumio-plugin
 * @param category = category of the plugin
 */
function customize_index(data, name, path, category) {
    var splitName = name.sysName.split("_");
    var camelName = "";
    for (var i in splitName) {
        if (i == 0)
            camelName += splitName[i];
        else
            camelName += splitName[i].charAt(0).toUpperCase() +
                splitName[i].slice(1);
    }
    var file = data.replace(/ControllerExamplePlugin/g, camelName);

    fs.writeFile(path + '/index.js', file, 'utf8', function (err) {
        if(err) return console.log("Error writing index.js " + err);
        customize_install(name, path, category);
    });
}

/**
 * changes install file, according to the name inserted by the user
 * @param name = name of the plugin
 * @param path = path of the plugin in volumio-plugin
 * @param category = category of the plugin
 */
function customize_install(name, path, category) {
    fs.readFile(path + '/install.sh', 'utf8', function (err,data) {
        if(err){
            console.log("Error reading install.sh " + err);
        }
        else{
            var file = data.replace(/Example Plugin/g, name.sysName.replace(/_/g, " "));
            fs.writeFile(path + "/install.sh", file, 'utf8', function (err) {
                if(err) return console.log("Error writing install.sh " + err);
                customize_package(name, path, category);
            });
        }
    });
}

/**
 * changes package file, according to the name and category inserted by the
 * user, asks for additional informations like description and author
 * @param pluginName = name of the plugin
 * @param path = path of the plugin in volumio-plugin
 * @param category = category of the plugin
 */
function customize_package(pluginName, path, category) {
    try{
        var package = fs.readJsonSync(path + '/package.json');
        package.name = pluginName.sysName;
        package.volumio_info.prettyName = pluginName.prettyName;
        package.volumio_info.plugin_type = category;
        
        var defaultNodeRange = getRange(semver.coerce(process.versions.node));
        var defaultVolumioRange = getRange(semver.coerce(getVolumioVersion(), { loose: true }));
        
        var semVerRangeCheck = function(range) {
            if(range === '' || range === null) {
                return true;
            }
                
            if(semver.validRange(range) === null){
                return "The semantic version range is not valid";
            }
            return true;
        };
        
        questions = [
            {
                type: 'input',
                name: 'username',
                message: 'Please insert your name',
                default: 'Volumio Team',
                validate: function (name) {
                    if (name.length < 2 || !name.match(/[a-z]/i)){
                        return "please insert at least a couple letters";
                    }
                    return true;
                }
            },
            {
                type: 'input',
                name: 'description',
                message: 'Insert a brief description of your plugin (Maximum 200 characters)',
                default: pluginName.sysName,
                validate: function (desc) {
                    if(desc.length > 200){
                        return "Description is too long. Use 200 characters maximum";
                    }
                    return true;
                }
            },
            {
                type: 'input',
                name: 'nodeVersion',
                message: 'Supply a semantic version range indicating the node version(s) that your plugin supports',
                default: defaultNodeRange,
                validate: semVerRangeCheck
            },
            {
                type: 'input',
                name: 'volumioVersion',
                message: 'Supply a semantic version range indicating the volumio version(s) that your plugin supports',
                default: defaultVolumioRange,
                validate: semVerRangeCheck
            }
        ];
        inquirer.prompt(questions).then(function (answer) {
            package.author = answer.username;
            package.description = answer.description;
            
            var addEngines = false;
            var engines = {};
            
            if(answer.nodeVersion) {
                addEngines = true;
                engines.node = answer.nodeVersion;
            }

            if(answer.volumioVersion) {
                addEngines = true;
                engines.volumio = answer.volumioVersion;
            }
            
            if(addEngines) {
                package.engines = engines;
            }
            
            fs.writeJsonSync(path + '/package.json', package, {spaces:'\t'});
            finalizing(path, package);
        });
    }
    catch(e){
        console.log("Error reading package.json " + e);
    }
}

function getRange(version) {
    if(semver.valid(version)) {
        var baseVersion = version.version;
        var nextVersion = semver.inc(version, 'major');
        return '>=' + baseVersion + ' <' + nextVersion;
    }
    return '';
}

function getVolumioVersion() {

  var file = fs.readFileSync('/etc/os-release').toString().split('\n');
  var volumioVersion = null;
  // console.log(file);
  var nLines = file.length;
  var str;
  for (var l = 0; l < nLines; l++) {
    if (file[l].match(/VOLUMIO_VERSION/i)) {
      str = file[l].split('=');
      return str[1].replace(/\"/gi, '');
    }
  }
}

/**
 * finalizes the creation, copying the new plugin in data and updating
 * plugin.json
 * @param path = path of the plugin
 * @param package = content of package.json
 */
function finalizing(path, package) {
    if(!fs.existsSync("/data/plugins/" + package.volumio_info.plugin_type)){
            fs.mkdirSync("/data/plugins/" + package.volumio_info.plugin_type);
    }
    if(!fs.existsSync("/data/plugins/" + package.volumio_info.plugin_type +
            "/" + package.name)) {
        fs.mkdirSync("/data/plugins/" + package.volumio_info.plugin_type +
            "/" + package.name);
    }

    var pluginName = package.name;
    var field = {
        "enabled": {
        "type": "boolean",
            "value": true
        },
        "status": {
        "type": "string",
            "value": "STARTED"
        }
    }

    try{
        var plugins = fs.readJsonSync("/data/configuration/plugins.json");
        for(var i in plugins){
            if(i == package.volumio_info.plugin_type){
                plugins[i][pluginName] = field;
            }
        }
        fs.writeJsonSync("/data/configuration/plugins.json", plugins, {spaces:'\t'});
    }
    catch(e){
        console.log("Error, impossible to update plugins.json: " + e);
    }

    execSync("/bin/cp -rp /home/volumio/volumio-plugins/plugins/" +
        package.volumio_info.plugin_type + "/" + package.name + "/* " +
        "/data/plugins/" + package.volumio_info.plugin_type + "/" +
        package.name);

    process.chdir("/data/plugins/" + package.volumio_info.plugin_type + "/" +
        package.name);

    console.log("Installing dependencies locally");
    if (fs.existsSync(process.cwd + '/package-lock.json')) {
        execSync("/bin/rm package-lock.json");
    }
    execSync("/usr/bin/npm install --production");
    if (fs.existsSync(process.cwd + '/package-lock.json')) {
        execSync("/bin/rm package-lock.json");
    }

    console.log("\nCongratulation, your plugin has been successfully created!\n" +
        "You can find it in: " + path + "\n");
}

// ============================= UPDATE LOCALLY ===============================
/**
 * This function copies the content of the current folder in the correspondent
 * folder in data, according to the information found in package.json, updating
 * the plugin
 */
function refresh() {
    console.log("Updating the plugin in Data");
    try {
        var package = fs.readJsonSync("package.json");
        execSync("/bin/cp -rp " + process.cwd() + "/* /data/plugins/" +
            package.volumio_info.plugin_type+ "/" + package.name);
        console.log("Plugin succesfully refreshed");
    }
    catch(e){
        console.log("Error, impossible to copy the plugin: " + e);
    }
}

// ================================ COMPRESS ==================================
/**
 * This function creates an archive with the plugin
 */
function zip(){
    console.log("Compressing the plugin");
    try {
        if(! fs.existsSync("node_modules")) {
            console.log("No modules found, running \"npm install\"");
            try{
                if (fs.existsSync(process.cwd + '/package-lock.json')) {
                    execSync("/bin/rm package-lock.json");
                }
                execSync("/usr/bin/npm install --production");
                if (fs.existsSync(process.cwd + '/package-lock.json')) {
                    execSync("/bin/rm package-lock.json");
                }
            }
            catch (e){
                console.log("Error installing node modules: " + e);
                process.exitCode = 1;
                return;
            }
        }
        var package = fs.readJsonSync("package.json");
        execSync("IFS=$'\\n'; /usr/bin/minizip -o -9 " + package.name +
            ".zip $(find -type f -not -name " + package.name + ".zip -printf '%P\\n')",
            {shell: '/bin/bash'}, {cwd: process.cwd()});
        console.log("Plugin succesfully compressed");
    }
    catch (e){
        console.log("Error compressing plugin: " + e);
        process.exitCode = 1;
    }
}

// ================================= COMMIT ===================================

/**
 * This function starts to publish the package, it calls zip to create it, if
 * missing, then switches branch and prepares the folder
 */
function publish() {
    function exit() {
        console.log("For help please go to: https://volumio.github.io/docs/Plugin_System/Writing_A_Plugin.html");
        process.exit(); 
    }
    
    try {
        var package = fs.readJsonSync("package.json");
        if (!package){
            console.log('Error loading package.json' );
            exit();        
        }
        if (!package.engines || !package.engines.volumio){
            console.log('Package.json does not contain engines.volumio field. Example: "engines": { "node": ">=8", "volumio": ">=3" }' );
            exit();        
        }
        if (!package.name){
            console.log('Package.json does not contain name field. Example: "name": "my_project"' );
            exit();        
        }
        if (!package.version){
            console.log('Package.json does not contain version field. Example: "version": "1.0.0"' );
            exit();        
        } else {
            var temp = package.version.split('.');
            if (temp.length != 3) {
                console.log("Please, insert a version number according to format (example: 1.0.0)");
                exit();
            }
            for (var i in temp) {
                if (!temp[i].match(/[0-9]/i)) {
                    console.log("Please, insert only numbers");
                    exit();
                }
            }
        }
        if (!package.author){
            console.log('Package.json does not contain author field. Example: "author": "me2000"' );
            exit();        
        }
        if (!package.description){
            console.log('Package.json does not contain description field. Example: "description": "This is my awesome project"' );
            exit();        
        }
        if (!package.license){
            console.log('Package.json does not contain license field. Example: "license": "ISC"' );
            exit();        
        }
        if (!package.repository){
            console.log('Package.json does not contain repository field. Example: "repository": "http://github.com/yourproject"' );
            exit();        
        }
        if (!package.volumio_info){
            console.log('Package.json does not contain volumio_info field. Example: "volumio_info": { "prettyName": "Plugin Pretty Name", "icon": "fa-spotify", "plugin_type": "music_service", "variants": ["volumio", "justboom", "minidspshd"] },' );
            exit();        
        }
        if (!package.volumio_info.prettyName){
            console.log('Package.json does not contain volumio_info.prettyName field. Example: "prettyName": "My Project"' );
            exit();
        }
        if (!package.volumio_info.architectures){
            console.log('Package.json does not contain volumio_info.architectures field, please add it. Example: "architectures": ["amd64", "armhf", "i386"]' );
            exit();        
        } else {
            //TODO: Get valid architectures from db
            package.volumio_info.architectures.forEach(arch => {
                if (!new Array("amd64", "armhf", "i386").includes(arch)){
                    console.log('Invalid architecture: ' + arch + '. Valid values: "amd64", "armhf", "i386"' );
                    exit();
                }
            });
        }
        if (!package.volumio_info.os){
            console.log('Package.json does not contain volumio_info.os field, please add it. Example: "os": ["buster"]' );
            exit();        
        } else {
            //TODO: Get valid os's from db
            package.volumio_info.os.forEach(os => {
                if (!new Array("buster").includes(os)){
                    console.log('Invalid architecture: ' + os + '. Valid values: "buster"' );
                    exit();
                }
            });
        }
        if (!package.volumio_info.details){
            console.log('Package.json does not contain volumio_info.details field. Example: "volumio_info": { "details": "Lorem ipsum" }' );
            exit();
        }
        if (!package.volumio_info.changelog){
            console.log('Package.json does not contain volumio_info.changelog field. Example: "volumio_info": { "changelog": "Lorem ipsum" }' );
            exit();
        }
        if (!package.volumio_info.plugin_type){
            console.log('Package.json does not contain volumio_info.plugin_type field. Example: "plugin_type": "music_service"' );
            exit();
        }
        if (!new Array("audio_interface", "music_service", "system_controller", "system_hardware", "user_interface").includes(package.volumio_info.plugin_type)){
            console.log('Invalid plugin_type: ' + package.volumio_info.plugin_type + '. Valid values: "audio_interface", "music_service", "system_controller", "system_hardware", "user_interface"' );
            exit();
        }
        if (!package.volumio_info.icon){
            console.log('Package.json does not contain volumio_info.icon field. Example: "icon": "fa-headphones" Available icons: https://fontawesome.com/v5.15/icons' );
            exit();
        }
        if (!package.volumio_info.channel){
            console.log('Package.json does not contain volumio_info.channel field. Example: "volumio_info": { "channel": "beta" } Values: beta, stable' );
            exit();
        }
        if (!new Array("alpha", "beta", "stable").includes(package.volumio_info.channel)){
            console.log('Invalid channel: ' + package.volumio_info.channel + '. Valid values: "alpha", "beta", "stable"');
            exit();
        }
        var questions = [
            {
                type: 'input',
                name: 'version',
                message: 'do you want to change your version? (leave blank ' +
                'for default)',
                default: package.version,
                validate: function (value) {
                    var temp = value.split('.');
                    if (temp.length != 3) {
                        return "Please, insert a version number " +
                            "according to format (example: 1.0.0)";
                    }
                    for (var i in temp) {
                        if (!temp[i].match(/[0-9]/i)) {
                            return "Please, insert only numbers";
                        }
                    }
                    return true;
                }
            }
        ];        
        inquirer.prompt(questions).then(function (answer) {
            package.version = answer.version;
            fs.writeJsonSync("package.json", package, {spaces:'\t'});
            fs.writeFileSync(".gitignore", ".gitignore" + os.EOL + "node_modules" + os.EOL + "*.zip");
            zip();
            var fileName = uuidv4() + ".zip";
            execSync("/bin/mv " + package.name + ".zip /tmp/" + fileName);
            process.chdir("../../../");            
            post_plugin(package, fileName);
        });
    }
    catch (e) {
        console.log("Error publishing plugin: " + e);
    }
}


/**
 * This function updates the plugins.json file, adding the information about
 * the new plugin, then prepares for the commit
 * @param package = package.json
 * @param arch = architecture
 */
function post_plugin(package, fileName) {
    try {
        
        var plugin = {}
        plugin.category = package.volumio_info.plugin_type;
        plugin.name = package.name;
        plugin.prettyName = package.volumio_info.prettyName;
        plugin.icon = package.volumio_info.icon;
        plugin.description = package.description;
        plugin.license = package.license;
        plugin.author = package.author;
        plugin.repository = package.repository;
        plugin.volumioVersion = package.engines.volumio;
        var today = new Date();
        plugin.updated = today.getDate() + "-" + (today.getMonth()+1) + "-" + today.getFullYear();
        plugin.details = package.volumio_info.details;
        plugin.changelog = package.volumio_info.changelog;
        plugin.screenshots = [{"image": "", "thumb": ""}];
        plugin.os = package.volumio_info.os;
        plugin.variants = ["volumio"];
        plugin.architectures = package.volumio_info.architectures;
        plugin.version = package.version;
        plugin.fileName = fileName;
        plugin.channel = package.volumio_info.channel;        

        for (const [key, value] of Object.entries(plugin)) {
            if (value === undefined) {
                console.log('Error: Value for ' + key + ' not defined')
                process.exit();
            }
        }

        let socket = websocket.connect('http://127.0.0.1:3000', {reconnect: true});
        socket.emit('getMyVolumioStatus', {})
        socket.on('pushMyVolumioStatus', function (result) {
            //console.log(result)
            if (result.loggedIn) {
                socket.emit('getMyVolumioToken', {})
                socket.on('pushMyVolumioToken', function (tokenResult) {
                    unirest
                        .post('https://us-central1-volumio-plugins-store.cloudfunctions.net/pluginsv2/plugin')
                        .headers({'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenResult.token})
                        .send(plugin)
                        .then(function (response) {
                            if (response && response.status === 200 && response.body) {
                                console.log('Plugin added');
                                unirest
                                    .post('https://us-central1-volumio-plugins-store.cloudfunctions.net/pluginsv2/plugin/upload')
                                    .headers({'Content-Type': 'multipart/form-data', 'Authorization': 'Bearer ' + tokenResult.token})
                                    .attach('plugin', '/tmp/' + fileName)
                                    .then(function (response) {
                                        if (response && response.status === 200 && response.body) {
                                            console.log('Plugin uploaded');
                                            process.exit();
                                        } else {
                                            if (response.error) {
                                                console.log('Error uploading plugin: ' + response.error);
                                            } else {
                                                console.log('Could not upload plugin: ' + response.body);
                                            }
                                            process.exit();
                                        }
                                    })
                            } else {
                                if (response.error) {
                                    console.log('Error adding plugin: ' + response.error);
                                } else {
                                    console.log('Could not add plugin: ' + response.body);
                                }
                                process.exit();
                            }
                        })
                });
            } else {
                console.log('Error: Please login to myvolumio in order to add plugins.');
                process.exit();
            }            
        })        
    }
    catch(e){
        console.log("Error updating plugins.json: " + e)
    }
}



// =============================== INSTALL ====================================

function install(){
    if(fs.existsSync("package.json")){
        let socket = websocket.connect('http://127.0.0.1:3000', {reconnect: true});
        var package = fs.readJsonSync("package.json");
        zip();
        if(!fs.existsSync("/tmp/plugins")) {
            execSync("/bin/mkdir /tmp/plugins/")
        }
        execSync("/bin/mv *.zip /tmp/plugins/" + package.name + ".zip");
        socket.emit('installPlugin', {url: 'http://127.0.0.1:3000/plugin-serve/'
            + package.name + ".zip"})
        socket.on('installPluginStatus', function (data) {
            console.log("Progress: " + data.progress + "\nStatus :" + data.message + "\n" + data.advancedLog)
            if(data.message == "Plugin Successfully Installed"){
                console.log("Done! Plugin Successfully Installed");
                socket.close();
                process.exit(1);
            }
        })
    }
    else {
        console.log("No package found")
        process.exitCode = 1;
    }
}

// ================================ UPDATE ====================================

function update() {
    if(fs.existsSync("package.json")){
        let socket = websocket.connect('http://127.0.0.1:3000', {reconnect: true});
        var package = fs.readJsonSync("package.json");
        zip();
        if(!fs.existsSync("/tmp/plugins")) {
            execSync("/bin/mkdir /tmp/plugins/")
        }
        execSync("/bin/mv *.zip /tmp/plugins/" + package.name + ".zip");
        socket.emit('updatePlugin', {url: 'http://127.0.0.1:3000/plugin-serve/'
            + package.name + ".zip", category: package.category, name: package.name})
        socket.on('installPluginStatus', function (data) {
            console.log("Progress: " + data.progress + "\nStatus :" + data.message)
            if(data.message == "Plugin Successfully Installed"){
                console.log("Done!");
                socket.close()
            }
        })
    }
    else {
        console.log("No package found")
        process.exitCode = 1;
    }
}

// ================================ START =====================================
var argument = process.argv[2];

switch (argument){
    case "init":
        init()
        break;
    case "refresh":
        refresh()
        break;
    case "package":
        zip()
        break;
    case "publish":
        publish()
        break;
    case "install":
        install()
        break;
    case "update":
        update()
        break;
}
