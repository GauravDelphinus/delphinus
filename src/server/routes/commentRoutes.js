var express = require("express");
var async = require("async");
var shortid = require("shortid");
var config = require("../config");
var logger = require("../logger");
var serverUtils = require("../serverUtils");

var routes = function(db) {

	var commentRouter = express.Router();

	commentRouter.route("/") // ROUTER for /api/comments

		.get(function(req, res){

			logger.debug("GET received on /api/comments, req.query = " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "entityId",
					type: "id"
				},
				{
					name: "user",
					type: "id"
				},
				{
					name: "category",
					type: "id"
				},
				{
					name: "sortBy",
					type: ["popularity", "date", "reverseDate"],
					required: "yes"
				},
				{
					name: "count",
					type: "number"
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			var cypherQuery;

			if (req.query.entityId && req.query.user) {
				cypherQuery = "MATCH (c:Comment)-[:POSTED_BY]->(u:User {id: '" + req.query.user + "'}), (c)-[:POSTED_IN]->({id: '" + req.query.entityId + "'}) ";
			} else if (req.query.entityId) {
				cypherQuery = "MATCH (c:Comment)-[:POSTED_IN]->({id: '" + req.query.entityId + "'}), (c)-[:POSTED_BY]->(u:User) ";
			} else if (req.query.user) {
				cypherQuery = "MATCH (c:Comment)-[:POSTED_BY]->(u:User {id: '" + req.query.user + "'}) ";
			} else {
				cypherQuery = "MATCH (c:Comment)-[:POSTED_BY]->(u:User) ";
			}
			
			// add social count check
			cypherQuery += " OPTIONAL MATCH (u2:User)-[:LIKES]->(c) RETURN c, u, COUNT(u2)";
			
			if (req.query.sortBy) {
				if (req.query.sortBy == "popularity") {
					cypherQuery += " ";
				} else if (req.query.sortBy == "date") {
					cypherQuery += " ORDER BY c.created DESC";
				} else if (req.query.sortBy == "reverseDate") {
					cypherQuery += " ORDER BY c.created ASC";
				}
			}

			if (req.query.count) {
				cypherQuery += " LIMIT " + req.query.count;
			}

			cypherQuery += " ;";
		
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) {
    				logger.dbError(err, cypherQuery);
    				return res.sendStatus(500);
    			}

    			var output = [];
    			for (var i = 0; i < result.data.length; i++) {
    				var c = result.data[i][0];
    				var u = result.data[i][1];
    				var numLikes = result.data[i][2];

    				var data = {};
    				data.type = "comment";
    				data.id = c.id;
    				data.children = c.children;
    				
					data.postedDate = c.created;
					data.postedByUser = {};
					data.postedByUser.id = u.id;
					data.postedByUser.displayName = u.displayName;
					data.postedByUser.image = u.image;

					data.socialStatus = {};
					data.socialStatus.numLikes = numLikes;

					data.text = c.text;

					output.push(data);
    			}

    			return res.json(output);
			});
		})

		.post(function(req, res){

			/**
				POST a new comment node
			**/

			logger.debug("POST received on /api/comments, req.body = " + JSON.stringify(req.body));

			var validationParams = [
				{
					name: "entityId",
					type: "id"
				},
				{
					name: "created",
					type: "number"
				},
				{
					name: "text",
					type: "string"
				}	
			];

			if (!serverUtils.validateQueryParams(req.body, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			var id = shortid.generate();
			/**
				First create the entry node.  Then later, link them to Filter nodes.
			**/
			var cypherQuery = "MATCH (e {id: '" + req.body.entityId + "'}) " + 
							" MATCH (u:User {id: '" + req.user.id + "'}) CREATE (c:Comment {" +
							"id: '" + id + "', " + 
							"created : '" + req.body.created + "', " + 
							"children : 0, " + 
							"text : '" + req.body.text + "'" + 
							"})-[:POSTED_IN]->(e), (u)<-[r:POSTED_BY]-(c) RETURN c;";

			
			db.cypherQuery(cypherQuery, function(err, result){
				if(err) {
					logger.dbError(err, cypherQuery);
					return res.sendStatus(500);
				}

				var newEntryId = result.data[0].id;

				var c = result.data[0];

				var data = {};
				data.type = "comment";
				data.id = c.id;
				
				data.postedDate = c.created;
				data.postedByUser = {};
				data.postedByUser.id = req.user.id;
				data.postedByUser.displayName = req.user.displayName;
				data.postedByUser.image = req.user.image;

				data.socialStatus = {};
				data.socialStatus.numLikes = 0;

				data.text = c.text;
				return res.json(data);
			});
		});

	commentRouter.route("/:commentId")

		.delete(function(req, res){
			
			/**
				DELETE will permantently delete the specified comment, along with all child comments.  Call with Caution!
			**/

			logger.debug("DELETE received on /api/comments/" + req.params.commentId);

			var validationParams = [
				{
					name: "commentId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			var cypherQuery = "MATCH (c:Comment {id: '" + req.params.commentId + "'}) OPTIONAL MATCH (c)<-[:POSTED_IN*1..2]-(comment:Comment) detach delete comment, c;";

			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) {
    				logger.dbError(err, cypherQuery);
    				return res.sendStatus(500);
    			}

    			return res.json(result.data);
			});
		});

	commentRouter.route("/:commentId/like") // /api/comments/:commentId/like

		.get(function(req, res) { //get current like status

			logger.debug("GET received on /api/comments/" + req.params.commentId + "/like, query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "commentId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

      		var cypherQuery = "MATCH (u:User {id: '" + req.user.id + 
      			"'})-[:LIKES]->(c:Comment {id: '" + req.params.commentId + "'}) RETURN c;";

      		db.cypherQuery(cypherQuery, function(err, result){
                if(err) {
                	logger.dbError(err, cypherQuery);
                	return res.sendStatus(500);
                }

                var output = {};
         		output.likeStatus = (result.data.length == 1) ? "on" : "off";

                return res.json(output);
			});

		})

		.put(function(req, res) {

			logger.debug("PUT received on /api/comments/" + req.params.commentId + "/like, req.body = " + JSON.stringify(req.body));

			var validationParams = [
				{
					name: "commentId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			validationParams = [
				{
					name: "created",
					type: "number",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.body, validationParams)) {
				return res.sendStatus(400);
			}

			if (req.body.likeAction == "like") {
      			var cypherQuery = "MATCH (u:User {id: '" + req.user.id + 
      				"'}), (c:Comment {id: '" + req.params.commentId + "'}) CREATE (u)-[r:LIKES {created: '" + req.body.created + "'}]->(c) RETURN r;";
      			db.cypherQuery(cypherQuery, function(err, result){
	                if(err) {
	                	logger.dbError(err, cypherQuery);
	                	return res.sendStatus(500);
	                }

	                var output = {likeStatus: (result.data.length == 1) ? "on" : "off"};

	                return res.json(output);
				});
      		} else if (req.body.likeAction == "unlike") {
      			var cypherQuery = "MATCH (u:User {id: '" + req.user.id + 
      				"'})-[r:LIKES]->(c:Comment {id: '" + req.params.commentId + "'}) DELETE r RETURN COUNT(r);";
      			db.cypherQuery(cypherQuery, function(err, result){
	                if(err) {
	                	logger.dbError(err, cypherQuery);
	                	return res.sendStatus(500);
	                }

					var output = {likeStatus: (result.data.length == 1) ? "off" : "on"};
					
					return res.json(output);
				});
      		}
		});


	return commentRouter;
};

module.exports = routes;