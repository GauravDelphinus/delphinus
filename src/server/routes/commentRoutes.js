var express = require("express");
var async = require("async");
var shortid = require("shortid");
var config = require("../config");

var routes = function(db) {

	var commentRouter = express.Router();

	commentRouter.route("/") // ROUTER for /api/comments

		.get(function(req, res){

			/**
				GET comments that match the given query parameters.

				Typical call would be a GET to the URL /api/comments?param1=value1&param2=value2 etc.

				Currently supported query paramters:
				1. entityId = id of entity to which the comments are attached (mandatory)
				2. sortby = recent | trending | popular
					recent - sort by the most recently created challenge
					trending - sort by the most trending challenge (most activity in the past 1 day)
					popular - sort by the most popular challenge (most liked/shared of all time)
				3. limit = <number of values> - number of values to limit in the returned results
				4. user = <user id> - comments posted by this user

				Note: all query options can be cascaded on top of each other and the overall
				effect will be an intersection.
			**/

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
    			if(err) throw err;

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

    			res.json(output);
			});
		})

		.post(function(req, res){

			/**
				POST a new comment node
			**/

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
				if(err) throw err;

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
				res.json(data);
			});
		});

	commentRouter.route("/:commentId")

		.get(function(req, res){

			/**
				GET the specific entry node data.  
				Returns a single JSON object of type entry
			**/

			var cypherQuery = "MATCH (c:Comment {id: '" + req.params.commentId + "'})-[:POSTED_BY]->(u:User) ";

			// add social count check
			cypherQuery += " OPTIONAL MATCH (u2:User)-[:LIKES]->(c) RETURN c, u, COUNT(u2)";
			
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

				var c = result.data[0][0];
				var u = result.data[0][1];
				var numLikes = result.data[0][2];

				var data = {};
				data.type = "comment";
				data.id = c.id;

				data.postedDate = e.created;
				data.postedByUser = {};
				data.postedByUser.id = u.id;
				data.postedByUser.displayName = u.displayName;
				data.postedByUser.image = u.image;

				data.socialStatus = {};
				data.socialStatus.numLikes = numLikes;

				data.text = c.text;
    			
    			res.json(data);
			});
		})

		.put(function(req, res){

			/**
				PUT the specific entry.  Replace the data with the incoming values.
				Returns the updated JSON object.
			**/

			var cypherQuery = "MATCH (c:Comment {id: '" + req.params.commentId + "'}) ";

			cypherQuery += " SET ";

			// In PUT requests, the missing properties should be Removed from the node.  Hence, setting them to NULL
			cypherQuery += " c.created = " + ((req.body.created) ? ("'" + req.body.created + "'") : "NULL") + " , ";
			cypherQuery += " c.text = " + ((req.body.text) ? ("'" + req.body.text + "'") : "NULL") + " ";

			cypherQuery += " RETURN c;";

			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			res.json(result.data[0]);
			});
		})

		.patch(function(req, res){

			/**
				PATCH the specific entry.  Update some properties of the entry.
				Returns the updated JSON object.
			**/

			var cypherQuery = "MATCH (c:Comment {id: '" + req.params.commentId + "'}) ";

			cypherQuery += " SET ";

			// In PATCH request, we updated only the available properties, and leave the rest
			// in tact with their current values.
			var addComma = false;

			if (req.body.created) {
				if (addComma) {
					cypherQuery += " , ";
				}
				cypherQuery += " c.created = '" + req.body.created + "' ";
				addComma = true;
			}

			if (req.body.text) {
				if (addComma) {
					cypherQuery += " , ";
				}
				cypherQuery += " c.text = '" + req.body.text + "' ";
				addComma = true;
			}

			cypherQuery += " RETURN c;";

			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			res.json(result.data[0]);
			});

		})

		.delete(function(req, res){
			
			/**
				DELETE will permantently delete the specified comment, along with all child comments.  Call with Caution!
			**/

			var cypherQuery = "MATCH (c:Comment {id: '" + req.params.commentId + "'}) OPTIONAL MATCH (c)<-[:POSTED_IN*1..2]-(comment:Comment) detach delete comment, c;";

			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			res.json(result.data);
			});
		});

		commentRouter.route("/:commentId/like") // /api/comments/:commentId/like

		.get(function(req, res) { //get current like status
			if (req.user && req.user.id) {
	      		var cypherQuery = "MATCH (u:User {id: '" + req.user.id + 
	      			"'})-[:LIKES]->(c:Comment {id: '" + req.params.commentId + "'}) RETURN c;";

	      		db.cypherQuery(cypherQuery, function(err, result){
	                if(err) throw err;

	                var output = {};
	                if (result.data.length == 1) {
	                	output = {likeStatus : "on"};
	                } else {
	                	output = {likeStatus : "off"};
	                }

	                res.json(output);
				});
      		} else {
      			res.json({error: "Not Logged In"});
      		}
		})
		.put(function(req, res) {
			if (req.body.likeAction == "like") {
      			var cypherQuery = "MATCH (u:User {id: '" + req.user.id + 
      				"'}), (c:Comment {id: '" + req.params.commentId + "'}) CREATE (u)-[r:LIKES {created: '" + req.body.created + "'}]->(c) RETURN r;";
      			db.cypherQuery(cypherQuery, function(err, result){
	                if(err) throw err;

	                var output = {};

	                if (result.data.length == 1) {

	                	output.likeStatus = "on";
	                } else {

	                	output.likeStatus = "off";
	                }
	                res.json(output);
				});
      		} else if (req.body.likeAction == "unlike") {
      			var cypherQuery = "MATCH (u:User {id: '" + req.user.id + 
      				"'})-[r:LIKES]->(c:Comment {id: '" + req.params.commentId + "'}) DELETE r RETURN COUNT(r);";
      			db.cypherQuery(cypherQuery, function(err, result){
	                if(err) throw err;

					var output = {};

					if (result.data.length == 1) {
						output.likeStatus = "off";
					} else {
						output.likeStatus = "on";
					}
					
					res.json(output);
				});
      		}
		});


	return commentRouter;
};

module.exports = routes;