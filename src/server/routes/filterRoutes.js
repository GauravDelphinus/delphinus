var express = require("express");
var dataUtils = require("../dataUtils");
var fs = require("fs");
var config = require("../config");
var async = require("async");
var mime = require("mime");
var spawn = require("child_process").spawn;
var execFile = require("child_process").execFile;
var filterUtils = require("../filterUtils");
var logger = require("../logger");
var serverUtils = require("../serverUtils");

var routes = function(db) {

	var filterRouter = express.Router();
	var imageProcessor = require("../imageProcessor");

	filterRouter.route("/")
		.get(function(req, res) {

			logger.debug("GET received on /api/filters, query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "type",
					required: "yes",
					type: ["filter", "layout", "artifact", "decoration"]
				},
				{
					name: "filterType",
					type: ["preset"]
				},
				{
					name: "layoutType",
					type: ["preset"]
				},
				{
					name: "artifactType",
					type: ["preset"]
				},
				{
					name: "decorationType",
					type: ["preset"]
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			var prototype;
			var cypherQuery;

			if (req.query.type == "filter" && req.query.filterType && req.query.filterType == "preset") {
				cypherQuery = "MATCH (f:Filter {filter_type : 'preset'}) RETURN f;";
				prototype = serverUtils.prototypes.filter;
			} else if (req.query.type == "layout" && req.query.layoutType && req.query.layoutType == "preset") {
				cypherQuery = "MATCH (l:Layout {layout_type : 'preset'}) RETURN l;";
				prototype = serverUtils.prototypes.layout;
			} else if (req.query.type == "artifact" && req.query.artifactType && req.query.artifactType == "preset") {
				cypherQuery = "MATCH (a:Artifact {artifact_type : 'preset'}) RETURN a;";
				prototype = serverUtils.prototypes.artifact;
			} else if (req.query.type == "decoration" && req.query.decorationType && req.query.decorationType == "preset") {
				cypherQuery = "MATCH (d:Decoration {decoration_type : 'preset'}) RETURN d;";
				prototype = serverUtils.prototypes.decoration;
			} else {
				logger.error("Invalid request received");
				return res.sendStatus(400);
			}

			db.cypherQuery(cypherQuery, function(err, result){
				if(err) {
					logger.dbError(err, cypherQuery);
					return res.sendStatus(500);
				} else if (result.data.length <= 0) {
    				logger.dbResultError(cypherQuery, "> 0", result.data.length);
    				return res.sendStatus(500);
    			}

				var output = [];
				for (var i = 0; i < result.data.length; i++) {
					output.push({id: result.data[i].id, name: result.data[i].name});
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

			var validationParams = [
				{
					name: "source",
					type: ["challengeId", "imageURL", "dataURI", "designId"],
					required: "yes"
				},
				{
					name: "challengeId",
					type: "id"
				},
				{
					name: "designId",
					type: "id",
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
				}
			];

			if (!serverUtils.validateQueryParams(req.body, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			if (!req.body.steps || !filterUtils.validateSteps(req.body.steps)) {
				logger.error("Steps validation failed, steps: " + JSON.stringify(req.body.steps));
				return res.sendStatus(400);
			}

			dataUtils.normalizeSteps(req.body.steps, function(err, steps){
    			if (err) {
    				return res.sendStatus(500);
    			}

    			async.waterfall([
				    function(callback) {
				    	if (req.body.source == "challengeId") {
							if (!req.body.challengeId) {
								logger.error("Challenge ID missing.");
								return callback(new Error("Challenge ID Missing."));
							}

							dataUtils.getImageDataForChallenge(req.body.challengeId, function(err, imageData){
								if (err) {
									return callback(err);
								}

								var sourceImagePath = global.appRoot + config.path.challengeImages + req.body.challengeId + "." + mime.extension(imageData.imageType);
								var hash = filterUtils.generateHash(JSON.stringify(steps));
								var targetImageName = req.body.challengeId + "-" + hash + "." + mime.extension(imageData.imageType);
								var targetImagePath = global.appRoot + config.path.cacheImages + targetImageName;
								var targetImageUrl = config.url.cacheImages + targetImageName;

		    					return callback(null, {sourceImagePath: sourceImagePath, sourceFileIsTemp: false, targetImagePath: targetImagePath, targetImageUrl: targetImageUrl, imageType: imageData.imageType});
							});
						} else {
							return callback(null, null);
						}
				    },
				    function(info, callback) {
				    	if (info == null && req.body.source == "imageURL") {
				    		if (!req.body.imageData) {
				    			logger.error("Missing Image URL.");
				    			return callback(new Error("Missing Image URL"));
				    		}

				    		var extension = req.body.imageData.split('.').pop();
				    		var imageType = mime.lookup(extension);
				    		if (!serverUtils.validateItem("imageType", "imageType", imageType)) {
				    			return callback(new Error("Invalid Image Type: " + imageType));
				    		}

				    		var tmp = require('tmp');

							tmp.file({ dir: config.tmpDir, prefix: 'apply-filter-', postfix: '.' + extension}, function _tempFileCreated(err, sourceImagePath, fd) {
								if (err) {
									return callback(err);
								}

								serverUtils.downloadImage(req.body.imageData, sourceImagePath, function(err) {
					    			if (err) {
					    				return callback(err);
					    			}

					   				return callback(null, {sourceImagePath: sourceImagePath, sourceFileIsTemp: true, targetImagePath: null, targetImageUrl: null, imageType: imageType});
								});
				    		});
				    	} else {
				    		return callback(null, info);
				    	}
				    },
				    function(info, callback) {
				    	if (info == null && req.body.source == "dataURI") {
				    		if (!req.body.imageData) {
				    			logger.error("Missing Image URI");
				    			return callback(new Error("Missing Image URI"));
				    		}

				    		var parseDataURI = require("parse-data-uri");
							var parsed = parseDataURI(req.body.imageData);
							
							var buffer = parsed.data;

							var tmp = require('tmp');

							logger.debug("going to create tmp file");
							tmp.file({ dir: config.tmpDir, prefix: 'apply-filter-', postfix: '.' + mime.extension(parsed.mimeType)}, function _tempFileCreated(err, sourceImagePath, fd) {
								if (err) {
									return callback(err);
								}

								logger.debug("going to write to tmp file: " + sourceImagePath);
								fs.writeFile(sourceImagePath, buffer, function(err) {
									if (err) {
										logger.error("Failed to write file: " + sourceImagePath + ": " + err);
										return callback(err);
									}

									return callback(null, {sourceImagePath: sourceImagePath, sourceFileIsTemp: true, targetImagePath: null, targetImageUrl: null, imageType: parsed.mimeType});
									
								});
				    		});
				    	} else {
				    		return callback(null, info);
				    	}
				    },
				    function(info, callback) {
				    	if (info == null && req.body.source == "designId") {
				    		if (!req.body.designId ) {
				    			logger.error("Missing Design ID");
				    			return callback(new Error("Missing Design ID"));
				    		}

				    		dataUtils.getImageDataForDesign(req.body.designId, function(err, imageData){
								if (err) {
									return callback(err);
								}

								var sourceImagePath = global.appRoot + config.path.designImages + req.body.designId + "." + mime.extension(imageData.imageType);
					    		var hash = filterUtils.generateHash(JSON.stringify(steps));
					    		var targetImageName = req.body.designId + "-" + hash + "." + mime.extension(imageData.imageType);
								var targetImagePath = global.appRoot + config.path.cacheImages + targetImageName;
								var targetImageUrl = config.url.cacheImages + targetImageName;

								return callback(null, {sourceImagePath: sourceImagePath, sourceFileIsTemp: false, targetImagePath: targetImagePath, targetImageUrl: targetImageUrl, imageType: imageData.imageType});
							});
				    	} else {
				    		return callback(null, info);
				    	}
				    }
				], function (err, info) {
					if (err) {
						logger.error("Some error encountered: " + err);
						return res.sendStatus(500);
					} else if (info == null) {
						logger.error("Info is null, meaning none of the inputs were valid.");
						return res.sendStatus(500);
					}

	    			imageProcessor.applyStepsToImage(info.sourceImagePath, info.targetImagePath, info.imageType, steps, req.body.caption, function(err, imagePath){
						if (err) {
							fs.unlink(info.targetImagePath, function(err) {
								if (err) {
									logger.error("Failed to delete file: " + err);
								}
							});

							logger.error("applyStepsToImage failed: " + err);
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

						if (info.targetImagePath == null) {
							//we generated a temp path.  make sure to send the file as blob and delete the temp file
							const DataURI = require('datauri');
							const datauri = new DataURI();
							datauri.encode(imagePath, function(err, content) {
								if (err) {
									throw err;
								}

								
								/*
								fs.unlink(imagePath, function(err) {
									if (err) {
										logger.error("Failed to delete temp file: " + err);
									}
								});
								*/

								var jsonObj = {"type" : "dataURI", "imageData" : content};

								if (!serverUtils.validateData(jsonObj, serverUtils.prototypes.imageInfo)) {
									return res.sendStatus(500);
								}

								return res.json(jsonObj);
							});
						} else {
							//we saved to the provided target image path.  send the link
							var jsonObj = {"type" : "imageURL", "imageData" : info.targetImageUrl};

							if (!serverUtils.validateData(jsonObj, serverUtils.prototypes.imageInfo)) {
								return res.sendStatus(500);
							}
							
							return res.json(jsonObj);
						}
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

			dataUtils.getImageDataForEntry(req.params.entryId, function(err, imageData){
				if (err) {
					logger.error("getImageDataForEntry, entry: " + req.params.entryId + ": " + err);
					return res.sendStatus(500);
				}

				var sourceImagePath = global.appRoot + config.path.challengeImages + imageData.image;

	    		dataUtils.normalizeSteps(imageData.steps, function(err, steps){
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
	    				var hash = filterUtils.generateHash(JSON.stringify(singleStepList[i]));

						var targetImageName = imageData.challengeId + "-" + hash + "." + mime.extension(imageData.imageType);
						var targetImage = global.appRoot + config.path.cacheImages + targetImageName;

						imageUrlPaths.push(config.url.cacheImages + targetImageName);

						//apply steps - note that applyStepsToImage first checks for existance of cache image
	    				applySingleStepToImageFunctions.push(async.apply(imageProcessor.applyStepsToImage, sourceImagePath, targetImage, imageData.imageType, singleStepList[i], imageData.caption));
	    			}

	    			var imagePaths = []; //list of image paths for each sub step
	    			async.series(applySingleStepToImageFunctions, function(err, imagePaths) {
	    				if (err) {
	    					logger.error("Failed to apply the single steps - " + err);
	    					return res.sendStatus(500);
	    				}

	    				var output = [];

	    				//first item is the base challenge image
	    				var sourceImagePublicPath = config.url.challengeImages + imageData.image;
	    				output.push({"imageType" : "url", "imageData" : sourceImagePublicPath});

	    				//for the rest of the items, add the target image url
	    				for (var j = 0; j < imagePaths.length; j++) {
							output.push({"imageType" : "url", "imageData" : imageUrlPaths[j]});
	    				}

	    				if (!serverUtils.validateData(output, serverUtils.prototypes.imageInfo)) {
	    					return res.sendStatus(500);
	    				}
						return res.json(output	);
	    			});
	    		});
			});
		});
	
	return filterRouter;
};

module.exports = routes;