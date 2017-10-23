const config = require('./config');
const path = require("path");

module.exports = function() {
	// Set up application root directory
	global.appRoot = path.normalize(path.resolve(__dirname) + "/../../");

	// Set up Environment Variables
	const env = process.env.NODE_ENV; //production or staging
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