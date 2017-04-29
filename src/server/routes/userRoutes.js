var express = require("express");
var dataUtils = require("../dataUtils");

var routes = function(db) {
	var userRouter = express.Router();

	userRouter.route("/")

        .get(function(req, res) {
            console.log("/user/ req.user is " + JSON.stringify(req.user));
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

            		console.log("passing user to render, user = " + JSON.stringify(user));
            		res.render("user", {user : user});
            	});
            } else {
            	res.render("user", null);
            }
        });

	return userRouter;
};

module.exports = routes;