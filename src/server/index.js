var cluster = require('cluster');
var app = require('./app');

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

