var express = require("express");
var dataUtils = require("../dataUtils");
var fs = require("fs");
var config = require("../config");

var routes = function(db) {

	var filterRouter = express.Router();
	var imageProcessor = require("../imageProcessor");

	filterRouter.route("/")
	.get(function(req, res) {
		if (req.query.type == "filter" && req.query.filterType == "preset") {
			var output = [];
			/*
		"rainyDay" : 1,
		"glassWall" : 2,
		"nightingale" : 3,
		"whirlpool" : 4,
		"comical" : 5 */
			var f = {id: 1, name: "Rain Day"};
			output.push([{id: 1, name: "Rainy Day"}]);
			output.push([{id: 2, name: "Glass Wall"}]);
			output.push([{id: 3, name: "Nightingale"}]);
			output.push([{id: 4, name: "Whirlpool"}]);
			output.push([{id: 5, name: "Comical"}]);

			console.log("for /api/filters returning to client: " + JSON.stringify(output));
			res.json(output);
		}
	});

	filterRouter.route("/apply") // /api/filters/apply ROUTE
	.post(function(req, res){
		console.log("/api/filters/apply received post, body is = " + JSON.stringify(req.body));

		var sourceImagePath;
		var purgeImageAfterUse = false;
		// Normalize the image
		// check what format the image source is of
		if (req.body.imageSource == "challengeId") {
			// find local path to the challenge's source image
			purgeImageAfterUse = false;

			dataUtils.getImageDataForChallenge(db, req.body.imageData, function(err, image){
				//console.log("/api/filters/apply - Received req.body = ~~" + JSON.stringify(req.body) + "~~");
				if (err) throw err;

				sourceImagePath = global.appRoot + config.path.challengeImages + image;

	    		dataUtils.normalizeSteps(req.body.steps, function(err, steps){
	    			imageProcessor.applyStepsToImage(sourceImagePath, steps, function(err, imagePath){
						if (err) throw err;

						//send the image as a base64 encoded image blob
						var imageBlob = fs.readFileSync(imagePath); //TODO - change to async
						var imageBase64 = new Buffer(imageBlob).toString('base64');
						var jsonObj = {"imageData" : imageBase64};
						res.setHeader('Content-Type', 'application/json');
						//console.log("sending response to /api/filters/apply, jsonObj is " + JSON.stringify(jsonObj));
						res.send(JSON.stringify(jsonObj));

						//dispose off the temp file
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
	if (err) throw err;

	//console.log("calling res.send with " + imagePath);
	var json = "{ image : '" + imagePath + "' }";
	res.send(json); //, function(err) {
			
	if (purge) {
		//unlink the tmp image
	}
}

module.exports = routes;