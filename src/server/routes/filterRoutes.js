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
	    			imageProcessor.applyStepsToImage(sourceImagePath, null, steps, req.body.caption, function(err, imagePath){
						if (err) throw err;

						//send the image as a base64 encoded image blob
						var imageBlob = fs.readFileSync(imagePath); //TODO - change to async
						var imageBase64 = new Buffer(imageBlob).toString('base64');
						var jsonObj = {"imageData" : imageBase64};
						res.setHeader('Content-Type', 'application/json');
						//console.log("sending response to /api/filters/apply, jsonObj is " + JSON.stringify(jsonObj));
						res.send(JSON.stringify(jsonObj));

						//dispose off the temp file, if source and target are not same
						if (sourceImagePath != imagePath) {
							fs.unlink(imagePath);
						}
						
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
						var targetImageName = req.params.entryId + "-" + hash + "." + mime.extension(imageData.imageType);
						if (i == singleStepList.length - 1) {
							//the last step is the cumulative of all filters, so just name that as the id of the entry
							targetImageName = req.params.entryId + "." + mime.extension(imageData.imageType)
						}
						var targetImage = global.appRoot + config.path.entryImages + targetImageName;
						imageUrlPaths.push(config.url.entryImages + targetImageName);

	    				if (fs.existsSync(targetImage)) {
	    					//file already exists, just use the existing file
	    					applySingleStepToImageFunctions.push(async.apply(function(targetImage, next) {
	    						next(0, targetImage); //pass the existing file path to the sync series function
	    					}, targetImage));
	    				} else {
	    					//file not found, generate a new file
	    					applySingleStepToImageFunctions.push(async.apply(imageProcessor.applyStepsToImage, sourceImagePath, targetImage, singleStepList[i], imageData.caption));
	    				}
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