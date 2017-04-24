var express = require("express");
var passport = require("passport");

var routes = function(db) {
	var authRouter = express.Router();

	authRouter.route("/google")

		.get(passport.authenticate('google', {
        	scope: ['https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email']
    	}));

	authRouter.route('/google/callback')

    	.get(passport.authenticate('google', {
        	successRedirect: '/user/',
        	failure: '/error/'
    	}));

	return authRouter;
};

module.exports = routes;