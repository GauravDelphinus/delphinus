var express = require("express");

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

			var cypherQuery = "MATCH (n:Challenge) ";

			cypherQuery += " RETURN n;";

			console.log("Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			console.log(result.data); // delivers an array of query results
    			console.log(result.columns); // delivers an array of names of objects getting returned

    			res.json(result.data);
			});
		})

		.post(function(req, res){

			/**
				POST a new challenge node.
			**/

			var cypherQuery = "CREATE (n:Challenge {" +
							"image : '" + req.body.image + "'," +
							"created : '" + req.body.created + "'," + 
							"title : '" + req.body.title + "'" +
							"} );";
			console.log("Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			console.log(result.data); // delivers an array of query results
    			console.log(result.columns); // delivers an array of names of objects getting returned

    			res.json(result.data);
			});
		});

	challengeRouter.route("/:challengeId") // ROUTER FOR /api/challenges/<id>

		.get(function(req, res){

			/**
				GET the specific challenge node data.
			**/

			var cypherQuery = "MATCH (c:Challenge) WHERE id(c) = " + req.params.challengeId + " RETURN c;";

			console.log("GET Received, Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			console.log(result.data); // delivers an array of query results
    			console.log(result.columns); // delivers an array of names of objects getting returned

    			res.json(result.data);
			});
		})

		.put(function(req, res){

			/**
				PUT the specific challenge.  Replace the data with the incoming values.
			**/

			var cypherQuery = "MATCH (c:Challenge) WHERE id(c) = " + req.params.challengeId;

			cypherQuery += " SET ";

			// In PUT requests, the missing properties should be Removed from the node.  Hence, setting them to NULL
			cypherQuery += " c.image = " + ((req.body.image) ? ("'" + req.body.image + "'") : "NULL") + " , ";
			cypherQuery += " c.created = " + ((req.body.created) ? ("'" + req.body.created + "'") : "NULL") + " , ";
			cypherQuery += " c.title = " + ((req.body.title) ? ("'" + req.body.title + "'") : "NULL") + " ";

			cypherQuery += " RETURN c;";

			console.log("PUT received, Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			console.log(result.data); // delivers an array of query results
    			console.log(result.columns); // delivers an array of names of objects getting returned

    			res.json(result.data);
			});
		})

		.patch(function(req, res){

			/**
				PATCH the specific challenge.  Update some properties of the challenge.
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

			console.log("PATCH received, Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			console.log(result.data); // delivers an array of query results
    			console.log(result.columns); // delivers an array of names of objects getting returned

    			res.json(result.data);
			});

		})
		
		.delete(function(req, res){
			
			/**
				DELETE will permantently delete the specified node.  Call with Caution!
			**/

			var cypherQuery = "MATCH (n: Challenge) WHERE id(c) = '" + req.params.challengeId + "' DELETE n;";
			console.log("DELETE received, Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			console.log(result.data); // delivers an array of query results
    			console.log(result.columns); // delivers an array of names of objects getting returned

    			res.json(result.data);
			});
		});


	return challengeRouter;
};

module.exports = routes;