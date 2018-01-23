var express = require("express");
var serverUtils = require("../serverUtils");
var logger = require("../logger");
var async = require("async");
var dbUtils = require("../db/dbUtils");

var routes = function() {
	var postRouter = express.Router();

	postRouter.route("/")
		.get(function(req, res){

			logger.debug("GET received on /api/posts, query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "postedBy",
					type: "id"
				},
				{
					name: "ts", //last fetched timestamp
					type: "timestamp"
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			var lastFetchedTimestamp = (req.query.ts) ? (req.query.ts) : 0;
			dbUtils.getPosts(req.query.postedBy, lastFetchedTimestamp, function(err, result, newTimeStamp) {
				if (err) {
					logger.error(err);
					return res.sendStatus(500);
				}
				
				if (!serverUtils.validateData(result, serverUtils.prototypes.entityExtended)) {
    				return res.sendStatus(500);
    			}

    			var output = {ts: newTimeStamp, list: result};
				return res.json(output);
			});
		});
		
	return postRouter;
};

module.exports = routes;