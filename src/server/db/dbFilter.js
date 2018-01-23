const dbUtils = require("./dbUtils");

/**
		Create a new filter Node in the db with the supplied information in JSON format.

		Returns the id of the newly created node.

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
		return callback(null, filter.preset);
	} else if (filter.type == "custom") {
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
	} else {
		return callback(new Error("Invalid filter.type value passed to createFilterNode: " + filter.type), 0);
	}
}

function createDecorationNode(decoration, callback) {
	if (decoration.type == "preset") {
		return callback(null, decoration.preset);
	} else if (decoration.type == "custom") {
		var cypherQuery = "CREATE (d:Decoration {";
		var id = shortid.generate();

		if (decoration.type == "custom") {
			cypherQuery += " id : '" + id + "' ";
			cypherQuery += ", decoration_type : 'custom' ";

			if (decoration.border) {
				cypherQuery += ", border : 'on'";
				cypherQuery += ", border_width : '" + decoration.border.width + "'";
				cypherQuery += ", border_color : '" + decoration.border.color + "'";
			}
		}

		cypherQuery += " }) RETURN d;";

		//console.log("Running cypherQuery: " + cypherQuery);

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

function createArtifactNode(artifact, callback) {
	if (artifact.type == "preset") {
		return callback(null, artifact.preset);
	} else if (artifact.type == "custom") {
		var cypherQuery = "CREATE (a:Artifact {";

		var id = shortid.generate();

		if (artifact.type == "custom") {
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

module.exports = {
	createArtifactNode: createArtifactNode,
	createLayoutNode: createLayoutNode,
	createFilterNode: createFilterNode,
	createDecorationNode: createDecorationNode
};