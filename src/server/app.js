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
	//var entryRouter = require("./routes/entryRoutes")();
	//app.use("/api/entries", entryRouter);

	/**
		FILE ROUTERS
		This is the list of file routers that allow for serving of file
		content, such as HTML.  The calls to these would usually come
		from the browser client and not with explicit client code.
	**/

	// Serve static files in public directory
	app.use(express.static(__dirname + '/public'));


	// Start listening for requests
	app.listen(config.port, function() {
		console.log("Listening on port " + config.port);
	});






















/*
	
db.cypherQuery("MATCH (n:Challenge) WHERE ID(n) = 2 RETURN n", function(err, result){
    if(err) throw err;

    console.log(result.data); // delivers an array of query results
    console.log(result.columns); // delivers an array of names of objects getting returned
});
*/

/*

	app.get("/challenge/:uid", function(req, res, next) {

		res.redirect("/challenge.html" + "?" + "id=" + req.params.uid);

		});
*/


	app.get("/challenge/:challengeId", function(req, res) {

		console.log("passing challenge ID " + req.params.challengeId + " to res.render");
		res.render("challenge", {challengeId: req.params.challengeId});
	});

	app.get("/data/challenges/images/:imageName", function(req, res){
		// TODO - this would ultimately process the image before sending it.  E.g., watermark, etc.
		res.sendFile(__dirname + "/data/challenges/images/" + req.params.imageName);
	});


/*
db.cypherQuery("MATCH (n:Challenge) WHERE ID(n) = " + req.params.uid + " RETURN n", function(err, result){
    if(err) throw err;

    console.log(result.data); // delivers an array of query results
    console.log(result.columns); // delivers an array of names of objects getting returned

    res.json(result.data);
});
*/

/*
		var json = {image: 'https://s-media-cache-ak0.pinimg.com/736x/c4/36/db/c436db9164ba3b0c6ce807c011d11987.jpg',
			title: 'I can.  I will.  End of story.',
			created: '2013:12:10:03:02:10+08:00'};
		res.json(json);
		*/
	
	



}
