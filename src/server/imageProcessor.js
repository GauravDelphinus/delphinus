var async = require("async");
var request = require("request");
var serverUtils = require("./serverUtils");

var functions = {
	processImage: function (command, targetImage, imArgs, next) {
		const dynamicConfig = require("./config/dynamicConfig");
		if (!dynamicConfig || !dynamicConfig.imageServiceHostname) {
			//Image service not found, just call local ImageMagick commands
			processImageSystem(command, targetImage, imArgs, next);
		} else if (dynamicConfig.imageServiceHostname.startsWith("http://localhost:")) {
			processImageLocalhost(command, targetImage, imArgs, dynamicConfig.imageServiceHostname, next);
		} else {
			processImageExternal(command, targetImage, imArgs, dynamicConfig.imageServiceHostname, next);
		}
	}
};

for (var key in functions) {
	module.exports[key] = functions[key];
}

function validateCommand(command) {
	if (command == "convert" || command == "identify" || command == "composite") {
		return true;
	}

	return false;
}

/**
	Transform the Image Magick commands list for consumption by the
	stepsHandler service.  Note that isLocal is set true for both
	"system" (i.e. the current process running the ImageMagick commands)
	as well as "localhost" (i.e., Image Processor service running on
	localhost).  For external service it is set as false.
**/
function transformImArgsForService(imArgs, isLocal, callback) {
	if (isLocal) {
		var finalArgs = [];

		for (let i = 0; i < imArgs.length; i++) {
			if (typeof imArgs[i] === "object") {
				finalArgs.push(imArgs[i].value);
			} else {
				finalArgs.push(imArgs[i]);
			}
		}

		return callback(null, finalArgs);
	} else {
		var functionList = [];
		for (let i = 0; i < imArgs.length; i++) {
			functionList.push(async.apply(function(arg, callback) {
				if (typeof arg === 'object') {
					if (arg.type == "INPUT_FILE") {
						const DataURI = require('datauri');
						const datauri = new DataURI();
						datauri.encode(arg.value, function(err, imageData) {
							if (err) {
								return next(err);
							}

							return callback(null, imageData);
						});
					} else if (arg.type == "OUTPUT_FILE") {
						return callback(null, "OUTPUT_FILE");
					} else {
						return callback(new Error("Invalid arg type: " + arg.type));
					}
				} else {
					return callback(null, arg);
				}
			}, 
			imArgs[i]));
		}

		async.series(functionList, function(err, finalArgs) {
			if (err) {
				return callback(err);
			}

			return callback(null, finalArgs);
		});
	}
}
/**
	Process the image locally using the ImageMagick system commands
**/
function processImageSystem(command, targetImage, imArgs, next) {
	if (!validateCommand(command)) {
		return next(new Error("Invalid command: " + command));
	}

	transformImArgsForService(imArgs, true, function(err, finalArgs) {
		if (err) {
			return next(err);
		}

		execFile(command, finalArgs, (error, stdout, stderr) => {
			if (error) {
		    	return next(error);
		  	} else {
		  		return next(0, stdout);
		  	}
	  	});
	});
}

/**
	Send the image processing command to the micro service running on Localhost
	Check out stepsHandler project
**/
function processImageLocalhost(command, targetImage, imArgs, hostname, next) {
	if (!validateCommand(command)) {
		return next(new Error("Invalid command: " + command));
	}

	transformImArgsForService(imArgs, true, function(err, finalArgs) {
		if (err) {
			return next(err);
		}

		request({
				uri: hostname + "/api/processimage",
				method: "GET",
				body: {
					command: command,
					imArgs: finalArgs
				},
				json: true
			},
			function(err, res, body) {
				if (err || res.statusCode != 200) {
			    	return next(err);
			  	} else {
			  		return next(0, body.stdout);
			  	}
			}
	  	);
	});
}

/**
	Send the image processing command to the external micro service or AWS Lambda function
**/
function processImageExternal(command, targetImage, imArgs, hostname, next) {
	if (!validateCommand(command)) {
		return next(new Error("Invalid command: " + command));
	}

	transformImArgsForService(imArgs, false, function(err, finalArgs) {
		if (err) {
			return next(err);
		}

		request({
				uri: hostname + "/api/processimage",
				method: "GET",
				body: {
					command: command,
					imArgs: finalArgs
				},
				json: true
			},
			function(err, res, body) {
				if (err || res.statusCode != 200) {
			    	return next(err);
			  	} else {
			  		//if targetImage is null, it means there was no output file expected
			  		if (!targetImage) {
			  			return next(0, body.stdout);
			  		}

			  		//if targetImage is present, write the image data to the targetImage
		  			if (!body.outputFileData) {
		  				return next(new Error("Error: Didn't receive any body.outputFileData"));
		  			}

		  			//extract the targetImageData and write to the targetImage path
			  		serverUtils.dataURItoFile(body.output, targetImage, function(err) {
			  			if (err) {
			  				return next(err);
			  			}

			  			return next(0, body.stdout);
			  		});
			  	}
			}
	  	);
	});
}

