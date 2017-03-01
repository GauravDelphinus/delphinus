var express = require("express");

var routes = function(db) {

	var entryRouter = express.Router();

	entryRouter.route("/")

		.get(function(req, res){

			/**
				GET entries that match the given query parameters.

				Typical call would be a GET to the URL /api/entries?param1=value1&param2=value2 etc.

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

			var cypherQuery = "MATCH (n:Entry) RETURN n;";

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
				POST a new entry node, and link it to a Challenge node.
			**/

			var cypherQuery = "MATCH (c:Challenge) WHERE id(c) = " + req.body.challengeId + 
							" CREATE (e:Entry {" +
							"steps : '" + req.body.steps + "'," +
							"created : '" + req.body.created + "'," + 
							"caption : '" + req.body.caption + "'" +
							"} )-[r:PART_OF]->(c);";
			console.log("Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			console.log(result.data); // delivers an array of query results
    			console.log(result.columns); // delivers an array of names of objects getting returned

    			res.json(result.data[0]);
			});
		});

	entryRouter.route("/:entryId")

		.get(function(req, res){

			/**
				GET the specific entry node data.  
				Returns a single JSON object of type entry
			**/

			var cypherQuery = "MATCH (e:Entry) WHERE id(e) = " + req.params.entryId + " RETURN e;";

			console.log("GET Received, Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			console.log(result.data); // delivers an array of query results
    			console.log(result.columns); // delivers an array of names of objects getting returned

    			var entryObject = result.data[0];
    			entryObject.image = "/data/entries/images/" + req.params.entryId;
    			res.json(entryObject);
			});
		})

		.put(function(req, res){

			/**
				PUT the specific entry.  Replace the data with the incoming values.
				Returns the updated JSON object.
			**/

			var cypherQuery = "MATCH (e:Challenge) WHERE id(e) = " + req.params.entryId;

			cypherQuery += " SET ";

			// In PUT requests, the missing properties should be Removed from the node.  Hence, setting them to NULL
			cypherQuery += " e.steps = " + ((req.body.steps) ? ("'" + req.body.steps + "'") : "NULL") + " , ";
			cypherQuery += " e.created = " + ((req.body.created) ? ("'" + req.body.created + "'") : "NULL") + " , ";
			cypherQuery += " e.caption = " + ((req.body.caption) ? ("'" + req.body.caption + "'") : "NULL") + " ";

			cypherQuery += " RETURN e;";

			console.log("PUT received, Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			console.log(result.data); // delivers an array of query results
    			console.log(result.columns); // delivers an array of names of objects getting returned

    			res.json(result.data[0]);
			});
		})

		.patch(function(req, res){

			/**
				PATCH the specific entry.  Update some properties of the entry.
				Returns the updated JSON object.
			**/

			var cypherQuery = "MATCH (e:Challenge) WHERE id(e) = " + req.params.entryId;

			cypherQuery += " SET ";

			// In PATCH request, we updated only the available properties, and leave the rest
			// in tact with their current values.
			var addComma = false;
			if (req.body.image) {
				cypherQuery += " e.steps = '" + req.body.steps + "' ";
				addComma = true;
			}

			if (req.body.created) {
				if (addComma) {
					cypherQuery += " , ";
				}
				cypherQuery += " e.created = '" + req.body.created + "' ";
				addComma = true;
			}

			if (req.body.title) {
				if (addComma) {
					cypherQuery += " , ";
				}
				cypherQuery += " e.title = '" + req.body.title + "' ";
				addComma = true;
			}

			cypherQuery += " RETURN e;";

			console.log("PATCH received, Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			console.log(result.data); // delivers an array of query results
    			console.log(result.columns); // delivers an array of names of objects getting returned

    			res.json(result.data[0]);
			});

		})

		.delete(function(req, res){
			
			/**
				DELETE will permantently delete the specified node.  Call with Caution!
			**/

			var cypherQuery = "MATCH (e: Challenge) WHERE id(e) = '" + req.params.challengeId + "' DELETE e;";
			console.log("DELETE received, Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			console.log(result.data); // delivers an array of query results
    			console.log(result.columns); // delivers an array of names of objects getting returned

    			res.json(result.data);
			});
		});

	return entryRouter;
};

module.exports = routes;