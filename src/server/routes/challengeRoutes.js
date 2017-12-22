var express = require("express");
var config = require("../config");
var shortid = require("shortid");
var dataUtils = require("../dataUtils");
var mime = require("mime");
var imageProcessor = require("../imageProcessor");
var logger = require("../logger");
var serverUtils = require("../serverUtils");
var dbUtils = require("../db/dbUtils");
var Challenge = require("../classes/challenge").Challenge;

var routes = function(db) {
	var challengeRouter = express.Router();

	challengeRouter.route("/") // ROUTER FOR /api/challenges

		.get(function(req, res){

			logger.debug("GET received on /api/challenges, query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "sortBy",
					required: "yes",
					type: ["dateCreated", "popularity"]
				},
				{
					name: "postedBy",
					type: "id"
				},
				{
					name: "category",
					type: "category"
				},
				{
					name: "limit",
					type: "number"
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			var cypherQuery = "";

			var meId = (req.user) ? (req.user.id) : (0);

			if (req.query.postedBy) {
				cypherQuery += "MATCH (category:Category)<-[:POSTED_IN]-(c:Challenge)-[r:POSTED_BY]->(poster:User {id: '" + req.query.postedBy + "'}) ";
			} else if (req.query.category) {
				cypherQuery += "MATCH (category:Category {id: '" + req.query.category + "'})<-[:POSTED_IN]-(c:Challenge)-[r:POSTED_BY]->(poster:User) ";
			} else {
				cypherQuery += "MATCH (category:Category)<-[:POSTED_IN]-(c:Challenge)-[r:POSTED_BY]->(poster:User) ";
			}

			cypherQuery +=
						" WITH c, category, poster " +
						" OPTIONAL MATCH (u2:User)-[:LIKES]->(c) " + 
						" WITH c, category, poster, COUNT(u2) AS like_count " + 
						" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
						" WITH c, category, poster, like_count, COUNT(comment) as comment_count " + 
						" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) " +
						" WITH c, category, poster, like_count, comment_count, COUNT(entry) AS entry_count " +
						" OPTIONAL MATCH (me:User {id: '" + meId + "'})-[like:LIKES]->(c) " +
						" RETURN c, poster, like_count, comment_count, entry_count, COUNT(like), (like_count + comment_count + entry_count) AS popularity_count, category ";

			if (req.query.sortBy) {
				if (req.query.sortBy == "dateCreated") {
					cypherQuery += " ORDER BY c.created DESC";
				} else if (req.query.sortBy == "popularity") {
					cypherQuery += " ORDER BY popularity_count DESC";
				}
			}

			if (req.query.limit) {
				cypherQuery += " LIMIT " + req.query.limit;
			}

			cypherQuery += ";";

			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) {
    				logger.dbError(err, cypherQuery);
					return res.sendStatus(500);
    			}

    			var output = [];
    			for (var i = 0; i < result.data.length; i++) {

    				var data = dataUtils.constructEntityData("challenge", result.data[i][0], result.data[i][1], result.data[i][0].created, result.data[i][2], result.data[i][3], result.data[i][4], 0, null, null, null, result.data[i][5] > 0, "none", null, null, null, null, result.data[i][7]);
					output.push(data);

    			}

    			if (!serverUtils.validateData(output, serverUtils.prototypes.challenge)) {
    				return res.sendStatus(500);
    			}

    			return res.json(output);
			});
		})

		.post(function(req, res){

			/**
				POST a new challenge node.
			**/

			logger.debug("POST received on /api/challenges, body: " + serverUtils.makePrintFriendly(req.body));

			var validationParams = [
				{
					name: "imageDataURI",
					required: "yes",
					type: "imageData"
				},
				{
					name: "category",
					type: "category",
					required: "yes"
				},
				{
					name: "created",
					type: "number",
					required: "yes"
				},
				{
					name: "caption",
					type: "string",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.body, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			// Store the incoming base64 encoded image into a local image file first
			var fs = require('fs');
			var parseDataURI = require("parse-data-uri");
			var parsed = parseDataURI(req.body.imageDataURI);

			var imageType = parsed.mimeType;

			//generate path name for challenge image
			var baseDirRaw = global.appRoot + config.path.challengeImagesRaw;
			var id = shortid.generate(); //new id for challenge
			var name = id + "." + mime.extension(imageType); //generate name of image file
			var fullpathRaw = baseDirRaw + name;
			
			//write the data to a file
			var buffer = parsed.data;
			fs.writeFile(fullpathRaw, buffer, function(err) {
				if (err) {
					logger.error("Failed to write file: " + fullpathRaw);
					return res.sendStatus(500);
				}

				var baseDir = global.appRoot + config.path.challengeImages;
				var fullPath = baseDir + name;
				imageProcessor.addWatermarkToImage(fullpathRaw, fullPath, function(err, outputPath) {
					if (err) {
						logger.error("Failed to apply watermark: " + fullPath);
						return res.sendStatus(500);
					}

					imageProcessor.findImageSize(outputPath, function(size) {
						var challenge = new Challenge(id, imageType, req.body.created, req.body.caption, req.user.id, req.body.category);
						challenge.save(function(err, result) {
							if(err) {
								logger.error(err);
								return res.sendStatus(500);
							}

							var output = {id: result.id};
							if (!serverUtils.validateData(output, serverUtils.prototypes.onlyId)) {
		    					return res.sendStatus(500);
		    				}
							
							res.header("Location", "/api/challenges/" + output.id);
							return res.status(201).json(output);
						});
					});
				});
			});
		});

	challengeRouter.route("/:challengeId") // ROUTER FOR /api/challenges/<id>

		.get(function(req, res){

			logger.debug("GET received on /api/challenges/" + req.params.challengeId + ", query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "challengeId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams)) {
				return res.sendStatus(400);
			}

			var meId = (req.user) ? (req.user.id) : (0);

			var cypherQuery = "MATCH (category:Category)<-[:POSTED_IN]-(c:Challenge {id: '" + req.params.challengeId + "'})-[r:POSTED_BY]->(poster:User) " +
						" WITH c, category, poster " +
						" OPTIONAL MATCH (u2:User)-[:LIKES]->(c) " + 
						" WITH c, category, poster, COUNT(u2) AS like_count " + 
						" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
						" WITH c, category, poster, like_count, COUNT(comment) as comment_count " + 
						" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) " +
						" WITH c, category, poster, like_count, comment_count, COUNT(entry) AS entry_count " +
						" OPTIONAL MATCH (me:User {id: '" + meId + "'})-[like:LIKES]->(c) " +
						" RETURN c, poster, like_count, comment_count, entry_count, COUNT(like), category ORDER BY c.created DESC;";

			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) {
    				logger.dbError(err, cypherQuery);
    				return res.sendStatus(500);
    			} else if (result.data.length != 1) {
    				logger.dbResultError(cypherQuery, 1, result.data.length);
    				return res.sendStatus(404); //invalid request
    			}

    			var output = dataUtils.constructEntityData("challenge", result.data[0][0], result.data[0][1], result.data[0][0].created, result.data[0][2], result.data[0][3], result.data[0][4], 0, null, null, null, result.data[0][5] > 0, "none", null, null, null, null, result.data[0][6]);
    			if (!serverUtils.validateData(output, serverUtils.prototypes.challenge)) {
    				return res.sendStatus(500);
    			}

    			return res.json(output);
			});
		})

		.delete(function(req, res){
			
			/**
				DELETE will permantently delete the specified node.  Call with Caution!
			**/

			logger.debug("DELETE received on /api/challenges/" + req.params.challengeid);

			var validationParams = [
				{
					name: "challengeId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams)) {
				return res.sendStatus(400);
			}

			var cypherQuery = "MATCH (c:Challenge {id: '" + req.params.challengeId + "'}) OPTIONAL MATCH (c)<-[:POSTED_IN*1..2]-(challengeComment:Comment) OPTIONAL MATCH (c)<-[:PART_OF]-(e:Entry) OPTIONAL MATCH(e)<-[:POSTED_IN*1..2]-(entryComment:Comment) DETACH DELETE challengeComment, entryComment, c, e;";

			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) {
    				logger.dbError(err, cypherQuery);
    				return res.sendStatus(500);
    			}

    			return res.sendStatus(204);
			});
		});

	challengeRouter.route("/:challengeId/like") // /api/challenges/:challengeId/like

		.put(function(req, res) {

			logger.debug("PUT received on /api/challenges/" + req.params.challengeId + "/like, req.body = " + JSON.stringify(req.body));

			var validationParams = [
				{
					name: "likeAction",
					type: ["like", "unlike"],
					required: "yes"
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

			validationParams = [
				{
					name: "challengeId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams)) {
				return res.sendStatus(400);
			}

			if (req.body.likeAction == "like") {
      			var cypherQuery = "MATCH (u:User {id: '" + req.user.id + 
      				"'}), (c:Challenge {id: '" + req.params.challengeId + "'}) CREATE (u)-[r:LIKES {created: '" + req.body.created + "'}]->(c) RETURN r;";
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
	                	entityId: req.params.challengeId,
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
      				"'})-[r:LIKES]->(c:Challenge {id: '" + req.params.challengeId + "'}) DELETE r RETURN COUNT(r);";
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
	                	entityId: req.params.challengeId,
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

		return challengeRouter;
};

module.exports = routes;

