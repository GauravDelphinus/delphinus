var express = require("express");
var passport = require("passport");

var routes = function(db) {
	var authRouter = express.Router();

	authRouter.route("/google")
        .get(function (req, res, next) {
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
                res.redirect(req.session.redirectTo);
            }
        });

	return authRouter;
};

module.exports = routes;