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
                console.log("referrer: " + req.get('Referrer'));
                req.session.redirectTo = req.get('Referrer');
            }

            res.render("login");
        });

	authRouter.route("/google")
        .get(function (req, res, next) {
            if (!req.session.redirectTo) {
                /**
                    If the redirectTo is not set, this means that this wasn't set explicitly
                    by a "sign-in required" resource access, but the user explicitly clicked
                    on the "Sign In" link from some web page.  Check the referring site's URL
                    and set that to the redirectTo value in the session.
                **/
                console.log("referrer: " + req.get('Referrer'));
                req.session.redirectTo = req.get('Referrer');
            }

            next();
        })
		.get(passport.authenticate('google', {
        	scope: ['https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email']
    	   }), function(req, res) {
        });

	authRouter.route('/google/callback')

    	.get(passport.authenticate('google', {
        	//successRedirect: '/user/',
        	failure: '/error/'
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

                console.log("session.destroy callback");
                res.redirect("/");
            });
            
        });

	return authRouter;
};

module.exports = routes;