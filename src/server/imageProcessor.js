var tmp = require("tmp");
var fs = require("fs");
var gm = require("gm").subClass({imageMagick: true});
var dataUtils = require("./dataUtils");

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
	},

		/**
		Apply the given filters on top of the image provided.
		Creates a new image with the steps applied, and passes
		the path to the callback function on success.

		The caller is responsible for disposing of the returned
		image once it has finished processing it.

		filters is an array of this form:

		filters = [
		{
			type: effects,
			effect-type: custom | preset | user-defined,
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

	Set public = true if you want the returned output image path to be publicly accessible
	TODO - figure out how to use the public argument, and how to purge the file if set to public.
	**/
	applyFiltersToImage : function(sourceImage, filters, next) {

		console.log("applyFiltersToImage: imagePath is " + sourceImage);

		var tmp = require('tmp');


		tmp.tmpName(function _tempNameGenerated(err, path) {
    		if (err) throw err;

    		// initialize the image
    		var image = gm(sourceImage);

    		//loop through filters
    		var numFilters = filters.length;
    		for (var i = 0; i < numFilters; i++) {
    			console.log("filters type = " + filters[i].type);
    			if (filters[i].type == "effects") {
    				console.log("filters effectType = " + filters[i].effectType);
    				if (filters[i].effectType == "preset") {
    					console.log("filters preset = " + filters[i].preset);

    					if (filters[i].preset == "grayscale") {
    						image.colorspace("GRAY");
    					}
    					if (filters[i].preset == "paint") {
	    					image.paint(10);
    					}
    					if (filters[i].preset == "mosaic") {
    						image.mosaic();
    					}
    					if (filters[i].preset == "negative") {
    						image.negative();
    					}
    					if (filters[i].preset == "solarize") {
    						image.solarize(50);
    					}
    					if (filters[i].preset == "monochrome") {
    						image.monochrome();
    					}
    					if (filters[i].preset == "swirl") {
    						image.swirl(10);
    					}
    					if (filters[i].preset == "wave") {
    						image.wave(10, 10);
    					}
    					if (filters[i].preset == "spread") {
    						image.spread(5);
    					}
    					if (filters[i].preset == "charcoal") {
    						image.charcoal(5);
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

		next(0, imagePath);
	});

}