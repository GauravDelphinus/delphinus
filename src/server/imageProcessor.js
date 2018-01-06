var tmp = require("tmp");
var fs = require("fs");
var execFile = require('child_process').execFile;
var logger = require("./logger");
var mime = require("mime");
var config = require("./config");

module.exports = {
	applyStepsToImage : function(sourceImage, targetImage, imageType, steps, caption, next) {
		//logger.debug("applyStepsToImage: sourceImage: " + sourceImage + ", targetImage: " + targetImage + ", steps: " + JSON.stringify(steps));
		if (targetImage) {
			if (fs.existsSync(targetImage)) {
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
	}
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
				applyDecorations(newSourceImage, steps.decorations, imArgs);
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
	layouts: [
	{		
		// one or more of the items below
		size: {
			width: <number>,
			height: <number>, (optional)
		},
		rotation: { // Rotate an image by the angle of degrees, and fill the background color with the specified color
			degrees: <number>,
			color: <color>
		},
		crop: { // Crop the image at the given x,y and width,height
			width: <number>,
			height: <number>,
			x: <number>,
			y: <number>
		},
		mirror: "flip" | "flop" // Mirror the image vertically (flip) or horizontally (flop),
		shear { // Shear the image
			xDegrees: <number>,
			yDegrees: <number>
		}
	}
	]
**/
function applyLayouts (sourceImage, layouts, imArgs, next) {
	//loop through layouts
	var numLayouts = (layouts) ? layouts.length : 0;
	var layoutArgs = [];

	for (var i = 0; i < numLayouts; i++) {

		var layout = layouts[i];

		if (layout.crop) {
			layoutArgs.push("-crop");
			layoutArgs.push(layout.crop.width + "x" + layout.crop.height + "+" + layout.crop.x + "+" + layout.crop.y);
		}

		if (layout.preset) {
			applyPresetLayout(layout.preset, layoutArgs);
		}

		/* Future support
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

		if (layout.shear) {
			layoutArgs.push("-background");
			layoutArgs.push(layout.shear.color);
			layoutArgs.push("-shear");
			layoutArgs.push(layout.shear.xDegrees + "x" + layout.shear.yDegrees);
		}
		*/
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
**/
function applyPresetLayout(presetLayout, imArgs) {
	switch (presetLayout) {
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

	filters : [
	{
		type : preset | custom  // note: types of 'none' and 'user_defined', which are valid types sent up by the client,
								// will get normalized.  'none' will not reach this function, and 'user_defined' will get
								// converted to a 'custom' filter
	},
	{
		type : preset,
		preset :
				// Exactly one of the following  
				// refer newentry.js - the list below should be in sync with those listed in that file
				rainy_day,
				solaris,
				nightingale,
				red_glory,
				comical
	},
	{
		type : custom,
		effects : {
			
			// One or more of the following

			paint : {
				radius: <value>
			},
			grayscale : "on",
			mosaic : "on",
			negative : "on",
			solarize : {
				threshold : <value>
			},
			monochrome: "on",
			swirl : {
				degrees : <value>
			},
			wave : {
				amplitude : <value>,
				wavelength : <value>
			},
			spread : {
				amount : <value>
			},
			charcoal : {
				factor : <value>
			}
		},
		settings: {

			// One or more of the following

			contrast : {
				value : <value>
			},
			brightness: {
				value : <value>
			},
			hue: {
				value : <value>
			},
			saturation: {
				value : <value>
			}

			// TODO - review options below
			gamma: <0 to 10>,
			blur : { // Blur the image using the specified radius and optional standard deviation
				type: default | gaussian | motion, // Type of blur.  In case of motion blur, the angle property is used if specified
				radius : <number>,
				sigma : <number>,
				angle: <number> // used only in case of motion blur
			},

			sepia: on | off,
			noise : { // Add or reduce noise in the image.  Expected to result in two commands - first set type, then set Noise radius
				type: uniform | guassian | multiplicative | impulse | laplacian | poisson // Type of noise
				radius: <number> // Radius used to adjust the effect of current noise type
			},
			sharpen { // Sharpen the given image
				type: default | gaussian,  // gaussian uses the unsharp option)
				radius: <number>,
				sigma : <number> (optional)
			}
			// consider adding more options from the "Others" list below
		}
	}
	]
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
		} else if (filter.type == "custom") {
			//Antique -------------
			if (filter.grayscale == "on") {
				//image.colorspace("GRAY");
				imArgs.push("-colorspace");
				imArgs.push("Gray");
			}

			if (filter.monochrome == "on") {
				//image.monochrome();
				imArgs.push("-monochrome");
			}

			if (filter.negative == "on") {
				//image.negative();
				imArgs.push("-negate");
			}

			if (filter.solarize) {
				//image.solarize(filter.effects.solarize.threshold);
				imArgs.push("-solarize");
				imArgs.push(filter.solarize.threshold);
			}

			//Distortion --------------
			if (filter.spread) {
				//image.spread(filter.effects.spread.amount);
				imArgs.push("-spread");
				imArgs.push(filter.spread.amount);
			}
			
			if (filter.swirl) {
				//image.swirl(filter.effects.swirl.degrees);
				imArgs.push("-swirl");
				imArgs.push(filter.swirl.degrees);
			}

			if (filter.wave) {
				//image.wave(filter.effects.wave.amplitude, filter.effects.wave.wavelength);
				imArgs.push("-wave");
				imArgs.push(filter.wave.amplitude + "x" + filter.wave.wavelength);
			}
			
			//Artistic -----------------
			if (filter.charcoal) {
				//image.charcoal(filter.effects.charcoal.factor);
				imArgs.push("-charcoal");
				imArgs.push(filter.charcoal.factor);
			}

			if (filter.mosaic == "on") {
				//console.log("setting image.mosaic");
				//image.mosaic();
				imArgs.push("-mosaic");
			}

			if (filter.paint) {
				//image.paint(filter.effects.paint.radius);
				imArgs.push("-paint");
				imArgs.push(filter.paint.radius);
			}

			//Color/Contrast/Brightness
			if (filter.contrast) {
				imArgs.push("-brightness-contrast");
				imArgs.push("0x" + parseInt(filter.contrast.value));
			}

			if (filter.brightness) {
				imArgs.push("-brightness-contrast");
				imArgs.push(parseInt(filter.brightness.value));
			}

			if (filter.hue) {
				imArgs.push("-modulate");
				imArgs.push("100,100," + absoluteToPercentageChangeSigned(parseInt(filter.hue.value)));
			}

			if (filter.saturation) {
				imArgs.push("-modulate");
				imArgs.push("100," + absoluteToPercentageChangeSigned(parseInt(filter.saturation.value)) + ",100");
			}
		}
	}
}

/**
	Apply the provided preset filter on top of the provided
	ImageMagick arguments list.
**/
function applyPresetFilter(presetFilter, imArgs) {
	switch (presetFilter) {
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

	artifacts: [
	{
		banner: {
			position: top | bottom,
			font: {
				font: "font name",
				size: <number>,
				color: <color>,
				strokeWidth: <number>
			},
			text: "text to draw",
			background: <color> // could set opacity to zero for transparent
		},
		callout: {
			position: {
				x: <number>,
				y: <number>,
				width: <number>,
				height: <number>
			},
			font: <same as banner>,
			background: <color>, //allow for transparency
			text: "text to draw"
		},
		freetext: {
			position: <same as callout>,
			font: <same as banner>,
			text: "text to draw",
			background: <color> //allow for transparency
		}
	}
	]
**/
function applyArtifacts (image, size, artifacts, caption, imArgs) {
	//loop through artifacts

	var numArtifacts = artifacts.length;
	
	for (var i = 0; i < numArtifacts; i++) {

		var artifact = artifacts[i];

		logger.debug("artifact.banner: " + JSON.stringify(artifact.banner));
		if (artifact.banner) {
			var placement = "south", extent = null;
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

			var backgroundColor = normalizeColorToIM(artifact.banner.backgroundColor);
			if (artifact.banner.backgroundColor == "transparent") {
				backgroundColor = "none";
			}

			//finally, apply the caption
			applyCaption(imArgs, size, backgroundColor, artifact.banner.textColor, caption, placement, parseInt(artifact.banner.fontSize), artifact.banner.fontName, extent);
		}
	}
}

/**
	Apply the provided preset artifacts on top of the ImageMagick arguments
	list, and use the provided size and bannerText for the same.
**/
function applyPresetArtifact(size, presetArtifact, bannerText, imArgs) {
	switch (presetArtifact) {
		case "bannerBottomWhite":
			applyCaption(imArgs, size, "#FFF8", "black", bannerText, "south");
			break;
		case "bannerBottomBlack":
			applyCaption(imArgs, size, "#0008", "white", bannerText, "south");
			break;
		case "bannerBottomBlackTransparent":
			applyCaption(imArgs, size, "#0000", "black", bannerText, "south");
			break;
		case "bannerBottomWhiteTransparent":
			applyCaption(imArgs, size, "#0000", "white", bannerText, "south");
			break;
		case "bannerTopWhite":
			applyCaption(imArgs, size, "#FFF8", "black", bannerText, "north");
			break;
		case "bannerTopBlack":
			applyCaption(imArgs, size, "#0008", "white", bannerText, "north");
			break;
		case "bannerTopBlackTransparent":
			applyCaption(imArgs, size, "#0000", "black", bannerText, "north");
			break;
		case "bannerTopWhiteTransparent":
			applyCaption(imArgs, size, "#0000", "white", bannerText, "north");
			break;
		case "bannerCenterWhite":
			applyCaption(imArgs, size, "#FFF8", "black", bannerText, "center");
			break;
		case "bannerCenterBlack":
			applyCaption(imArgs, size, "#0008", "white", bannerText, "center");
			break;
		case "bannerCenterBlackTransparent":
			applyCaption(imArgs, size, "#0000", "black", bannerText, "center");
			break;
		case "bannerCenterWhiteTransparent":
			applyCaption(imArgs, size, "#0000", "white", bannerText, "center");
			break;
		default:
			break;
	}
}

/**
	Helper function to apply the given caption information on top of the provided
	ImageMagick arguments list.  Be very careful with the order of arguments!
**/
function applyCaption(imArgs, size, background, foreground, caption, placement, fontSize, fontName, extent) {
	var labelHeight = 200; // TODO

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
		imArgs.push(size.width + "x" + (size.height + labelHeight));
		
		//change in height
		size.height += labelHeight;
	}

	//push other arguments
	imArgs.push("-background");
	imArgs.push(background);
	imArgs.push("-fill");
	imArgs.push(foreground);

	//font related arguments
	if (fontSize) {
		imArgs.push("-pointsize");
		imArgs.push(fontSize);
	}
	if (fontName) {
		var imFontName = normalizeFontNameToIM(fontName);
		imArgs.push("-font");
		imArgs.push(imFontName);
	}

	//finally, place the caption
	imArgs.push("-gravity");
	imArgs.push("center");
	imArgs.push("-size");
	imArgs.push(size.width + "x" + labelHeight);
	imArgs.push("caption:" + caption);
	imArgs.push("-gravity");
	imArgs.push(placement);
	imArgs.push("-composite");
}

/********************************** DECORATIONS *******************************/

/**
	Apply the given decorations on top of the given image by pushing new args
	on top of the provided ImageMagick arguments list.

	Typical format of decorations array:

		decorations: [
		{
			type: border,
			//one of decoration types below
			border : { //Draw a border around the image, of the specified dimensions and color
				width : <number>,
				height : <number>,
				color : <color>
			}
		}
		],
**/
function applyDecorations (image, decorations, imArgs) {
	var numDecorations = decorations.length;

	for (var i = 0; i < numDecorations; i++) {
		var decoration = decorations[i];

		if (decoration.type == "preset") {
			applyPresetDecoration(decoration.preset, imArgs);
		} else if (decoration.type == "custom") {
			if (decoration.border) {
				//image.borderColor(decoration.border.color);
				//image.border(decoration.border.width, decoration.border.width);
				applyBorder(imArgs, decoration.border.width, decoration.border.color);
			}
		}
	}

}

/**
	Apply the preset decoration on top of the provided ImageMagick
	arguments list.
**/
function applyPresetDecoration(presetDecoration, imArgs) {
	switch (presetDecoration) {
		case "whiteBorder10":
			applyBorder(imArgs, 10, "white");
			break;
		case "blackBorder10":
			applyBorder(imArgs, 10, "black");
			break;
		case "whiteBorder20":
			applyBorder(imArgs, 20, "white");
			break;
		case "blackBorder20":
			applyBorder(imArgs, 20, "black");
			break;
		case "grayBorder10":
			applyBorder(imArgs, 10, "gray");
			break;
		case "grayBorder20":
			applyBorder(imArgs, 20, "gray");
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



/****************** Common Helper Functions *****************/

/**
	Write the given sourceImage to the targetImage after applying the provided
	ImageMagick arguments.  Then, call the next functin with the error (if any),
	or with the path to the final image, along with info on whether there was 
	really any change done.
**/
function writeImage(sourceImage, targetImage, imArgs, next) {
	//logger.debug("****************** writeImage, imArgs: " + JSON.stringify(imArgs));
	if (imArgs.length > 0) {
		execFile("convert", imArgs, (error, stdout, stderr) => {
			if (error) {
		    	next(error, null);
		  	} else {
		  		next(0, targetImage);
		  	}
	  	});
	} else {
		next(0, sourceImage); // no changes done, so just send back the source image
	}
}

/**
	Write the given sourceImage to the targetImage after applying the provided
	ImageMagick arguments.  Then, call the next functin with the error (if any),
	or with the path to the final image, along with info on whether there was 
	really any change done.
**/
function compositeImage(sourceImage, targetImage, imArgs, next) {
	if (imArgs.length > 0) {
		logger.debug("calling composite with imArgs: " + JSON.stringify(imArgs));
		execFile("composite", imArgs, (error, stdout, stderr) => {
			logger.debug("output of composite: error: " + error);
			if (error) {
		    	next(error, null);
		  	} else {
		  		next(0, targetImage);
		  	}
	  	});
	} else {
		next(0, sourceImage); // no changes done, so just send back the source image
	}
}



/**
	Find the size of the provided image
**/
function findImageSize(imagePath, next) {
	execFile('identify', ["-format", "%Wx%H", imagePath], (error, stdout, stderr) => {
	  	if (error) {
	    	return next(error, 0);
	  	}

	  	var sizeArray = stdout.trim().split("x");
	  	var newImageSize = {width: parseInt(sizeArray[0]), height: parseInt(sizeArray[1])};

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