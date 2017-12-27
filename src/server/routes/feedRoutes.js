
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

			var validationParams = [
				{
					name: "ts", //last fetched timestamp
					type: "timestamp"
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			var meId = null;
			if (req.user && req.user.id) {
				meId = req.user.id;
			}
			
			var lastFetchedTimestamp = (req.query.ts) ? (req.query.ts) : 0;
			dbFeeds.createMainFeed(meId, lastFetchedTimestamp, function(err, result, newTimeStamp) {
				if (err) {
					logger.error(err);
					return res.sendStatus(500);
				}
				
				if (!serverUtils.validateData(result, serverUtils.prototypes.entityExtended)) {
    				return res.sendStatus(500);
    			}

    			var output = {ts: newTimeStamp, list: result};
    			logger.debug("returning output: " + JSON.stringify(output));
				return res.json(output);
			});
		});

	return feedRouter;
}

module.exports = routes;