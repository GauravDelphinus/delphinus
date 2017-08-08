var express = require("express");
var config = require("../config");

var routes = function(db) {
	var socialRouter = express.Router();

	socialRouter.route("/")
	.post(function(req, res) {
		if (req.query.target == "facebook") {
			var facebook = require('../services/facebook')();
			facebook.postUpdate(req.body.message, config.hostname + req.body.link, req.user.facebook.token, function(error, data) {
				if (error) {
	        		res.sendStatus(401);
	        	} else {
	        		res.json(data);
	        	}
			});
		} else if (req.query.target == "twitter") {
			var twitter = require('../services/twitter')();
	        twitter.postUpdate(req.body.message, req.user.twitter.token, req.user.twitter.tokenSecret, function (error, data) {
	        	if (error) {
	        		res.sendStatus(401);
	        	} else {
	        		res.json(data);
	        	}
	        });
		}
	});

	return socialRouter;
};

module.exports = routes;