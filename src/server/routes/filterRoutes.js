var express = require("express");
var dataUtils = require("../dataUtils");
var fs = require("fs");
var config = require("../config");
var async = require("async");
var mime = require("mime");
var spawn = require("child_process").spawn;
var execFile = require("child_process").execFile;

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
		//console.log("/api/filters/timelapse received get");

		var sourceImagePath;
		var purgeImageAfterUse = false;
		// Normalize the image
		// check what format the image source is of
		if (req.params.entryId) {
			// find local path to the challenge's source image
			purgeImageAfterUse = false;

			dataUtils.getImageDataForEntry(req.params.entryId, function(err, imageData){
				if (err) throw err;

				sourceImagePath = global.appRoot + config.path.challengeImages + imageData.image;

	    		dataUtils.normalizeSteps(imageData.steps, function(err, steps){

	    			var singleStepList = extractSingleStepList(steps);
	    			var applySingleStepToImageFunctions = [];

	    			for (var i = 0; i < singleStepList.length; i++) {
	    				//console.log("singleStepList " + i + " is:" + JSON.stringify(singleStepList[i]));
	    				applySingleStepToImageFunctions.push(async.apply(imageProcessor.applyStepsToImage, sourceImagePath, null, singleStepList[i], imageData.caption));
	    			}

	    			var imagePaths = []; //list of image paths for each sub step
	    			async.series(applySingleStepToImageFunctions, function(err, imagePaths) {
	    				if (err) throw err;

	    				var jsonObj = {};
	    				jsonObj.timelapseData = [];

	    				//first item is the base challenge image
	    				var sourceImagePublicPath = config.url.challengeImages + imageData.image;
	    				jsonObj.timelapseData.push({"imageType" : "url", "imageData" : sourceImagePublicPath})

	    				for (var j = 0; j < imagePaths.length; j++) {
	    					//send the image as a base64 encoded image blob
	    					//console.log("imagePaths " + j + " is " + imagePaths[j]);
							var imageBlob = fs.readFileSync(imagePaths[j]); //TODO - change to async WARNING - PERFORMANCE ISSUE
							var imageBase64 = new Buffer(imageBlob).toString('base64');
							jsonObj.timelapseData.push({"imageType" : "data", "imageData" : imageBase64});
							
							//dispose off the temp file
							fs.unlink(imagePaths[j]);
	    				}

						res.setHeader('Content-Type', 'application/json');
						//console.log("sending response to /api/filters/timelapse, jsonObj is " + JSON.stringify(jsonObj));
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
	
	return filterRouter;
}

function cloneObject(input) {
	return JSON.parse(JSON.stringify(input));
}

function extractSingleStepList(steps) {
	//console.log("extractSingleStepList, input steps: " + JSON.stringify(steps));
	var singleStepList = [];

	var step = {};

	if (steps.layouts) {
		step.layouts = [];
		for (var i = 0; i < steps.layouts.length; i++) {
			var layout = {};
			step.layouts.push(layout);

			if (steps.layouts[i].type == "custom") {
				step.layouts[i].type = "custom";

				if (steps.layouts[i].size) {
					step.layouts[i].size = steps.layouts[i].size;
					singleStepList.push(cloneObject(step));
				}

				if (steps.layouts[i].crop) {
					step.layouts[i].crop = steps.layouts[i].crop;
					singleStepList.push(cloneObject(step));
				}

				if (steps.layouts[i].mirror) {
					step.layouts[i].mirror = steps.layouts[i].mirror;
					singleStepList.push(cloneObject(step));
				}

				if (steps.layouts[i].rotation) {
					step.layouts[i].rotation = steps.layouts[i].rotation;
					singleStepList.push(cloneObject(step));
				}

				if (steps.layouts[i].shear) {
					step.layouts[i].shear = steps.layouts[i].shear;
					singleStepList.push(cloneObject(step));
				}
			} else if (steps.layouts[i].type == "preset") {
				step.layouts[i].type = "preset";
				step.layouts[i].preset = steps.layouts[i].preset;
				singleStepList.push(cloneObject(step));
			}
		}
	}

	if (steps.filters) {
		step.filters = [];

		for (var i = 0; i < steps.filters.length; i++) {
			var filter = {};
			step.filters.push(filter);

			if (steps.filters[i].type == "custom") {
				step.filters[i].type = "custom";

				if (steps.filters[i].settings) {
					step.filters[i].settings = steps.filters[i].settings;
					singleStepList.push(cloneObject(step));
				}

				if (steps.filters[i].effects) {
					step.filters[i].effects = {};

					if (steps.filters[i].effects.paint) {
						step.filters[i].effects.paint = steps.filters[i].effects.paint;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.grayscale) {
						step.filters[i].effects.grayscale = steps.filters[i].effects.grayscale;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.mosaic) {
						step.filters[i].effects.mosaic = steps.filters[i].effects.mosaic;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.negative) {
						step.filters[i].effects.negative = steps.filters[i].effects.negative;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.solarize) {
						step.filters[i].effects.solarize = steps.filters[i].effects.solarize;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.monochrome) {
						step.filters[i].effects.monochrome = steps.filters[i].effects.monochrome;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.swirl) {
						step.filters[i].effects.swirl = steps.filters[i].effects.swirl;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.wave) {
						step.filters[i].effects.wave = steps.filters[i].effects.wave;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.spread) {
						step.filters[i].effects.spread = steps.filters[i].effects.spread;
						singleStepList.push(cloneObject(step));
					}

					if (steps.filters[i].effects.charcoal) {
						step.filters[i].effects.charcoal = steps.filters[i].effects.charcoal;
						singleStepList.push(cloneObject(step));
					}
				}

			} else if (steps.filters[i].type == "preset") {
				step.filters[i].type = "preset";
				step.filters[i].preset = steps.filters[i].preset;
				singleStepList.push(cloneObject(step));
			}
		}
	}

	if (steps.artifacts) {
		step.artifacts = [];

		for (var i = 0; i < steps.artifacts.length; i++) {
			var artifact = {};
			step.artifacts.push(artifact);

			if (steps.artifacts[i].type == "custom") {
				step.artifacts[i].type = "custom";

				if (steps.artifacts[i].banner) {
					step.artifacts[i].banner = steps.artifacts[i].banner;
					singleStepList.push(cloneObject(step));
				}
			} else if (steps.artifacts[i].type == "preset") {
				step.artifacts[i].type = "preset";
				step.artifacts[i].preset = steps.artifacts[i].preset;
				singleStepList.push(cloneObject(step));
			}
		}
	}

	if (steps.decorations) {
		step.decorations = [];

		for (var i = 0; i < steps.decorations.length; i++) {
			var decoration = {};
			step.decorations.push(decoration);

			if (steps.decorations[i].type == "custom") {
				step.decorations[i].type = "custom";

				if (steps.decorations[i].border) {
					step.decorations[i].border = steps.decorations[i].border;
					singleStepList.push(cloneObject(step));
				}
			} else if (steps.decorations[i].type == "preset") {
				step.decorations[i].type = "preset";
				step.decorations[i].preset = steps.decorations[i].preset;
				singleStepList.push(cloneObject(step));
			}
		}
	}

	return singleStepList;
}

function sendImage(err, imagePath, purge) {
	if (err) throw err;

	var json = "{ image : '" + imagePath + "' }";
	res.send(json); //, function(err) {
			
	if (purge) {
		//unlink the tmp image
	}
}

module.exports = routes;