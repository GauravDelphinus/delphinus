module.exports = function() {
	
	var express = require('express');
	var bodyParser = require('body-parser');
	var neo4j = require("node-neo4j");
	var async = require('async');
	var fs = require("fs");
	var mime = require("mime");
	var logger = require("./logger");
	var path = require("path");

	var dataUtils = require("./dataUtils");
	var imageProcessor = require("./imageProcessor");

	// Initialize the Neo4j Graph Database
	var db = new neo4j("http://neo4j:mypassword@localhost:7474");
	dataUtils.initializeDB(db);
	
	var config = require('./config');
	var app = express();

	require('./auth/passport')(app);

	var flash = require("connect-flash");

	// Set the view engine to ejs
	app.set('view engine', 'ejs');
	app.set("views", global.appRoot + "/src/server/views");


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

	var commentRouter = require("./routes/commentRoutes")(db);
	app.use("/api/comments", commentRouter);

	var feedRouter = require("./routes/feedRoutes")(db);
	app.use("/api/feeds", feedRouter);
	
	var categoryRouter = require("./routes/categoryRoutes")(db);
	app.use("/api/categories", categoryRouter);
	
	var socialRouter = require("./routes/socialRoutes")(db);
	app.use("/api/social", socialRouter);
	
	/**
		FILE ROUTERS
		This is the list of file routers that allow for serving of file
		content, such as HTML.  The calls to these would usually come
		from the browser client and not with explicit client code.
	**/

	// 0 - Home Page
	app.get("/", function(req, res) {
		var metaData = dataUtils.constructMetaData("home");
		metaData.user = normalizeUser(req.user);
		res.render("index", metaData);
	});

	app.get("/challenges", function(req, res) {
		dataUtils.getMetaDataForCategory(req.query.category, function(err, data) {
			if (err) {
				logger.error("Error retrieving metadata for category '" + req.query.category + "': " + err);
				return res.render("error", {redirectURL: "/"});
			}

			var jsonObj = data;
			jsonObj.user = normalizeUser(req.user);
			jsonObj.categoryId = (req.query.category) ? req.query.category : "all";

			return res.render("challenges", jsonObj);
		});
	});

	app.get("/entries", function(req, res) {
		res.render("entries", {user: normalizeUser(req.user)});
	});

	app.get("/users", function(req, res) {
		res.render("users", {user: normalizeUser(req.user)});
	});

	// 1 - Challenge Page
	app.get("/challenge/:challengeId", function(req, res) {
		// extract information for meta tags on the page
		dataUtils.getMetaDataForChallenge(req.params.challengeId, function(err, data) {
			if (err) {
				logger.error("Error retrieving metadata for challenge '" + req.params.challengeId + "': " + err);
				return res.render("error", {redirectURL: "/"});
			}

			var jsonObj = data;
			jsonObj.challengeId = req.params.challengeId;
			jsonObj.user = normalizeUser(req.user);

			res.render("challenge", jsonObj);
		});
	});

	//load the error page and then redirect to the appropriate
	//page depending on the referrer
	app.get("/error", function(req, res) {
		var referrerURL = req.get('Referrer');
		var redirectURL = "/"; //by default, redirect to home page

		var redirects = require("./redirects");
		for (redirect in redirects) {
			if (referrerURL.includes(redirect)) {
				redirectURL = redirects[redirect];
				break;
			}
		}
		res.render("error", {redirectURL: redirectURL});
	});
	
	// 2 - Challenge Image
	/*
	app.get("/challenges/images/:imageName", function(req, res) {
		
		var targetImage = global.appRoot + config.path.challengeImages + req.params.imageName;
		res.setHeader("Content-Type", mime.lookup(targetImage));
		res.sendFile(targetImage, function(err) {
			if (err && err.code !== "ECONNABORTED") throw err;
		});
	});
	*/
	

	// 3 - Entry Page
	app.get("/entry/:entryId", function(req, res) {
		// extract information for meta tags on the page
		dataUtils.getMetaDataForEntry(req.params.entryId, function(err, data) {
			if (err) {
				logger.error("Error retrieving metadata for entry '" + req.params.entryId + "': " + err);
				return res.render("error", {redirectURL: "/"});
			}

			var jsonObj = data;
			jsonObj.entryId = req.params.entryId;
			jsonObj.user = normalizeUser(req.user);

			res.render("entry", jsonObj);
		});
	});

	// 5 - Challenge - New Entry
	app.get("/challenge/:challengeId/newEntry", ensureLoggedIn, function(req, res){
		res.render("newentry", {challengeId: req.params.challengeId, user: normalizeUser(req.user)});
	});

	// 6 - New Challenge
	app.get("/newChallenge", ensureLoggedIn, function(req, res) {
		res.render("newchallenge", {user: normalizeUser(req.user)});
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

            	if (req.user.local) {
            		query.localEmail = req.user.local.email;
            	}
            	
            	dataUtils.findUser(query, function(err, user) {
            		if (err) {
            			logger.error("Couldn't find user, query: " + JSON.stringify(query) + ": " + err);
            			return res.render("error", redirectURL: "/users");
            		}

            		return res.render("user", {user : user, userInfo: user});
            	});
            } else {
            	return res.render("user", null);
            }
    });

	app.get("/user/:userID", function(req, res) {
            var query = {
				userID : req.params.userID
            };

            dataUtils.findUser(query, function(err, user) {
				if (err) {
					logger.error("Couldn't find user, query: " + JSON.stringify(query) + ": " + err);
					return res.render("error", redirectURL: "/users");
				}

				return res.render("user", {userInfo: user, user: normalizeUser(req.user)});
            });
    });

	/**
		STATIC ROUTERS
		Serve static files in public directory
	**/

	var publicDir = path.normalize(global.appRoot + config.path.publicDir);
	app.use(express.static(publicDir));
	
	// Finally, start listening for requests
	app.listen(config.port, function() {
		logger.info("Node Server, Environment: " + process.env.NODE_ENV + ", Listening on port " + config.port);
		logger.info("Application Root: " + global.appRoot + ", Express Static directory: " + publicDir);
	});
};

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
