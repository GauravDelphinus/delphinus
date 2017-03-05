var express = require("express");
var dataUtils = require("../dataUtils");

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

				sourceImagePath = __dirname + "/../" + image;

				imageProcessor.applyFiltersToImage(sourceImagePath, req.body.filters, true, function(err, imagePath){
					if (err) throw err;

					//remove the local prefix from the imagePath, if any
					var pos = imagePath.indexOf("/public/");
					if (pos >= 0) {
						imagePath = imagePath.slice(pos + 7);
					}
					console.log("calling res.send with imagePath " + imagePath);
					var json = "{ 'image' : '" + imagePath + "' }";
					var jsonObj = { 'image' : imagePath };
					res.setHeader('Content-Type', 'application/json');
					res.send(JSON.stringify(jsonObj)); //, function(err) {
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