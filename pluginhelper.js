/* eslint-disable */
var fs = require('fs-extra');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var inquirer = require('inquirer');
var websocket = require('socket.io-client');
var os = require('os');

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
            }
        ];
        inquirer.prompt(questions).then(function (answer) {
            package.author = answer.username;
            package.description = answer.description;
            fs.writeJsonSync(path + '/package.json', package, {spaces:'\t'});
            finalizing(path, package);
        });
    }
    catch(e){
        console.log("Error reading package.json " + e);
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
    execSync("/usr/local/bin/npm install --production");
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
                execSync("/usr/local/bin/npm install --production");
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
    console.log("Publishing the plugin");

    try {
        var package = fs.readJsonSync("package.json");
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
            try {
                execSync("/usr/bin/git add *");
            }
            catch (e){
                console.log("Nothing to add");
            }

            try {
                execSync("/usr/bin/git commit -am \"updating plugin " +
                    package.name + " version " + package.version + "\"");

            }
            catch (e){
                console.log("Nothing to commit");
            }

            zip();

            execSync("/bin/mv " + package.name + ".zip /tmp/");
            process.chdir("../../../");
            execSync("/usr/bin/git checkout gh-pages");
            var arch = "";
            exec("cat /etc/os-release | grep ^VOLUMIO_ARCH | tr -d \'VOLUMIO_ARCH=\"\'",
                function (error, stdout, stderr) {
                    if (error) {
                        console.error('Error, cannot detect system architecture: '+error);
                        return;
                    } else {
                        arch = stdout.replace(/\n$/, '');
                        if (arch == 'x86') {
                            arch = 'i386';
                        }
                        else {
                            arch = 'armhf';
                        }
                        create_folder(package, arch);
                    }

                });
        });
    }
    catch (e) {
        console.log("Error publishing plugin: " + e);
    }
}

/**
 * This functions creates the appropriate folder path for the package
 * @param package = package.json
 * @param arch = architecture
 */
function create_folder(package, arch) {
    var path = process.cwd() + "/plugins/volumio/" + arch + "/" +
        package.volumio_info.plugin_type;
    if(!fs.existsSync(path + "/" + package.name)){
        if(!fs.existsSync(path)){
            fs.mkdirSync(path);
        }
        fs.mkdirSync(path + "/" + package.name);
    }
    execSync("/bin/cp -rp /tmp/" + package.name + ".zip " + path + "/" +
        package.name);

    update_plugins(package, arch);
}

/**
 * This function updates the plugins.json file, adding the information about
 * the new plugin, then prepares for the commit
 * @param package = package.json
 * @param arch = architecture
 */
function update_plugins(package, arch) {
    try {
        var plugins = fs.readJsonSync(process.cwd() + "/plugins/volumio/" + arch +
        "/plugins.json");
        var i = 0;
        var catFound = false;
        var plugFound = false;
        for (i = 0; i < plugins.categories.length; i++){
            if(plugins.categories[i].name == package.volumio_info.plugin_type){
                var j = 0;
                for (j = 0; j < plugins.categories[i].plugins.length; j++){
                    if(plugins.categories[i].plugins[j].name == package.name){
                        var today = new Date();
                        plugins.categories[i].plugins[j].updated =
                            today.getDate() + "-" + (today.getMonth()+1) +
                            "-" + today.getFullYear();
                        plugins.categories[i].plugins[j].version = package.version;
                        update_desc_details(package, plugins, i, j, arch);
                        plugFound = true;
                        catFound = true;
                    }
                }
                if(j == plugins.categories[i].plugins.length && !plugFound &&
                    plugins.categories[i].plugins[j-1].name != package.name){
                    write_new_plugin(package, arch, plugins, i);
                    catFound = true;
                }
            }
        }
        if(i == plugins.categories.length && plugins.categories[i-1].name
            != package.volumio_info.plugin_type && !catFound){
            write_new_category(package, arch, plugins, i);
        }
    }
    catch(e){
        console.log("Error updating plugins.json: " + e)
    }
}

/**
 * This function creates a json containing information about the new plugin
 * @param package = package.json
 * @param arch = architecture
 * @param plugins = plugins.json
 * @param index = plugin_index
 */
function write_new_plugin(package, arch, plugins, index) {
    var data = {};
    var question = [
        {
            type: 'input',
            name: 'details',
            message: 'Insert some details about your plugin (e.g. features, ' +
            'requirements, notes, etc... max 1000 chars)',
            default: "",
            validate: function (desc) {
                if(desc.length > 1000){
                    return "Description is too long. Use 1000 characters maximum";
                }
                return true;
            }
        }
    ];
    inquirer.prompt(question).then(function (answer) {
        var today = new Date();
        data.prettyName = package.volumio_info.prettyName;
        if (package.icon != undefined) {
            data.icon = package.icon;
        } else {
            data.icon = "fa-lightbulb-o";
        }
        data.name = package.name;
        data.version = package.version;
        data.url = "http://volumio.github.io/volumio-plugins/" +
            "plugins/volumio/" + arch + "/" +
            package.volumio_info.plugin_type + "/" +
            package.name + "/" + package.name + ".zip";
        data.license = package.license;
        data.description = package.description;
        data.details = answer.details;
        data.author = package.author;
        data.screenshots = [{"image": "", "thumb": ""}];
        data.updated = today.getDate() + "-" + (today.getMonth()+1) +
            "-" + today.getFullYear();

        plugins.categories[index].plugins.push(data);
        fs.writeJsonSync(process.cwd() + "/plugins/volumio/" +
            arch + "/plugins.json", plugins, {spaces:'\t'});

        commit(package, arch);
    });
}

/**
 * This function creates a json with info about the category in which to put
 * the plugin, called if the category is missing from plugins.json
 * @param package = package.json
 * @param arch = architecture
 * @param plugins = plugins.json
 * @param index = plugin_index
 */
function write_new_category(package, arch, plugins, index){
    var data = {};
    data.prettyName = package.volumio_info.plugin_type.replace(/_/g, " ");
    data.name = package.volumio_info.plugin_type;
    data.id = "cat" + (index+1);
    data.description = "";
    data.plugins = [];

    plugins.categories.push(data);
    write_new_plugin(package, arch, plugins, index);
}

/**
 * This function updates description and details for an already existing plugin
 * @param package = package.json
 * @param plugins = plugins.json
 * @param catIndex = i
 * @param plugIndex = j
 */
function update_desc_details(package, plugins, catIndex, plugIndex, arch) {
    var descDet = {};
    var questions = [
        {
            type: 'input',
            name: 'details',
            message: 'Do you want to change the details of your plugin?' +
            ' (leave blank for default)',
            default: plugins.categories[catIndex].plugins[plugIndex].details,
            validate: function (desc) {
                if(desc.length > 1000){
                    return "Description is too long. Use 1000 characters maximum";
                }
                return true;
            }
        },
        {
            type: 'input',
            name: 'description',
            message: 'Do you want to change the description of your plugin?' +
            ' (leave blank for default)',
            default: package.description,
            validate: function (desc) {
                if(desc.length > 200){
                    return "Description is too long. Use 200 characters maximum";
                }
                return true;
            }
        }
    ];
    inquirer.prompt(questions).then(function (answer) {
        plugins.categories[catIndex].plugins[plugIndex].details = answer.details;
        plugins.categories[catIndex].plugins[plugIndex].description = answer.description;

        fs.writeJsonSync(process.cwd() + "/plugins/volumio/" +
            arch + "/plugins.json", plugins, {spaces:'\t'});

        commit(package, arch);
    });
}

/**
 * This function creates a commit for github, it pushes it if called by volumio
 * else it notifies that commit is ready
 * @param package = package.json
 * @param arch = architecture
 */
function commit(package, arch) {
    execSync("/usr/bin/git add " + process.cwd() + "/plugins/volumio/" + arch +
       "/" + package.volumio_info.plugin_type + "/" + package.name + "/*");
    execSync("/usr/bin/git commit -am \"updating plugin " + package.name + " " +
        package.version + "\"");
    console.log("updating plugin sources:\n");
    execSync("/usr/bin/git push origin master");
    console.log("updating plugin packages:\n");
    execSync("/usr/bin/git push origin gh-pages");
    console.log("Congratulations, your package has been correctly uploaded and" +
        "is ready for merging!")
    process.exit(1)
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
