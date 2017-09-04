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

var routes = function(db) {

	var filterRouter = express.Router();
	var imageProcessor = require("../imageProcessor");

	filterRouter.route("/")
	.get(function(req, res) {
		var cypherQuery;

		if (req.query.type == "filter" && req.query.filterType == "preset") {
			cypherQuery = "MATCH (f:Filter {filter_type : 'preset'}) RETURN f;";
		} else if (req.query.type == "layout" && req.query.layoutType == "preset") {
			cypherQuery = "MATCH (l:Layout {layout_type : 'preset'}) RETURN l;";
		} else if (req.query.type == "artifact" && req.query.artifactType == "preset") {
			cypherQuery = "MATCH (a:Artifact {artifact_type : 'preset'}) RETURN a;";
		} else if (req.query.type == "decoration" && req.query.decorationType == "preset") {
			cypherQuery = "MATCH (d:Decoration {decoration_type : 'preset'}) RETURN d;";
		}

		//console.log("Running cypherQuery: " + cypherQuery);
		db.cypherQuery(cypherQuery, function(err, result){
			if(err) throw err;

			var output = [];
			for (var i = 0; i < result.data.length; i++) {
				output.push([{id: result.data[i].id, name: result.data[i].name}]);
			}
		
			//console.log("for /api/filters returning to client: " + JSON.stringify(output));

			res.json(output);
		});
	});

	filterRouter.route("/apply") // /api/filters/apply ROUTE
	.post(function(req, res){
		var sourceImagePath;
		var purgeImageAfterUse = false;
		// Normalize the image
		// check what format the image source is of
		if (req.body.imageSource == "challengeId") {
			// find local path to the challenge's source image
			purgeImageAfterUse = false;

			
			dataUtils.getImageDataForChallenge(req.body.imageData, function(err, imageData){
				if (err) throw err;

				var image = req.body.imageData; //challengeId
				sourceImagePath = global.appRoot + config.path.challengeImages + image + "." + mime.extension(imageData.imageType);
	    		dataUtils.normalizeSteps(req.body.steps, function(err, steps){

	    			var hash = filterUtils.generateHash(JSON.stringify(steps));
					var targetImageName = req.body.imageData + "-" + hash + "." + mime.extension(imageData.imageType);
					var targetImage = global.appRoot + config.path.cacheImages + targetImageName;
	    				
	    			imageProcessor.applyStepsToImage(sourceImagePath, targetImage, steps, req.body.caption, function(err, imagePath){
						if (err) throw err;

						var imageUrlPath = config.url.cacheImages + targetImageName;

						var jsonObj = {"type" : "url", "imageData" : imageUrlPath};
						res.setHeader('Content-Type', 'application/json');
						res.send(JSON.stringify(jsonObj));
					});
	    		});
    		});
		} else if (req.body.imageSource == "url") {
			// download the external web image into a local temp path, also set the "delete" flag to true
			purgeImageAfterUse = true;
		} else if (req.body.imageSource == "blob") {
			// convert the base64 encoded image blob into a local temp path, and set the purge flag to true
			purgeImageAfterUse = true;
		}
		
	});

	filterRouter.route("/timelapse/:entryId") // /api/filters/timelapse ROUTE
	.get(function(req, res){
		logger.debug("GET received on /timelapse/" + req.params.entryId);
		var sourceImagePath;
		// Normalize the image
		// check what format the image source is of
		if (req.params.entryId) {
			// find local path to the challenge's source image

			dataUtils.getImageDataForEntry(req.params.entryId, function(err, imageData){
				if (err) throw err;

				sourceImagePath = global.appRoot + config.path.challengeImages + imageData.image;

	    		dataUtils.normalizeSteps(imageData.steps, function(err, steps){
	    			if (err) throw err;

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
	    				if (err) throw err;

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
						res.send(JSON.stringify(jsonObj));
	    			});
	    		});
			});
		}
	});
	
	return filterRouter;
};

function sendImage(err, imagePath, purge) {
	if (err) throw err;

	var json = "{ image : '" + imagePath + "' }";
	res.send(json); //, function(err) {
			
	if (purge) {
		//unlink the tmp image
	}
}

module.exports = routes;