var tmp = require("tmp");
var fs = require("fs");
var gm = require("gm").subClass({imageMagick: true});

module.exports = {

	/**
		Apply the given steps on top of the image provided.
		Creates a new image with the steps applied, and returns
		a temporary path containing the new image.

		The caller is responsible for disposing of the returned
		image once it has finished processing it.
	**/
	applyStepsToImage : function(image, steps, next) {

		var sourceImage = __dirname + image;  //input image full path
		//var outputImage = 

		var tmp = require('tmp');

		tmp.tmpName(function _tempNameGenerated(err, path) {
    		if (err) throw err;
 
    		if (steps = "black-and-white") {
				gm(sourceImage)
				.colorspace("GRAY")
				.write(path, function(err){
					if (!err) console.log ("done!");

					next(0, path);
				});
			}
		});


	}
};