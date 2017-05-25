var fs = require('fs-extra');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var inquirer = require('inquirer');

// ============================== CREATE PLUGIN ===============================

/**
 * This function starts the creation of a new plugin, it downloads volumio-plugins
 * repository, then prepares questions for the user
 */
function init() {
    var self = this;
    console.log("Creating a new plugin");

    if(!fs.existsSync("/home/volumio/volumio-plugins")){
        console.log("volumio plugins folder non existent, cloning repo:\n" +
            "git clone https://github.com/volumio/volumio-plugins.git");
        execSync("/usr/bin/git clone https://github.com/volumio/volumio-plugins.git " +
            "/home/volumio/volumio-plugins")
    }

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
        ask_user(categories, answer);
    });
}

/**
 * This function asks the user to specify name and category for his plugin, then
 * calls for the creation
 * @param categories = list of available categories
 * @param answer = previous selected category
 */
function ask_user(categories, answer) {
    var category = answer.category;
    questions = [
        {
            type: 'input',
            name: 'name',
            message: 'Please insert a name for your plugin',
            filter: function (name) {
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
        create_plugin(answer, category);
    });
}

/**
 * This function creates the directories for the custom plugin, using information
 * provided by the user, then calls for customization of files
 * @param answer = name of the plugin
 * @param category = category of the plugin
 */
function create_plugin(answer, category) {
    var name = answer.name;
    var path = "/home/volumio/volumio-plugins/plugins/" + category;
    console.log("NAME: " + name + " CATEGORY: " + category);
    if(!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    path = path + "/" + name;
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
    var splitName = name.split("_");
    var camelName = "";
    for (var i in splitName) {
        if (i == 0)
            camelName += splitName[i];
        else
            camelName += splitName[i].charAt(0).toUpperCase() + splitName[i].slice(1);
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
            var file = data.replace(/Example Plugin/g, name.replace(/_/g, " "));
            fs.writeFile(path + "/install.sh", file, 'utf8', function (err) {
                if(err) return console.log("Error writing install.sh " + err);
                customize_package(name, path, category);
            });
        }
    });
}

/**
 * changes package file, according to the name and category inserted by the user,
 * asks for additional informations like description and author
 * @param pluginName = name of the plugin
 * @param path = path of the plugin in volumio-plugin
 * @param category = category of the plugin
 */
function customize_package(pluginName, path, category) {
    try{
        var package = fs.readJsonSync(path + '/package.json');
        package.name = pluginName;
        package.volumio_info.prettyName = pluginName.replace(/_/g, " ");
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
                message: 'Insert a brief description of your plugin (100 chars)',
                default: pluginName,
                validate: function (desc) {
                    if(desc.length > 100){
                        return "please be brief";
                    }
                    return true;
                }
            }
        ];
        inquirer.prompt(questions).then(function (answer) {
            package.author = answer.username;
            package.description = answer.description;
            fs.writeJsonSync(path + '/package.json', package);
            finalizing(path, package);
        });
    }
    catch(e){
        console.log("Error reading package.json " + e);
    }
}

/**
 * finalizes the creation, copying the new plugin in data and updating plugin.json
 * @param path = path of the plugin
 * @param package = content of package.json
 */
function finalizing(path, package) {
    if(!fs.existsSync("/data/plugins/" + package.volumio_info.plugin_type)){
            fs.mkdirSync("/data/plugins/" + package.volumio_info.plugin_type);
            if(!fs.existsSync("/data/plugins/" + package.volumio_info.plugin_type + "/" +
                    package.name)) {
                fs.mkdirSync("/data/plugins/" + package.volumio_info.plugin_type + "/" +
                    package.name)
            }
    }

    var pluginName = package.name;
    var field = {
        pluginName: {
            "enabled": {
            "type": "boolean",
                "value": true
            },
            "status": {
            "type": "string",
                "value": "STARTED"
            }
        }
    }

    //TODO finish to write in plugins.json
    try{
        var plugins = fs.readJsonSync("/data/configuration/plugins.json");
        for(var i in plugins){
            if(Object.keys(plugins)[i] == package.volumio_info.plugin_type){
                plugins[i].push(field);
            }
        }
        fs.writeJsonSync("/data/configuration/plugins.json", plugins);
    }
    catch(e){
        console.log("Error, impossible to update plugins.json: " + e);
    }

    execSync("/bin/cp -rp /home/volumio/volumio-plugins/plugins/" + package.volumio_info.plugin_type +
        "/" + package.name + "/* /data/plugins/" + package.volumio_info.plugin_type +
        "/" + package.name);

    console.log("Congratulation, your plugin has been succesfully created!\n" +
        "You can find it in: " + path);
}

// ========================= INSTALL/UPDATE LOCALLY ===========================

function refresh() {
    console.log("Updating the plugin in Data");
    try
    {
        var package = fs.readJsonSync("package.json");
        execSync("/bin/cp -rp" + __dirname + "/data/plugins/" + package.volumio_info.plugin_type+
           "/" + package.name);
    }
    catch(e){
        console.log("Error, impossible to copy the plugin: " + e)
    }
}

// ================================ COMPRESS ==================================
function zip(){
    console.log("Compressing the plugin");
}

// ================================= COMMIT ===================================
function publish() {
    console.log("Publishing the plugin");
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
}
