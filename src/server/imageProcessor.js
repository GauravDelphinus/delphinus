var tmp = require("tmp");
var fs = require("fs");
var gm = require("gm") //.subClass({imageMagick: true});
var dataUtils = require("./dataUtils");
var config = require('./config');

/**
	FORMAT OF JSON SENT UP TO SERVER

	The order of items in the array is important - that's the order in which the steps are applied on the
	image.  Also, the items can fall anywhere and as many times in the array of steps.

	filters = [
		{
			type: effects,
			filter-type: custom | preset | user-defined,
			custom: {
				brightness: <-100 to 100>,
				hue: <0 to 100>,
				gamma: <0 to 10>,
				blur : { // Blur the image using the specified radius and optional standard deviation
					type: default | gaussian | motion, // Type of blur.  In case of motion blur, the angle property is used if specified
					radius : <number>,
					sigma : <number>,
					angle: <number> // used only in case of motion blur
				},
				contrast: <-100 to 100>,
				saturation: <-100 to 100>,
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
			preset: <one of the below>
					- charcoal
					- grayscale
					- mosaic
					- monochrome
					- negative
					- paint
					- solarize
					- spread
					- swirl
					- wave
					- above list subject to review and could add more options after playing with it,
			user-defined: <id>
		},
		{
			type: decoration,
			decoration-type: border,
			//one of decoration types below
			border : { //Draw a border around the image, of the specified dimensions and color
				width : <number>,
				height : <number>,
				color : <color>
			}
		},
		{
			type: artifact,
			artifact-type: banner | callout | freetext,
			banner: {
				position: top | bottom,
				font: {
					font: "font name",
					size: <number>,
					color: <color>,
					strokeWidth: <number>
				},
				text: "text to draw",
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
		},
		{
			type: layout,
			layout-type: size | rotation | crop | mirror | shear,
			//one of the items below
			size: {
				width: <number>,
				height: <number>, (optional)
			},
			rotation: { // Rotate an image by the angle of degrees, and fill the background color with the specified color
				degrees: <number>,
				color: <color>
			},
			crop: { // Crop the image at the given x,y and width,height
				x: <number>,
				y: <number>,
				width: <number>,
				height: <number>
			},
			mirror: flip | flop // Mirror the image vertically (flip) or horizontally (flop),
			shear { // Shear the image
				xDegrees: <number>,
				yDegrees: <number>
			}
		}
	]
**/
/**
	SEQUENCE OF STEPS WOULD HAVE ONE OR MORE OF THE FOLLOWING APPLIED TO THE IMAGE
	IN A SPECIFIC ORDER

	- IMAGE FILTER
	Image Filter comprises of filters that affect the visual quality of the image.  It is a combination
	of applying one or more of the below settings on the image:
		- brightness = -100 to 100 (under "modulate" option in ImageMagick)
		- vibrance
		- hue = 0 to 100 (under "modulate" option in ImageMagick)
		- gamma = 0 to 10 (or give option to specify individually for r, g, b) ("gamma" option in ImageMagick)
		- clip --> Not sure if we need this
		- blur = type, radius, sigma, angle ("blur" option in ImageMagick)
		- contrast = -100 to 100 ("contrast" option in ImageMagick)
		- saturation = -100 to 100 (under "modulate" option in ImageMagick)
		- exposure --> Not sure, does not exist in ImageMagick
		- sepia = on or off ("sepia" option in ImageMagick)
		- noise = type, radius ("noise" option in ImageMagick)
		- sharpen = type, radius, sigma ("sharpen" option in ImageMagick)
		
	Others:
		- despeckle
		- dither
		- edge
		- emboss
		- enhance
		- equalize
		- implode
		- median
		- monochrome
		- colorspace
		- mosaic
		- negative
		- normalize
		- paint
		- raise
		- solarize
		- spread
		- swirl
		- wave


	- SIZE FILTER
		- size
		- rotation
		- crop
		- mirror
		- shear
	
	- DECORATIONS
		- border

	- PREDEFINED IMAGE FILTERS
		- charcoal
		- grayscale
		- mosaic
		- monochrome
		- negative
		- paint
		- solarize
		- spread
		- swirl
		- wave

	- ARTIFACTS AND TEXT
		- text label (top, bottom) - background, foreground
		- callout (text, background, foreground, coordinates)
		- free text (location, text, foreground)
		- etc.

**/
/**
	DESIGN OF IMAGE MANIPULATION "EFFECTS" or "STEPS"

	effects = [
		{
			bitdepth : 8 | 16 // This is the number of bits of color to preserve in the image
		},
		{
			blur : { // Blur the image using the specified radius and optional standard deviation
				type: default | gaussian | motion, // Type of blur.  In case of motion blur, the angle property is used if specified
				radius : <number>,
				sigma : <number>,
				angle: <number> // used only in case of motion blur
				}
		},
		{
			border : { //Draw a border around the image, of the specified dimensions and color
				width : <number>,
				height : <number>,
				color : <color>
			}
		},
		{	// Extract a particular channel from the image
			channel: Red | Green | Blue | Opacity | Matte | Cyan | Magenta | Yellow | Black | Gray
		},
		{	
			charcoal: <factor> // Simulate a charcoal drawing, based on the specified factor
		},
		{
			colorize: { // Colorize the image with optionally separate red, green and blue percentages
				red: <%age>,
				green: <%age>,
				blue: <%age>
			}
		},
		{
			colorspace: CineonLog | CMYK | GRAY | HSL | HWB | OHTA | RGB | ... etc. // Specify the type of colorspace
						// TBD - consider limiting the number of options here
		},
		{
			contrast: <integer> // Increase or decrease the image contrast.  Supports - sign ahead of the value
		},
		{
			crop: { // Crop the image at the given x,y and width,height
				x: <number>,
				y: <number>,
				width: <number>,
				height: <number>
			}
		},
		{
			despeckle : true | false // Reduces the speckles within the image, if true.  No action if false.
		},
		{
			dither : true | false // Apply Floyd/Steinberg error diffusion to the image
		},
		{
			edge : { // Emphasize edges in the image.  Takes an optional radius of the emphasis to apply
				on : true | false,
				radius: <number> (optional)
			}
		},
		{
			emboss: { // Emboss the image, takes an optional radius
				on: true | false,
				radius: <number> (optional)
			}
		},
		{
			enhance: true | false // Apply a digital filter to enhance a noisy image
		},
		{
			equalize: true | false // Perform histogram equalization to the image
		},
		{
			mirror: flip | flop // Mirror the image vertically (flip) or horizontally (flop)
		},
		{
			foreground: <color> // Specify the foreground color
		},
		{
			frame: { // Surround the image with an ornamental border
				width: <number>,
				height: <number>,
				outerBevelWidth: <number>,
				innerBevelWidth: <number>,
				color: <color> // color to use for the frame (mattecolor option)
			}
		},
		{
			gamma: { // Specify level of gamma correction
				red: <number>,
				green: <number>,
				blue: <number>
			}
		},
		{
			implode : <factor> // Implode the image pixels about the center
		},
		{
			magnify : <factor> // Magnify the image by the given factor
		},
		{
			median : { // Apply the median filter on the image
				on : true | false,
				radius : <number> (optional)
			}
		},
		{
			modulate : { // Vary the brightness, saturation and hue of an image
				brightness: <%age>,
				saturation: <%age>,
				hue: <%age>
			}
		},
		{
			monochrome: true | false // Transforms the image into black and white
		},
		{
			mosaic: true | false // Create a mosaic from an image
		},
		{
			negative: true | false // Negate every pixel with a complemantary color
		},
		{
			noise : { // Add or reduce noise in the image.  Expected to result in two commands - first set type, then set Noise radius
				type: uniform | guassian | multiplicative | impulse | laplacian | poisson // Type of noise
				radius: <number> // Radius used to adjust the effect of current noise type
			}
		},
		{
			normalize : true | false // Transform the image to span the full range of color values
		},
		{
			paint : { // Simulate an oil painting.  Each pixel is replaced by the most frequent pixel in the cirle of radius provided
				on : true | false,
				radius : <number>
			}
		},
		{
			raise: { // Create a pseudo 3D raising effect of the images edges
				width: <number>,
				height: <number>
			}
		},
		{
			resize: { // Resize the image to the new proportions.  If height is not specified, aspect ratio is maintained
				width: <number>,
				height: <number>, (optional)
			}
		},
		{
			rotate: { // Rotate an image by the angle of degrees, and fill the background color with the specified color
				degrees: <number>,
				color: <color>
			}
		},
		{
			sepia: true | false // Apply a sepia effect to the image
		},
		{
			sharpen { // Sharpen the given image
				type: default | gaussian,  // gaussian uses the unsharp option)
				radius: <number>,
				sigma : <number> (optional)
			}
		},
		{
			shear { // Shear the image
				xDegrees: <number>,
				yDegrees: <number>
			}
		},
		{
			solarize { // Negate all pixels above threshold percent
				threshold : <%age>
			}
		},
		{
			spread { // Displace image pixels by the specified amount
				amount: <number>
			}
		},
		{
			swirl { // Swirl pixels around the center of the image, degrees specifies the thickness of the swirl
				degrees: <number>
			}
		},
		{
			wave: { // Alter the image along a sine wave
				amplitude: <number>,
				wavelength: <number>
			}
		},
		{
			text: { // Draw text at a specified position on the image
				font: "font name",
				size: <number>,
				color: <color>,
				x: <number>,
				y: <number>,
				string: "text to draw",
				strokeWidth: <number>
			}
		}
	]
**/
module.exports = {

	/**
		Apply the given steps on top of the image provided.
		Creates a new image with the steps applied, and passes
		the path to the callback function on success.

		The caller is responsible for disposing of the returned
		image once it has finished processing it.
	**/
	applyStepsToImage : function(sourceImage, targetImage, steps, next) {
		var tmp = require('tmp');

		//console.log("applyStepsToImage: steps = " + JSON.stringify(steps));
		if (targetImage) {
			applySteps(sourceImage, targetImage, steps, next);
		} else {
			tmp.tmpName(function _tempNameGenerated(err, path) {
    			if (err) throw err;

    			applySteps(sourceImage, path, steps, next);
			});
		}
	},
		
	applyFiltersToImage : function(sourceImage, filters, next) {

		//console.log("applyFiltersToImage: imagePath is " + sourceImage);
		//console.log("filters: " + filters);

		var tmp = require('tmp');


		tmp.tmpName(function _tempNameGenerated(err, path) {
    		if (err) throw err;

    		// initialize the image
    		var image = gm(sourceImage);

    		//loop through filters
    		var numFilters = filters.length;
    		for (var i = 0; i < numFilters; i++) {
    			//console.log("filters type = " + filters[i].type);

    			var filter = filters[i];

    			// NOTE: the filter object sent to the image processor does *not* have the custom/user_defined objects
    			// because all those are normalized/resolved by the time the information reaches the image process.
    			// The image processor expects actual settings, and does not need to worry about where they are coming from.
    			// So the format here skips the custom/preset/user_defined level in the object hierarchy.
    			//console.log("filter is: " + JSON.stringify(filter));
    			if (filter.type == "preset") {
    				applyPresetFilter(image, filter.preset);
    			} else { // check for custom settings
	    			if (filter.settings) {

	    				// Brigthness, Saturation and Hue
	    				if (filter.settings.brightness || filter.settings.saturation || filter.settings.hue) {
	    					var brightness, hue, saturation;
	    					if (filter.settings.brightness) {
	    						// Brightness values are from -100 to 100, 0 meaning no change
	    						// Image Processor expects the values from -200% to 200%, 100% meaning no change
	    						brightness = absoluteToPercentageChangeSigned(filter.settings.brightness.value);
	    					} else {
	    						brightness = 100; // no change, 100%
	    					}

	    					if (filter.settings.saturation) {
	    						saturation = absoluteToPercentageChangeSigned(filter.settings.saturation.value);
	    					} else {
	    						saturation = 100; // no change, 100%
	    					}

	    					if (filter.settings.hue) {
	    						hue = absoluteToPercentageChangeSigned(filter.settings.hue.value);
	    					} else {
	    						hue = 100; // no change, 100%
	    					}

	    					// now, do the thing
	    					//console.log("calling modulate with brightness = " + brightness + ", saturation = " + saturation + ", hue = " + hue);
	    					image.modulate(brightness, saturation, hue);
	    				}
	    		
	    						
	    				// Contrast
	    				if (filter.settings.contrast) {
	    					image.contrast(absoluteToMultiplierSigned(filter.settings.contrast.value));
	    				}
	    						
	    				// ADD MORE
	    			}

	    			if (filter.effects) {
	    				if (filter.effects.paint) {
	    					image.paint(filter.effects.paint.radius);
	    				}
	    				if (filter.effects.grayscale == "on") {
	    					image.colorspace("GRAY");
	    				}
	    				if (filter.effects.mosaic == "on") {
	    					image.mosaic();
	    				}
	    				if (filter.effects.negative == "on") {
	    					image.negative();
	    				}
	    				if (filter.effects.solarize) {
	    					image.solarize(filter.effects.solarize.threshold);
	    				}
	    				if (filter.effects.monochrome == "on") {
	    					image.monochrome();
	    				}
	    				if (filter.effects.swirl) {
	    					image.swirl(filter.effects.swirl.degrees);
	    				}
	    				if (filter.effects.wave) {
	    					image.wave(filter.effects.wave.amplitude, filter.effects.wave.wavelength);
	    				}
	    				if (filter.effects.spread) {
	    					image.spread(filter.effects.spread.amount);
	    				}
	    				if (filter.effects.charcoal) {
	    					image.charcoal(filter.effects.charcoal.factor);
	    				}
	    			}
    			}
			}
			writeImage(image, path, next);
		});
	}
};

function writeImage(image, imagePath, next) {

	image.write(imagePath, function(err) {
		if (err) throw err;

		console.log("next is " + next);
		next(0, imagePath);
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

function absoluteToMultiplierSigned(absoluteValue) {
	if (absoluteValue < -100) {
		absoluteValue = -100;
	} else if (absoluteValue > 100) {
		absoluteValue = 100;
	}

	var multiplierValue = absoluteValue;

	return multiplierValue;
}

function applySteps(sourceImage, targetImage, steps, next) {
	console.log("applySteps, steps = " + JSON.stringify(steps));
	// initialize the image
	var image = gm(sourceImage);
	
	image.size(function (err, size) {
		if (err) throw err;

		if (steps.layouts) {
			applyLayouts(image, size, steps.layouts);
		}

		if (steps.filters) {
			applyFilters(image, size, steps.filters);
		}

		if (steps.artifacts) {
			applyArtifacts(image, size, steps.artifacts);
		}

		if (steps.decorations) {
			applyDecorations(image, size, steps.decorations);
		}

		writeImage(image, targetImage, next);
	});
}
	

/**
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
function applyLayouts (image, size, layouts) {
	//loop through layouts
	var numLayouts = layouts.length;
	for (var i = 0; i < numLayouts; i++) {

		var layout = layouts[i];

		if (layout.type == "preset") {
			applyPresetLayout(image, size, layout.preset);
		} else if (layout.type == "custom") {
			if (layout.size) {
				if (layout.size == "auto") {
					// determine the best size for the image
					// TODO - only call below if the size of the image is bigger than those values
					image.resize(config.image.maxWidth, config.image.maxHeight);
				} else if (layout.size == "custom" && layout.customSize) {
					if (layout.customSize.height) {
						image.resize(layout.customSize.width, layout.customSize.height);
					} else {
						image.resize(layout.customSize.width);
					}
				}
			}

			if (layout.crop) {
				image.crop(layout.crop.width, layout.crop.height, layout.crop.x, layout.crop.y);
			}

			if (layout.mirror) {
				if (layout.mirror == "flop") {
					image.flop();
				}

				if (layout.mirror == "flip") {
					image.flip();
				}
			}

			if (layout.rotation) {
				image.rotate(layout.rotation.color, layout.rotation.degrees);
			}

			if (layout.shear) {
				//image.fill("#00FF00"); TODO - how to set fill background color in case of shear?
				image.shear(layout.shear.xDegrees, layout.shear.yDegrees);
			}
		}
	}
}

/**
	Apply the given filters on top of the image provided.
	
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
function applyFilters (image, size, filters) {

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
			applyPresetFilter(image, size, filter.preset);
		} else if (filter.type == "custom") {
			if (filter.settings) {

				// Brigthness, Saturation and Hue
				if (filter.settings.brightness || filter.settings.saturation || filter.settings.hue) {
					var brightness, hue, saturation;
					if (filter.settings.brightness) {
						// Brightness values are from -100 to 100, 0 meaning no change
						// Image Processor expects the values from -200% to 200%, 100% meaning no change
						brightness = absoluteToPercentageChangeSigned(parseInt(filter.settings.brightness.value));
					} else {
						brightness = 100; // no change, 100%
					}

					if (filter.settings.saturation) {
						saturation = absoluteToPercentageChangeSigned(parseInt(filter.settings.saturation.value));
					} else {
						saturation = 100; // no change, 100%
					}

					if (filter.settings.hue) {
						hue = absoluteToPercentageChangeSigned(parseInt(filter.settings.hue.value));
					} else {
						hue = 100; // no change, 100%
					}

					// now, do the thing
					console.log("calling image.modulate with brightness = " + brightness + ", hue = " + hue + ", saturation = " + saturation);
					image.modulate(brightness, saturation, hue);
				}
		
						
				// Contrast
				if (filter.settings.contrast) {
					image.contrast(absoluteToMultiplierSigned(parseInt(filter.settings.contrast.value)));
				}
					
			// ADD MORE
			}

			if (filter.effects) {
				if (filter.effects.paint) {
					image.paint(filter.effects.paint.radius);
				}
				if (filter.effects.grayscale == "on") {
					image.colorspace("GRAY");
				}
				if (filter.effects.mosaic == "on") {
					console.log("setting image.mosaic");
					image.mosaic();
				}
				if (filter.effects.negative == "on") {
					image.negative();
				}
				if (filter.effects.solarize) {
					image.solarize(filter.effects.solarize.threshold);
				}
				if (filter.effects.monochrome == "on") {
					image.monochrome();
				}
				if (filter.effects.swirl) {
					image.swirl(filter.effects.swirl.degrees);
				}
				if (filter.effects.wave) {
					image.wave(filter.effects.wave.amplitude, filter.effects.wave.wavelength);
				}
				if (filter.effects.spread) {
					image.spread(filter.effects.spread.amount);
				}
				if (filter.effects.charcoal) {
					image.charcoal(filter.effects.charcoal.factor);
				}
			}
		}
		
	}
}

/**
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
function applyArtifacts (image, size, artifacts) {
	//loop through artifacts

	var numArtifacts = artifacts.length;
	
	for (var i = 0; i < numArtifacts; i++) {

		var artifact = artifacts[i];
		console.log("artifact is " + JSON.stringify(artifact));

		if (artifact.type == "preset") {
			var bannerText;
			if (artifact.banner && artifact.banner.text) {
				bannerText = artifact.banner.text;
			}
			applyPresetArtifact(image, size, artifact.preset, bannerText);
		} else if (artifact.type == "custom") {
			if (artifact.banner) {
				var labelHeight = 200; // testing

				image.fontSize(parseInt(artifact.banner.fontSize));
				image.font(artifact.banner.fontName);

				if (artifact.banner.location == "bottom") {
					image.region(size.width, labelHeight, 0, size.height - labelHeight).gravity("Center");

				} else if (artifact.banner.location == "top") {
					image.region(size.width, labelHeight, 0, 0).gravity("Center");
				} else if (artifact.banner.location == "below") {
					image.extent(size.width, size.height + labelHeight);
					image.region(size.width, labelHeight, 0, size.height).gravity("Center");
				} else if (artifact.banner.location == "above") {
					image.extent(size.width, size.height + labelHeight, "+0-" + labelHeight);
					image.region(size.width, labelHeight, 0, 0).gravity("Center");
				}

				// Fill the background
				console.log("calling image.fill with " + artifact.banner.backgroundColor);
				if (artifact.banner.backgroundColor == "transparent") {
					image.fill("none");
				} else {
					image.fill(artifact.banner.backgroundColor);
				}
				image.drawRectangle(0, 0, size.width, size.height);

				// Draw the text
				image.strokeWidth(1);
				image.stroke(artifact.banner.textColor);
				image.drawText(0, 0, artifact.banner.text);
			}
		}
	}
	
}

/**
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
function applyDecorations (image, size, decorations) {
	var numDecorations = decorations.length;

	for (var i = 0; i < numDecorations; i++) {
		var decoration = decorations[i];

		if (decoration.type == "preset") {
			applyPresetDecoration(image, size, decoration.preset);
		} else if (decoration.type == "custom") {
			if (decoration.border) {
				image.borderColor(decoration.border.color);
				image.border(decoration.border.width, decoration.border.width);
			}
		}
	}

}

function applyPresetLayout(image, size, presetLayout) {
	switch (presetLayout) {
		case "rotateClock90White":
			image.rotate("white", 90);
			break;
		case "rotateAnticlock90White":
			image.rotate("white", -90);
			break;
		case "flipVertical":
			image.flip();
			break;
		case "flipHorizontal":
			image.flop();
			break;
		default:
			break;
	}
}

function applyPresetFilter(image, size, presetFilter) {
	//console.log("applyPresetFilter, presetFilter is " + presetFilter + ", config rainyDay is " + config.presetFilter.rainyDay);
	switch (presetFilter) {
		case "rainyDay":
			image.wave(5, 100);
			break;
		case "glassWall":
			image.spread(15);
			break;
		case "nightingale":
			image.colorspace("GRAY");
			image.negative();
			image.monochrome();
			break;
		case "whirlpool":
			image.swirl(360);
			break;
		case "comical":
			image.paint(20);
			image.colorspace("GRAY");
			break;
		default:
			break;
	}
}

function applyPresetArtifact(image, size, presetArtifact, bannerText) {
	var labelHeight = 200; // testing
	image.strokeWidth(1);
	
	switch (presetArtifact) {
		case "bannerBottomWhite":
			image.region(size.width, labelHeight, 0, size.height - labelHeight).gravity("Center");
			image.fill("white");
			image.drawRectangle(0, 0, size.width, size.height);
			image.stroke("black");
			image.drawText(0, 0, bannerText);
			break;
		case "bannerBottomBlack":
			image.region(size.width, labelHeight, 0, size.height - labelHeight).gravity("Center");
			image.fill("black");
			image.drawRectangle(0, 0, size.width, size.height);
			image.stroke("white");
			image.drawText(0, 0, bannerText);
			break;
		case "bannerBottomTransparent":
			image.region(size.width, labelHeight, 0, size.height - labelHeight).gravity("Center");
			image.fill("none");
			image.drawRectangle(0, 0, size.width, size.height);
			image.stroke("black");
			image.drawText(0, 0, bannerText);
			break;
		case "bannerTopWhite":
			image.region(size.width, labelHeight, 0, 0).gravity("Center");
			image.fill("white");
			image.drawRectangle(0, 0, size.width, size.height);
			image.stroke("black");
			image.drawText(0, 0, bannerText);
			break;
		case "bannerTopBlack":
			image.region(size.width, labelHeight, 0, 0).gravity("Center");
			image.fill("black");
			image.drawRectangle(0, 0, size.width, size.height);
			image.stroke("white");
			image.drawText(0, 0, bannerText);
			break;
		case "bannerTopTransparent":
			image.region(size.width, labelHeight, 0, 0).gravity("Center");
			image.fill("none");
			image.drawRectangle(0, 0, size.width, size.height);
			image.stroke("black");
			image.drawText(0, 0, bannerText);
			break;
		default:
			break;
	}
}

function applyPresetDecoration(image, size, presetDecoration) {
	switch (presetDecoration) {
		case "whiteBorder10":
			image.borderColor("white");
			image.border(10, 10);
			break;
		case "blackBorder10":
			image.borderColor("black");
			image.border(10, 10);
			break;
		case "whiteBorder20":
			image.borderColor("white");
			image.border(20, 20);
			break;
		case "blackBorder20":
			image.borderColor("black");
			image.border(20, 20);
			break;
		default:
			break;
	}
}