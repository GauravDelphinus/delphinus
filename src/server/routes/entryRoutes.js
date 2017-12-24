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
var dbEntry = require("../db/dbEntry");
var dbUtils = require("../db/dbUtils");


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
					name: "challengeId",
					type: "id"
				},
				{
					name: "postedBy",
					type: "id"
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			dbEntry.fetchEntries(req.query.postedBy, req.query.challengeId, function(err, output) {
				if (err) {
					logger.error(err);
					return res.sendStatus(500);
				}

				if (!serverUtils.validateData(output, serverUtils.prototypes.entryExtended)) {
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
			var entryInfo = {
				id: id,
				created: req.body.created,
				title: req.body.caption,
				userId: req.user.id,
				source: req.body.source
			};

			if (req.body.source == "designId") {
				entryInfo.sourceId = req.body.designId;
			} else if (req.body.source == "challengeId") {
				entryInfo.sourceId = req.body.challengeId;
			}

			dbEntry.createEntry(entryInfo, function(err, result) {
				if(err) {
					logger.error(err);
					return res.sendStatus(500);
				}

				var newEntryId = result.id;

				
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
	    						//serverUtils.copyFile(imagePaths[imagePaths.length - 1], entryImagePath, function(err) {
	    						imageProcessor.addWatermarkToImage(imagePaths[imagePaths.length - 1], entryImagePath, function(err) {
	    							if (err) {
	    								logger.error("Error creating the final Entry Image: " + err);
	    								return res.sendStatus(500);
	    							}

	    							//set image type in the db node
	    							//if we created an independent entry, link that back up to the independent entry node
	    							var cypherQuery = "MATCH (e:Entry {id: '" + id + "'}) SET e.image_type = '" + info.imageType + "' ";
	    							if (req.body.source == "dataURI" || req.body.source == "imageURL") {
	    								//we must have created an indepenent image node.  mkae sure to link up the newly created entyr with that
	    								cypherQuery += " MERGE (i:IndependentImage {id: '" + info.sourceId + "'}) ";
	    								cypherQuery += " MERGE (e)-[:BASED_ON]->(i) ";
	    							}
	    							cypherQuery += " RETURN e;";

	    							logger.dbDebug(cypherQuery);
	    							db.cypherQuery(cypherQuery, function(err, result){
						    			if(err) {
						    				logger.dbError(err, cypherQuery);
						    				return res.sendStatus(500);
						    			} else if (result.data.length != 1) {
						    				logger.dbResultError(cypherQuery, 1, result.data.length);
						    				return res.sendStatus(404); //not found
						    			}

						    			//finally, prepare the output to send back to client
						    			var output = {id: result.data[0].id};
										if (!serverUtils.validateData(output, serverUtils.prototypes.onlyId)) {
					    					return res.sendStatus(500);
					    				}

					    				res.header("Location", "/api/entries/" + result.data[0].id);
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

			logger.debug("GET received on /api/entries/" + req.params.entryId + ", query: " + JSON.stringify(req.query));

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

			var queryParams = [
				{
					name: "info",
					type: ["basic", "extended", "social"],
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.query, queryParams)) {
				return res.sendStatus(400);
			}

			var meId = (req.user) ? (req.user.id) : (0);

			if (req.query.info == "basic") {
				dbEntry.lookupEntryBasicInfo(req.params.entryId, function(err, output) {
					if (err) {
						logger.error(err);
						return res.sendStatus(500);
					}

					if (!serverUtils.validateData(output, serverUtils.prototypes.entryBasic)) {
	    				return res.sendStatus(500);
	    			}

	    			return res.json(output);
				});
			} else if (req.query.info == "extended") {
				dbEntry.lookupEntryExtendedInfo(req.params.entryId, meId, function(err, output) {
					if (err) {
						logger.error(err);
						return res.sendStatus(500);
					}

					if (!serverUtils.validateData(output, serverUtils.prototypes.entryExtended)) {
	    				return res.sendStatus(500);
	    			}

	    			return res.json(output);
				});
			} else if (req.query.info == "social") {
				dbEntry.lookupEntrySocialInfo(req.params.entryId, meId, function(err, output) {
					if (err) {
						logger.error(err);
						return res.sendStatus(500);
					}

					if (!serverUtils.validateData(output, serverUtils.prototypes.entrySocialInfo)) {
	    				return res.sendStatus(500);
	    			}

	    			return res.json(output);
				});
			}
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

	                //now, save the activity in the challenge
	                var activityInfo = {
	                	entityId: req.params.entryId,
	                	type: "like",
	                	timestamp: req.body.created,
	                	userId: req.user.id
	                }
	                dbUtils.saveActivity(activityInfo, function(err, id) {
	                	if (err) {
	                		logger.error(err);
	                		return res.sendStatus(500);
	                	}

		              	var output = {likeStatus: (result.data.length == 1) ? "on" : "off"};

		                return res.json(output);
		            });
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

	                //now, reset the activity in the challenge, since the person no longer likes this challenge
	                var activityInfo = {
	                	entityId: req.params.entryId,
	                	type: "post"
	                }
	                dbUtils.saveActivity(activityInfo, function(err, id) {
	                	if (err) {
	                		logger.error(err);
	                		return res.sendStatus(500);
	                	}

						var output = {likeStatus: (result.data.length == 1) ? "off" : "on"};
						
						return res.json(output);

					});
				});
      		}
		});


	return entryRouter;
};



module.exports = routes;