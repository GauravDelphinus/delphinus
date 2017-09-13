var express = require("express");
var config = require("../config");
var serverUtils = require("../serverUtils");

var routes = function(db) {
	var socialRouter = express.Router();

	socialRouter.route("/")
		.post(function(req, res) {
			logger.debug("POST received on /api/social, body: " + JSON.stringify(req.body));

			var validationParams = [
				{
					name: "message",
					required: "yes",
					type: "string"
				},
				{
					name: "link",
					type: "url",
					required: "yes"
				},
				{
					name: "target",
					required: "yes",
					type: ["facebook", "twitter"]
				}
			];

			if (!serverUtils.validateQueryParams(req.body, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			if (req.body.target == "facebook") {
				var facebook = require('../services/facebook')();
				facebook.postUpdate(req.body.message, config.hostname + req.body.link, req.user.facebook.token, function(error, data) {
					if (error) {
		        		res.sendStatus(500);
		        	} else {
		        		res.status(201).json({id: body.id});
		        	}
				});
			} else if (req.body.target == "twitter") {
				var twitter = require('../services/twitter')();
		        twitter.postUpdate(req.body.message, req.user.twitter.token, req.user.twitter.tokenSecret, function (error, data) {
		        	if (error) {
		        		res.sendStatus(500);
		        	} else {
		        		res.status(201).json({id: body.id});
		        	}
		        });
			}
		});

	return socialRouter;
};

module.exports = routes;