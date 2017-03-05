module.exports = function() {
	
	var express = require('express');
	var bodyParser = require('body-parser');
	var neo4j = require("node-neo4j");
	var async = require('async');
	var fs = require("fs");

	var dataUtils = require("./dataUtils");
	var imageProcessor = require("./imageProcessor");

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

	// 3 - Filter Router
	var filterRouter = require("./routes/filterRoutes")(db);
	app.use("/api/filters", filterRouter);

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
	/*
	app.get("/data/challenges/images/:imageName", function(req, res){
		// TODO - this would ultimately process the image before sending it.  E.g., watermark, etc.
		res.sendFile(__dirname + "/data/challenges/images/" + req.params.imageName);
	});
	*/

	app.get("/challenges/images/:challengeId", function(req, res) {
		// TODO - this would ultimately process the image before sending it.  For entries, it will probably
		// not need to story the image itself, but the steps that need to be performed on the challenge image
		//res.sendFile(__dirname + "/data/entries/images/" + req.params.imageName);


		dataUtils.getImageDataForChallenge(db, req.params.challengeId, function(err, image){
			if (err) throw err;

			console.log("calling res.sendFile with " + image);
			res.sendFile(__dirname + "/" + image, function(err) {
				if (err) throw err;
			});
		});
	});

	// 3 - Entry Page
	app.get("/entry/:entryId", function(req, res) {
		res.render("entry", {entryId: req.params.entryId});
	});

	// 4 - Entry Image
	app.get("/entries/images/:entryId", function(req, res) {
		// TODO - this would ultimately process the image before sending it.  For entries, it will probably
		// not need to story the image itself, but the steps that need to be performed on the challenge image
		//res.sendFile(__dirname + "/data/entries/images/" + req.params.imageName);

		dataUtils.getImageDataForEntry(db, req.params.entryId, function(err, imageData){
			if (err) throw err;

			imageProcessor.applyStepsToImage(imageData.imagePath, imageData.steps, function(err, image){
				console.log("err is " + err);
				if (err) throw err;

				console.log("calling res.sendFile with " + image);
				res.sendFile(image, function(err) {
					if (err) throw err;

					//dispose off the file
					fs.unlink(image, function(err) {
						if (err) throw err;
					});
				});
			});
		});
	});

	// 5 - Challenge - New Entry
	app.get("/challenge/:challengeId/newEntry", function(req, res){
		res.render("newentry", {challengeId: req.params.challengeId});
	});


	/////. TESTING TESTING
	

	/////. TESTING TESTING


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
