var express = require("express");
var serverUtils = require("../serverUtils");
var logger = require("../logger");
var async = require("async");
var dataUtils = require("../dataUtils");

var routes = function(db) {
	var postRouter = express.Router();

	postRouter.route("/")
		.get(function(req, res){

			logger.debug("GET received on /api/posts, query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "sortBy",
					required: "yes",
					type: ["dateCreated", "popularity"]
				},
				{
					name: "postedBy",
					type: "id"
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			var meId = (req.user) ? (req.user.id) : (0);

			var postedByStr = "";
			if (req.query.postedBy) {
				postedByStr += " {id: '" + req.query.postedBy + "'}";
			}

			var runQueryFunctions = [];
			var resultArrays = [];

			runQueryFunctions.push(function(callback){
				var cypherQuery = "MATCH (category:Category)<-[:POSTED_IN]-(c:Challenge)-[r:POSTED_BY]->(u:User " + postedByStr + ") " +
					" WITH c, category, u " +
					" OPTIONAL MATCH (u2:User)-[:LIKES]->(c) " + 
					" WITH c, category, u, COUNT(u2) AS like_count " +
					" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
					" WITH c, category, u, like_count, COUNT(comment) AS comment_count " +
					" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) " +
					" WITH c, category, u, like_count, comment_count, COUNT(entry) AS entry_count " +
					" OPTIONAL MATCH (me:User {id: '" + meId + "'})-[like:LIKES]->(c) " +
					" RETURN c, u, like_count, comment_count, entry_count, COUNT(like), category ORDER BY c.created DESC;";

				db.cypherQuery(cypherQuery, function(err, result) {
					if (err) {
						logger.dbError(err, cypherQuery);
						return callback(err, 0);
					}

					var output = [];
	    			for (var i = 0; i < result.data.length; i++) {
	    				var data = dataUtils.constructEntityData("challenge", result.data[i][0], result.data[i][1], result.data[i][0].created, result.data[i][2], result.data[i][3], result.data[i][4], 0, null, null, null, result.data[i][5] > 0, "post", null, null, null, null, result.data[i][6]);
						output.push(data);
	    			}

	    			if (!serverUtils.validateData(output, serverUtils.prototypes.challenge)) {
	    				return callback(new error.DataValidationError(output, serverUtils.prototypes.challenge), 0);
	    			}
					resultArrays.push(output);
					return callback(null, 0);
				});
			});

			// Entries posted recently by a user who I'm following (refined)
			runQueryFunctions.push(function(callback){
				var cypherQuery = "MATCH (e:Entry)-[:POSTED_BY]->(u:User " + postedByStr + ") " +
					" WITH e, u " +
					" OPTIONAL MATCH (u2:User)-[:LIKES]->(e) " + 
					" WITH e, u, COUNT(u2) AS like_count " +
					" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(e) " + 
					" WITH e, u, like_count, COUNT(comment) AS comment_count " +
					" OPTIONAL MATCH (me:User {id: '" + meId + "'})-[like:LIKES]->(e) " +
					" RETURN e, u, like_count, comment_count, COUNT(like) ORDER BY e.created DESC;";

				db.cypherQuery(cypherQuery, function(err, result) {
					if (err) {
						logger.dbError(err, cypherQuery);
						return callback(err, 0);
					}

					var output = [];
	    			for (var i = 0; i < result.data.length; i++) {
	    				var data = dataUtils.constructEntityData("entry", result.data[i][0], result.data[i][1], result.data[i][0].created, result.data[i][2], result.data[i][3], null, 0, null, null, null, result.data[i][4] > 0, "post", null, null, null, null);
						output.push(data);
	    			}

	    			if (!serverUtils.validateData(output, serverUtils.prototypes.entry)) {
	    				return callback(new error.DataValidationError(output, serverUtils.prototypes.entry), 0);
	    			}
					resultArrays.push(output);
					return callback(null, 0);
				});
			});

			async.series(runQueryFunctions, function(err, unusedList) {
				if (err) {
					logger.error("Error with one of the query functions: " + err);
					return res.sendStatus(500);
				}

				var mergedOutput = [];
				serverUtils.mergeFeeds(resultArrays, mergedOutput);
				return res.json(mergedOutput);
			});
		});
		
	return postRouter;
};

module.exports = routes;