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
	const neo4j = require("node-neo4j");

	const serverUtils = require("./serverUtils");

	require("dotenv").config();
	if (!process.env.NEO4J_USERNAME || !process.env.NEO4J_PASSWORD || !process.env.NEO4J_HOSTNAME) {
		return callback(new Error("Missing NEO4J authentication fields in the .env file, or .env file missing"));
	}

	// Initialize the Neo4j Graph Database
	const db = new neo4j("http://" + process.env.NEO4J_USERNAME + ":" + process.env.NEO4J_PASSWORD + "@" + process.env.NEO4J_HOSTNAME);

	dbInit.initializeDB(db, function(err) {
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
			logger.info("Node Server, Environment: " + process.env.NODE_ENV + ", Listening on " + process.env.NODE_HOSTNAME + ", port " + config.port + ", Connected to Neo4j Database: " + process.env.NEO4J_HOSTNAME);
			logger.info("Application Root: " + global.appRoot + ", Express Static directory: " + publicDir);

			return callback(null, app);
		});
	});
};


