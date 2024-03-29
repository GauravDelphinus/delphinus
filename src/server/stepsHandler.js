var tmp = require("tmp");
var fs = require("fs");

var logger = require("./logger");
var mime = require("mime");
var config = require("./config");
var request = require("request");
var serverUtils = require("./serverUtils");
var async = require("async");
var imageHandler = require("./imageHandler");

var functions = {
	applySteps: applySteps
};

for (var key in functions) {
	module.exports[key] = functions[key];
}


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

			imArgs.unshift({type: "INPUT_FILE", value: newSourceImage});
    		imArgs.push({type: "OUTPUT_FILE", value: targetImage});
			imageHandler.writeImage(newSourceImage, targetImage, imArgs, next);
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

    		layoutArgs.unshift({type: "INPUT_FILE", value: sourceImage});
    		layoutArgs.push({type: "OUTPUT_FILE", value: newSourceImage});
    		imageHandler.writeImage(sourceImage, newSourceImage, layoutArgs, function(err, targetImage, changesDone) {
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

    			imageHandler.findImageSize(targetImage, function(err, newImageSize) {
    				return next(err, targetImage, newImageSize);
    			});
    		});
    	});
	} else {
		//nothing to layout, so just find the size of original image and pass on to next step
		imageHandler.findImageSize(sourceImage, function(err, imageSize) {
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
	var averageColor = imageHandler.findAverageColor(image, labelGeometry);
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

/****************** Common Helper Functions *****************/


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


