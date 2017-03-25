var config = require('./config');

module.exports = {

	/**
		Given an Entry ID, return the corresponding
		Challenge ID that this entry belongs to.
		Return -1 in case of error
	**/
	getChallengeForEntry : function(db, entryId) {

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

	    		// Now, get the filters attached to this image

				var cypherQuery = "MATCH (e:Entry)-[u:USES]->(f:Filter) WHERE id(e) = " + entryId + " RETURN f ORDER BY u.order;";

				db.cypherQuery(cypherQuery, function(err, result){
	    			if(err) throw err;

	    			console.log(result.data); // delivers an array of query results

	    			var filtersFromDB = result.data;
	    			var filters = [];

	    			// Now construct the filters array in the JSON format
	    			for (var i = 0; i < filtersFromDB.length; i++) {
	    				var filterFromDB = filtersFromDB[i];
	    				var filter = {};
	    				filter.effects = {};

	    				if (filterFromDB.effects_type == "none") {
	    		
	    					filter.effects.type = "none";
	    				} else if (filterFromDB.effects_type == "preset") {
	    					filter.effects.type = "preset";

	    					if (filterFromDB.effects_preset == "paint") {
	    						filter.effects.preset = "paint";
	    						filter.effects.paint = {};
	    						filter.effects.paint.radius = filterFromDB.effects_paint_radius;
	    					} else if (filterFromDB.effects_preset == "grayscale") {
	    						filter.effects.preset = "grayscale";
	    					} else if (filterFromDB.effects_preset == "charcoal") {
	    						filter.effects.preset = "charcoal";
	    						filter.effects.charcoal = {};
	    						filter.effects.charcoal.factor = filterFromDB.effects_charcoal_factor;
	    					} else if (filterFromDB.effects_preset == "mosaic") {
	    						filter.effects.preset = "mosaic";
	    					} else if (filterFromDB.effects_preset == "negative") {
	    						filter.effects.preset = "negative";
	    					} else if (filterFromDB.effects_preset == "solarize") {
	    						filter.effects.preset = "solarize";
	    						filter.effects.solarize = {};
	    						filter.effects.solarize.threshold = filterFromDB.effects_solarize_threshold;
	    					} else if (filterFromDB.effects_preset == "monochrome") {
	    						filter.effects.preset = "monochrome";
	    					} else if (filterFromDB.effects_preset == "swirl") {
	    						filter.effects.preset = "swirl";
	    						filter.effects.swirl = {};
	    						filter.effects.swirl.degrees = filterFromDB.effects_swirl_degrees;
	    					} else if (filterFromDB.effects_preset == "wave") {
	    						filter.effects.preset = "wave";
	    						filter.effects.wave = {};
	    						filter.effects.wave.amplitude = filterFromDB.effects_wave_amplitude;
	    						filter.effects.wave.wavelength = filterFromDB.effects_wave_wavelength;
	    					} else if (filterFromDB.effects_preset == "spread") {
	    						filter.effects.preset = "spread";
	    						filter.effects.spread = {};
	    						filter.effects.spread.amount = filterFromDB.effects_spread_amount;
	    					}

	    					// ADD MORE
	    				} 

	    				filter.settings = {};
	    				filter.settings.brightness = filterFromDB.settings_brightness;
	    				filter.settings.hue = filterFromDB.settings_hue;
	    				filter.settings.saturation = filterFromDB.settings_saturation;
	    				filter.settings.contrast = filterFromDB.settings_contrast;
	    			

	   					// ADD MORE

	    				filters.push(filter);
	    			}

	    			next(0, { "image" : imagePath, "filters" : filters});
	    	});

		});

	},

	/**
		Normalize / expand the filters array such that all indirect references
		(such as filter node ids, etc.) are resolved to actual settings that can 
		be processed by the Image Processor.
	**/
	normalizeFilters: function (filters, next) {
		next(0, filters);
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

		if (filter.effects.type == "none") {
			cypherQuery += " effects_type : 'none' ";
		} else if (filter.effects.type == "preset") {
			cypherQuery += " effects_type : 'preset'";

			if (filter.effects.preset == "paint") {
				cypherQuery += ", effects_preset : 'paint' ";
				cypherQuery += ", effects_paint_radius : " + filter.effects.paint.radius;
			} else if (filter.effects.preset == "grayscale") {
				cypherQuery += ", effects_preset : 'grayscale' ";
			} else if (filter.effects.preset == "charcoal") {
				cypherQuery += ", effects_preset : 'charcoal' ";
				cypherQuery += ", effects_charcoal_factor : " + filter.effects.charcoal.factor;
			} else if (filter.effects.preset == "mosaic") {
				cypherQuery += ", effects_preset : 'mosaic' ";
			} else if (filter.effects.preset == "negative") {
				cypherQuery += ", effects_preset : 'negative' ";
			} else if (filter.effects.preset == "solarize") {
				cypherQuery += ", effects_preset : 'solarize' ";
				cypherQuery += ", effects_solarize_threshold : " + filter.effects.solarize.threshold;
			} else if (filter.effects.preset == "monochrome") {
				cypherQuery += ", effects_preset : 'monochrome' ";
			} else if (filter.effects.preset == "swirl") {
				cypherQuery += ", effects_preset : 'swirl' ";
				cypherQuery += ", effects_swirl_degrees : " + filter.effects.swirl.degrees;
			} else if (filter.effects.preset == "wave") {
				cypherQuery += ", effects_preset : 'wave' ";
				cypherQuery += ", effects_wave_amplitude : " + filter.effects.wave.amplitude;
				cypherQuery += ", effects_wave_wavelength : " + filter.effects.wave.wavelength;
			} else if (filter.effects.preset == "spread") {
				cypherQuery += ", effects_preset : 'spread' ";
				cypherQuery += ", effects_spread_amount : " + filter.effects.spread.amount;
			}
			
		} // TODO - careful about this case.  Can else every happen?  Maybe throw in that case?

		if (filter.settings) {
			cypherQuery += ", settings_brightness : " + ((filter.settings.brightness) ? (filter.settings.brightness) : (0));
			cypherQuery += ", settings_contrast : " + ((filter.settings.contrast) ? (filter.settings.contrast) : (0));
			cypherQuery += ", settings_hue : " + ((filter.settings.hue) ? (filter.settings.hue) : (0));
			cypherQuery += ", settings_saturation: " + ((filter.settings.saturation) ? (filter.settings.saturation) : (0));
		}
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

	createArtifactNode : function(db, artifactJSON) {

	},

	createLayoutNode : function(db, layoutJSON) {

	}

}