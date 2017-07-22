var express = require("express");
var tmp = require("tmp");
var path = require("path");
var config = require("../config");
var shortid = require("shortid");
var dataUtils = require("../dataUtils");

var routes = function(db) {
	var challengeRouter = express.Router();

	challengeRouter.route("/") // ROUTER FOR /api/challenges

		.get(function(req, res){

			/** 
				GET challenges matching the query paramters.
				Typical call would be a GET to the URL /api/challenges?param1=value1&param2=value2 etc.

				Currently supported query paramters:
				1. search = <search query> - return all challenges matching the search query in their titles
				2. sortby = recent | trending | popular
					recent - sort by the most recently created challenge
					trending - sort by the most trending challenge (most activity in the past 1 day)
					popular - sort by the most popular challenge (most liked/shared of all time)
				3. limit = <number of values> - number of values to limit in the returned results

				Note: all query options can be cascaded on top of each other and the overall
				effect will be an intersection.
			**/

			var meId = (req.user) ? (req.user.id) : (0);

			var cypherQuery = "MATCH (c:Challenge)-[r:POSTED_BY]->(poster:User) " +
						" WITH c, poster " +
						" OPTIONAL MATCH (u2:User)-[:LIKES]->(c) " + 
						" WITH c, poster, COUNT(u2) AS like_count " + 
						" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
						" WITH c, poster, like_count, COUNT(comment) as comment_count " + 
						" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) " +
						" WITH c, poster, like_count, comment_count, COUNT(entry) AS entry_count " +
						" OPTIONAL MATCH (me:User {id: '" + meId + "'})-[like:LIKES]->(c) " +
						" RETURN c, poster, like_count, comment_count, entry_count, COUNT(like) ORDER BY c.created DESC;";


			//console.log("Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			//console.log(result.data); // delivers an array of query results
    			//console.log(result.columns); // delivers an array of names of objects getting returned

    			var output = [];
    			for (var i = 0; i < result.data.length; i++) {

    				var data = dataUtils.constructEntityData("challenge", result.data[i][0], result.data[i][1], result.data[i][0].created, result.data[i][2], result.data[i][3], result.data[i][4], 0, null, null, null, result.data[i][5] > 0, "none", null, null, null, null);
					output.push(data);

    			}
    			res.json(output);
			});
		})

		.post(function(req, res){

			/**
				POST a new challenge node.
			**/

			//console.log("received POST on /api/challenges");
			// Store the incoming base64 encoded image into a local image file first
			var fs = require('fs');
			var imageDataURI = req.body.imageDataURI;
			//var regex = /^data:.+\/(.+);base64,(.*)$/;

			//var matches = imageDataURI.match(regex);
			//var ext = matches[1].toLowerCase();
			//var data = matches[2];
			var index = imageDataURI.indexOf("base64,");
			var data;
			if (index != -1) {
				data = imageDataURI.slice(index + 7);
			} else {
				data = imageDataURI;
			}

			var buffer = new Buffer(data, 'base64');
			var baseDir = global.appRoot + config.path.challengeImages;

			//Create random name for new image file
			tmp.tmpName({ dir: baseDir }, function _tempNameGenerated(err, fullpath) {
    			if (err) throw err;
 
 				var name = path.parse(fullpath).base;

    			fs.writeFileSync(fullpath, buffer);

    			//console.log(JSON.stringify(req.user));
    			
    			var id = shortid.generate();

				var cypherQuery = "MATCH(u:User {id: '" + req.user.id + "'}) CREATE (n:Challenge {" +
							"id: '" + id + "'," +
							"image : '" + name + "'," +
							"created : '" + req.body.created + "'," + 
							"title : '" + dataUtils.escapeSingleQuotes(req.body.caption) + "'" +
							"})-[r:POSTED_BY]->(u) RETURN n;";

				//console.log("Running cypherQuery: " + cypherQuery);
				
				db.cypherQuery(cypherQuery, function(err, result){
    				if(err) throw err;

    				//console.log(result.data); // delivers an array of query results

    				res.json(result.data[0]);
				});
				
			});
		});

	challengeRouter.route("/:challengeId") // ROUTER FOR /api/challenges/<id>

		.get(function(req, res){

			/**
				GET the specific challenge node data.  
				Returns a single JSON object of type challenge
			**/

			//var cypherQuery = "MATCH (c:Challenge {id: '" + req.params.challengeId + "'})-[:POSTED_BY]->(u:User) OPTIONAL MATCH (u2:User)-[:LIKES]->(c) OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) RETURN c, u, COUNT(u2), COUNT(comment), COUNT(entry);";

			var cypherQuery = "MATCH (c:Challenge {id: '" + req.params.challengeId + "'})-[r:POSTED_BY]->(poster:User) " +
						" WITH c, poster " +
						" OPTIONAL MATCH (u2:User)-[:LIKES]->(c) " + 
						" WITH c, poster, COUNT(u2) AS like_count " + 
						" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
						" WITH c, poster, like_count, COUNT(comment) as comment_count " + 
						" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) " +
						" RETURN c, poster, like_count, comment_count, COUNT(entry) AS entry_count ORDER BY c.created DESC;";

			console.log("GET Received, Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			var data = dataUtils.constructEntityData("challenge", result.data[0][0], result.data[0][1], result.data[0][0].created, result.data[0][2], result.data[0][3], result.data[0][4], 0, null, null, null, "none", null, null, null, null);
    			res.json(data);
			});
		})

		.put(function(req, res){

			/**
				PUT the specific challenge.  Replace the data with the incoming values.
				Returns the updated JSON object.
			**/

			var cypherQuery = "MATCH (c:Challenge {id: '" + req.params.challengeId + "'}) ";

			cypherQuery += " SET ";

			// In PUT requests, the missing properties should be Removed from the node.  Hence, setting them to NULL
			cypherQuery += " c.image = " + ((req.body.image) ? ("'" + req.body.image + "'") : "NULL") + " , ";
			cypherQuery += " c.created = " + ((req.body.created) ? ("'" + req.body.created + "'") : "NULL") + " , ";
			cypherQuery += " c.title = " + ((req.body.title) ? ("'" + req.body.title + "'") : "NULL") + " ";

			cypherQuery += " RETURN c;";

			//console.log("PUT received, Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			//console.log(result.data); // delivers an array of query results
    			//console.log(result.columns); // delivers an array of names of objects getting returned

    			res.json(result.data[0]);
			});
		})

		.patch(function(req, res){

			/**
				PATCH the specific challenge.  Update some properties of the challenge.
				Returns the updated JSON object.
			**/

			var cypherQuery = "MATCH (c:Challenge {id : '" + req.params.challengeId + "'}) ";

			cypherQuery += " SET ";

			// In PATCH request, we updated only the available properties, and leave the rest
			// in tact with their current values.
			var addComma = false;
			if (req.body.image) {
				cypherQuery += " c.image = '" + req.body.image + "' ";
				addComma = true;
			}

			if (req.body.created) {
				if (addComma) {
					cypherQuery += " , ";
				}
				cypherQuery += " c.created = '" + req.body.created + "' ";
				addComma = true;
			}

			if (req.body.title) {
				if (addComma) {
					cypherQuery += " , ";
				}
				cypherQuery += " c.title = '" + req.body.title + "' ";
				addComma = true;
			}

			cypherQuery += " RETURN c;";

			//console.log("PATCH received, Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			//console.log(result.data); // delivers an array of query results
    			//console.log(result.columns); // delivers an array of names of objects getting returned

    			res.json(result.data[0]);
			});

		})

		.delete(function(req, res){
			
			/**
				DELETE will permantently delete the specified node.  Call with Caution!
			**/

			var cypherQuery = "MATCH (c: Challenge {id : '" + req.params.challengeId + "'}) DELETE c;";
			//console.log("DELETE received, Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			//console.log(result.data); // delivers an array of query results
    			//console.log(result.columns); // delivers an array of names of objects getting returned

    			res.json(result.data);
			});
		});

	challengeRouter.route("/:challengeId/like") // /api/challenges/:challengeId/like

		.get(function(req, res) { //get current like status
			if (req.user && req.user.id) {
	      		var cypherQuery = "MATCH (u:User {id: '" + req.user.id + 
	      			"'})-[:LIKES]->(c:Challenge {id: '" + req.params.challengeId + "'}) RETURN c;";
	      		//console.log("running cypherQuery: " + cypherQuery);
	      		db.cypherQuery(cypherQuery, function(err, result){
	                if(err) throw err;

	                //console.log("result of get likes is " + JSON.stringify(result.data)); // delivers an array of query results
	                //console.log(result.columns); // delivers an array of names of objects getting returned

	                //console.log(result.data);
	                var output = {};
	                if (result.data.length == 1) {
	                	output = {likeStatus : "on"};
	                } else {
	                	output = {likeStatus : "off"};
	                }

	                //console.log("sending back to client: " + JSON.stringify(output));
	                res.json(output);
				});
      		} else {
      			res.json({error: "Not Logged In"});
      		}
		})

		.put(function(req, res) {
			if (req.body.likeAction == "like") {
      			var cypherQuery = "MATCH (u:User {id: '" + req.user.id + 
      				"'}), (c:Challenge {id: '" + req.params.challengeId + "'}) CREATE (u)-[r:LIKES {created: '" + req.body.created + "'}]->(c) RETURN r;";
      			db.cypherQuery(cypherQuery, function(err, result){
	                if(err) throw err;

	                //console.log(result.data); // delivers an array of query results
	                //console.log(result.columns); // delivers an array of names of objects getting returned

	                var output = {};

	                //console.log(result.data);
	                if (result.data.length == 1) {

	                	output.likeStatus = "on";
	                } else {

	                	output.likeStatus = "off";
	                }
	                res.json(output);
				});
      		} else if (req.body.likeAction == "unlike") {
      			var cypherQuery = "MATCH (u:User {id: '" + req.user.id + 
      				"'})-[r:LIKES]->(c:Challenge {id: '" + req.params.challengeId + "'}) DELETE r RETURN COUNT(r);";
      			db.cypherQuery(cypherQuery, function(err, result){
	                if(err) throw err;

					//console.log("result of deletion: " + JSON.stringify(result));
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

		return challengeRouter;
}

module.exports = routes;