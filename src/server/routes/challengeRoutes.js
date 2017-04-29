var express = require("express");
var tmp = require("tmp");
var path = require("path");
var config = require("../config");

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

			var cypherQuery = "MATCH (n:Challenge)";

			// Filter by user who posted the challenge
			if (req.query.user) {
				cypherQuery += "-[r:POSTED_BY]->(u:User {id: '" + req.query.user + "'}) ";
			}

			cypherQuery += " RETURN n;";

			//console.log("Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			//console.log(result.data); // delivers an array of query results
    			//console.log(result.columns); // delivers an array of names of objects getting returned

    			res.json(result.data);
			});
		})

		.post(function(req, res){

			/**
				POST a new challenge node.
			**/

			console.log("received POST on /api/challenges");
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

    			console.log(JSON.stringify(req.user));
    			
				var cypherQuery = "MATCH(u:User {id: '" + req.user.id + "'}) CREATE (n:Challenge {" +
							"image : '" + name + "'," +
							//"imageType : '" + ext + "'," + 
							"created : '" + req.body.created + "'," + 
							"title : '" + req.body.caption + "'" +
							"})-[r:POSTED_BY]->(u) RETURN n;";

				console.log("Running cypherQuery: " + cypherQuery);
				
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

			var cypherQuery = "MATCH (c:Challenge) WHERE id(c) = " + req.params.challengeId + " RETURN c;";

			//console.log("GET Received, Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			//console.log(result.data); // delivers an array of query results
    			//console.log(result.columns); // delivers an array of names of objects getting returned

    			//image is /challenges/images/challengeId which in turn will be mapped to the actual image by the separate route
    			result.data[0].image = "/challenges/images/" + req.params.challengeId;
    			res.json(result.data[0]);
			});
		})

		.put(function(req, res){

			/**
				PUT the specific challenge.  Replace the data with the incoming values.
				Returns the updated JSON object.
			**/

			var cypherQuery = "MATCH (c:Challenge) WHERE id(c) = " + req.params.challengeId;

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

			var cypherQuery = "MATCH (c:Challenge) WHERE id(c) = " + req.params.challengeId;

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

			var cypherQuery = "MATCH (c: Challenge) WHERE id(c) = '" + req.params.challengeId + "' DELETE c;";
			//console.log("DELETE received, Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			//console.log(result.data); // delivers an array of query results
    			//console.log(result.columns); // delivers an array of names of objects getting returned

    			res.json(result.data);
			});
		});


	return challengeRouter;
};

module.exports = routes;