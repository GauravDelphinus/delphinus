var express = require("express");
var dataUtils = require("../dataUtils");
var fs = require("fs");
var config = require("../config");

var routes = function(db) {

	var filterRouter = express.Router();
	var imageProcessor = require("../imageProcessor");

	filterRouter.route("/apply")
	.post(function(req, res){
		console.log("received post, body is = " + req.body.filters);

		var sourceImagePath;
		var purgeImageAfterUse = false;
		// Normalize the image
		// check what format the image source is of
		if (req.body.imageSource == "challengeId") {
			// find local path to the challenge's source image
			purgeImageAfterUse = false;

			dataUtils.getImageDataForChallenge(db, req.body.imageData, function(err, image){
				if (err) throw err;

				sourceImagePath = global.appRoot + config.path.challengeImages + image;

				/// TODO - add "normalization" code for the json obj filters
				var filtersFromClient = req.body.filters;
	    		var filters = [];

	    		// Now construct the filters array in the JSON format
	    		for (var i = 0; i < filtersFromClient.length; i++) {
	    			var filterFromClient = filtersFromClient[i];
	    			var filter = {};

	    			filter.type = filterFromClient.type;
	    			
	    			if (filterFromClient.settings) {
	    				filter.settings = filterFromClient.settings;
	    			} 

	    			if (filterFromClient.effects) {
	    				filter.effects = filterFromClient.effects;
	    			}
	    			
	    			filters.push(filter);
	    		}

	    		dataUtils.normalizeFilters(filters, function(err, normalizedFilters){
	    			imageProcessor.applyFiltersToImage(sourceImagePath, normalizedFilters, function(err, imagePath){
					if (err) throw err;

					//send the image as a base64 encoded image blob
					var imageBlob = fs.readFileSync(imagePath); //TODO - change to async
					var imageBase64 = new Buffer(imageBlob).toString('base64');
					var jsonObj = {"imageData" : imageBase64};
					res.setHeader('Content-Type', 'application/json');
					res.send(JSON.stringify(jsonObj));

					//dispose off the temp file
					console.log("disposing off " + imagePath);
					fs.unlink(imagePath);
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

function sendImage(err, imagePath, purge) {
	console.log("err is " + err);
	if (err) throw err;

	console.log("calling res.send with " + imagePath);
	var json = "{ image : '" + imagePath + "' }";
	res.send(json); //, function(err) {
			
	if (purge) {
		//unlink the tmp image
	}
}

module.exports = routes;