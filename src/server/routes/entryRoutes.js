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
			var meId = (req.user) ? (req.user.id) : (0);

			var cypherQuery;

			// In case a challenge is mentioned, extract all entries linked to that challenge
			if (req.query.challengeId && req.query.user) {
				cypherQuery = "MATCH (e:Entry)-[:POSTED_BY]->(poster:User {id: '" + req.query.user + "'}), (e)-[:PART_OF]->(c:Challenge {id: '" + req.query.challengeId + "'}) "
			} else if (req.query.challengeId && req.query.excludeUser) {
				cypherQuery = "MATCH (e:Entry)-[:PART_OF]->(c:Challenge {id: '" + req.query.challengeId + "'}), (e)-[:POSTED_BY]->(poster:User) WHERE NOT ('" + req.query.excludeUser + "' IN poster.id) "
			} else if (req.query.challengeId) {
				cypherQuery = "MATCH (e:Entry)-[:PART_OF]->(c:Challenge {id: '" + req.query.challengeId + "'}), (e)-[:POSTED_BY]->(poster:User) "
			} else if (req.query.postedBy) {
				cypherQuery = "MATCH (e:Entry)-[:POSTED_BY]->(poster:User {id: '" + req.query.postedBy + "'}) ";
			} else {
				cypherQuery = "MATCH (e:Entry)-[:POSTED_BY]->(poster:User) ";
			}
			
			cypherQuery += 
						" WITH e, poster " + 
						" OPTIONAL MATCH (liker:User)-[:LIKES]->(e) " + 
						" WITH e, poster, COUNT(liker) AS like_count " + 
						" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(e) " + 
						" WITH e, poster, like_count, COUNT(comment) AS comment_count " + 
						" OPTIONAL MATCH (me:User {id: '" + meId + "'})-[like:LIKES]->(e) " +	
						" RETURN e, poster, like_count, comment_count, COUNT(like), (like_count + comment_count) AS popularity_count ";

			if (req.query.sortBy) {
				if (req.query.sortBy == "dateCreated") {
					cypherQuery += " ORDER BY e.created DESC;";
				} else if (req.query.sortBy == "popularity") {
					cypherQuery += " ORDER BY popularity_count DESC;";
				}
			}

			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			var output = [];
    			for (var i = 0; i < result.data.length; i++) {

    				var data = dataUtils.constructEntityData("entry", result.data[i][0], result.data[i][1], result.data[i][0].created, result.data[i][2], result.data[i][3], null, 0, null, null, null, result.data[i][4] > 0, "recentlyPosted", null, null, null, null);
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
							"caption: '" + dataUtils.escapeSingleQuotes(req.body.caption) + "', " + 
							"image_height: '" + req.body.imageHeight + "', " +
							"image_width: '" + req.body.imageWidth + "', " +
							"image_type: '" + req.body.imageType + "', " +
							"created : '" + req.body.created + "'" + 
							"})-[:PART_OF]->(c), (u)<-[r:POSTED_BY]-(e) RETURN e;";
			
			db.cypherQuery(cypherQuery, function(err, result){
				if(err) throw err;

				var newEntryId = result.data[0].id;

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

							if (layout.type == "preset" || layout.type == "custom") {
								createFilterNodesFunctions.push(async.apply(dataUtils.createLayoutNode, layout));
							}
						}
					}

					if (req.body.steps.filters && (req.body.steps.filters.constructor === Array)) {
						for (var i = 0; i < req.body.steps.filters.length; i++) {
							var filter = req.body.steps.filters[i];

							if (filter.type == "preset" || filter.type == "custom") {
								createFilterNodesFunctions.push(async.apply(dataUtils.createFilterNode, filter));
							}
						}
					}

					if (req.body.steps.artifacts && req.body.steps.artifacts.constructor === Array) {
						for (var i = 0; i < req.body.steps.artifacts.length; i++) {
							var artifact = req.body.steps.artifacts[i];

							if (artifact.type == "preset" || artifact.type == "custom") {
								createFilterNodesFunctions.push(async.apply(dataUtils.createArtifactNode, artifact));
							}
						}
					}

					if (req.body.steps.decorations && req.body.steps.decorations.constructor === Array) {
						for (var i = 0; i < req.body.steps.decorations.length; i++) {
							var decoration = req.body.steps.decorations[i];

							if (decoration.type == "preset" || decoration.type == "custom") {
								createFilterNodesFunctions.push(async.apply(dataUtils.createDecorationNode, decoration));
							}
						}
					}
				}
				

				// LAYOUTS

				async.series(createFilterNodesFunctions, function(err, filterNodes) {
					if (err) {
						throw err;
					}

					var cypherQuery = "MATCH (e:Entry {id: '" + newEntryId + "'}) ";
					for (var i = 0; i < filterNodes.length; i++) {

						// Now associate filters to the new entry
						cypherQuery += " MATCH (s" + i + " {id: '" + filterNodes[i] + "'}) ";
					}

					if (filterNodes.length > 0) {
						cypherQuery += " CREATE ";
					}
					
					for (var i = 0; i < filterNodes.length; i++) {
						if (i > 0) {
							cypherQuery += " , ";
						}
						cypherQuery += " (s" + i + ")<-[:USES {order : '" + i + "'}]-(e) ";
					}

					cypherQuery += " return e;";

					db.cypherQuery(cypherQuery, function(err, result){
						if(err) throw err;

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
			var meId = (req.user) ? (req.user.id) : (0);

			var cypherQuery = "MATCH (e:Entry {id: '" + req.params.entryId + "'})-[:POSTED_BY]->(poster:User) " +
						" WITH e, poster " + 
						" OPTIONAL MATCH (u2:User)-[:LIKES]->(e) " + 
						" WITH e, poster, COUNT(u2) AS like_count " + 
						" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(e) " + 
						" WITH e, poster, like_count, COUNT(comment) AS comment_count " + 
						" OPTIONAL MATCH (me:User {id: '" + meId + "'})-[like:LIKES]->(e) " +	
						" RETURN e, poster, like_count, comment_count, COUNT(like) ORDER BY e.created DESC;";
	
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			var data = dataUtils.constructEntityData("entry", result.data[0][0], result.data[0][1], result.data[0][0].created, result.data[0][2], result.data[0][3], null, 0, null, null, null, result.data[0][4] > 0, "recentlyPosted", null, null, null, null);
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

			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			res.json(result.data[0]);
			});

		})

		.delete(function(req, res){
			
			/**
				DELETE will permantently delete the specified node.  Call with Caution!
				Deletes the comments linked to this Entry up to level 2 (we currently only support comments till level 2)
			**/

			var cypherQuery = "MATCH (e:Entry {id: '" + req.params.entryId + "'}) OPTIONAL MATCH (e)<-[:POSTED_IN*1..2]-(comment:Comment) detach delete comment, e;";

			db.cypherQuery(cypherQuery, function(err, result) {
    			if(err) throw err;

    			res.json(result.data);
			});
		});

		entryRouter.route("/:entryId/like") // /api/entries/:entryId/like

		.get(function(req, res) { //get current like status
			if (req.user && req.user.id) {
	      		var cypherQuery = "MATCH (u:User {id: '" + req.user.id + 
	      			"'})-[:LIKES]->(e:Entry {id: '" + req.params.entryId + "'}) RETURN e;";
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
      				"'}), (e:Entry {id: '" + req.params.entryId + "'}) CREATE (u)-[r:LIKES {created: '" + req.body.created + "'}]->(e) RETURN r;";
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
      				"'})-[r:LIKES]->(e:Entry {id: '" + req.params.entryId + "'}) DELETE r RETURN COUNT(r);";
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


	return entryRouter;
};

module.exports = routes;