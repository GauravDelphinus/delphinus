var tmp = require("tmp");
var fs = require("fs");
var gm = require("gm").subClass({imageMagick: true});

module.exports = {

	/**
		Apply the given steps on top of the image provided.
		Creates a new image with the steps applied, and passes
		the path to the callback function on success.

		The caller is responsible for disposing of the returned
		image once it has finished processing it.
	**/
	applyStepsToImage : function(imagePath, steps, next) {

		var sourceImage = __dirname + imagePath;  //input image full path
		//var outputImage = 

		var tmp = require('tmp');

		tmp.tmpName(function _tempNameGenerated(err, path) {
    		if (err) throw err;
 
 			/*
    		if (steps = "black-and-white") {
				gm(sourceImage)
				.colorspace("GRAY")
				.write(path, function(err){
					if (!err) console.log ("done!");

					next(0, path);
				});
			}
			*/

			if (steps = "black-and-white") {
				var image = gm(sourceImage)
						.colorspace("GRAY");

				writeImage(image, path, next);
			}
		});
	}
};

function writeImage(image, imagePath, next) {

	image.write(imagePath, function(err) {
		if (err) throw err;

		next(0, imagePath);
	});

}