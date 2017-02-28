module.exports = function() {
	
	var express = require('express');
	var bodyParser = require('body-parser');
	var neo4j = require("node-neo4j");
	var async = require('async');

	// Initialize the Neo4j Graph Database
	var db = new neo4j("http://neo4j:Puzz1e$$@localhost:7474");

	//var url = require('url');
	//var querystring = require('querystring');
	
	var config = require('./config');
	var app = express();
	

	// Set the view engine to ejs
	app.set('view engine', 'ejs');


	// Add cookie parsing functionality to our Express app
	app.use(require('cookie-parser')());

	// Parse JSON body and store result in req.body
	app.use(bodyParser.json());

	/**
		API ROUTERS
		This is the list of API Routers that help route the various
		APIs such as /api/challenges and /api/entries. The implementation
		of the routers can be found under ./routes

		NOTE: These are supposed to be called explicitly by client code
		using REST APIs, and not supposed to be called by the web browser
		implicitly or by the user directly.
	**/

	// 1 - Challenge Router
	var challengeRouter = require("./routes/challengeRoutes")(db);
	app.use("/api/challenges", challengeRouter);

	// 2 - Entry Router
	var entryRouter = require("./routes/entryRoutes")(db);
	app.use("/api/entries", entryRouter);

	/**
		FILE ROUTERS
		This is the list of file routers that allow for serving of file
		content, such as HTML.  The calls to these would usually come
		from the browser client and not with explicit client code.
	**/

	// 1 - Challenge Page
	app.get("/challenge/:challengeId", function(req, res) {
		res.render("challenge", {challengeId: req.params.challengeId});
	});

	// 2 - Challenge Image
	app.get("/data/challenges/images/:imageName", function(req, res){
		// TODO - this would ultimately process the image before sending it.  E.g., watermark, etc.
		res.sendFile(__dirname + "/data/challenges/images/" + req.params.imageName);
	});

	// 3 - Entry Page
	app.get("/entry/:entryId", function(req, res) {
		res.render("entry", {entryId: req.params.entryId});
	});

	// 4 - Entry Image
	app.get("/data/entries/images/:imageName", function(req, res) {
		// TODO - this would ultimately process the image before sending it.  For entries, it will probably
		// not need to story the image itself, but the steps that need to be performed on the challenge image
		res.sendFile(__dirname + "/data/entries/images/" + req.params.imageName);
	});

	/**
		STATIC ROUTERS
		Serve static files in public directory
	**/
	app.use(express.static(__dirname + '/public'));

	// Finally, start listening for requests
	app.listen(config.port, function() {
		console.log("Listening on port " + config.port);
	});
}
