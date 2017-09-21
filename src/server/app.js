'use strict';

const config = require('./config');
const path = require("path");
const querystring = require("querystring");

// Set up application root directory
global.appRoot = path.normalize(path.resolve(__dirname) + "/../../");
configureEnvironment();

module.exports = function(callback) {
	
	const express = require('express');
	const bodyParser = require('body-parser');
	const neo4j = require("node-neo4j");
	const logger = require("./logger");
	const serverUtils = require("./serverUtils");

	const dataUtils = require("./dataUtils");

	// Initialize the Neo4j Graph Database
	const db = new neo4j("http://neo4j:mypassword@localhost:7474");
	dataUtils.initializeDB(db, function(err) {
		if (err) {
			return callback(err);
		}

		const app = express();

		require('./auth/passport')(app);

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

		const authRouter = require("./routes/authRoutes")();
		app.use('/auth', authRouter);

		const userRouter = require("./routes/userRoutes")(db);
		app.use("/api/users", userRouter);

		// 1 - Challenge Router
		const challengeRouter = require("./routes/challengeRoutes")(db);
		app.use("/api/challenges", challengeRouter);

		// 2 - Entry Router
		const entryRouter = require("./routes/entryRoutes")(db);
		app.use("/api/entries", entryRouter);

		// 3 - Filter Router
		const filterRouter = require("./routes/filterRoutes")(db);
		app.use("/api/filters", filterRouter);

		const commentRouter = require("./routes/commentRoutes")(db);
		app.use("/api/comments", commentRouter);

		const feedRouter = require("./routes/feedRoutes")(db);
		app.use("/api/feeds", feedRouter);
		
		const categoryRouter = require("./routes/categoryRoutes")(db);
		app.use("/api/categories", categoryRouter);
		
		const socialRouter = require("./routes/socialRoutes")(db);
		app.use("/api/social", socialRouter);

		const postRouter = require("./routes/postRoutes")(db);
		app.use("/api/posts", postRouter);
		
		/**
			FILE ROUTERS
			This is the list of file routers that allow for serving of file
			content, such as HTML.  The calls to these would usually come
			from the browser client and not with explicit client code.
		**/

		// 0 - Home Page
		app.get("/", function(req, res) {
			const metaData = dataUtils.constructMetaData("home");
			metaData.user = normalizeUser(req.user);
			res.render("index", metaData);
		});

		app.get("/challenges", function(req, res) {
			dataUtils.getMetaDataForCategory(req.query.category, function(err, data) {
				if (err) {
					logger.error("Error retrieving metadata for category '" + req.query.category + "': " + err);
					return res.render("error", {redirectURL: "/"});
				}

				const jsonObj = data;
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

				const jsonObj = data;
				jsonObj.challengeId = req.params.challengeId;
				jsonObj.user = normalizeUser(req.user);

				res.render("challenge", jsonObj);
			});
		});

		//load the error page and then redirect to the appropriate
		//page depending on the referrer
		app.get("/error", function(req, res) {

			/*
				Supported params
			*/
			const validationParams = [
				{
					name: "reload",
					type: ["yes", "no"]
				},
				{
					name: "target",
					type: "myURL"
				}
			];

			const referrerURL = req.get('Referrer');
			let redirectURL = "/"; //by default, redirect to home page

			if (serverUtils.validateQueryParams(req.query, validationParams)) {
				if (req.query.reload && req.query.reload == "yes") {
					redirectURL = referrerURL;
				} else if (req.query.target) {
					redirectURL = req.query.target;
				} else {
					const redirects = require("./redirects");
					for (const redirect in redirects) {
						if (referrerURL.includes(redirect)) {
							redirectURL = redirects[redirect];
							break;
						}
					}
				}
			} else {
				logger.warn("/error Query Validation failed, query: " + JSON.stringify(req.query));
			}

			res.render("error", {redirectURL: redirectURL});
		});

		// 3 - Entry Page
		app.get("/entry/:entryId", function(req, res) {
			// extract information for meta tags on the page
			dataUtils.getMetaDataForEntry(req.params.entryId, function(err, data) {
				if (err) {
					logger.error("Error retrieving metadata for entry '" + req.params.entryId + "': " + err);
					return res.render("error", {redirectURL: "/"});
				}

				const jsonObj = data;
				jsonObj.entryId = req.params.entryId;
				jsonObj.user = normalizeUser(req.user);

				res.render("entry", jsonObj);
			});
		});

		// 5 - Challenge - New Entry
		app.get("/challenge/:challengeId/newEntry", ensureLoggedIn, function(req, res){
			res.render("newentry", {challengeId: req.params.challengeId, user: normalizeUser(req.user)});
		});

		app.get("/newentry", ensureLoggedIn, function(req, res) {
			var jsonObj = {challengeId: 0, designId: 0, user: normalizeUser(req.user)};
			if (req.query && req.query.challengeId) {
				jsonObj.challengeId = req.query.challengeId;
			} else if (req.query && req.query.designId) {
				jsonObj.designId = req.query.designId;
			}

			res.render("newentry", jsonObj);
		});

		// 6 - New Challenge
		app.get("/newChallenge", ensureLoggedIn, function(req, res) {
			res.render("newchallenge", {user: normalizeUser(req.user)});
		});

		app.get("/newcaption", ensureLoggedIn, function(req, res) {
			res.render("newcaption", {user: normalizeUser(req.user)});
		});

		app.get("/user", ensureLoggedIn, function(req, res) {
	        if (req.user) {
				const query = {
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
						return res.render("error", {redirectURL: "/users"});
					}

					return res.render("user", {user : user, userInfo: user});
				});

			} else {
				return res.render("user", null);
	        }
		});

		app.get("/user/:userID", function(req, res) {
	            const query = {
					userID : req.params.userID
	            };

	            dataUtils.findUser(query, function(err, user) {
					if (err) {
						logger.error("Couldn't find user, query: " + JSON.stringify(query) + ": " + err);
						return res.render("error", {redirectURL: "/users"});
					}

					return res.render("user", {userInfo: user, user: normalizeUser(req.user)});
	            });
	    });

		/**
			STATIC ROUTERS
			Serve static files in public directory
		**/

		const publicDir = path.normalize(global.appRoot + config.path.publicDir);
		app.use(express.static(publicDir));
		
		// Finally, start listening for requests
		app.listen(config.port, function() {
			logger.info("Node Server, Environment: " + process.env.NODE_ENV + ", Listening on port " + config.port);
			logger.info("Application Root: " + global.appRoot + ", Express Static directory: " + publicDir);
		});

		return app;
	});
};

function ensureLoggedIn(req, res, next) {
	if (!req.user) {
		req.session.redirectTo = req.path + "?" + querystring.stringify(req.query);
		res.redirect("/auth");
	} else {
		next();
	}
}

function normalizeUser(user) {
	if (typeof user == 'undefined') {
		return 0;
	}

	return {id: user.id, displayName: user.displayName, image: user.image};
}

function configureEnvironment() {
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
