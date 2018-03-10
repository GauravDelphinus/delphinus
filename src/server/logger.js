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
	logFileName = "node_debug.log";
	logLevel = "debug"; // restrict production logging to info and above
} else {
	logFileName = "node_debug.log";
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

//if length of result from query does not match expected count
logger.dbResultError = function(query, expectedCount, actualCount) {
	this.error("Ran Cypher Query: " + query + ", Expected Count of Result: " + expectedCount + ", but Actual Count: " + actualCount);
}

logger.errorIf = function(logError, message) {
	if (logError) {
		this.error(message);
	}
}

// trying to get get line numbers show in the logs - testing
Object.defineProperty(global, '__stack', {
	get: function() {
        var orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function(_, stack) {
            return stack;
        };
        var err = new Error;
        Error.captureStackTrace(err, arguments.callee);
        var stack = err.stack;
        Error.prepareStackTrace = orig;
        return stack;
    }
});

Object.defineProperty(global, '__line', {
	get: function() {
        return __stack[1].getLineNumber();
    }
});

Object.defineProperty(global, '__function', {
	get: function() {
        return __stack[1].getFunctionName();
    }
});

module.exports = logger;