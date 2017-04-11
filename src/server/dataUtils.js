var config = require('./config');

module.exports = {

	/**
		Given an Entry ID, return the corresponding
		Challenge ID that this entry belongs to.
		calls the function next with an err and the challengeId
	**/
	getChallengeForEntry : function(db, entryId, next) {
		var fetchChallengeQuery = "MATCH (c:Challenge)<-[:PART_OF]-(e:Entry) WHERE id(e) = " + entryId + " RETURN id(c);"
		db.cypherQuery(fetchChallengeQuery, function(err, result){
	    		if (err) {
	    			next(err, -1);
	    			return;
	    		}

	    		var challengeId = parseInt(result.data[0]);

	    		next(0, challengeId);
	    });
	},

		/**
		Given an Challenge ID, fetch the details of the image
		that was posted for that challenge.  This includes:
		- Name of the image (random name stored under /data/challenges/images/<name>)
		- Image Type (as originally posted - eg. jpeg, gif, png, etc.)

		Calls the function in the last argument with 3 parameters - err, imageName and imageType.
	**/
	getImageDataForChallenge : function(db, challengeId, next) {
		var cypherQuery = "MATCH (c:Challenge) WHERE id(c) = " + challengeId + " RETURN c.imageType, c.image;";

		console.log("cypherQuery is " + cypherQuery);
		db.cypherQuery(cypherQuery, function(err, result){
	    	if(err) throw err;

	    	var row = result.data[0].toString();
	    	console.log("row is " + row);
	    	var dataArray = row.split(",");
	    	var imageType = dataArray[0];
	    	var image = dataArray[1];

	    	next(0, image, imageType);
		});

	},

	/**
		Given an Entry ID, fetch the details of the image
		that forms this entry.  This includes:
		- Original Image from the Challenge
		- List of steps to be performed on the image

		Returns an object of this form:
		{
			imagePath : "/path/to/original/image/from/server/root",
			steps : "steps to perform"
		}
	**/
	getImageDataForEntry : function(db, entryId, next) {

		// First get the original image from the challenge
		var fetchChallengeQuery = "MATCH (c:Challenge)<-[:PART_OF]-(e:Entry) WHERE id(e) = " + entryId + " RETURN c.image;"
		db.cypherQuery(fetchChallengeQuery, function(err, output){
	    		if (err) throw err;

	    		console.log(output.data);
	    		var image = output.data[0];
	    		var imagePath = global.appRoot + config.path.challengeImages + image;

	    		console.log("Image is " + imagePath);

	    		// Now, get the steps attached to this image

				var cypherQuery = "MATCH (e:Entry)-[u:USES]->(s) WHERE id(e) = " + entryId + " RETURN LABELS(s),s ORDER BY u.order;";

				db.cypherQuery(cypherQuery, function(err, result){
	    			if(err) throw err;

	    			console.log(result.data); // delivers an array of query results

	    			var stepsFromDB = result.data;
	    			var steps = {};
	    			var filters = [], layouts = [], artifacts = [], decorations = [];

	    			// Now construct the filters array in the JSON format
	    			for (var i = 0; i < stepsFromDB.length; i++) {
	    				var stepFromDB = stepsFromDB[i];

	    				if (stepFromDB[0][0] == "Filter") {
	    					var filterFromDB = stepFromDB[1];

	    					var filter = {};
		    				filter.effects = {};

		    				if (filterFromDB.filter_type == "none") {
		    		
		    					// shouldn't happen
		    					throw err;
		    				} else if (filterFromDB.filter_type == "preset") {
		    					filter.type = "preset";

		    					filter.preset = filterFromDB.preset;

		    				} else if (filterFromDB.filter_type == "user_defined" || filterFromDB.filter_type == "custom") {
		    					
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
		    				} 

		    				filters.push(filter);

	    				} else if (stepFromDB[0][0] == "Layout") {
	    					var layoutFromDB = stepFromDB[1];

	    					var layout = {};

		    				if (layoutFromDB.layout_type == "none") {
		    		
		    					// shouldn't happen
		    					throw err;
		    				} else if (layoutFromDB.layout_type == "preset") {
		    					layout.type = "preset";

		    					layout.preset = layoutFromDB.preset;

		    				} else if (layoutFromDB.layout_type == "user_defined" || layoutFromDB.layout_type == "custom") {
		    					
		    					layout.type = layoutFromDB.layout_type;

		    					if (layoutFromDB.mirror_flip == "on") {
		    						layout.mirror = "flip";
		    					} else if (layoutFromDB.mirror_flop == "on") {
		    						layout.mirror = "flop";
		    					}
		    				}

		    				layouts.push(layout);

	    				} else if (stepFromDB[0][0] == "Artifact") {
	    					var artifactFromDB = stepFromDB[1];

	    					var artifact = {};

	    					if (artifactFromDB.artifact_type == "none") {
	    						// shouldn't happen
	    						throw err;
	    					} else if (artifactFromDB.artifact_type == "preset") {
	    						artifact.type = "preset";

	    						artifact.preset = artifactFromDB.preset;
	    					} else if (artifactFromDB.artifact_type == "user_defined" || artifactFromDB.artifact_type == "custom") {
	    						artifact.type = artifactFromDB.artifact_type;

	    						if (artifactFromDB.banner == "on") {
	    							artifact.banner = {};
	    							artifact.banner.text = artifactFromDB.banner_text;
	    							artifact.banner.location = artifactFromDB.banner_location;
	    						}
	    					}

	    					artifacts.push(artifact);

	    				} else if (stepFromDB[0][0] == "Decoration") {

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

	    			next(0, { "image" : imagePath, "steps" : steps});
	    	});

		});

	},

	/**
		Normalize / expand the steps array such that all indirect references
		(such as filter node ids, etc.) are resolved to actual settings that can 
		be processed by the Image Processor.
	**/
	normalizeSteps: function (steps, next) {
		next(0, steps);
	},

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
	createFilterNode : function(db, filter, callback) {
		var cypherQuery = "CREATE (f:Filter {";

		if (filter.type == "none") {
			// There's no need to create a filter node in this case.
			// This shouldn't be called, and should get handled by caller
			throw err;
		} else if (filter.type == "user_defined") {
			callback(null, parseInt(filter.user_defined));
			return;
		}


		if (filter.type == "preset") {
			cypherQuery += " filter_type : 'preset' ";

			cypherQuery += ", filter_preset : '" + filter.preset + "' ";
		} else if (filter.type == "custom") {
			cypherQuery += " filter_type : 'custom'";

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

		console.log("Running cypherQuery: " + cypherQuery);
				
		db.cypherQuery(cypherQuery, function(err, result){
    		if(err) throw err;

    		console.log(result.data[0]); // delivers an array of query results

    		var filterID = result.data[0]._id;
			callback(null, filterID);
		});
	},

	createDecorationNode : function(db, decorationJSON) {

	},

	createArtifactNode : function(db, artifact, callback) {
		console.log("createArtifactNode: artifact = " + JSON.stringify(artifact));
		var cypherQuery = "CREATE (a:Artifact {";

		if (artifact.type == "none") {
			throw err; // shouldn't happen
		} else if (artifact.type == "user_defined") {
			callback(null, parseInt(artifact.user_defined));
			return;
		}

		if (artifact.type == "custom") {
			cypherQuery += " artifact_type : 'custom' ";

			if (artifact.banner) {
				cypherQuery += ", banner : 'on'";
				cypherQuery += ", banner_text : '" + artifact.banner.text + "'";

				cypherQuery += ", banner_location : '" + artifact.banner.location + "'";
			}
		}

		cypherQuery += "}) RETURN a;";

		console.log("Running cypherQuery: " + cypherQuery);

		db.cypherQuery(cypherQuery, function(err, result) {
			if (err) throw err;

			console.log(result.data[0]);

			var artifactId = result.data[0]._id;
			callback(null, artifactId);
		});
	},

	createLayoutNode : function(db, layout, callback) {
		var cypherQuery = "CREATE (l:Layout {";

		if (layout.type == "none") {
			// There's no need to create a layout node in this case.
			// This shouldn't be called, and should get handled by caller
			throw err;
		} else if (layout.type == "user_defined") {
			callback(null, parseInt(layout.user_defined));
			return;
		}

		if (layout.type == "custom") {
			cypherQuery += " layout_type : 'custom' ";

			if (layout.mirror) {
				if (layout.mirror == "flip") {
					cypherQuery += ", mirror_flip : 'on'";
				} else if (layout.mirror == "flop") {
					cypherQuery += ", mirror_flop : 'on'";
				}
			}
		}

		cypherQuery += "}) RETURN l;";

		console.log("Running cypherQuery: " + cypherQuery);
				
		db.cypherQuery(cypherQuery, function(err, result){
    		if(err) throw err;

    		console.log(result.data[0]); // delivers an array of query results

    		var layoutID = result.data[0]._id;
			callback(null, layoutID);
		});
	}

}