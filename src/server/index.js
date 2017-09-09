var cluster = require('cluster'); 
var app = require('./app');
var fs = require("fs");
var config = require("./config");
var path = require("path");

// Set up application root directory
global.appRoot = path.normalize(path.resolve(__dirname) + "/../../");

configureEnvironment();


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

function configureEnvironment() {
	// Set up Environment Variables
	var env = process.env.NODE_ENV; //production or staging
	if (env == undefined) {
		process.env.NODE_ENV = "development"; //when running locally
	}
	
	if (process.env.NODE_ENV == "development") {
		global.hostname = config.development.hostname;
	} else if (process.env.NODE_ENV == "staging") {
		global.hostname = config.staging.hostname;
	} else if (process.env.NODE_ENV == "production") {
		global.hostname = config.production.hostname;
	}
}