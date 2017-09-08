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

			var cypherQuery;

			if (req.query.type == "filter" && req.query.filterType && req.query.filterType == "preset") {
				cypherQuery = "MATCH (f:Filter {filter_type : 'preset'}) RETURN f;";
			} else if (req.query.type == "layout" && req.query.layoutType && req.query.layoutType == "preset") {
				cypherQuery = "MATCH (l:Layout {layout_type : 'preset'}) RETURN l;";
			} else if (req.query.type == "artifact" && req.query.artifactType && req.query.artifactType == "preset") {
				cypherQuery = "MATCH (a:Artifact {artifact_type : 'preset'}) RETURN a;";
			} else if (req.query.type == "decoration" && req.query.decorationType && req.query.decorationType == "preset") {
				cypherQuery = "MATCH (d:Decoration {decoration_type : 'preset'}) RETURN d;";
			} else {
				logger.error("Invalid request received");
				return res.sendStatus(400);
			}

			db.cypherQuery(cypherQuery, function(err, result){
				if(err) {
					logger.dbError(err, cypherQuery);
					return res.sendStatus(500);
				}

				var output = [];
				for (var i = 0; i < result.data.length; i++) {
					output.push([{id: result.data[i].id, name: result.data[i].name}]);
				}
			
				return res.json(output);
			});
		});

	filterRouter.route("/apply") // /api/filters/apply ROUTE

		.post(function(req, res){

			logger.debug("POST received on /api/filters/apply, body: " + JSON.stringify(req.body));

			var validationParams = [
				{
					name: "challengeId",
					required: "yes",
					type: "id"
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

			if (!req.body.steps || !filterUtils.validateSteps(req.body.steps)) {
				logger.error("Steps validation failed, steps: " + JSON.stringify(req.body.steps));
				return res.sendStatus(400);
			}
				
			dataUtils.getImageDataForChallenge(req.body.challengeId, function(err, imageData){
				if (err) {
					return res.sendStatus(500);
				}

				var image = req.body.challengeId;
				var sourceImagePath = global.appRoot + config.path.challengeImages + image + "." + mime.extension(imageData.imageType);
	    		dataUtils.normalizeSteps(req.body.steps, function(err, steps){
	    			if (err) {
	    				return res.sendStatus(500);
	    			}

	    			var hash = filterUtils.generateHash(JSON.stringify(steps));
					var targetImageName = req.body.challengeId + "-" + hash + "." + mime.extension(imageData.imageType);
					var targetImage = global.appRoot + config.path.cacheImages + targetImageName;
	    				
	    			imageProcessor.applyStepsToImage(sourceImagePath, targetImage, steps, req.body.caption, function(err, imagePath){
						if (err) {
							return res.sendStatus(500);
						}

						var imageUrlPath = config.url.cacheImages + targetImageName;

						var jsonObj = {"type" : "url", "imageData" : imageUrlPath};
						res.setHeader('Content-Type', 'application/json');

						return res.send(JSON.stringify(jsonObj));
					});
	    		});
    		});
		});

	filterRouter.route("/timelapse/:entryId") // /api/filters/timelapse ROUTE

		.get(function(req, res){

			logger.debug("GET received on api/filters/timelapse/" + req.params.entryId + ", query: " + JSON.stringify(req.query));
			
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
					return res.sendStatus(500);
				}

				var sourceImagePath = global.appRoot + config.path.challengeImages + imageData.image;

	    		dataUtils.normalizeSteps(imageData.steps, function(err, steps){
	    			if (err) {
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
	    				applySingleStepToImageFunctions.push(async.apply(imageProcessor.applyStepsToImage, sourceImagePath, targetImage, singleStepList[i], imageData.caption));
	    			}

	    			var imagePaths = []; //list of image paths for each sub step
	    			async.series(applySingleStepToImageFunctions, function(err, imagePaths) {
	    				if (err) {
	    					logger.error("Failed to apply the single steps - " + err);
	    					return res.sendStatus(500);
	    				}

	    				var jsonObj = {};
	    				jsonObj.timelapseData = [];

	    				//first item is the base challenge image
	    				var sourceImagePublicPath = config.url.challengeImages + imageData.image;
	    				jsonObj.timelapseData.push({"imageType" : "url", "imageData" : sourceImagePublicPath});

	    				//for the rest of the items, add the target image url
	    				for (var j = 0; j < imagePaths.length; j++) {
							jsonObj.timelapseData.push({"imageType" : "url", "imageData" : imageUrlPaths[j]});
	    				}

						res.setHeader('Content-Type', 'application/json');

						return res.send(JSON.stringify(jsonObj));
	    			});
	    		});
			});
		});
	
	return filterRouter;
};

module.exports = routes;