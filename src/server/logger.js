var winston = require("winston");
var config = require("./config");

const tsFormat = () => {
	var date = new Date();
	return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

var logFileName = "";
var logLevel = "";

var env = process.env.NODE_ENV;
if (env === "production") {
	logFileName = "info.log";
	logLevel = "info"; // restrict production logging to info and above
} else {
	logFileName = "debug.log";
	logLevel = "debug"; // staging and dev logging can be debug and above
}

/* Logging levels: { 
	error: 0, 	An unexpected, fatal error occurred
	warn: 1, 	A failure occurred, that can be recovered from but worth noting
	info: 2, 	Some useful, informational log
	verbose: 3,	Don't use
	debug: 4, 	Debugging related log - shouldn't be shown in prod
	silly: 5 } 	Don't use

 Refer: https://github.com/winstonjs/winston
*/

const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({
      timestamp: tsFormat,
      name: 'log-file',
      filename: global.appRoot + config.path.logDir + logFileName,
      level: logLevel,
      json: false
    }),
    new (winston.transports.Console)({
      timestamp: tsFormat,
      colorize: true,
      level: 'debug',
      json: false
    }),
  ]
});

logger.dbError = function(error, query) {
	this.error("DB Error: " + error + ".  Cypher Query: " + query);
}

logger.dbDebug = function(query) {
	this.debug("Calling Cypher Query: " + query);
}

module.exports = logger;