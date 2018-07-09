
const dbChallenge = require("./db/dbChallenge");
const dbEntry = require("./db/dbEntry");
const serverUtils = require("./serverUtils");	
const logger = require("./logger");
const metadata = require("./metadata");
const querystring = require("querystring");
const dbUtils = require("./db/dbUtils");

module.exports = function(app) {
	setupAPIRoutes(app);

	setupRenderRoutes(app);
};

/*
	Set up API routes - these are called by clients using AJAX calls.  They typically
	respond with a JSON object
*/
function setupAPIRoutes(app) {
	const authRouter = require("./routes/authRoutes")();
	app.use('/auth', authRouter);

	const userRouter = require("./routes/userRoutes")();
	app.use("/api/users", userRouter);

	// 1 - Challenge Router
	const challengeRouter = require("./routes/challengeRoutes")();
	app.use("/api/challenges", challengeRouter);

	// 2 - Entry Router
	const entryRouter = require("./routes/entryRoutes")();
	app.use("/api/entries", entryRouter);

	// 3 - Filter Router
	const filterRouter = require("./routes/filterRoutes")();
	app.use("/api/filters", filterRouter);

	const commentRouter = require("./routes/commentRoutes")();
	app.use("/api/comments", commentRouter);

	const feedRouter = require("./routes/feedRoutes")();
	app.use("/api/feeds", feedRouter);
	
	const categoryRouter = require("./routes/categoryRoutes")();
	app.use("/api/categories", categoryRouter);
	
	const socialRouter = require("./routes/socialRoutes")();
	app.use("/api/social", socialRouter);

	const postRouter = require("./routes/postRoutes")();
	app.use("/api/posts", postRouter);

	const designRouter = require("./routes/designRoutes")();
	app.use("/api/designs", designRouter);

	const contactRouter = require("./routes/contactRoutes")();
	app.use("/api/contact", contactRouter);
}

/*
	Set up File (HTML) rendering routes.  These are called by explicit user
	navibation to pages on the website.  These do validation and generate appropriate
	information to be passed to the views for rendering the pages
*/
function setupRenderRoutes(app) {

	let clientIP = "";
	app.get("*", function(req, res, next) {
		require("dotenv").config();
		/*
			Check for Site redirects - these can be used for site maintenance activities
			SITE_REDIRECT: name of page at root that we need to redirect to, specified in .env
			SITE_ALLOWED_IP: ip address of client who should still be allowed to access the site, despite the SITE_REDIRECT clause.  Specified in .env
		*/
		if (process.env.SITE_REDIRECT) {
			clientIP = req.ip || req.connection.remoteAddress;
			if (process.env.SITE_ALLOWED_IP && (clientIP == process.env.SITE_ALLOWED_IP)) {
				logger.debug("IP is: " + clientIP);
				next();
			}
			else {
				res.render(process.env.SITE_REDIRECT, {metadata: metadata.getGenericMetadata("home"), user: normalizeUser(req.user)});
			}
		} else {
			next();
		}
	});

	//********* HOME PAGE **********************************************
	app.get("/", function(req, res) {
		require("dotenv").config();
		if (process.env.HOMEPAGE_REDIRECT) {
			res.render(process.env.HOMEPAGE_REDIRECT, {metadata: metadata.getGenericMetadata("home"), user: normalizeUser(req.user)});
		} else {
			res.render("index", {metadata: metadata.getGenericMetadata("home"), user: normalizeUser(req.user)});
		}
	});

	app.get("/betasignup", function(req, res) {
		res.render("betasignup");
	});

	app.get("/contact", function(req, res) {
		res.render("contact");
	});

	app.get("/privacy", function(req, res) {
		res.render("privacy");
	});

	//******** CHALLENGES related routes *******************************

	//render the page for all challenges matching an optional category
	app.get("/challenges", function(req, res) {
		res.render("challenges", {metadata: metadata.getGenericMetadata("challenges"), user: normalizeUser(req.user), categoryId: (req.query.categoryId ? req.query.categoryId : 0)});
	});

	//render the page for a specific challenge
	app.get("/challenge/:challengeId", function(req, res) {
		// extract information for meta tags on the page

		metadata.getChallengeMetadata(req.params.challengeId, function(err, data) {
			if (err) {
				logger.error("Error retrieving metadata for challenge id: " + req.params.challengeId + ", err: " + err);
				return res.render("error", {redirectURL: "/"});
			}

			if (!serverUtils.validateData(data.challenge, serverUtils.prototypes.challenge) ||
				!serverUtils.validateData(data.metadata, serverUtils.prototypes.metadata)) {
				return res.render("error", {redirectURL: "/challenges"});
			}

			data.user = normalizeUser(req.user);
			res.render("challenge", data);
		});
	});

	// New Challenge page
	app.get("/newChallenge", ensureLoggedIn, function(req, res) {
		res.render("newchallenge", {user: normalizeUser(req.user)});
	});

	//******** ENTRIES related routes *******************************

	//render the page that lists all entries
	app.get("/entries", function(req, res) {
		res.render("entries", {metadata: metadata.getGenericMetadata("entries"), user: normalizeUser(req.user)});
	});

	// Specific Entry Page
	app.get("/entry/:entryId", function(req, res) {
		// extract information for meta tags on the page
		metadata.getEntryMetadata(req.params.entryId, function(err, data) {
			if (err) {
				logger.error("Error retrieving metadata for entry id: " + req.params.entryId + ", err: " + err);
				return res.render("error", {redirectURL: "/entries"});
			}

			if (!serverUtils.validateData(data.entry, serverUtils.prototypes.entry) ||
				!serverUtils.validateData(data.metadata, serverUtils.prototypes.metadata)) {
				return res.render("error", {redirectURL: "/entries"});
			}

			data.user = normalizeUser(req.user);
			res.render("entry", data);
		});
	});

	//new entry creation page
	app.get("/newentry", ensureLoggedIn, function(req, res) {
		var jsonObj = {challengeId: 0, designId: 0, user: normalizeUser(req.user)};
		if (req.query && req.query.challengeId) {
			jsonObj.challengeId = req.query.challengeId;
		} else if (req.query && req.query.designId) {
			jsonObj.designId = req.query.designId;
		}

		res.render("newentry", jsonObj);
	});


	//******** USERS related routes *********************************

	//render the page that lists all users
	app.get("/users", function(req, res) {
		res.render("users", {metadata: metadata.getGenericMetadata("users"), user: normalizeUser(req.user)});
	});

	//render the page for the currently logged in user
	app.get("/user", ensureLoggedIn, function(req, res) {
        if (req.user) {
        	metadata.getUserMetadata(req.user.id, function(err, data) {
				if (err) {
					logger.error("Error retrieving metadata for user id: " + req.user.id + ", err: " + err);
					return res.render("error", {redirectURL: "/users"});
				}

				if (!serverUtils.validateData(data.userInfo, serverUtils.prototypes.user) ||
					!serverUtils.validateData(data.metadata, serverUtils.prototypes.metadata)) {
					return res.render("error", {redirectURL: "/users"});
				}

				data.user = normalizeUser(req.user);
				res.render("user", data);
			});
		} else {
			return res.render("error", {redirectURL: "/users"});
        }
	});

	//render the page for the user specified
	app.get("/user/:userID", function(req, res) {
		metadata.getUserMetadata(req.params.userID, function(err, data) {
			if (err) {
				logger.error("Error retrieving metadata for user id: " + req.params.userID + ", err: " + err);
				return res.render("error", {redirectURL: "/users"});
			}

			if (!serverUtils.validateData(data.userInfo, serverUtils.prototypes.user) ||
				!serverUtils.validateData(data.metadata, serverUtils.prototypes.metadata)) {
				return res.render("error", {redirectURL: "/users"});
			}

			data.user = normalizeUser(req.user);
			res.render("user", data);
		});
    });
	
	//******** ERROR page ********************************************

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
			} else if (referrerURL) {
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

	
	//******** SHARE related pages ********************************************

	//generic page for sharing to social networks
	app.get("/share", function(req, res) {
		var params = {user: normalizeUser(req.user)};
		if (req.query && req.query.id) {
			params.id = req.query.id;
		}
		if (req.query && req.query.type) {
			params.type = req.query.type;
		}
		if (req.query && req.query.target) {
			params.target = req.query.target;
		}
		if (req.query && req.query.referrer) {
			params.referrer = req.query.referrer;
		} else {
			params.referrer = "";
		}
		res.render("share", params);
	});

	//************ HELP page **************************************************
	app.get("/help", function(req, res) {
		res.render("help");
	});
}

function normalizeUser(user) {
	if (typeof user == 'undefined') {
		return 0;
	}

	return {id: user.id, displayName: user.displayName, image: user.image};
}

function ensureLoggedIn(req, res, next) {
	if (!req.user) {
		req.session.redirectTo = req.path + "?" + querystring.stringify(req.query);
		res.redirect("/auth");
	} else {
		next();
	}
}