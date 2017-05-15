var fs = require('fs-extra');
const readline = require('readline');

function init() {
    var self = this;
    console.log("Creating a new plugin!");

    if(fs.existsSync("/home/volumio/volumio-plugins")){
        console.log("volumio plugins non existent!");
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("Please select the Plugin Category\n\n1 - audio_interface\n2 " +
        "- miscellanea\n3 - music_service\n4 - system_controller\n5 - " +
        "user_interface\n");

    var category = 0;

    rl.on('line', function (line) {
        category = parseInt(line.trim());
        if(category > 0 && category < 5){
            switch (category){
                case 1:
                    category = "audio_interface"
                    break;
                case 2:
                    category = "miscellanea"
                    break;
                case 3:
                    category = "music_service"
                    break;
                case 4:
                    category = "system_controller"
                    break;
                case 5:
                    category = "user_interface"
                    break;
            }
            rl.close();
            process.stdin.destroy();
            create_plugin();
        }
        else{
            console.log("Please insert a number according to existing categories");
        }
    });


}

function refresh() {
    console.log("Copying the plugin in Data");
}

function zip(){
    console.log("Compressing the plugin");
}

function publish() {
    console.log("Publishing the plugin");
}

function start_message() {
    console.log("---- VOLUMIO PLUGIN HELPER ---- \n\nThis utility helps you " +
        "creating new plugins for Volumio.\nOptions: \n1) init - creates a new " +
        "plugin\n2) refresh - copies the plugin in the system\n3) zip - compresses " +
        "the plugin \n4) publish - publishes the plugin on git");

    //console.log(process.cwd());
}

function ask_category(){

}

function create_plugin() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("Please type a name for your plugin")

    var name = "";

    rl.on('line', function (line) {
        name = line.trim();
        rl.close();
        process.stdin.destroy();
        return name;
    });
}

var argument = process.argv[2];

switch (argument){
    case "init":
        init()
        break;
    case "refresh":
        refresh()
        break;
    case "zip":
        zip()
        break;
    case "publish":
        publish()
        break;
    default:
        start_message()
        break;
}
