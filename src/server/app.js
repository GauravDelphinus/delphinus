'use strict';

require("./init")();

const config = require('./config');
const dynamicConfig = require("./config/dynamicConfig");
const path = require("path");
const logger = require("./logger");
const helmet = require("helmet");
const dbChallenge = require("./db/dbChallenge");
const setupRoutes = require("./setupRoutes");
const dbInit = require("./db/dbInit");

process.on('uncaughtException', function (error) {
   logger.error(error);
});

module.exports = function(callback) {
	
	const express = require('express');
	const bodyParser = require('body-parser');
	const neo4j = require('neo4j-driver'); //officially supported JS driver
	//const neo4j = require('node-neo4j'); //deprecated

	const serverUtils = require("./serverUtils");

	require("dotenv").config();
	if (!dynamicConfig.dbUsername || !dynamicConfig.dbPassword || !dynamicConfig.dbHostname) {
		return callback(new Error("Missing NEO4J authentication fields in the .env file, or .env file missing"));
	}

	// Initialize the Neo4j Graph Database
	//const db = new neo4j("http://" + dynamicConfig.dbUsername + ":" + dynamicConfig.dbPassword + "@" + dynamicConfig.dbHostname);
	const uri = 'neo4j://localhost';
	const dbdriver = neo4j.driver(uri, neo4j.auth.basic(dynamicConfig.dbUsername, dynamicConfig.dbPassword))

	dbInit.initializeDB(dbdriver, function(err) {
		if (err) {
			return callback(err);
		}

		const app = express();

		require('./auth/passport')(app);

		app.enable('trust proxy');
		
		// Set the view engine to ejs
		app.set('view engine', 'ejs');
		app.set("views", global.appRoot + "/src/server/views");


		// Add cookie parsing functionality to our Express app
		app.use(require('cookie-parser')());

		// Parse JSON body and store result in req.body
		app.use(bodyParser.json({limit: "50mb"})); //make sure we can handle large messages that include images.  The actual value may require fine tuning later
		app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));

		app.use(helmet()); //for security - https://expressjs.com/en/advanced/best-practice-security.html

		//set up Static directory
		const publicDir = path.normalize(global.appRoot + config.path.publicDir);
		app.use(express.static(publicDir));

		//set up Routes for APIs as well as HTML Rendering via the views
		setupRoutes(app);
		
		// Finally, start listening for requests
		app.listen(config.port, function() {
			logger.info("Node Server, Environment: " + dynamicConfig.nodeEnv + ", Listening on " + dynamicConfig.nodeHostname + ", port " + config.port + ", Connected to Neo4j Database: " + dynamicConfig.dbHostname);
			logger.info("Application Root: " + global.appRoot + ", Express Static directory: " + publicDir);

			return callback(null, app);
		});
	});
};


