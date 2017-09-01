var cluster = require('cluster'); 
var app = require('./app');
var fs = require("fs");
var config = require("./config");

var logDir = global.appRoot + config.path.logFolder;
var access = fs.createWriteStream(logDir + '/node.access.log', { flags: 'a' })
      , error = fs.createWriteStream(logDir + '/node.error.log', { flags: 'a' });

// redirect stdout / stderr
/*
process.stdout.pipe(access);
process.stderr.pipe(error);

process.stdout.write = access.write.bind(access);
process.stderr.write = error.write.bind(error);

process.on('uncaughtException', function(err) {
  console.error((err && err.stack) ? err.stack : err);
});

*/

var env = process.env.NODE_ENV; //production or staging
if (env == undefined) {
	env = "dev"; //when running locally
}

console.log("Environment : " + env);
console.log("testing");

if (cluster.isMaster) {
        // // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    //gaurav - use one cpu for now for troubleshooting other issues
    cpuCount = 1;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }
} else {
        app();
}

