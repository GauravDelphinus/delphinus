var express = require("express");
var async = require("async");
var dataUtils = require("../dataUtils");
var shortid = require("shortid");
var config = require("../config");
var filterUtils = require("../filterUtils");
var logger = require("../logger");
var mime = require("mime");
var fs = require("fs");
var imageProcessor = require("../imageProcessor");
var serverUtils = require("../serverUtils");

/*

						source: challenge id:
						---------------------

						input file: /challengeImages/challengeid.jpeg
						output file: /entryImages/entryid.jpeg

						step files:

						/cacheImages/challengeid-fkdfhd.jpeg
						/cacheImages/challengeid-dffdfs.jpeg
						/cacheImages/challengeid-sddfds.jpeg


						source: design id:
						---------------------

						input file: /designImages/designid.jpeg
						output file: /entryImages/entryid.jpeg

						step files:

						/cacheImages/designid-fkdfhd.jpeg
						/cacheImages/designid-dffdfs.jpeg
						/cacheImages/designid-sddfds.jpeg


						source: dataURI:
						---------------------

						input file: /independentEntryImages/independententryid.jpeg
						output file: /entryImages/entryid.jpeg

						step files:

						/cacheImages/independententryid-kdfsdkhfd.jpeg
						/cacheImages/independententryid-dffdfs.jpeg
						/cacheImages/independententryid-sddfds.jpeg


						*/

var routes = function(db) {

	var entryRouter = express.Router();

	entryRouter.route("/") // ROUTER for /api/entries

		.get(function(req, res){

			logger.debug("GET received on /api/entries, query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "sortBy",
					required: "yes",
					type: ["dateCreated", "popularity"]
				},
				{
					name: "challengeId",
					type: "id"
				},
				{
					name: "postedBy",
					type: "id"
				},
				{
					name: "user",
					type: "id"
				},
				{
					name: "excludeUser",
					type: "id"
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			var meId = (req.user) ? (req.user.id) : (0);

			var cypherQuery;

			// In case a challenge is mentioned, extract all entries linked to that challenge
			if (req.query.challengeId && req.query.user) {
				cypherQuery = "MATCH (e:Entry)-[:POSTED_BY]->(poster:User {id: '" + req.query.user + "'}), (e)-[:PART_OF]->(c:Challenge {id: '" + req.query.challengeId + "'}) ";
			} else if (req.query.challengeId && req.query.excludeUser) {
				cypherQuery = "MATCH (e:Entry)-[:PART_OF]->(c:Challenge {id: '" + req.query.challengeId + "'}), (e)-[:POSTED_BY]->(poster:User) WHERE NOT ('" + req.query.excludeUser + "' IN poster.id) ";
			} else if (req.query.challengeId) {
				cypherQuery = "MATCH (e:Entry)-[:PART_OF]->(c:Challenge {id: '" + req.query.challengeId + "'}), (e)-[:POSTED_BY]->(poster:User) ";
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
				if (req.query.sortBy == "date") {
					cypherQuery += " ORDER BY e.created DESC;";
				} else if (req.query.sortBy == "popularity") {
					cypherQuery += " ORDER BY popularity_count DESC;";
				}
			}

			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) {
    				logger.dbError(err, cypherQuery);
    				return res.sendStatus(500);
    			}

    			var output = [];
    			for (var i = 0; i < result.data.length; i++) {

    				var data = dataUtils.constructEntityData("entry", result.data[i][0], result.data[i][1], result.data[i][0].created, result.data[i][2], result.data[i][3], null, 0, null, null, null, result.data[i][4] > 0, "recentlyPosted", null, null, null, null);
					output.push(data);
    			}

    			if (!serverUtils.validateData(output, serverUtils.prototypes.entry)) {
    				return res.sendStatus(500);
    			}
    			return res.json(output);
			});
		})

		.post(function(req, res){

			/**
				POST a new entry node, and link it to a Challenge node.
			**/

			logger.debug("POST received on /api/entries, req.body: " + JSON.stringify(req.body));

			var validationParams = [
				{
					name: "source",
					type: ["challengeId", "designId", "dataURI", "imageURL"],
					required: "yes"
				},
				{
					name: "challengeId",
					type: "id"
				},
				{
					name: "designId",
					type: "id"
				},
				{
					name: "caption",
					type: "string",
					required: "yes"
				},
				{
					name: "imageData",
					type: ["oneoftypes", "myURL", "dataURI"]
				},
				{
					name: "created",
					type: "number",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.body, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			if (req.body.source == "challengeId" && !req.body.challengeId) {
				logger.error("Challenge ID missing.");
				return res.sendStatus(400);
			} else if (req.body.source == "designId" && !req.body.designId) {
				logger.error("Design ID missing.");
				return res.sendStatus(400);
			} else if (req.body.source == "dataURI" && !serverUtils.validateItem("dataURI", "imageData", req.body.imageData)) {
				logger.error("Invalid dataURI received.");
				return res.sendStatus(400);
			} else if (req.body.source == "imageURL" && !serverUtils.validateItem("myURL", "imageData", req.body.imageData)) {
				logger.error("Invalid Image URL received.");
				return res.sendStatus(400);
			}

			
			var id = shortid.generate();
			
			//First create the entry node.  Then later, link them to Filter nodes.
			
			var cypherQuery = " MATCH (u:User {id: '" + req.user.id + "'}) CREATE (e:Entry {" +
							"id: '" + id + "', " + 
							"caption: '" + dataUtils.sanitizeStringForCypher(req.body.caption) + "', " + 
							"image_height: '" + req.body.imageHeight + "', " +
							"image_width: '" + req.body.imageWidth + "', " +
							"image_type: '" + req.body.imageType + "', " +
							"created : '" + req.body.created + "'" + 
							"})-[r:POSTED_BY]->(u) ";

			if (req.body.source == "challengeId") { //link to challenge
				cypherQuery = "MATCH (c:Challenge {id: '" + req.body.challengeId + "'}) " +
							cypherQuery +
							", (c)<-[:PART_OF]-(e) RETURN e;";
			} else if (req.body.source == "designId") {// link to design
				cypherQuery += "MATCH (d:Design {id: '" + req.body.designId + "'}) " +
							cypherQuery +
							", (d)<-[:BASED_ON]-(e) RETURN e;";
			} else { //independent entry
				cypherQuery += " RETURN e;";
			}
			
			db.cypherQuery(cypherQuery, function(err, result){
				if(err) {
					logger.dbError(err, cypherQuery);
					return res.sendStatus(500);
				} else if (result.data.length != 1) {
					logger.dbResultError(cypherQuery, 1, result.data.length);
					return res.sendStatus(500);
				}

				var newEntryId = result.data[0].id;

				
					//Next extract all the filters, decorations, layouts and artifacts, and create the
					//respective nodes, and link them to the entry node.
				

				var createFilterNodesFunctions = []; // array of functions that will create the Filter Nodes

				// STEPS

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
						logger.error("Created Entry Node, but error creating Filter Nodes");
						return res.sendStatus(500);
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
						if(err) {
							logger.dbError(err, cypherQuery);
							return res.sendStatus(500);
						} else if (result.data.length != 1) {
							logger.dbResultError(cypherQuery, 1, result.data.length);
							return res.sendStatus(500);
						}

						var entryData = req.body;
						entryData.userId = req.user.id;
    					filterUtils.processImageDataForEntry(entryData, true, function(err, info) {
    						if (err) {
    							logger.error("Error in processImageDataForEntry: " + err);
    							return res.sendStatus(500);
    						}

		    				//now, generate the image(s)
							var singleStepList = filterUtils.extractSingleStepList(req.body.steps);
							var applySingleStepToImageFunctions = [];

							for (var i = 0; i < singleStepList.length; i++) {
								var hash = filterUtils.generateHash(JSON.stringify(singleStepList[i]));
								var targetImagePath = global.appRoot + config.path.cacheImages + info.sourceId + "-" + hash + "." + mime.extension(info.imageType);

								applySingleStepToImageFunctions.push(async.apply(imageProcessor.applyStepsToImage, info.sourceImagePath, targetImagePath, info.imageType, singleStepList[i], dataUtils.escapeSingleQuotes(req.body.caption)));
							}

							var imagePaths = []; //list of image paths for each sub step
	    					async.series(applySingleStepToImageFunctions, function(err, imagePaths) {
	    						if (err) {
	    							logger.error("Error creating Images for the Entry Steps: " + err);
	    							return res.sendStatus(500);
	    						}

	    						//create a copy of the final cumulative/combined (i.e., last step in the array) to the entry image
	    						var entryImagePath = global.appRoot + config.path.entryImages + id + "." + mime.extension(info.imageType);
	    						serverUtils.copyFile(imagePaths[imagePaths.length - 1], entryImagePath, function(err) {
	    							if (err) {
	    								logger.error("Error creating the final Entry Image: " + err);
	    								return res.sendStatus(500);
	    							}

	    							//set image type in the db node
	    							var cypherQuery = "MATCH (e:Entry {id: '" + id + "'}) SET e.image_type = '" + info.imageType + "' RETURN e;";
	    							db.cypherQuery(cypherQuery, function(err, result){
						    			if(err) {
						    				logger.dbError(err, cypherQuery);
						    				return res.sendStatus(500);
						    			} else if (result.data.length != 1) {
						    				logger.dbResultError(cypherQuery, 1, result.data.length);
						    				return res.sendStatus(404); //not found
						    			}

						    			//finally, prepare the output to send back to client
						    			var output = {id: id};
										if (!serverUtils.validateData(output, serverUtils.prototypes.onlyId)) {
					    					return res.sendStatus(500);
					    				}

					    				res.header("Location", "/api/entries/" + id);
		    							return res.status(201).json(output);
						    		});
	    						});
	    					});	
    					});
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

			logger.debug("GET received o /api/entries/" + req.params.entryId + ", query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "entryId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams)) {
				return res.sendStatus(400);
			}

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
    			if(err) {
    				logger.dbError(err, cypherQuery);
    				return res.sendStatus(500);
    			} else if (result.data.length != 1) {
    				logger.dbResultError(cypherQuery, 1, result.data.length);
    				return res.sendStatus(404); //not found
    			}

    			var data = dataUtils.constructEntityData("entry", result.data[0][0], result.data[0][1], result.data[0][0].created, result.data[0][2], result.data[0][3], null, 0, null, null, null, result.data[0][4] > 0, "recentlyPosted", null, null, null, null);

    			if (!serverUtils.validateData(data, serverUtils.prototypes.entry)) {
    				return res.sendStatus(500);
    			}
    			return res.json(data);
			});
		})

		.delete(function(req, res){
			
			/**
				DELETE will permantently delete the specified node.  Call with Caution!
				Deletes the comments linked to this Entry up to level 2 (we currently only support comments till level 2)
			**/

			logger.debug("DELETE received on /api/entries/" + req.params.entryId);

			var validationParams = [
				{
					name: "entryId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams)) {
				return res.sendStatus(400);
			}

			var cypherQuery = "MATCH (e:Entry {id: '" + req.params.entryId + "'}) OPTIONAL MATCH (e)<-[:POSTED_IN*1..2]-(comment:Comment) detach delete comment, e;";

			db.cypherQuery(cypherQuery, function(err, result) {
    			if(err) {
    				logger.dbError(err, cypherQuery);
    				return res.sendStatus(500);
    			}

    			return res.sendStatus(204);
			});
		});

	entryRouter.route("/:entryId/like") // /api/entries/:entryId/like

		.get(function(req, res) { //get current like status

			logger.debug("GET received on /api/entries/" + req.params.entryId + "/like, query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "entryId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

      		var cypherQuery = "MATCH (u:User {id: '" + req.user.id + 
      			"'})-[:LIKES]->(e:Entry {id: '" + req.params.entryId + "'}) RETURN e;";
      		db.cypherQuery(cypherQuery, function(err, result){
                if(err) {
                	logger.dbError(err, cypherQuery);
                	return res.sendStatus(500);
                } else if (!(result.data.length == 0 || result.data.length == 1)) {
                	logger.dbResultError(cypherQuery, "0 or 1", result.data.length);
                	return res.sendStatus(500);
                }

                var output = {likeStatus: (result.data.length == 1) ? "on" : "off"};

                return res.json(output);
			});

		})
		.put(function(req, res) {
			
			logger.debug("PUT received on /api/entries/" + req.params.entryId + "/like");

			var validationParams = [
				{
					name: "entryId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			if (req.body.likeAction == "like") {
      			var cypherQuery = "MATCH (u:User {id: '" + req.user.id + 
      				"'}), (e:Entry {id: '" + req.params.entryId + "'}) CREATE (u)-[r:LIKES {created: '" + req.body.created + "'}]->(e) RETURN r;";
      			db.cypherQuery(cypherQuery, function(err, result){
	                if(err) {
	                	logger.dbError(err, cypherQuery);
	                	return res.sendStatus(500);
	                } else if (!(result.data.length == 0 || result.data.length == 1)) {
	                	logger.dbResultError(cypherQuery, "0 or 1", result.data.length);
	                	return res.sendStatus(500);
	                }

	                var output = {likeStatus: (result.data.length == 1) ? "on" : "off"};

	                return res.json(output);
				});
      		} else if (req.body.likeAction == "unlike") {
      			var cypherQuery = "MATCH (u:User {id: '" + req.user.id + 
      				"'})-[r:LIKES]->(e:Entry {id: '" + req.params.entryId + "'}) DELETE r RETURN COUNT(r);";
      			db.cypherQuery(cypherQuery, function(err, result){
	                if(err) {
	                	logger.dbError(err, cypherQuery);
	                	return res.sendStatus(500);
	                } else if (!(result.data.length == 0 || result.data.length == 1)) {
	                	logger.dbResultError(cypherQuery, "0 or 1", result.data.length);
	                	return res.sendStatus(500);
	                }

					var output = {likeStatus: (result.data.length == 1) ? "off" : "on"};
					
					return res.json(output);
				});
      		}
		});


	return entryRouter;
};



module.exports = routes;