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
	dataUtils.initializeDB(db);
	
	var config = require('./config');
	var app = express();

	// Set global variable called 'appRoot' to store the Node JS root directory
	var path = require('path');
	global.appRoot = path.resolve(__dirname);
	
	require('./auth/passport')(app);

	// Set the view engine to ejs
	app.set('view engine', 'ejs');


	// Add cookie parsing functionality to our Express app
	app.use(require('cookie-parser')());

	// Parse JSON body and store result in req.body
	app.use(bodyParser.json({limit: "50mb"})); //make sure we can handle large messages that include images.  The actual value may require fine tuning later
	app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));

	/**
		API ROUTERS
		This is the list of API Routers that help route the various
		APIs such as /api/challenges and /api/entries. The implementation
		of the routers can be found under ./routes

		NOTE: These are supposed to be called explicitly by client code
		using REST APIs, and not supposed to be called by the web browser
		implicitly or by the user directly.
	**/

	var authRouter = require("./routes/authRoutes")(db);
	app.use('/auth', authRouter);

	var userRouter = require("./routes/userRoutes")(db);
	app.use("/api/users", userRouter);

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

	// 0 - Home Page
	app.get("/", function(req, res) {
		res.render("index", {user: normalizeUser(req.user)});
	});

	// 1 - Challenge Page
	app.get("/challenge/:challengeId", function(req, res) {
		res.render("challenge", {challengeId: req.params.challengeId, user: normalizeUser(req.user)});
	});

	// 2 - Challenge Image
	app.get("/challenges/images/:challengeId", function(req, res) {
		/**
			The /challenges/images/challengeId route returns the actual original image
			for that challenge Id.  That is the only legal way for the client to retrieve
			the challenge Image.  The actual image is stored under /data/challenges/images/<random name>
			path, and the random name is stored in the neo4j db entry for that challenge node.
		**/
		dataUtils.getImageDataForChallenge(db, req.params.challengeId, function(err, image, imageType){
			if (err) throw err;

			var challengeImagesDir = __dirname + "/data/challenges/images/";
			//console.log("calling res.sendFile with " + image);
			res.set('Content-Type', 'image/' + imageType);
			res.sendFile(challengeImagesDir + image, function(err) {
				if (err && err.code !== "ECONNABORTED") throw err;
			});
		});
	});

	// 3 - Entry Page
	app.get("/entry/:entryId", function(req, res) {
		dataUtils.getChallengeForEntry(db, req.params.entryId, function (err, challengeId) {
			if (err) throw err;

			res.render("entry", {entryId: req.params.entryId, challengeId: challengeId, user: normalizeUser(req.user)});
		});
		
	});

	// 4 - Entry Image
	app.get("/entries/images/:entryId", function(req, res) {
		// TODO - this would ultimately process the image before sending it.  For entries, it will probably
		// not need to story the image itself, but the steps that need to be performed on the challenge image
		//res.sendFile(__dirname + "/data/entries/images/" + req.params.imageName);

		dataUtils.getImageDataForEntry(db, req.params.entryId, function(err, imageData){
			if (err) throw err;

			imageProcessor.applyStepsToImage(imageData.image, imageData.steps, function(err, image){
				if (err) throw err;

				//console.log("calling res.sendFile with " + image);
				res.sendFile(image, function(err) {
					if (err) {
						if (err.code == "ECONNABORTED") {
						//console.log("err is " + err + ", continuing as usual ... ");
						//console.log("err JSON is " + JSON.stringify(err));
						//console.log("err.name is " + err.name);
						} else {
							throw err;
						}
					}
					//dispose off the file
					fs.unlink(image, function(err) {
						if (err) throw err;
					});
				});
			});
		});
	});

	// 5 - Challenge - New Entry
	app.get("/challenge/:challengeId/newEntry", ensureLoggedIn, function(req, res){
		res.render("newentry", {challengeId: req.params.challengeId, user: normalizeUser(req.user)});
	});

	// 6 - New Challenge
	app.get("/newChallenge", ensureLoggedIn, function(req, res) {
		res.render("newChallenge", {user: normalizeUser(req.user)});
	});

	app.get("/user", ensureLoggedIn, function(req, res) {
            //console.log("/user/ req.user is " + JSON.stringify(req.user));
            if (req.user) {
            	var query = {
            	};

            	if (req.user.id) {
            		query.userID = req.user.id;
            	}

            	if (req.user.google) {
            		query.googleID = req.user.google.id;
            	}

            	if (req.user.twitter) {
            		query.twitterID = req.user.twitter.id;
            	}

            	if (req.user.facebook) {
            		query.facebookID = req.user.facebook.id;
            	}
            	
            	dataUtils.findUser(query, function(err, user) {
            		if (err) throw err;

            		//console.log("passing user to render, user = " + JSON.stringify(user));
            		res.render("user", {user : user});
            	});
            } else {
            	res.render("user", null);
            }
    });

	app.get("/user/:userID", function(req, res) {
            var query = {
                  userID : req.params.userID
            };

            dataUtils.findUser(query, function(err, user) {
                  if (err) throw err;

                  res.render("user", {userInfo: user, user: normalizeUser(req.user)});
            });
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

function ensureLoggedIn(req, res, next) {
	if (!req.user) {
		req.session.redirectTo = req.path;
		res.redirect("/auth");
	} else {
		next();
	}
}

function normalizeUser(user) {
	if (typeof user == 'undefined') {
		return 0;
	}

	return user;
}
