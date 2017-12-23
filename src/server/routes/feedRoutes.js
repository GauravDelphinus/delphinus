
var express = require("express");
var dataUtils = require("../dataUtils");
var logger = require("../logger");
var serverUtils = require("../serverUtils");
var error = require("../error");
var dbFeeds = require("../db/dbFeeds");

var routes = function(db) {
	var feedRouter = express.Router();

	
	feedRouter.route("/") // ROUTER FOR /api/feeds

		.get(function(req, res){

			logger.debug("GET received on /api/feeds, query: " + JSON.stringify(req.query));

			if (req.user && req.user.id) {
				dbFeeds.createMainFeedForLoggedInUser(req.user.id, function(err, result) {
					if (err) {
						logger.error(err);
						return res.sendStatus(500);
					}
					
					return res.json(result);
				});
			} else {
				dbFeeds.createMainFeedForAnonymousUser(function(err, result) {
					if (err) {
						logger.error(err);
						return res.sendStatus(500);
					}

					return res.json(result);
				});
			}
			
		});

	return feedRouter;
}

module.exports = routes;