var tmp = require("tmp");
var fs = require("fs");
var execFile = require('child_process').execFile;
var execFileSync = require("child_process").execFileSync;
var logger = require("./logger");
var mime = require("mime");
var config = require("./config");

module.exports = {
	applyStepsToImage : function(sourceImage, targetImage, imageType, steps, caption, next) {
		//logger.debug("applyStepsToImage: sourceImage: " + sourceImage + ", targetImage: " + targetImage + ", steps: " + JSON.stringify(steps));
		if (targetImage) {
			if (fs.existsSync(targetImage)) { //check if file already exists in Cache
				return next(0, targetImage);
			} else {
				applySteps(sourceImage, targetImage, steps, caption, next);
			}
		} else {
			tmp.tmpName(function _tempNameGenerated(err, path) {
    			if (err) {
    				return next(err, 0);
    			}
    			
    			applySteps(sourceImage, path + "." + mime.extension(imageType), steps, caption, next);
			});
		}
	},

	findImageSize: findImageSize,

	addWatermarkToImage: function(sourceImage, targetImage, next) {
		addWatermark(sourceImage, targetImage, next);
	},

	compressImage: compressImage
};


function applySteps(sourceImage, targetImage, steps, caption, next) {
	//logger.debug("applySteps: sourceImage: " + sourceImage + ", targetImage: " + targetImage + ", steps: " + JSON.stringify(steps) + ", caption: " + caption);
	//if there are any steps, then apply them one after the other
	if ((steps.layouts && steps.layouts.length > 0) || (steps.filters && steps.filters.length > 0) || 
		(steps.artifacts && steps.artifacts.length > 0) || (steps.decorations && steps.decorations.length > 0)) {
		
		var imArgs = []; //imageMagickArgs
		applyLayouts(sourceImage, steps.layouts, imArgs, function(err, newSourceImage, imageSize) {
			if (err) {
				return next(err, 0);
			}

			if (steps.filters) {
				applyFilters(newSourceImage, steps.filters, imArgs);
			}

			if (steps.artifacts) {
				//Important: applyArtifacts *may* change the size of the image
				applyArtifacts(newSourceImage, imageSize, steps.artifacts, caption, imArgs);
			}

			if (steps.decorations) {
				applyDecorations(newSourceImage, imageSize, steps.decorations, imArgs);
			}

			//insert the source and target images into the arguments list
			imArgs.unshift(newSourceImage);
			imArgs.push(targetImage);
			writeImage(newSourceImage, targetImage, imArgs, next);
		});
	} else {
		//since there weren't any changes, just pass along the original image
		return next(0, sourceImage);
	}
}

/******************************* LAYOUTS *****************************/

/**
	Apply the provided layouts on top of the provided sourceImage
	by updating the ImageMagick arguments list, and then calling
	the next function with the updated image and size (if something
	changed in the layout).

	Typical format of layouts array

	//for preset
	layout: {
		type: "preset",
		preset: "originalLayout", etc. (one of the values in presets.json)
	}

	//for custom
	layout: {
		type: "custom",
		crop: {
			x: <x value of top left coordinate>,
			y: <y value of top left coordinate>,
			width: width in pixels
			height: height in pixels
		}
	}
**/
function applyLayouts (sourceImage, layouts, imArgs, next) {
	//loop through layouts
	var numLayouts = (layouts) ? layouts.length : 0;
	var layoutArgs = [];

	for (var i = 0; i < numLayouts; i++) {

		var layout = layouts[i];

		if (layout.type == "preset") {
			applyPresetLayout(layout.preset, layoutArgs);
		} else if (layout.type == "custom") {
			if (layout.crop) {
				layoutArgs.push("-crop");
				layoutArgs.push(layout.crop.width + "x" + layout.crop.height + "+" + layout.crop.x + "+" + layout.crop.y);
			}

			if (layout.mirror) {
				if (layout.mirror == "flop") {
					layoutArgs.push("-flop");
				}

				if (layout.mirror == "flip") {
					layoutArgs.push("-flip");
				}
			}

			if (layout.rotation) {
				layoutArgs.push("-background");
				layoutArgs.push(layout.rotation.color);
				layoutArgs.push("-rotate");
				layoutArgs.push(layout.rotation.degrees);
			}
		}
	}

	if (layoutArgs.length > 0) {
		//something to layout
		tmp.tmpName(function _tempNameGenerated(err, newSourceImage) {
    		if (err) {
    			return next(err, 0, 0);
    		}

    		layoutArgs.unshift(sourceImage);
    		layoutArgs.push(newSourceImage);
    		writeImage(sourceImage, newSourceImage, layoutArgs, function(err, targetImage, changesDone) {
    			if (err) {
    				return next(err, 0, 0);
    			}

    			if (!changesDone && sourceImage == targetImage) {
    				//get rid of the temp file
    				fs.unlink(newSourceImage, function(err) {
    					if (err) {
    						return next(err, 0, 0);
    					}
    				});
    			}

    			findImageSize(targetImage, function(err, newImageSize) {
    				return next(err, targetImage, newImageSize);
    			});
    		});
    	});
	} else {
		//nothing to layout, so just find the size of original image and pass on to next step
		findImageSize(sourceImage, function(err, imageSize) {
			return next(err, sourceImage, imageSize);
		});
	}
}

/**
	Apply the provided Preset Layout on top of the supplied
	ImageMagick arguments list.

	possible values of preset layotus are in presets.json
**/
function applyPresetLayout(presetLayout, imArgs) {
	switch (presetLayout) {
		case "originalLayout":
			//do nothing;
			break;
		case "rotateClock90White":
			imArgs.push("-rotate");
			imArgs.push(90);
			break;
		case "rotateAnticlock90White":
			imArgs.push("-rotate");
			imArgs.push(-90);
			break;
		case "flipVertical":
			imArgs.push("-flip");
			break;
		case "flipHorizontal":
			imArgs.push("-flop");
			break;
		default:
			break;
	}
}

/**************************************** FILTERS ***************************/

/**
	Apply the given filters on top of the image provided by updating the provided
	ImageMagick arguments list. 
	
	Expected format of input filters

		filter: {
			type: "preset",
			preset: "noFilter", etc. (one of the values in presets.json)
		}
**/
function applyFilters (image, filters, imArgs) {

	//loop through filters
	var numFilters = filters.length;
	for (var i = 0; i < numFilters; i++) {
		//console.log("filters type = " + filters[i].type);

		var filter = filters[i];

		// NOTE: the filter object sent to the image processor does *not* have the custom/preset/user_defined objects
		// because all those are normalized/resolved by the time the information reaches the image process.
		// The image processor expects actual settings, and does not need to worry about where they are coming from.
		// So the format here skips the custom/preset/user_defined level in the object hierarchy.
		//console.log("filter is: " + JSON.stringify(filter));

		if (filter.type == "preset") {
			applyPresetFilter(filter.preset, imArgs);
		}
	}
}

/**
	Apply the provided preset filter on top of the provided
	ImageMagick arguments list.
**/
function applyPresetFilter(presetFilter, imArgs) {
	switch (presetFilter) {
		case "noFilter":
			//do nothing
			break;
		case "rainyDay":
			imArgs.push("-wave");
			imArgs.push("5x100");
			break;
		case "glassWall":
			imArgs.push("-spread");
			imArgs.push(15);
			break;
		case "nightingale":
			imArgs.push("-negate");
			break;
		case "whirlpool":
			imArgs.push("-swirl");
			imArgs.push(360);
			break;
		case "comical":
			imArgs.push("-paint");
			imArgs.push(20);
			break;
		default:
			break;
	}
}

/************************************** ARTIFACTS (BANNERS) **********************/

/**
	Apply the provided artifacts on top of the provided image by updating the
	provided ImageMagick arguments list and the size information.

	Typical form of the artifacts array:
	artifact: {
		type: "preset",
		preset: "bannerBottom", etc. (one of the values in presets.json)
	}

	artifact: {
		type: "custom",
		banner: {
			fontSize: <number>,
			backgroundColor: #ff00aa, (hex color code)
			textColor: #ff00aa, (hex color code)
			fontName: "arial" (fixed for now)
			location: "bottom", "top", "center", "below", "below", "above"
		}
	}
**/
function applyArtifacts (image, size, artifacts, caption, imArgs) {
	//logger.debug("applyArtifacts: artifacts: " + JSON.stringify(artifacts));
	//loop through artifacts

	var numArtifacts = artifacts.length;
	
	for (var i = 0; i < numArtifacts; i++) {

		var artifact = artifacts[i];

		var placement = "south", extent = null;
		if (artifact.type == "preset") {
			if (artifact.preset) {
				if (artifact.preset == "bannerBottom") {
					placement = "south";
				} else if (artifact.preset == "bannerTop") {
					placement = "north";
				} else if (artifact.preset == "bannerCenter") {
					placement = "center";
				} else if (artifact.preset == "bannerAbove") {
					placement = "north";
					extent = "north";
				} else if (artifact.preset == "bannerBelow") {
					placement = "south";
					extent = "south";
				}
			}

			var labelGeometry = calculateLabelGeometry(size, placement, extent);
			applyPresetCaption(imArgs, image, size, caption, placement, extent, labelGeometry);
		} else if (artifact.type == "custom") {
			if (artifact.banner) {
				var placement = "south", extent = null;
				if (artifact.banner.location) {
					if (artifact.banner.location == "bottom") {
						placement = "south";
					} else if (artifact.banner.location == "top") {
						placement = "north";
					} else if (artifact.banner.location == "center") {
						placement = "center";
					} else if (artifact.banner.location == "above") {
						placement = "north";
						extent = "north";
					} else if (artifact.banner.location == "below") {
						placement = "south";
						extent = "south";
					}
				}

				var labelGeometry = calculateLabelGeometry(size, placement, extent);

				var backgroundColor = normalizeColorToIM(artifact.banner.backgroundColor);
				if (artifact.banner.backgroundColor == "transparent") {
					backgroundColor = "none";
				}

				//finally, apply the caption
				applyCaption(imArgs, size, backgroundColor, artifact.banner.textColor, caption, placement, artifact.banner.fontName, extent, labelGeometry);
			}
		}
	}
}

/**
	Apply preset caption and determine the best possible settings
	for the given image

	Possible values of preset are in presets.json
**/
function applyPresetCaption(imArgs, image, size, caption, placement, extent, labelGeometry) {
	//logger.debug("applyPresetCaption: image: " + image + ", size: " + size + ", caption: " + caption + ", labelGeometry: " + JSON.stringify(labelGeometry));
	var backgroundColor = "none";
	var foregroundColor = "black";

	/*
		Background and Foreground color prediction

		If the caption is being placed "in" the image, not below or above,
		meaning the extent is null, the background is defaulted to transparent.

		The foreground is calculated by inverting the "average color" of the section
		of the image where the caption will be placed. (check findAverageColor)

		If the caption is being placed below or above the image, the background
		color is set to the average color of the lower or upper region of the image
		respectively.
	*/
	var averageColor = findAverageColor(image, labelGeometry);
	if (extent) {
		if (averageColor) {
			backgroundColor = "rgb(" + averageColor.r + "," + averageColor.g + "," + averageColor.b + ")";
		}
	} else {
		backgroundColor = "none";
	}

	/*
		Foreground color.  While theoretically the foreground color to pick should be the exact
		inverse of the background color, but in practice, this doesn't work as in many cases the
		colors don't look good to the eye.  So, I've decided to always fall back to either Black or White
		as the foreground color, depending on what shade the inverse of the background color is.
	*/
	if (averageColor) {
		const grayIntensity = ((255 - averageColor.r) * 0.2126 + (255 - averageColor.g) * 0.7152 + (255 - averageColor.b) * 0.0722)/255;
		if (grayIntensity < 0.5) {
			foregroundColor = "black";
		} else {
			foregroundColor = "white";
		}
		//foregroundColor = "rgb(" + (255 - averageColor.r) + "," + (255 - averageColor.g) + "," + (255 - averageColor.b) + ")";
	}

	applyCaption(imArgs, size, backgroundColor, foregroundColor, caption, placement, null, extent, labelGeometry);
}

/**
	Helper function to apply the given caption information on top of the provided
	ImageMagick arguments list.  Be very careful with the order of arguments!
**/
function applyCaption(imArgs, size, background, foreground, caption, placement, fontName, extent, labelGeometry) {
	//extend the image size in case the user has decided to place the banner above or below the image
	if (extent) {
		if (extent == "south") {
			imArgs.push("-gravity");
			imArgs.push("north");
		} else if (extent == "north") {
			imArgs.push("-gravity");
			imArgs.push("south");
		}
		imArgs.push("-extent");
		imArgs.push(size.width + "x" + (size.height + labelGeometry.height));
		
		//change in height
		size.height += labelGeometry.height;
	}

	//push other arguments
	imArgs.push("-background");
	imArgs.push(background);
	imArgs.push("-fill");
	imArgs.push(foreground);

	//font related arguments
	if (fontName) {
		var imFontName = normalizeFontNameToIM(fontName);
		imArgs.push("-font");
		imArgs.push(imFontName);
	}

	//finally, place the caption
	imArgs.push("-gravity");
	imArgs.push("center");
	imArgs.push("-size");
	imArgs.push(labelGeometry.width + "x" + labelGeometry.height);
	imArgs.push("caption:" + caption);
	imArgs.push("-gravity");
	imArgs.push(placement);
	imArgs.push("-composite");
}

/**
	Calculate the geometry/size/locatino of the caption label depending on location of label

	location can be: top, bottom, center, below, above
**/
function calculateLabelGeometry(imageSize, placement, extent) {
	//logger.debug("calculateLabelGeometry: imageSize: " + JSON.stringify(imageSize) + ", placement: " + placement + ", extent: " + extent);
	var left = 0, top = 0;
	var width = imageSize.width * 0.9, height = imageSize.height * 0.2;

	if (placement == "north") {
		left = (imageSize.width - width) / 2;
		top = 0;
	} else if (placement == "south") {
		left = (imageSize.width - width) / 2;
		top = imageSize.height - height;
	} else if (placement == "center") {
		left = (imageSize.width - width) / 2;
		top = (imageSize.height - height) / 2;
	}

	if (extent) { //above or below
		width = imageSize.width; //full width as the background should fill full width for extended image portion
	}

	return {left: Math.round(left), top: Math.round(top), width: Math.round(width), height: Math.round(height)};
}

/********************************** DECORATIONS *******************************/

/**
	Apply the given decorations on top of the given image by pushing new args
	on top of the provided ImageMagick arguments list.

	Typical format of decorations array:

		decoration: {
			type: "custom",
			border: {
				width: <width in pixels>
				color: color of border
			}
		}
**/
function applyDecorations (image, size, decorations, imArgs) {
	//logger.debug("applyDecorations: decorations: " + JSON.stringify(decorations));
	var numDecorations = decorations.length;

	for (var i = 0; i < numDecorations; i++) {
		var decoration = decorations[i];

		if (decoration.type == "preset") {
			applyPresetDecoration(imArgs, size, decoration.preset);
		} else if (decoration.type == "custom") { //currently only support custom decorations (not presets)
			if (decoration.border && decoration.border.width > 0) {
				applyBorder(imArgs, decoration.border.width, decoration.border.color);
			}
		}
	}

}

/**
	Apply the preset decoration on top of the provided ImageMagick
	arguments list.
**/

function applyPresetDecoration(imArgs, size, presetDecoration) {
	let thinBorderWidth = Math.min(size.height / 100, size.width / 100);
	let thickBorderWidth = thinBorderWidth * 3;

	switch (presetDecoration) {
		case "thinBorderBlack":
			applyBorder(imArgs, thinBorderWidth, "black");
			break;
		case "thickBorderBlack":
			applyBorder(imArgs, thickBorderWidth, "black");
			break;
		case "thinBorderGray":
			applyBorder(imArgs, thinBorderWidth, "gray");
			break;
		case "thickBorderGray":
			applyBorder(imArgs, thickBorderWidth, "gray");
			break;
		default:
			break;
	}
}


/**
	Helper function to apply border arguments on top of the 
	given ImageMagick arguments list.
**/
function applyBorder(imArgs, borderWidth, borderColor) {
	imArgs.push("-bordercolor");
	imArgs.push(borderColor);
	imArgs.push("-border");
	imArgs.push(borderWidth);
}


function getCaptionType(imArgs) {
	if (imArgs.indexOf("-extent") > -1) {
		if (imArgs.indexOf("south") > -1) {
			return "#### BELOW ####";
		}
	}

	if (imArgs.indexOf("-extent") > -1) {
		if (imArgs.indexOf("north") > -1) {
			return "$$$$ ABOVE $$$$";
		}
	}

	if (imArgs.indexOf("south") > -1) {
			return "vvvv BOTTOM vvvv";
	}

	if (imArgs.indexOf("north") > -1) {
			return "^^^^ TOP ^^^^";
	}

	return "---- CENTER ----";
}
/****************** Common Helper Functions *****************/

/**
	Write the given sourceImage to the targetImage after applying the provided
	ImageMagick arguments.  Then, call the next functin with the error (if any),
	or with the path to the final image, along with info on whether there was 
	really any change done.
**/
function writeImage(sourceImage, targetImage, imArgs, next) {
	
	logger.debug(getCaptionType(imArgs) + " writeImage, sourceImage: " + sourceImage + ", targetImage: " + targetImage + ", imArgs: " + JSON.stringify(imArgs));
	const timer = logger.startTimer();
	if (imArgs.length > 0) {
		execFile("convert", imArgs, (error, stdout, stderr) => {
			if (error) {
		    	next(error, null);
		    	timer.done(getCaptionType(imArgs) + "writeImage, error: sourceImage: " + sourceImage + ", targetImage: " + targetImage + ", imArgs: " + JSON.stringify(imArgs));
		  	} else {
		  		next(0, targetImage);
		  		timer.done(getCaptionType(imArgs) + "writeImage, success: sourceImage: " + sourceImage + ", targetImage: " + targetImage + ", imArgs: " + JSON.stringify(imArgs));
		  	}
	  	});
	} else {
		next(0, sourceImage); // no changes done, so just send back the source image
		timer.done(getCaptionType(imArgs) + "writeImage, no changes: sourceImage: " + sourceImage + ", targetImage: " + targetImage + ", imArgs: " + JSON.stringify(imArgs));
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
		//logger.debug("calling composite with imArgs: " + JSON.stringify(imArgs));
		execFile("composite", imArgs, (error, stdout, stderr) => {
			//logger.debug("output of composite: error: " + error);
			if (error) {
		    	next(error, null);
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

/**
	Find the average color (RGB) in a section of the image

	NOTE: SYNCHRONOUS CALL!!!!
**/
function findAverageColor(imagePath, labelGeometry) {
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
}

/**
	Find the size of the provided image
**/
function findImageSize(imagePath, next) {
	const timer = logger.startTimer();
	execFile('identify', ["-format", "%Wx%H", imagePath], (error, stdout, stderr) => {
	  	if (error) {
	  		timer.done("findImageSize, error: imagePath: " + imagePath);
	    	return next(error, 0);
	  	}

	  	var sizeArray = stdout.trim().split("x");
	  	var newImageSize = {width: parseInt(sizeArray[0]), height: parseInt(sizeArray[1])};

	  	timer.done("findImageSize, success: imagePath: " + imagePath);
	  	return next(0, newImageSize);
	});
}

/**
	Convert from the -100 to 100 range to a %age change.

	E.g., 0 -> 100%, -100 -> 0%, 100 -> 200%, etc.
**/
function absoluteToPercentageChangeSigned(absoluteValue) {
	if (absoluteValue < -100) {
		absoluteValue = -100;
	} else if (absoluteValue > 100) {
		absoluteValue = 100;
	}

	var percentageChange = absoluteValue + 100;

	return percentageChange;
}

/*
function absoluteToMultiplierSigned(absoluteValue) {
	if (absoluteValue < -100) {
		absoluteValue = -100;
	} else if (absoluteValue > 100) {
		absoluteValue = 100;
	}

	var multiplierValue = absoluteValue;

	return multiplierValue;
}
*/

/*
	Convert color coming in from client to a format that ImageMagick
	recognizes.  Refer https://www.imagemagick.org/script/color.php

	If no match, default to "none" meaning transparent
*/
function normalizeColorToIM(color) {
	var normalizedColor = "none";
	if (color == null || color == undefined || color == "transparent") {
		normalizedColor = "none";
	} else {
		color = color.toLowerCase();

		if (/#[a-f0-9]+/.test(color)) {
			normalizedColor = color.match(/#[a-f0-9]+/);
		} else if (/rgb\([0-9]+, [0-9]+, [0-9]+\)/.test(color)) {
			normalizedColor = color.match(/rgb\([0-9]+, [0-9]+, [0-9]+\)/);
		} else if (/rgba\([0-9]+, [0-9]+, [0-9]+, [0-9]+\.?[0-9]*\)/.test(color)) {
			normalizedColor = color.match(/rgba\([0-9]+, [0-9]+, [0-9]+, [0-9]+\.?[0-9]*\)/);
		}
	}
	
	return normalizedColor;
}

/**
	Convert the passed in font to a font name that is recognized by ImageMagick.
**/
function normalizeFontNameToIM(fontName) {
	fontName = "arial";
	return fontName; // TODO
}

/************************** WATERMARK RELATED ***************************/

/**
	Add a watermark to the SourceImage, and save that to the TargetImage
**/
function addWatermark(sourceImage, targetImage, next) {
	var imArgs = []; //imageMagickArgs

	applyWatermark(imArgs);

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

		imArgs.push(watermarkImagePath);
		imArgs.push(sourceImage);
		imArgs.push(targetImage);

		compositeImage(sourceImage, targetImage, imArgs, next);
	});
}

function applyWatermark(imArgs) {
	imArgs.push("-compose");
	imArgs.push("multiply");
	imArgs.push("-gravity");
	imArgs.push("SouthWest");
	imArgs.push("-geometry");
	imArgs.push("+5+5");
	
}

/**
	Compress the given image to a smaller size as supported by Captionify
**/
function compressImage(before, after, callback) {
	//logger.debug("calling execFile in compressImage");
	const timer = logger.startTimer();	
	execFile('convert', [before, "-resize", config.image.maxWidth + "x" + config.image.maxHeight + "\>", after], (error, stdout, stderr) => {
	  	if (error) {
	  		timer.done("compressImage, error: before: " + before + ", after: " + after);
	    	return callback(error, 0);
	  	}

	  	timer.done("compressImage, success: before: " + before + ", after: " + after);
	  	return callback(0);
	});
}