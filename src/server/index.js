const cluster = require('cluster'); 
const app = require('./app');
const logger = require("./logger");

if (cluster.isMaster) {
        // // Count the machine's CPUs
    let cpuCount = require('os').cpus().length;

    //gaurav - use one cpu for now for troubleshooting other issues
    cpuCount = 1;

    // Create a worker for each CPU
    for (let i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }
} else {
    app(function(err) {
    	if (err) {
    		logger.error("Fatal Error.  Node JS App NOT STARTED.  " + err);
    		process.exit(1);
    	}
    });		
}