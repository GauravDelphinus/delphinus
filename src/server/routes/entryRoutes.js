var express = require("express");
var async = require("async");
var dataUtils = require("../dataUtils");

var routes = function(db) {

	var entryRouter = express.Router();

	entryRouter.route("/") // ROUTER for /api/entries

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


			/**
				First create the entry node.  Then later, link them to Filter nodes.
			**/
			var cypherQuery = "MATCH (c:Challenge) WHERE id(c) = " + req.body.challengeId +
							" CREATE (e:Entry {" +
							"created : '" + req.body.created + "'" + 
							"})-[:PART_OF]->(c) RETURN e;";

				console.log("Running cypherQuery: " + cypherQuery);
				
				db.cypherQuery(cypherQuery, function(err, result){
    				if(err) throw err;

    				console.log(result.data); // delivers an array of query results
    				var newEntryId = result.data[0]._id;

    				//res.json(result.data[0]);

    				/**
						Next extract all the filters, decorations, layouts and artifacts, and create the
						respective nodes, and link them to the entry node.
					**/

					var createFilterNodesFunctions = []; // array of functions that will create the Filter Nodes

					// FILTERS
					if (req.body.filters && (req.body.filters.constructor === Array)) {
						for (var i = 0; i < req.body.filters.length; i++) {
							var filter = req.body.filters[i];

							if (filter.effects.type == "user_defined") {
								var userDefinedFilterNodeId = parseInt(filter.effects.user_defined);
								createFilterNodesFunctions.push(function(callback) {
									callback(null, userDefinedFilterNodeId);
								});
							} else {
								createFilterNodesFunctions.push(async.apply(dataUtils.createFilterNode, db, filter));
							}
							/*
							if (filter.type == "preset") {
								// the value coming in the 'preset' value is the id of the Filter Node for the preset filter
								nodeId = parseInt(filter.preset);
								createFilterNodesFunctions.push(function(callback) {
									console.log("preset function called, calling callback with nodeId = " + nodeId);
									callback(null, nodeId);
								});

							} else if (filter.type == "user_defined") {
								// the valu ecoming in the 'user_defined' value is the id of the Filter Node for the user defined filter
								nodeId = parseInt(filter.user_defined);
								createFilterNodesFunctions.push(function(callback) {
									console.log("user_defined function called, calling callback with nodeId = " + nodeId);
									callback(null, nodeId);
								});
							} else if (filter.type == "custom") {
								
								var createFilterQuery = "CREATE (f: Filter {" +
														"type: 'custom', ";
								createFilterNodesFunctions.push(async.apply(dataUtils.createFilterNode, db, filter.custom));
								

							}
							*/
						}
					}

					// LAYOUTS

					async.series(createFilterNodesFunctions, 
						function(err, filterNodes) {

							var cypherQuery = "MATCH (e:Entry) WHERE id(e) = " + newEntryId + "";
							console.log("filterNodes, num values = " + filterNodes.length);
							for (var i = 0; i < filterNodes.length; i++) {
								console.log("filterNodes, " + i + " = " + filterNodes[i]);

								// Now associate filters to the new entry
								cypherQuery += " MATCH (f" + i + ":Filter) WHERE id(f" + i + ") = " + filterNodes[i] + "";
							}

							cypherQuery += " CREATE ";

							for (var i = 0; i < filterNodes.length; i++) {
								if (i > 0) {
									cypherQuery += " , ";
								}
								cypherQuery += " (f" + i + ")<-[:USES {order : '" + i + "'}]-(e) ";
							}

							cypherQuery += ";";

							console.log("cypherQuery is: " + cypherQuery);

							db.cypherQuery(cypherQuery, function(err, result){
    							if(err) throw err;

    							var responseJSON = {};
								responseJSON.entryId = newEntryId;
								res.json(JSON.stringify(responseJSON));
    						});
							
						});
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
    			entryObject.image = "/entries/images/" + req.params.entryId;
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