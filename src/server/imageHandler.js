var stepsHandler = require("./stepsHandler");
var fs = require("fs");
var tmp = require("tmp");
//var execFile = require('child_process').execFile;
//var execFileSync = require("child_process").execFileSync;
var imageProcessor = require("./imageProcessor");
var logger = require("./logger");
var config = require("./config");
var mime = require("mime");

var functions = {
	applyStepsToImage : function(sourceImage, targetImage, imageType, steps, caption, next) {
		//logger.debug("applyStepsToImage: sourceImage: " + sourceImage + ", targetImage: " + targetImage + ", steps: " + JSON.stringify(steps));
		if (targetImage) {
			if (fs.existsSync(targetImage)) { //check if file already exists in Cache
				return next(0, targetImage);
			} else {
				stepsHandler.applySteps(sourceImage, targetImage, steps, caption, next);
			}
		} else {
			tmp.tmpName(function _tempNameGenerated(err, path) {
    			if (err) {
    				return next(err, 0);
    			}
    			
    			stepsHandler.applySteps(sourceImage, path + "." + mime.extension(imageType), steps, caption, next);
			});
		}
	},

	
	findImageSize: findImageSize,

	addWatermarkToImage: function(sourceImage, targetImage, next) {
		addWatermark(sourceImage, targetImage, next);
	},

	/**
		Compress the given image to a smaller size as supported by Captionify
	**/
	compressImage: function (before, after, next) {
		//logger.debug("calling execFile in compressImage");
		var imArgs = [{type: "INPUT_FILE", value: before}, "-resize", config.image.maxWidth + "x" + config.image.maxHeight + "\>", {type: "OUTPUT_FILE", value: after}];

		const timer = logger.startTimer();
		imageProcessor.processImage("convert", after, imArgs, function(err) {
			if (err) {
				timer.done("compressImage, error: before: " + before + ", after: " + after + ", imArgs: " + JSON.stringify(imArgs));
				return next(err);
			    
			} else {
				timer.done("compressImage, success: before: " + before + ", after: " + after + ", imArgs: " + JSON.stringify(imArgs));
				return next(0, after);
			}
		});
	},

	/**
		Find the average color (RGB) in a section of the image

		NOTE: SYNCHRONOUS CALL!!!!
	**/
	findAverageColor: function (imagePath, labelGeometry) {
		//logger.debug("findAverageColor: imagePath: " + imagePath + ", labelGeometry: " + JSON.stringify(labelGeometry));
		const timer = logger.startTimer();
		try {
			var output = execFileSync('convert', [imagePath, "-crop", labelGeometry.width + "x" + labelGeometry.height + "+" + labelGeometry.left + "+" + labelGeometry.top, "-resize", "1x1\!", "-format", "%[fx:int(255*r+.5)],%[fx:int(255*g+.5)],%[fx:int(255*b+.5)]", "info:-"]);
			var colorArray = output.toString().trim().split(",");
		  	var color = {r: parseInt(colorArray[0]), g: parseInt(colorArray[1]), b: parseInt(colorArray[2])};

		  	timer.done("findAverageColor, success: imagePath: " + imagePath + ", labelGeometry: " + JSON.stringify(labelGeometry));
		  	return color;
		} catch (error) {
			logger.error("error in determining the average color: " + error);
			timer.done("findAverageColor, error: imagePath: " + imagePath + ", labelGeometry: " + JSON.stringify(labelGeometry));
		}

		return null;
	},

	writeImage: writeImage
};

for (var key in functions) {
	module.exports[key] = functions[key];
}

/**
	Find the size of the provided image
**/
function findImageSize (imagePath, next) {
	var imArgs = ["-format", "%Wx%H", {type: "INPUT_FILE", value: imagePath}];
	const timer = logger.startTimer();

	imageProcessor.processImage("identify", null, imArgs, function(err, stdout) {
		if (err) {
			timer.done("findImageSize, error: imagePath: " + imagePath + ", imArgs: " + JSON.stringify(imArgs));
			return next(err);
		} 

		var sizeArray = stdout.trim().split("x");
  		var newImageSize = {width: parseInt(sizeArray[0]), height: parseInt(sizeArray[1])};

		timer.done("findImageSize, success: imagePath: " + imagePath + ", imArgs: " + JSON.stringify(imArgs));
		return next(0, newImageSize);
	});
}


/**
	Add a watermark to the SourceImage, and save that to the TargetImage
**/
function addWatermark(sourceImage, targetImage, next) {
	var imArgs = []; //imageMagickArgs

	imArgs.push("-compose");
	imArgs.push("multiply");
	imArgs.push("-gravity");
	imArgs.push("SouthWest");
	imArgs.push("-geometry");
	imArgs.push("+5+5");

	findImageSize(sourceImage, function(err, imageSize) {
		if (err) {
			return next(err);
		}

		let watermarkImagePath = global.appRoot + config.path.watermarkImages + "/";
		if (imageSize.width < 600) {
			watermarkImagePath += "captionify_watermark_gray_white_150x50.png";
		} else if (imageSize.width < 1200) {
			watermarkImagePath += "captionify_watermark_gray_white_300x100.png";
		} else if (imageSize.width < 1800) {
			watermarkImagePath += "captionify_watermark_gray_white_450x150.png";
		} else if (imageSize.width < 2400) {
			watermarkImagePath += "captionify_watermark_gray_white_600x200.png";
		} else if (imageSize.width < 3600) {
			watermarkImagePath += "captionify_watermark_gray_white_900x300.png";
		} else if (imageSize.width < 4800) {
			watermarkImagePath += "captionify_watermark_gray_white_1200x400.png";
		} else {
			watermarkImagePath += "captionify_watermark_gray_white_1500x500.png";
		}

		imArgs.push({type: "INPUT_FILE", value: watermarkImagePath});
		imArgs.push({type: "INPUT_FILE", value: sourceImage});
		imArgs.push({type: "OUTPUT_FILE", value: targetImage});

		compositeImage(sourceImage, targetImage, imArgs, next);
	});
}

/**
	Write the given sourceImage to the targetImage after applying the provided
	ImageMagick arguments.  Then, call the next functin with the error (if any),
	or with the path to the final image, along with info on whether there was 
	really any change done.
**/
function writeImage(sourceImage, targetImage, imArgs, next) {
	const timer = logger.startTimer();
	if (imArgs.length > 0) {
		imageProcessor.processImage("convert", targetImage, imArgs, function(err) {
			if (err) {
				next(err, null);
			    timer.done("writeImage, error: sourceImage: " + sourceImage + ", targetImage: " + targetImage + ", imArgs: " + JSON.stringify(imArgs));
			} else {
				next(0, targetImage);
			  	timer.done("writeImage, success: sourceImage: " + sourceImage + ", targetImage: " + targetImage + ", imArgs: " + JSON.stringify(imArgs));
			}
		});
	} else {
		next(0, sourceImage); // no changes done, so just send back the source image
		timer.done("writeImage, no changes: sourceImage: " + sourceImage + ", targetImage: " + targetImage + ", imArgs: " + JSON.stringify(imArgs));
	}
}

/**
	Write the given sourceImage to the targetImage after applying the provided
	ImageMagick arguments.  Then, call the next functin with the error (if any),
	or with the path to the final image, along with info on whether there was 
	really any change done.
**/
function compositeImage(sourceImage, targetImage, imArgs, next) {
	const timer = logger.startTimer();
	if (imArgs.length > 0) {
		imageProcessor.processImage("composite", targetImage, imArgs, function(err) {
			if (err) {
		    	next(err, null);
		    	timer.done("compositeImage, error: sourceImage: " + sourceImage + ", targetImage: " + targetImage + ", imArgs: " + JSON.stringify(imArgs));
		  	} else {
		  		next(0, targetImage);
		  		timer.done("compositeImage, success: sourceImage: " + sourceImage + ", targetImage: " + targetImage + ", imArgs: " + JSON.stringify(imArgs));
		  	}
	  	});
	} else {
		next(0, sourceImage); // no changes done, so just send back the source image
		timer.done("compositeImage, no changes: sourceImage: " + sourceImage + ", targetImage: " + targetImage + ", imArgs: " + JSON.stringify(imArgs));
	}
}

