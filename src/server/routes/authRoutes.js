var express = require("express");
var passport = require("passport");

var routes = function(db) {
	var authRouter = express.Router();

    authRouter.route("/")
        .get(function(req, res, next) {
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

            res.render("auth");
        });

    authRouter.route("/login")
        .get(function(req, res, next) {
            res.render("login", {message: []});
        })
        .post(passport.authenticate("local-login", {
            failureRedirect : "/auth/login",
            failureFlash: true
        }), function(req, res) {
            //console.log("**** Local login callback **** ");
            //console.log("req.session.redirectTo is " + req.session.redirectTo);
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
            res.render("signup", {message: req.flash("signupMessage")});
        })
        .post(passport.authenticate("local-signup", {
            failureRedirect: "/auth/signup",
            failureFlash: true
        }), function(req, res) {
            //console.log(" ****** Local Signup callback ************* ");
            //console.log("req.session.redirectTo is " + req.session.redirectTo);
            if (req.session.redirectTo) {
                var redirectTo = req.session.redirectTo;
                req.session.redirectTo = null;
                res.redirect(redirectTo);
            } else {
                res.redirect("/"); // redirect to home page by default
            }
        });

	authRouter.route("/google")
    
        .get(function (req, res, next) {

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
            //console.log("########## /auth/google authenticate ##############");
            //console.log("req.sessiom is " + JSON.stringify(req.session));
        });

	authRouter.route('/google/callback')

    	.get(passport.authenticate('google', {
        	//successRedirect: '/user/',
        	failureRedirect: '/error/'
    	}), function(req, res) {
            //console.log("########## Google callback ##############");
            //console.log("req.sessiom is " + JSON.stringify(req.session));
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
            scope: ['email', 'user_friends']
        }), function(req, res) {
        });

    authRouter.route('/facebook/callback')

        .get(passport.authenticate('facebook', {
            //successRedirect: '/user/',
            failureRedirect: '/error/'
        }), function(req, res) {
            if (req.session.redirectTo) {
                var redirectTo = req.session.redirectTo;
                req.session.redirectTo = null;
                res.redirect(redirectTo);
            } else {
                res.redirect("/"); // redirect to home page by default
            }
        });
        

    authRouter.route("/logout")
        .get(function (req, res) {
            req.logout();
            //res.redirect("/");
            
            req.session.destroy(function(err) {
                if (err) throw err;

                //console.log("session.destroy callback");
                res.redirect("/");
            });
            
        });

	return authRouter;
};

module.exports = routes;