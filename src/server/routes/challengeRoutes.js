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
var dbChallenge = require("../db/dbChallenge");

var routes = function(db) {
	var challengeRouter = express.Router();

	challengeRouter.route("/") // ROUTER FOR /api/challenges

		.get(function(req, res){

			logger.debug("GET received on /api/challenges, query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "postedBy",
					type: "id"
				},
				{
					name: "category",
					type: "category"
				},
				{
					name: "ts", //last fetched timestamp
					type: "timestamp"
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			var lastFetchedTimestamp = (req.query.ts) ? (req.query.ts) : 0;
			dbChallenge.getChallenges(req.query.postedBy, req.query.categoryId, lastFetchedTimestamp, function(err, result, newTimeStamp) {
				if (err) {
					logger.error(err);
					return res.sendStatus(500);
				}

				if (!serverUtils.validateData(result, serverUtils.prototypes.challenge)) {
    				return res.sendStatus(500);
    			}

    			var output = {ts: newTimeStamp, list: result};
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
						var challengeInfo = {
							id: id,
							imageType: imageType,
							created: req.body.created,
							title: req.body.caption,
							userId: req.user.id,
							category: req.body.category
						};

						dbChallenge.createChallenge(challengeInfo, function(err, result) {
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
				dbChallenge.getChallenge(req.params.challengeId, function(err, output) {
					if (err) {
						logger.error(err);
						return res.sendStatus(500);
					}

					if (!serverUtils.validateData(output, serverUtils.prototypes.challenge)) {
	    				return res.sendStatus(500);
	    			}

	    			return res.json(output);
				});
			} else if (req.query.info == "social") {
				dbChallenge.getChallengeSocialInfo(req.params.challengeId, meId, function(err, output) {
					if (err) {
						logger.error(err);
						return res.sendStatus(500);
					}

					if (!serverUtils.validateData(output, serverUtils.prototypes.challengeSocialInfo)) {
	    				return res.sendStatus(500);
	    			}

	    			return res.json(output);
				});
			}
			
		})

		.delete(function(req, res){
			
			/**
				DELETE will permantently delete the specified node.  Call with Caution!
			**/

			logger.debug("DELETE received on /api/challenges/" + req.params.challengeId);

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

			dbChallenge.deleteChallenge(req.params.challengeId, function(err) {
    			if(err) {
    				logger.error(err);
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

			dbChallenge.likeChallenge(req.params.challengeId, req.body.likeAction == "like", req.user.id, req.body.created, function(err, likeResult) {
				if (err) {
					logger.error(err);
					return res.sendStatus(500);
				}

				var output = {likeStatus: (likeResult ? "on" : "off")};

				return res.json(output);
			});
		});

		return challengeRouter;
};

module.exports = routes;

