var express = require("express");
var passport = require("passport");
var config = require("../config");
var logger = require("../logger");
var serverUtils = require("../serverUtils");
var dbUser = require("../db/dbUser");

var routes = function() {
	var authRouter = express.Router();

    authRouter.route("/")
        .get(function(req, res, next) {
        	logger.debug("GET received on /auth, query: " + JSON.stringify(req.query));

            if (!req.session.redirectTo) {
                /**
                    If the redirectTo is not set, this means that this wasn't set explicitly
                    by a "sign-in required" resource access, but the user explicitly clicked
                    on the "Sign In" link from some web page.  Check the referring site's URL
                    and set that to the redirectTo value in the session.
                **/
                req.session.redirectTo = req.get('Referrer');
            }

			res.render("auth", {pageTitle: "Sign In | " + config.branding.siteName, isAdmin: serverUtils.clientIsAdmin(req)});
        });

    authRouter.route("/login")
        .get(function(req, res, next) {
        	logger.debug("GET received on /auth/login, query: " + JSON.stringify(req.query));

            res.render("login", {message: [], pageTitle: "Sign in | " + config.branding.siteName});
        })

        .post(passport.authenticate("local-login", {
	            failureRedirect : "/auth/login",
	            failureFlash: true
        	}), function(req, res) {

        	logger.debug("POST received on /auth/login, body: " + JSON.stringify(req.body));

            if (req.session.redirectTo) {
                var redirectTo = req.session.redirectTo;
                req.session.redirectTo = null;
                res.redirect(redirectTo);
            } else {
                res.redirect("/"); // redirect to home page by default
            }
        });

    authRouter.route("/signup")
        .get(function(req, res, next) {
        	logger.debug("GET received on /auth/signup, query: " + JSON.stringify(req.query));

            res.render("signup", {message: req.flash("signupMessage"), pageTitle: "Sign up | " + config.branding.siteName});
        })
        .post(passport.authenticate("local-signup", {
	            failureRedirect: "/auth/signup",
	            failureFlash: true
	        }), function(req, res) {
            
            logger.debug("POST received on /auth/signup, body: " + JSON.stringify(req.body));

            if (req.session.redirectTo) {
                var redirectTo = req.session.redirectTo;
                req.session.redirectTo = null;
                res.redirect(redirectTo);
            } else {
                res.redirect("/"); // redirect to home page by default
            }
        });

    // Private API path - not used by web client, only used by Content Generator
    authRouter.route("/signup-api") 
       
        .post(function(req, res, next) {
        	logger.debug("POST received on /auth/signup-api, body: " + JSON.stringify(req.body));

        	var validationParams = [
				{
					name: "email",
					required: "yes",
					type: "email"
				},
				{
					name: "password",
					type: "string",
					required: "yes"
				},
				{
					name: "displayName",
					type: "string",
					required: "yes"
				},
				{
					name: "key",
					type: "string",
					required: "yes"
				},
				{
					name: "signature",
					type: "string",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.body, validationParams)) {
				return res.sendStatus(400);
			}

			//check for private data
				// verify the digital signature to make sure this is coming from the content generator
			if (!serverUtils.verifyDigitalSignature(req.body.key, req.body.signature)) {
				return res.sendStatus(401); //not authorized
			}

			dbUser.createUser(req.body.email, req.body.password, req.body.displayName, req.user, function(err, user) {
				logger.debug("createUser callback, err: " + err);
        		if (err) {
        			return res.sendStatus(500);
        		}

        		return res.status(201).json(user);
        	});
        });

	authRouter.route("/google")
    
        .get(function (req, res, next) {

        	logger.debug("GET received on /auth/google, query: " + JSON.stringify(req.query));

            //console.log("########## /auth/google ##############");
            //console.log("req.sessiom is " + JSON.stringify(req.session));
            if (!req.session.redirectTo) {
                
                //console.log("referrer: " + req.get('Referrer'));
                req.session.redirectTo = req.get('Referrer');
            }

            next();
        })

		.get(passport.authenticate('google', {
        	scope: ['https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email']
    	   }) , function(req, res) {
        });

	authRouter.route('/google/callback')

    	.get(passport.authenticate('google', {
        	//successRedirect: '/user/',
        	failureRedirect: '/error/'
    	}), function(req, res) {
            logger.debug("GET received on /auth/google/callback, query: " + JSON.stringify(req.query));

            if (req.session.redirectTo) {
                var redirectTo = req.session.redirectTo;
                req.session.redirectTo = null;
                res.redirect(redirectTo);
            } else {
                res.redirect("/"); // redirect to home page by default
            }
        });

    authRouter.route("/twitter")
        .get(function (req, res, next) {
        	logger.debug("GET received on /auth/twitter, query: " + JSON.stringify(req.query));
            if (!req.session.redirectTo) {
                /**
                    If the redirectTo is not set, this means that this wasn't set explicitly
                    by a "sign-in required" resource access, but the user explicitly clicked
                    on the "Sign In" link from some web page.  Check the referring site's URL
                    and set that to the redirectTo value in the session.
                **/
                
                var referrer = req.get("Referrer");
                //console.log("referrer: " + referrer);
                if (referrer) {
                    req.session.redirectTo = referrer;
                }
            }

            next();
        })
        .get(passport.authenticate('twitter'), function(req, res) {
        });

    authRouter.route('/twitter/callback')

        .get(passport.authenticate('twitter', {
            //successRedirect: '/user/',
            failureRedirect: '/error/'
        }), function(req, res) {
        	logger.debug("GET received on /auth/twitter/callback, query: " + JSON.stringify(req.query));
            if (req.session.redirectTo) {
                var redirectTo = req.session.redirectTo;
                req.session.redirectTo = null;
                res.redirect(redirectTo);
            } else {
                res.redirect("/"); // redirect to home page by default
            }
        });

    authRouter.route("/facebook")
        .get(function (req, res, next) {
        	logger.debug("GET received on /auth/facebook, query: " + JSON.stringify(req.query));
        	logger.debug("Now going to request for default permissions from Facebook ...");
            if (!req.session.redirectTo) {
                /**
                    If the redirectTo is not set, this means that this wasn't set explicitly
                    by a "sign-in required" resource access, but the user explicitly clicked
                    on the "Sign In" link from some web page.  Check the referring site's URL
                    and set that to the redirectTo value in the session.
                **/
                //console.log("referrer: " + req.get('Referrer'));
                req.session.redirectTo = req.get('Referrer');
            }

            next();
        })
        //in the normal flow, do not ask for any additional permissions.  Default permissions
        //include user_profile and email, and do *not* require Facebook App Review
        .get(passport.authenticate('facebook'), function(req, res) {
        	logger.debug("requesting for default permissions from Facebook");
        });

    //Reauthenticate with Facebook for "share" (aka publish) permissions
    authRouter.route("/facebook/share")
        .get(function (req, res, next) {
        	logger.debug("GET received on /auth/facebook/share, query: " + JSON.stringify(req.query));
            if (!req.session.redirectTo) {
                /**
                    If the redirectTo is not set, this means that this wasn't set explicitly
                    by a "sign-in required" resource access, but the user explicitly clicked
                    on the "Sign In" link from some web page.  Check the referring site's URL
                    and set that to the redirectTo value in the session.
                **/
                //console.log("referrer: " + req.get('Referrer'));
                req.session.redirectTo = req.get('Referrer');
            }

            next();
        })
        .get(passport.authenticate('facebook', {
        	authType: 'rerequest',
            scope: ['email', 'user_friends', 'publish_actions'] //include publish_actions permission
        }), function(req, res) {
        });

    authRouter.route('/facebook/callback')

        .get(passport.authenticate('facebook', {
            //successRedirect: '/user/',
            failureRedirect: '/error/'
        }), function(req, res) {
        	logger.debug("GET received on /auth/facebook/callback, query: " + JSON.stringify(req.query));
            if (req.session.redirectTo) {
                var redirectTo = req.session.redirectTo;
                req.session.redirectTo = null;
                res.redirect(redirectTo);
            } else {
                res.redirect("/"); // redirect to home page by default
            }
        });
        
    authRouter.route("/facebook/logout")
    	.get(function(req, res) {
    		logger.debug("GET received on /auth/facebook/logout, query: " + JSON.stringify(req.query));
    		//destroy facebook auth token
    		
			var facebook = require('../services/facebook')();
			facebook.logout(req.user.facebook.token, function(error, data) {
				if (!error) {
					//delete locally stored tokens
					dbUser.removeAccessForUser(req.user.id, "facebook", function(err) {
						console.log("removed from DB, req.session.user is " + JSON.stringify(req.session.user));

						if (req.session.redirectTo) {
			                var redirectTo = req.session.redirectTo;
			                req.session.redirectTo = null;
			                res.redirect(redirectTo);
			            } else {
			                res.redirect("/"); // redirect to home page by default
			            }
					});
				} else {
					if (req.session.redirectTo) {
		                var redirectTo = req.session.redirectTo;
		                req.session.redirectTo = null;
		                res.redirect(redirectTo);
		            } else {
		                res.redirect("/"); // redirect to home page by default
		            }	
				}
			});
    	});

       authRouter.route("/twitter/logout")
    	.get(function(req, res) {
    		logger.debug("GET received on /auth/twitter/logout, query: " + JSON.stringify(req.query));
    		//destroy facebook auth token
    		
			var twitter = require('../services/twitter')();
			twitter.logout(req.user.twitter.token, req.user.twitter.tokenSecret, function(error, data) {
				if (!error) {
					//delete locally stored tokens
					dbUser.removeAccessForUser(req.user.id, "twitter", function(err) {
						console.log("removed from DB, req.session.user is " + JSON.stringify(req.session.user));

						if (req.session.redirectTo) {
			                var redirectTo = req.session.redirectTo;
			                req.session.redirectTo = null;
			                res.redirect(redirectTo);
			            } else {
			                res.redirect("/"); // redirect to home page by default
			            }
					});
				} else {
					if (req.session.redirectTo) {
		                var redirectTo = req.session.redirectTo;
		                req.session.redirectTo = null;
		                res.redirect(redirectTo);
		            } else {
		                res.redirect("/"); // redirect to home page by default
		            }	
				}
			});
    	});

    authRouter.route("/logout")
        .get(function (req, res) {
        	logger.debug("GET received on /auth/logout, query: " + JSON.stringify(req.query));
            req.logout();
            //res.redirect("/");
            
            req.session.destroy(function(err) {
                if (err) {
                	logger.error("Session destory failed: " + err);
                	return;
                }

                res.redirect("/");
            });
            
        });

	return authRouter;
};

module.exports = routes;