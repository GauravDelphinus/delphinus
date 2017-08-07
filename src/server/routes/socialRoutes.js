var express = require("express");
var config = require("../config");

var routes = function(db) {
	var socialRouter = express.Router();

	socialRouter.route("/")
	.post(function(req, res) {
		if (req.query.target == "facebook") {
			var facebook = require('../services/facebook')('1286014801445639', '81732e3d807f86c9099589f632897dce');
			facebook.postUpdate(req.body.message, config.hostname + req.body.link, req.user.facebook.token, function(error, data) {
				if (error) {
	        		res.sendStatus(401);
	        	} else {
	        		res.json(data);
	        	}
			});
		} else if (req.query.target == "twitter") {
			var twitter = require('../services/twitter')('7Y9T7UneSfQnZ3EvuhErbEpdP', 'n7lQJiOJFrTCpNzrsq1Vt6JI18hkEwfTB0r1iTRgozYi8w793f');
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