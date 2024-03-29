var express = require("express");
var fs = require("fs");
var config = require("../config");
var async = require("async");
var mime = require("mime");
var spawn = require("child_process").spawn;
var execFile = require("child_process").execFile;
var filterUtils = require("../filterUtils");
var logger = require("../logger");
var serverUtils = require("../serverUtils");
var dbEntry = require("../db/dbEntry");
var dbUtils = require("../db/dbUtils");
var filterUtils = require("../filterUtils");
var imageHandler = require("../imageHandler");

var routes = function() {

	var filterRouter = express.Router();
	var stepsHandler = require("../stepsHandler");

	filterRouter.route("/")
		.get(function(req, res) {

			logger.debug("GET received on /api/filters, query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "stepType",
					required: "yes",
					type: ["filter", "layout", "artifact", "decoration"]
				},
				{
					name: "type",
					type: ["preset"]
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			var prototype;
			var cypherQuery;

			if (req.query.type && req.query.type == "preset") {
				if (req.query.stepType == "filter") {
					cypherQuery = "MATCH (e:Filter {filter_type : 'preset'}) RETURN e;";
					prototype = serverUtils.prototypes.filter;
				} else if (req.query.stepType == "layout") {
					cypherQuery = "MATCH (e:Layout {layout_type : 'preset'}) RETURN e;";
					prototype = serverUtils.prototypes.layout;
				} else if (req.query.stepType == "artifact") {
					cypherQuery = "MATCH (e:Artifact {artifact_type : 'preset'}) RETURN e;";
					prototype = serverUtils.prototypes.artifact;
				} else if (req.query.stepType == "decoration") {
					cypherQuery = "MATCH (e:Decoration {decoration_type : 'preset'}) RETURN e;";
					prototype = serverUtils.prototypes.decoration;
				} else {
					logger.error("Invalid request received");
					return res.sendStatus(400);
				}
			}
			

			dbUtils.runQuery(cypherQuery, function(err, result){
				if(err) {
					return res.sendStatus(500);
				} else if (result.records.length <= 0) {
    				logger.dbResultError(cypherQuery, "> 0", result.records.length);
    				return res.sendStatus(500);
    			}

				var output = [];
				for (var i = 0; i < result.records.length; i++) {
					var record = result.records[i];
					var entity = dbUtils.recordGetField(record, "e");
					output.push({id: entity.id, name: entity.name});
				}
			
				if (!serverUtils.validateData(output, prototype)) {
    				return res.sendStatus(500);
    			}

				return res.json(output);
			});
		});

	filterRouter.route("/apply") // /api/filters/apply ROUTE

		.post(function(req, res){

			logger.debug("POST received on /api/filters/apply, body: " + serverUtils.makePrintFriendly(req.body));
			const timer = logger.startTimer();

			var validationParams = [
				{
					name: "sourceType",
					type: ["challengeId", "imageURL", "dataURI", "designId"],
					required: "yes"
				},
				{
					name: "challengeId",
					type: "id"
				},
				{
					name: "designId",
					type: "idStr",
				},
				{
					name: "imageType",
					type: "imageType"
				},
				{
					name: "imageURL",
					type: "url"
				},
				{
					name: "dataURI",
					type: "imageData"
				},
				{
					name: "caption",
					type: "string"
				}
			];

			if (!serverUtils.validateQueryParams(req.body, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			if (!req.body.steps || !filterUtils.validateSteps(req.body.steps)) {
				logger.error("Steps validation failed, steps: " + JSON.stringify(req.body.steps));
				return res.sendStatus(400);
			}

			filterUtils.normalizeSteps(req.body.steps, req.body.caption, function(err, steps){
    			if (err) {
    				return res.sendStatus(500);
    			}

    			var entryData = req.body;
    			entryData.userId = req.user.id;
    			dbEntry.processImageDataForEntry(entryData, false, function(err, info) {
    				if (err) {
    					logger.error("processImageDataForEntry: some error occurred: " + err);
    					return res.sendStatus(500);
    				}

    				var targetImagePath = null;
    				var targetImageUrl = null;
    				if (info.sourceId) {
    					//sourceId would be set for challenges and designs, but not for independent entries
    					//since we passed 'false' above to the processImageDataForEntry call
    					var hash = filterUtils.generateHash(steps, req.body.caption);
						var targetImageName = info.sourceId + "-" + hash + "." + mime.extension(info.imageType);
						var targetImagePath = global.appRoot + config.path.cacheImagesRaw + targetImageName;
						var targetImageUrl = config.url.cacheImages + targetImageName;
    				}

    				imageHandler.applyStepsToImage(info.sourceImagePath, targetImagePath, info.imageType, steps, req.body.caption, function(err, imagePathRaw){
						if (err) {
							logger.error("applyStepsToImage failed: " + err);
							return res.sendStatus(500);
						}

						//now, add the watermark
						var imagePath = imagePathRaw;
						if (targetImagePath) {
							imagePath = global.appRoot + config.path.cacheImages + targetImageName;
						}

						imageHandler.addWatermarkToImage(imagePathRaw, imagePath, function(err, outputPath) {
							if (err) {
								logger.error("Failed to apply watermark: " + imagePath + ", error: " + err);
								return res.sendStatus(500);
							}

							if (info.sourceFileIsTemp) {
								//get rid of the source file since it was temporary
								fs.unlink(info.sourceImagePath, function(err) {
									if (err) {
										logger.error("Failed to delete source image file: " + err);
									}
								});
							}

							if (targetImageUrl == null) {
								//we generated a temp path.  make sure to send the file as blob and delete the temp file
								const DataURI = require('datauri');
								const datauri = new DataURI();
								datauri.encode(outputPath, function(err, content) {
									if (err) {
										throw err;
									}

									fs.unlink(outputPath, function(err) {
										if (err) {
											logger.error("Failed to delete temp file: " + err);
										}
									});
									

									var jsonObj = {"type" : "dataURI", "imageData" : content};

									if (!serverUtils.validateData(jsonObj, serverUtils.prototypes.imageInfo)) {
										return res.sendStatus(500);
									}

									timer.done("POST received on /api/filters/apply, sending blob");
									return res.json(jsonObj);
								});
							} else {
								//we saved to the provided target image path.  send the link
								var jsonObj = {"type" : "imageURL", "imageData" : targetImageUrl};

								if (!serverUtils.validateData(jsonObj, serverUtils.prototypes.imageInfo)) {
									return res.sendStatus(500);
								}
								
								timer.done("POST received on /api/filters/apply, sending link");								
								return res.json(jsonObj);
							}
						});
					});
    			});
			});
		});

	filterRouter.route("/timelapse/:entryId") // /api/filters/timelapse ROUTE

		.get(function(req, res){

			logger.debug("GET received on /api/filters/timelapse/" + req.params.entryId + ", query: " + JSON.stringify(req.query));
			
			var validationParams = [
				{
					name: "entryId",
					required: "yes",
					type: "id"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams)) {
				return res.sendStatus(400);
			}

			dbEntry.getEntryImageData(req.params.entryId, function(err, imageData){
				if (err) {
					logger.error("getImageDataForEntry, entry: " + req.params.entryId + ": " + err);
					return res.sendStatus(500);
				}

				var sourceImagePath = imageData.sourceImagePath;
	    		filterUtils.normalizeSteps(imageData.steps, imageData.caption, function(err, steps){
	    			if (err) {
	    				logger.error("normalizeSteps, steps: " + imageDate.steps + ": " + err);
	    				return res.sendStatus(500);
	    			}

	    			//extract the steps (cumulative format) and generate the hash to 
	    			//look for actual step images
	    			var singleStepList = filterUtils.extractSingleStepList(steps);
	    			var applySingleStepToImageFunctions = [];
	    			var imageUrlPaths = []; //paths to target urls (to be sent back to client)

	    			for (var i = 0; i < singleStepList.length; i++) {
	    				var hash = filterUtils.generateHash(singleStepList[i], imageData.caption);

						var targetImageName = imageData.sourceId + "-" + hash + "." + mime.extension(imageData.imageType);
						var targetImage = global.appRoot + config.path.cacheImages + targetImageName;

						imageUrlPaths.push(config.url.cacheImages + targetImageName);

						//apply steps - note that applyStepsToImage first checks for existance of cache image
	    				applySingleStepToImageFunctions.push(async.apply(imageHandler.applyStepsToImage, sourceImagePath, targetImage, imageData.imageType, singleStepList[i], imageData.caption));
	    			}

	    			var imagePaths = []; //list of image paths for each sub step
	    			async.series(applySingleStepToImageFunctions, function(err, imagePaths) {
	    				if (err) {
	    					logger.error("Failed to apply the single steps - " + err);
	    					return res.sendStatus(500);
	    				}

	    				var output = [];

	    				//first item is the base challenge image
	    				output.push({"type" : "imageURL", "imageData" : imageData.sourceImageUrl});

	    				//for the rest of the items, add the target image url
	    				for (var j = 0; j < imagePaths.length; j++) {
							output.push({"type" : "imageURL", "imageData" : imageUrlPaths[j]});
	    				}

	    				if (!serverUtils.validateData(output, serverUtils.prototypes.imageInfo)) {
	    					return res.sendStatus(500);
	    				}

	    				logger.debug("returning to client: " + JSON.stringify(output));
						return res.json(output);
	    			});
	    		});
			});
		});
	
	return filterRouter;
};

module.exports = routes;