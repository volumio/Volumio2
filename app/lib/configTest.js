/**
 * Created by massi on 27/07/15.
 */
var config=new (require(__dirname+'/config.js'))();

config.loadFile(__dirname+'/testConfig.json');

console.log("VALUE "+config.get('debug'));
console.log("VALUE "+config.get('env'));
console.log("VALUE "+config.get('structured.a'));
console.log("VALUE "+config.get('structured.b'));

config.set('debug',true);
config.set('env',"PRODUCTION");
config.set('structured.a',500);
config.set('structured.b',1000);

console.log("VALUE "+config.get('debug'));
console.log("VALUE "+config.get('env'));
console.log("VALUE "+config.get('structured.a'));
console.log("VALUE "+config.get('structured.b'));

