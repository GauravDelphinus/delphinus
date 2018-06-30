const dbUtils = require("./dbUtils");
const logger = require("../logger");
const shortid = require("shortid");

/**
	Create a new filter Node in the db with the supplied information in JSON format.

		Returns the id of the newly created node.

		Currently only Preset Filters are supported (see preset.json)

		Format:
		filter: {
			type: "preset",
			preset: "noFilter", etc. (one of the values in presets.json)
		}

		FUTURE CUSTOM OPTIONS:
		Format of JSON: (mapped from 'custom' object in the full JSON sent up by the client)
			filter: {
				settings: {
					brightness: <-100 to 100>,
					contrast: <-100 to 100>,
					hue: <-100 to 100>,
					gamma: <0 to 10>,
					blur : { // Blur the image using the specified radius and optional standard deviation
						type: default | gaussian | motion, // Type of blur.  In case of motion blur, the angle property is used if specified
						radius : <number>,
						sigma : <number>,
						angle: <number> // used only in case of motion blur
					},
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
				effects: {
					charcoal: on | off,
					grayscale: on | off,
					mosaic: on | off,
					monochrome: on | off,
					negative: on | off,
					paint: <radius>,
					solarize: on | off,
					spread: <value>,
					swirl: <value>,
					wave: <size>
				}
			}
	**/
function createFilterNode(filter, callback) {
	if (filter.type == "preset") {
		//preset nodes are created in dbInit.js
		return callback(null, filter.preset);
	} /* future 
	else if (filter.type == "custom") {
		var cypherQuery = "CREATE (f:Filter {";
		var id = shortid.generate();

		if (filter.type == "custom") {
			cypherQuery += " id : '" + id + "' ";
			cypherQuery += ", filter_type : 'custom'";

			if (filter.effects) {
				if (filter.effects.paint) {
					cypherQuery += ", effects_paint : 'on' ";
					cypherQuery += ", effects_paint_radius : " + filter.effects.paint.radius;
				}
				if (filter.effects.grayscale && filter.effects.grayscale == "on") {
					cypherQuery += ", effects_grayscale : 'on' ";
				}
				if (filter.effects.charcoal) {
					cypherQuery += ", effects_charcoal : 'on' ";
					cypherQuery += ", effects_charcoal_factor : " + filter.effects.charcoal.factor;
				}
				if (filter.effects.mosaic && filter.effects.mosaic == "on") {
					cypherQuery += ", effects_mosaic : 'on' ";
				}
				if (filter.effects.negative && filter.effects.negative == "on") {
					cypherQuery += ", effects_negative : 'on' ";
				}
				if (filter.effects.solarize) {
					cypherQuery += ", effects_solarize : 'on' ";
					cypherQuery += ", effects_solarize_threshold : " + filter.effects.solarize.threshold;
				}
				if (filter.effects.monochrome && filter.effects.monochrome == "on") {
					cypherQuery += ", effects_monochrome : 'on' ";
				}
				if (filter.effects.swirl) {
					cypherQuery += ", effects_swirl : 'on' ";
					cypherQuery += ", effects_swirl_degrees : " + filter.effects.swirl.degrees;
				}
				if (filter.effects.wave) {
					cypherQuery += ", effects_wave : 'on' ";
					cypherQuery += ", effects_wave_amplitude : " + filter.effects.wave.amplitude;
					cypherQuery += ", effects_wave_wavelength : " + filter.effects.wave.wavelength;
				}
				if (filter.effects.spread) {
					cypherQuery += ", effects_spread : 'on' ";
					cypherQuery += ", effects_spread_amount : " + filter.effects.spread.amount;
				}
			}

			if (filter.settings) {
				if (filter.settings.brightness) {
					cypherQuery += ", settings_brightness : 'on' ";
					cypherQuery += ", settings_brightness_value : " + filter.settings.brightness.value;
				}
				if (filter.settings.contrast) {
					cypherQuery += ", settings_contrast : 'on' ";
					cypherQuery += ", settings_contrast_value : " + filter.settings.contrast.value;
				}
				if (filter.settings.hue) {
					cypherQuery += ", settings_hue : 'on' ";
					cypherQuery += ", settings_hue_value : " + filter.settings.hue.value;
				}
				if (filter.settings.saturation) {
					cypherQuery += ", settings_saturation : 'on' ";
					cypherQuery += ", settings_saturation_value : " + filter.settings.saturation.value;
				}
			}
		} // TODO - careful about this case.  Can else every happen?  Maybe throw in that case?

		
		/// ADD MORE

		cypherQuery += "}) RETURN f;";

		//console.log("Running cypherQuery: " + cypherQuery);
				
		dbUtils.runQuery(cypherQuery, function(err){
    		if(err) {
    			return callback(err, 0);
    		}

			return callback(null, id);
		});
	} */

	else {
		return callback(new Error("Invalid filter.type value passed to createFilterNode: " + filter.type), 0);
	}
}

/**
	Create decoration node.  Currently only custom decoration (borders) are supported.

	Input format:

	decoration: {
		type: "custom",
		border: {
			width: <width in pixels>
			color: color of border
		}
	}
**/
function createDecorationNode(decoration, callback) {

	if (decoration.type == "preset") {
		//preset node is created in dbInit
		return callback(null, decoration.preset);
	} else if (decoration.type == "custom") {
		var cypherQuery = "CREATE (d:Decoration {";
		var id = shortid.generate();

		cypherQuery += " id : '" + id + "' ";
		cypherQuery += ", decoration_type : 'custom' ";

		if (decoration.border) {
			cypherQuery += ", border : 'on'";
			cypherQuery += ", border_width : '" + decoration.border.width + "'";
			cypherQuery += ", border_color : '" + decoration.border.color + "'";
		}

		cypherQuery += " }) RETURN d;";

		dbUtils.runQuery(cypherQuery, function(err) {
			if (err) {
				return callback(err, 0);
			}

			return callback(null, id);
		});

		return;
	} else {
		return callback(new Error("Invalid decoration.type value passed to createDecorationNode: " + decoration.type), 0);
	}
}

/**
	Create artifact node.  Format:

	//for presets
	artifact: {
		type: "preset",
		preset: "bannerBottom", etc. (one of the values in presets.json)
		banner: {
			caption: <text> //this is only there to allow server to account for caption text when generating image hashes
		}
	}

	//for custom
	artifact: {
		type: "custom",
		banner: {
			fontSize: <number>,
			backgroundColor: #ff00aa, (hex color code)
			textColor: #ff00aa, (hex color code)
			fontName: "arial" (fixed for now)
			location: "bottom", "top", "center", "below", "below", "above"
			caption: <text> //this is only there to allow server to account for caption text when generating image hashes
		}
	}
**/
function createArtifactNode(artifact, callback) {
	if (artifact.type == "preset") {
		return callback(null, artifact.preset);
	} else if (artifact.type == "custom") {
		var cypherQuery = "CREATE (a:Artifact {";

		var id = shortid.generate();

		cypherQuery += " id : '" + id + "' ";
		cypherQuery += ", artifact_type : 'custom' ";

		if (artifact.banner) {
			cypherQuery += ", banner : 'on'";
			cypherQuery += ", banner_location : '" + artifact.banner.location + "'";
			cypherQuery += ", banner_fontSize : '" + artifact.banner.fontSize + "'";
			cypherQuery += ", banner_fontName : '" + artifact.banner.fontName + "'";
			cypherQuery += ", banner_backgroundColor : '" + artifact.banner.backgroundColor + "'";
			cypherQuery += ", banner_textColor : '" + artifact.banner.textColor + "'";
		}

		cypherQuery += "}) RETURN a;";

		dbUtils.runQuery(cypherQuery, function(err) {
			if (err) {
				return callback(err, 0);
			}

			return callback(null, id);
		});

		return;
	} else {
		return callback(new Error("Invalid artifact.type value passed to createArtifactNode: " + artifact.type), 0);
	}
}

/**
	Create layout node.  Format:

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
function createLayoutNode(layout, callback) {
	if (layout.type == "preset") {
		return callback(null, layout.preset);
	} else if (layout.type == "custom") {
		var id = shortid.generate();

		var cypherQuery = "CREATE (l:Layout {";

		if (layout.type == "custom") {
			cypherQuery += " id : '" + id + "' ";
			cypherQuery += ", layout_type : 'custom' ";

			if (layout.mirror) {
				if (layout.mirror == "flip") {
					cypherQuery += ", mirror_flip : 'on'";
				} else if (layout.mirror == "flop") {
					cypherQuery += ", mirror_flop : 'on'";
				}
			}

			if (layout.crop) {
				cypherQuery += ", crop : 'on'";
				cypherQuery += ", crop_x : '" + layout.crop.x + "'";
				cypherQuery += ", crop_y : '" + layout.crop.y + "'";
				cypherQuery += ", crop_width : '" + layout.crop.width + "'";
				cypherQuery += ", crop_height : '" + layout.crop.height + "'";
			}

			if (layout.rotation) {
				cypherQuery += ", rotation : 'on'";
				cypherQuery += ", rotation_degrees : '" + layout.rotation.degrees + "'";
				cypherQuery += ", rotation_color : '" + layout.rotation.color + "'";
			}

			if (layout.shear) {
				cypherQuery += ", shear : 'on'";
				cypherQuery += ", shear_xDegrees : '" + layout.shear.xDegrees + "'";
				cypherQuery += ", shear_yDegrees : '" + layout.shear.yDegrees + "'";
			}
		}

		cypherQuery += "}) RETURN l;";
				
		dbUtils.runQuery(cypherQuery, function(err){
    		if(err) {
    			return callback(err, 0);
    		}

			return callback(null, id);
		});

		return;
	} else {
		return callback(new Error("Invalid layout.type property passed to createLayoutNode: " + layout.type), 0);
	}
}

/**
	Extract the steps from DB
**/
function getEntrySteps(entryId, callback) {
	var cypherQuery = "MATCH (e:Entry {id: '" + entryId + "'})-[u:USES]->(s) RETURN LABELS(s),s ORDER BY u.order;";
	dbUtils.runQuery(cypherQuery, function(err, result){
		if(err) {
			return callback(err, null);
		}

		var steps = {};
		var filters = [], layouts = [], artifacts = [], decorations = [];

		// Now construct the filters array in the JSON format
		for (var i = 0; i < result.data.length; i++) {
			var stepFromDB = result.data[i];

			if (stepFromDB[0][0] == "Filter") {
				var filterFromDB = stepFromDB[1];

				var filter = {};
				filter.effects = {};

				if (filterFromDB.filter_type == "preset") {
					filter.type = "preset";

					filter.preset = filterFromDB.id;

				} /* FUTURE
				else if (filterFromDB.filter_type == "user_defined" || filterFromDB.filter_type == "custom") {
					
					filter.type = filterFromDB.filter_type;

					filter.effects = {};

					if (filterFromDB.effects_paint == "on") {
						filter.effects.paint = {};
						filter.effects.paint.radius = filterFromDB.effects_paint_radius;
					}
					if (filterFromDB.effects_grayscale == "on") {
						filter.effects.grayscale = "on";
					}
					if (filterFromDB.effects_charcoal == "on") {
						filter.effects.charcoal = {};
						filter.effects.charcoal.factor = filterFromDB.effects_charcoal_factor;
					}
					if (filterFromDB.effects_mosaic == "on") {
						filter.effects.mosaic = "on";
					}
					if (filterFromDB.effects_negative == "on") {
						filter.effects.negative = "on";
					}
					if (filterFromDB.effects_solarize == "on") {
						filter.effects.solarize = {};
						filter.effects.solarize.threshold = filterFromDB.effects_solarize_threshold;
					}
					if (filterFromDB.effects_monochrome == "on") {
						filter.effects.monochrome = "on";
					}
					if (filterFromDB.effects_swirl == "on") {
						filter.effects.swirl = {};
						filter.effects.swirl.degrees = filterFromDB.effects_swirl_degrees;
					}
					if (filterFromDB.effects_wave == "on") {
						filter.effects.wave = {};
						filter.effects.wave.amplitude = filterFromDB.effects_wave_amplitude;
						filter.effects.wave.wavelength = filterFromDB.effects_wave_wavelength;
					}
					if (filterFromDB.effects_spread == "on") {
						filter.effects.spread = {};
						filter.effects.spread.amount = filterFromDB.effects_spread_amount;
					}

					// ADD MORE

					filter.settings = {};

					if (filterFromDB.settings_brightness == "on") {
						filter.settings.brightness = { value: filterFromDB.settings_brightness_value};
					}
					if (filterFromDB.settings_hue == "on") {
						filter.settings.hue = { value: filterFromDB.settings_hue_value};
					}
					if (filterFromDB.settings_saturation == "on") {
						filter.settings.saturation = { value: filterFromDB.settings_saturation_value};
					}
					if (filterFromDB.settings_contrast == "on") {
						filter.settings.contrast = { value: filterFromDB.settings_contrast_value};
					}
				} */
				else {
					return next(new Error("Invalid type '" + filterFromDB.filter_type + "' found for filterFromDB.filter_type"), null);
				}

				filters.push(filter);

			} else if (stepFromDB[0][0] == "Layout") {
				var layoutFromDB = stepFromDB[1];

				var layout = {};

				if (layoutFromDB.layout_type == "preset") {
					layout.type = "preset";

					layout.preset = layoutFromDB.id;

				} else if (layoutFromDB.layout_type == "custom") {
					layout.type = "custom";

					if (layoutFromDB.mirror_flip == "on") {
						layout.mirror = "flip";
					} else if (layoutFromDB.mirror_flop == "on") {
						layout.mirror = "flop";
					}

					if (layoutFromDB.crop == "on") {
						layout.crop = {};
						layout.crop.x = parseInt(layoutFromDB.crop_x);
						layout.crop.y = parseInt(layoutFromDB.crop_y);
						layout.crop.width = parseInt(layoutFromDB.crop_width);
						layout.crop.height = parseInt(layoutFromDB.crop_height);
					}

					if (layoutFromDB.rotation == "on") {
						layout.rotation = {};
						layout.rotation.degrees = parseInt(layoutFromDB.rotation_degrees);
						layout.rotation.color = layoutFromDB.rotation_color;
					}

					/* FUTURE
					if (layoutFromDB.shear == "on") {
						layout.shear = {};
						layout.shear.xDegrees = parseInt(layoutFromDB.shear_xDegrees);
						layout.shear.yDegrees = parseInt(layoutFromDB.shear_yDegrees);
					}
					*/
				} else {
					return next(new Error("Invalid type '" + layoutFromDB.layout_type + "' found for layoutFromDB.layout_type"), null);
				}

				layouts.push(layout);

			} else if (stepFromDB[0][0] == "Artifact") {
				var artifactFromDB = stepFromDB[1];

				var artifact = {};

				if (artifactFromDB.artifact_type == "preset") {
					artifact.type = "preset";

					artifact.preset = artifactFromDB.id;			
				} else if (artifactFromDB.artifact_type == "custom") {
					artifact.type = "custom";

					if (artifactFromDB.banner == "on") { //actual banner text is stored in entry.caption
						artifact.banner = {};
						artifact.banner.location = artifactFromDB.banner_location;
						artifact.banner.fontSize = parseInt(artifactFromDB.banner_fontSize);
						artifact.banner.fontName = artifactFromDB.banner_fontName;
						artifact.banner.backgroundColor = artifactFromDB.banner_backgroundColor;
						artifact.banner.textColor = artifactFromDB.banner_textColor;
					}
				} else {
					return next(new Error("Invalid type '" + artifactFromDB.artifact_type + "' found for artifactFromDB.artifact_type"), null);
				}

				artifacts.push(artifact);

			} else if (stepFromDB[0][0] == "Decoration") {
				var decorationFromDB = stepFromDB[1];

				var decoration = {};

				if (decorationFromDB.decoration_type == "preset") {
					decoration.type = "preset";

					decoration.preset = decorationFromDB.id;
				} else if (decorationFromDB.decoration_type == "custom") {
					decoration.type = "custom";

					if (decorationFromDB.border == "on") {
						decoration.border = {};

						decoration.border.width = parseInt(decorationFromDB.border_width);
						decoration.border.color = decorationFromDB.border_color;
					}
				} else {
					return next(new Error("Invalid type '" + decorationFromDB.decoration_type + "' found for decorationFromDB.decoration_type"), null);
				}

				decorations.push(decoration);
			}
			
			if (filters.length > 0) {
				steps.filters = filters;
			}

			if (layouts.length > 0) {
				steps.layouts = layouts;
			}

			if (artifacts.length > 0) {
				steps.artifacts = artifacts;
			}

			if (decorations.length > 0) {
				steps.decorations = decorations;
			}
			
		}

		return callback(0, steps);
	});
}

module.exports = {
	createArtifactNode: createArtifactNode,
	createLayoutNode: createLayoutNode,
	createFilterNode: createFilterNode,
	createDecorationNode: createDecorationNode,
	getEntrySteps: getEntrySteps
};