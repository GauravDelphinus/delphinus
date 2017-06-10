var express = require("express");
var async = require("async");
var dataUtils = require("../dataUtils");
var shortid = require("shortid");
var config = require("../config");

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

			var cypherQuery;

			console.log("/api/entries, query is " + JSON.stringify(req.query));
			// In case a challenge is mentioned, extract all entries linked to that challenge
			if (req.query.challengeId && req.query.user) {
				cypherQuery = "MATCH (e:Entry)-[:POSTED_BY]->(u:User {id: '" + req.query.user + "'}), (e)-[:PART_OF]->(c:Challenge {id: '" + req.query.challengeId + "'}) "
			} else if (req.query.challengeId && req.query.excludeUser) {
				cypherQuery = "MATCH (e:Entry)-[:PART_OF]->(c:Challenge {id: '" + req.query.challengeId + "'}), (e)-[:POSTED_BY]->(u:User) WHERE NOT ('" + req.query.excludeUser + "' IN u.id) "
			} else if (req.query.challengeId) {
				cypherQuery = "MATCH (e:Entry)-[:PART_OF]->(c:Challenge {id: '" + req.query.challengeId + "'}), (e)-[:POSTED_BY]->(u:User) "
			} else if (req.query.user) {
				cypherQuery = "MATCH (e:Entry)-[:POSTED_BY]->(u:User {id: '" + req.query.user + "'}) ";
			} else {
				cypherQuery = "MATCH (e:Entry)-[:POSTED_BY]->(u:User) ";
			}
			
			// add social count check
			cypherQuery += " OPTIONAL MATCH (u2:User)-[:LIKES]->(e) OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(e) RETURN e, u, COUNT(u2), COUNT(comment)";
			
			if (req.query.sortBy) {
				if (req.query.sortBy == "popularity") {
					cypherQuery += " ";
				} else if (req.query.sortBy == "date") {
					cypherQuery += " ORDER BY e.created DESC";
				}
			}

			if (req.query.count) {
				cypherQuery += " LIMIT " + req.query.count;
			}

			cypherQuery += " ;";
		
			console.log("Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			console.log("result is " + JSON.stringify(result.data)); // delivers an array of query results
    			//console.log(result.columns); // delivers an array of names of objects getting returned

    			var output = [];
    			for (var i = 0; i < result.data.length; i++) {
    				var e = result.data[i][0];
    				var u = result.data[i][1];
    				var numLikes = result.data[i][2];
    				var numComments = result.data[i][3];

    				var data = {};
    				data.type = "entry";
    				data.id = e.id;
    				data.image = config.url.entryImages + e.id;
					data.postedDate = e.created;
					data.postedByUser = {};
					data.postedByUser.id = u.id;
					data.postedByUser.displayName = u.displayName;
					data.postedByUser.image = u.image;

					data.socialStatus = {};
					data.socialStatus.numLikes = numLikes;
					data.socialStatus.numShares = 23;
					data.socialStatus.numComments = numComments;

					data.caption = e.caption;

					data.link = config.url.entry + e.id;

					output.push(data);
    			}

    			res.json(output);
			});
		})

		.post(function(req, res){

			/**
				POST a new entry node, and link it to a Challenge node.
			**/

			var id = shortid.generate();
			/**
				First create the entry node.  Then later, link them to Filter nodes.
			**/
			var cypherQuery = "MATCH (c:Challenge {id: '" + req.body.challengeId + "'}) " + 
							" MATCH (u:User {id: '" + req.user.id + "'}) CREATE (e:Entry {" +
							"id: '" + id + "', " + 
							"created : '" + req.body.created + "'" + 
							"})-[:PART_OF]->(c), (u)<-[r:POSTED_BY]-(e) RETURN e;";

			console.log("Running cypherQuery: " + cypherQuery);
			
			db.cypherQuery(cypherQuery, function(err, result){
				if(err) throw err;

				console.log(result.data); // delivers an array of query results
				var newEntryId = result.data[0].id;

				//res.json(result.data[0]);

				/**
					Next extract all the filters, decorations, layouts and artifacts, and create the
					respective nodes, and link them to the entry node.
				**/

				var createFilterNodesFunctions = []; // array of functions that will create the Filter Nodes

				// FILTERS
				if (req.body.steps) {
					if (req.body.steps.layouts && req.body.steps.layouts.constructor === Array) {
						for (var i = 0; i < req.body.steps.layouts.length; i++) {
							var layout = req.body.steps.layouts[i];

							if (layout.type == "none") {
								// No layout, do nothing
							} else {
								createFilterNodesFunctions.push(async.apply(dataUtils.createLayoutNode, db, layout));
							}
						}
					}

					if (req.body.steps.filters && (req.body.steps.filters.constructor === Array)) {
						for (var i = 0; i < req.body.steps.filters.length; i++) {
							var filter = req.body.steps.filters[i];

							if (filter.type == "none") {
								// No filter added - do nothing
							} else {
								createFilterNodesFunctions.push(async.apply(dataUtils.createFilterNode, db, filter));
							}
						}
					}

					if (req.body.steps.artifacts && req.body.steps.artifacts.constructor === Array) {
						for (var i = 0; i < req.body.steps.artifacts.length; i++) {
							var artifact = req.body.steps.artifacts[i];

							if (artifact.type == "none") {
								// No Artifact, do nothing
							} else {
								createFilterNodesFunctions.push(async.apply(dataUtils.createArtifactNode, db, artifact));
							}
						}
					}

					if (req.body.steps.decorations && req.body.steps.decorations.constructor === Array) {
						for (var i = 0; i < req.body.steps.decorations.length; i++) {
							var decoration = req.body.steps.decorations[i];

							if (decoration.type == "none") {
								// No Decoration, do nothing
							} else {
								createFilterNodesFunctions.push(async.apply(dataUtils.createDecorationNode, db, decoration));
							}
						}
					}
				}
				

				// LAYOUTS

				async.series(createFilterNodesFunctions, function(err, filterNodes) {

					var cypherQuery = "MATCH (e:Entry {id: '" + newEntryId + "'}) ";
					//console.log("filterNodes, num values = " + filterNodes.length);
					for (var i = 0; i < filterNodes.length; i++) {
						//console.log("filterNodes, " + i + " = " + filterNodes[i]);

						// Now associate filters to the new entry
						cypherQuery += " MATCH (s" + i + " {id: '" + filterNodes[i] + "'}) ";
					}

					cypherQuery += " CREATE ";

					for (var i = 0; i < filterNodes.length; i++) {
						if (i > 0) {
							cypherQuery += " , ";
						}
						cypherQuery += " (s" + i + ")<-[:USES {order : '" + i + "'}]-(e) ";
					}

					cypherQuery += " return e;";

					console.log("cypherQuery is: " + cypherQuery);

					db.cypherQuery(cypherQuery, function(err, result){
						if(err) throw err;

						console.log("result is " + JSON.stringify(result.data));
						if (result.data.length > 0) {
							res.json(result.data[0]);
						}
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

			var cypherQuery = "MATCH (e:Entry {id: '" + req.params.entryId + "'})-[:POSTED_BY]->(u:User) ";

			// add social count check
			cypherQuery += " OPTIONAL MATCH (u2:User)-[:LIKES]->(e) RETURN e, u, COUNT(u2)";
			
			console.log("GET Received, Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

				var e = result.data[0][0];
				var u = result.data[0][1];
				var numLikes = result.data[0][2];

				var data = {};
				data.type = "entry";
				data.id = e.id;
				data.image = config.url.entryImages + e.id;
				data.postedDate = e.created;
				data.postedByUser = {};
				data.postedByUser.id = u.id;
				data.postedByUser.displayName = u.displayName;
				data.postedByUser.image = u.image;

				data.socialStatus = {};
				data.socialStatus.numLikes = numLikes;
				data.socialStatus.numShares = 23;
				data.socialStatus.numComments = 45;

				data.caption = e.caption;

				data.link = config.url.entry + e.id;
    			
    			res.json(data);
			});
		})

		.put(function(req, res){

			/**
				PUT the specific entry.  Replace the data with the incoming values.
				Returns the updated JSON object.
			**/

			var cypherQuery = "MATCH (e:Entry {id: '" + req.params.entryId + "'}) ";

			cypherQuery += " SET ";

			// In PUT requests, the missing properties should be Removed from the node.  Hence, setting them to NULL
			cypherQuery += " e.steps = " + ((req.body.steps) ? ("'" + req.body.steps + "'") : "NULL") + " , ";
			cypherQuery += " e.created = " + ((req.body.created) ? ("'" + req.body.created + "'") : "NULL") + " , ";
			cypherQuery += " e.caption = " + ((req.body.caption) ? ("'" + req.body.caption + "'") : "NULL") + " ";

			cypherQuery += " RETURN e;";

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
				PATCH the specific entry.  Update some properties of the entry.
				Returns the updated JSON object.
			**/

			var cypherQuery = "MATCH (e:Entry {id: '" + req.params.entryId + "'}) ";

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

			var cypherQuery = "MATCH (e: Entry {id: '" + req.params.entryId + "'}) DELETE e;";
			//console.log("DELETE received, Running cypherQuery: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			//console.log(result.data); // delivers an array of query results
    			//console.log(result.columns); // delivers an array of names of objects getting returned

    			res.json(result.data);
			});
		});

		entryRouter.route("/:entryId/like") // /api/entries/:entryId/like

		.get(function(req, res) { //get current like status
			if (req.user && req.user.id) {
	      		var cypherQuery = "MATCH (u:User {id: '" + req.user.id + 
	      			"'})-[:LIKES]->(e:Entry {id: '" + req.params.entryId + "'}) RETURN e;";
	      		console.log("running cypherQuery: " + cypherQuery);
	      		db.cypherQuery(cypherQuery, function(err, result){
	                if(err) throw err;

	                console.log("result of get likes is " + JSON.stringify(result.data)); // delivers an array of query results
	                //console.log(result.columns); // delivers an array of names of objects getting returned

	                console.log(result.data);
	                var output = {};
	                if (result.data.length == 1) {
	                	output = {likeStatus : "on"};
	                } else {
	                	output = {likeStatus : "off"};
	                }

	                console.log("sending back to client: " + JSON.stringify(output));
	                res.json(output);
				});
      		} else {
      			res.json({error: "Not Logged In"});
      		}
		})
		.put(function(req, res) {
			if (req.body.likeAction == "like") {
      			var cypherQuery = "MATCH (u:User {id: '" + req.user.id + 
      				"'}), (e:Entry {id: '" + req.params.entryId + "'}) CREATE (u)-[r:LIKES]->(e) RETURN r;";
      			db.cypherQuery(cypherQuery, function(err, result){
	                if(err) throw err;

	                //console.log(result.data); // delivers an array of query results
	                //console.log(result.columns); // delivers an array of names of objects getting returned

	                var output = {};

	                console.log(result.data);
	                if (result.data.length == 1) {

	                	output.likeStatus = "on";
	                } else {

	                	output.likeStatus = "off";
	                }
	                res.json(output);
				});
      		} else if (req.body.likeAction == "unlike") {
      			var cypherQuery = "MATCH (u:User {id: '" + req.user.id + 
      				"'})-[r:LIKES]->(e:Entry {id: '" + req.params.entryId + "'}) DELETE r RETURN COUNT(r);";
      			db.cypherQuery(cypherQuery, function(err, result){
	                if(err) throw err;

					console.log("result of deletion: " + JSON.stringify(result));
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


	return entryRouter;
};

module.exports = routes;