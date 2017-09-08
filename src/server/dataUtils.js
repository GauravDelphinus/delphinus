var config = require('./config');
var presets = require("./presets");
var categories = require("./categories");
var shortid = require("shortid");
var fs = require("fs");
var mime = require("mime");

module.exports = {

	myDB: null,

	initializeDB : function(db) {
		myDB = db;

		//enumerate preset filters and create the nodes if not present

		for (var key in presets.presetLayout) {
			var id = key;
			var presetLayoutName = presets.presetLayout[key];

			var cypherQuery = "MERGE (l:Layout {id: '" + id + "'}) ON CREATE SET l.name = '" + presetLayoutName + "', l.layout_type = 'preset' RETURN l;";

			//console.log("INIT DB Running cypherQuery: " + cypherQuery);
				
			db.cypherQuery(cypherQuery, function(err, result){
				if(err) {
					logger.dbError(err, cypherQuery);
				}
			});
		}
		for (var key in presets.presetFilter) {
			var id = key;
			var presetFilterName = presets.presetFilter[key];

			var cypherQuery = "MERGE (f:Filter {id: '" + id + "'}) ON CREATE SET f.name = '" + presetFilterName + "', f.filter_type = 'preset' RETURN f;";

			//console.log("INIT DB Running cypherQuery: " + cypherQuery);
				
			db.cypherQuery(cypherQuery, function(err, result){
				if(err) {
					logger.dbError(err, cypherQuery);
				}
			});
		}
		for (var key in presets.presetArtifact) {
			var id = key;
			var presetArtifactName = presets.presetArtifact[key];

			var cypherQuery = "MERGE (a:Artifact {id: '" + id + "'}) ON CREATE SET a.name = '" + presetArtifactName + "', a.artifact_type = 'preset' RETURN a;";

			//console.log("INIT DB Running cypherQuery: " + cypherQuery);
				
			db.cypherQuery(cypherQuery, function(err, result){
				if(err) {
					logger.dbError(err, cypherQuery);
				}
			});
		}
		for (var key in presets.presetDecoration) {
			var id = key;
			var presetDecorationName = presets.presetDecoration[key];

			var cypherQuery = "MERGE (d:Decoration {id: '" + id + "'}) ON CREATE SET d.name = '" + presetDecorationName + "', d.decoration_type = 'preset' RETURN d;";

			//console.log("INIT DB Running cypherQuery: " + cypherQuery);
				
			db.cypherQuery(cypherQuery, function(err, result){
				if(err) {
					logger.dbError(err, cypherQuery);
				}
			});
		}

		//enumerate and create nodes for the categories and subcategories
		for (var key in categories) {
			var id = key;
			var categoryValue = categories[key];

			createNodesForCategory(null, key, categories[key]);
		}
	},

	getDB : function() {
		return myDB;
	},



	/**
		Given an Entry ID, return the corresponding
		Challenge ID that this entry belongs to.
		calls the function next with an err and the challengeId
	**/
	getChallengeForEntry : function(entryId, next) {
		var fetchChallengeQuery = "MATCH (c:Challenge)<-[:PART_OF]-(e:Entry {id: '" + entryId + "'}) RETURN c.id;"
		myDB.cypherQuery(fetchChallengeQuery, function(err, result){
	    		if (err) {
	    			next(err, -1);
	    			return;
	    		}

	    		var challengeId = result.data[0];

	    		next(0, challengeId);
	    });
	},

	/**
		Given an Challenge ID, fetch the meta data related to the challenge.
	**/
	getMetaDataForChallenge : function(challengeId, next) {
		var constructMetaData = this.constructMetaData;
		
		var cypherQuery = "MATCH (c:Challenge {id: '" + challengeId + "'})-[:POSTED_BY]->(poster:User) RETURN c, poster;";

		myDB.cypherQuery(cypherQuery, function(err, result){
	    	if(err) {
	    		return next(err, null);
	    	} else if (result.data.length <= 0) {
	    		return next(new Error("Database returned no results."), null);
	    	}

	    	var data = constructMetaData("challenge", result.data[0][0], result.data[0][1]);

		    return next(0, data);
		});

	},

	/**
		Given an Category ID, fetch the meta data related to the category.
	**/
	getMetaDataForCategory : function(categoryId, next) {
		var constructMetaData = this.constructMetaData;
		if (categoryId != undefined) {
			var cypherQuery = "MATCH (c:Category {id: '" + categoryId + "'}) RETURN c;";

			myDB.cypherQuery(cypherQuery, function(err, result){
				if(err) {
		    		return next(err, null);
		    	} else if (result.data.length <= 0) {
		    		return next(new Error("Database returned no results."), null);
		    	}

		    	var data = constructMetaData("category", result.data[0], null);

			    return next(0, data);
			});
		} else {
			var data = this.constructMetaData("category", null, null);
			return next (0, data);
		}
	},

	/**
		Given an Entry ID, fetch the meta data related to the Entry.
	**/
	getMetaDataForEntry : function(entryId, next) {
		var constructMetaData = this.constructMetaData;
		var cypherQuery = "MATCH (e:Entry {id: '" + entryId + "'}) MATCH (c:Challenge)<-[:PART_OF]-(e)-[:POSTED_BY]->(poster:User) RETURN e, poster, c;";

		myDB.cypherQuery(cypherQuery, function(err, result){
			if(err) {
	    		return next(err, null);
	    	} else if (result.data.length <= 0) {
	    		return next(new Error("Database returned no results."), null);
	    	}

	    	var data = constructMetaData("entry", result.data[0][0], result.data[0][1], result.data[0][2]);

		    return next(0, data);
		});

	},

	constructMetaData: function(entityType, entity, poster, challenge) {

		var data = {
			fbAppId: config.social.facebook.clientID,
			publisherName : config.branding.siteName
		};

		if (entityType == "challenge") {
			data.id = entity.id;
			data.imageURL = config.hostname + config.url.challengeImages + entity.id + "." + mime.extension(entity.image_type);
			data.pageTitle = entity.title + " - " + config.branding.siteName;
			data.pageURL = config.hostname + config.url.challenge + entity.id;
			data.pageDescription = "Challenge posted";
			data.imageType = entity.image_type;
			data.imageWidth = entity.image_width;
			data.imageHeight = entity.image_height;
			data.authorName = poster.displayName;
		} else if (entityType == "entry") {
			data.id = entity.id;
			data.imageURL = config.hostname + config.url.entryImages + entity.id  + "." + mime.extension(entity.image_type);
			data.pageTitle = entity.caption + " - " + config.branding.siteName;
			data.pageURL = config.hostname + config.url.entry + entity.id;
			data.pageDescription = "Entry posted";
			data.challengeId = challenge.id;
			data.imageType = challenge.image_type; //entry retains format of the challenge
			data.imageWidth = entity.image_width;
			data.imageHeight = entity.image_height;
			data.authorName = poster.displayName;
		} else if (entityType == "category") {
			data.imageURL = config.hostname + config.url.brandImages + config.branding.shareImage.imageName;
			data.imageType = config.branding.shareImage.imageType;
			data.imageWidth = config.branding.shareImage.imageWidth;
			data.imageHeight = config.branding.shareImage.imageHeight;

			if (entity) {
				data.id = entity.id;
				data.pageTitle = "Challenges under " + entity.name + " - " + config.branding.siteName;
				data.pageURL = config.hostname + config.url.challenges + "?category=" + entity.id;
				data.pageDescription = "Challenge posted under " + entity.name;
			} else {
				data.pageTitle = "All Challenges" + " - " + config.branding.siteName;
				data.pageURL = config.hostname + config.url.challenges;
				data.pageDescription = "All Challenges Posted";
			}
			
			data.authorName = config.branding.siteName;
		} else if (entityType == "home") { //home page or other generic pages
			data.pageURL = config.hostname;
			data.pageTitle = config.branding.siteTitle + " - " + config.branding.siteName;
			data.pageDescription = config.branding.siteDescription;
			data.imageURL = config.hostname + config.url.brandImages + config.branding.shareImage.imageName;
			data.imageType = config.branding.shareImage.imageType;
			data.imageWidth = config.branding.shareImage.imageWidth;
			data.imageHeight = config.branding.shareImage.imageHeight;

			data.authorName = config.branding.siteName;
		}
		
		return data;
	},

	getImageDataForChallenge : function(challengeId, next) {
		var fetchChallengeQuery = "MATCH (c:Challenge {id: '" + challengeId + "'}) RETURN c;"
		myDB.cypherQuery(fetchChallengeQuery, function(err, output){
	    	if (err) {
	    		return next(err, null);
	    	}

	    	var c = output.data[0];
	    	var imageData = {};
	    	imageData.imageType = c.image_type;
	    	imageData.imageWidth = c.image_width;
	    	imageData.imageHeight = c.image_height;

	    	return next(0, imageData);
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
	getImageDataForEntry : function(entryId, next) {

		// First get the original image from the challenge
		var fetchChallengeQuery = "MATCH (c:Challenge)<-[:PART_OF]-(e:Entry {id: '" + entryId + "'}) RETURN c.id, c.image_type;"
		myDB.cypherQuery(fetchChallengeQuery, function(err, output){
	    		if (err) {
	    			return next(err, null);
	    		}

	    		var imageType = output.data[0][1];
	    		var challengeId = output.data[0][0];
	    		var image = challengeId + "." + mime.extension(imageType);
	    		//var imagePath = global.appRoot + config.path.challengeImages + image + "." + extractExtension(imageType);

	    		//console.log("Image is " + imagePath);

	    		// Now, get the steps attached to this image

				var cypherQuery = "MATCH (e:Entry {id: '" + entryId + "'})-[u:USES]->(s) RETURN LABELS(s),s, e.caption ORDER BY u.order;";


				myDB.cypherQuery(cypherQuery, function(err, result){
	    			if(err) {
	    				return next(err, null);
	    			}

	    			//console.log(result.data); // delivers an array of query results

	    			var imageCaption;
	    			var stepsFromDB = result.data;

	    			var steps = {};
	    			var filters = [], layouts = [], artifacts = [], decorations = [];

	    			// Now construct the filters array in the JSON format
	    			for (var i = 0; i < stepsFromDB.length; i++) {
	    				var stepFromDB = stepsFromDB[i];
	    				imageCaption = stepFromDB[2];

	    				if (stepFromDB[0][0] == "Filter") {
	    					var filterFromDB = stepFromDB[1];

	    					var filter = {};
		    				filter.effects = {};

		    				if (filterFromDB.filter_type == "preset") {
		    					filter.type = "preset";

		    					filter.preset = filterFromDB.id;

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
		    				} else {
		    					return next(new Error("Invalid type '" + filterFromDB.filter_type + "' found for filterFromDB.filter_type"), null);
		    				}

		    				filters.push(filter);

	    				} else if (stepFromDB[0][0] == "Layout") {
	    					var layoutFromDB = stepFromDB[1];

	    					var layout = {};

		    				if (layoutFromDB.layout_type == "preset") {
		    					layout.type = "preset";

		    					layout.preset = layoutFromDB.id;

		    				} else if (layoutFromDB.layout_type == "user_defined" || layoutFromDB.layout_type == "custom") {
		    					
		    					layout.type = layoutFromDB.layout_type;

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

		    					if (layoutFromDB.shear == "on") {
		    						layout.shear = {};
		    						layout.shear.xDegrees = parseInt(layoutFromDB.shear_xDegrees);
		    						layout.shear.yDegrees = parseInt(layoutFromDB.shear_yDegrees);
		    					}
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
	    					} else if (artifactFromDB.artifact_type == "user_defined" || artifactFromDB.artifact_type == "custom") {
	    						artifact.type = artifactFromDB.artifact_type;

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
	    					} else if (decorationFromDB.decoration_type == "user_defined" || decorationFromDB.decoration_type == "custom") {
	    						decoration.type = decorationFromDB.decoration_type;

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

	    			return next(0, { "challengeId" : challengeId, "image" : image, "imageType" : imageType, "steps" : steps, "caption" : imageCaption});
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
	createFilterNode : function(filter, callback) {
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
					
			myDB.cypherQuery(cypherQuery, function(err, result){
	    		if(err) {
	    			return callback(err, 0);
	    		}

				return callback(null, id);
			});
		} else {
			return callback(new Error("Invalid filter.type value passed to createFilterNode: " + filter.type), 0);
		}
	},

	createDecorationNode : function(decoration, callback) {
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

			myDB.cypherQuery(cypherQuery, function(err, result) {
				if (err) {
					return callback(err, 0);
				}

				return callback(null, id);
			});

			return;
		} else {
			return callback(new Error("Invalid decoration.type value passed to createDecorationNode: " + decoration.type), 0);
		}
	},

	escapeSingleQuotes : function(str) {
		//console.log("escapeSingleQuotes called");
		return str.replace(/'/g, "\\'");
		//str.replace(/h/g, "v");
		//console.log("str is now " + str);

		return str;
	},

	createArtifactNode : function(artifact, callback) {
		//console.log("createArtifactNode: artifact = " + JSON.stringify(artifact));
		

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

			//console.log("Running cypherQuery: " + cypherQuery);

			myDB.cypherQuery(cypherQuery, function(err, result) {
				if (err) {
					return callback(err, 0);
				}

				return callback(null, id);
			});

			return;
		} else {
			return callback(new Error("Invalid artifact.type value passed to createArtifactNode: " + artifact.type), 0);
		}
	},

	createLayoutNode : function(layout, callback) {
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

			//console.log("Running cypherQuery: " + cypherQuery);
					
			myDB.cypherQuery(cypherQuery, function(err, result){
	    		if(err) {
	    			return callback(err, 0);
	    		}

				return callback(null, id);
			});

			return;
		} else {
			return callback(new Error("Invalid layout.type property passed to createLayoutNode: " + layout.type), 0);
		}
	},

	findUser : function (query, callback) {
		var findUserQuery = "MATCH(u:User) WHERE ";
		var addOr = false;

		if (query.userID) {
			findUserQuery += " u.id = '" + query.userID + "'";
			addOr = true;
		}

		if (query.googleID) {
			if (addOr) {
				findUserQuery += " OR ";
			}
			findUserQuery += " u.google_id = '" + query.googleID + "'";
			addOr = true;
		}

		if (query.twitterID) {
			if (addOr) {
				findUserQuery += " OR ";
			}
			findUserQuery += " u.twitter_id = '" + query.twitterID + "'";
			addOr = true;
		}

		if (query.facebookID) {
			if (addOr) {
				findUserQuery += " OR ";
			}
			findUserQuery += " u.facebook_id = '" + query.facebookID + "'";
			addOr = true;
		}

		if (query.localEmail) {
			if (addOr) {
				findUserQuery += " OR ";
			}
			findUserQuery += " u.local_email = '" + query.localEmail + "'";

			if (query.type == "extended") { // search in other accounts as well
				findUserQuery += " OR '" + query.localEmail + "' IN u.google_emails ";
				findUserQuery += " OR '" + query.localEmail + "' IN u.facebook_emails ";
			}
			addOr = true;
		}

		findUserQuery += " RETURN u;";

		//console.log("running 2 cypherquery: " + findUserQuery);
		myDB.cypherQuery(findUserQuery, function(err, result) {
			if (err) {
				return callback(err, null);
			}

			//console.log("result is " + JSON.stringify(result.data[0]));

			if (result.data.length == 0) {
				// no user found
				callback(null, null);
			} else {
				var userFromDB = result.data[0];

				var user = {};

				if (userFromDB.id) {
					user.id = userFromDB.id;
				}

				if (userFromDB.displayName) {
					user.displayName = userFromDB.displayName;
				}

				if (userFromDB.image) {
					user.image = userFromDB.image;
				}

				if (userFromDB.username) {
					user.username = userFromDB.username;
				}

				if (userFromDB.email) {
					user.email = userFromDB.email;
				}

				if(userFromDB.location) {
					user.location = userFromDB.location;
				}

				if (userFromDB.google_id) {
					user.google = {};
					user.google.id = userFromDB.google_id;
					user.google.displayName = userFromDB.google_displayName;
					user.google.token = userFromDB.google_token;
					user.google.emails = userFromDB.google_emails;
					user.google.images = userFromDB.google_images;
				}

				if (userFromDB.twitter_id) {
					user.twitter = {};
					user.twitter.id = userFromDB.twitter_id;
					user.twitter.username = userFromDB.twitter_username;
					user.twitter.profileLink = userFromDB.twitter_profile_link;
					user.twitter.token = userFromDB.twitter_token;
					user.twitter.tokenSecret = userFromDB.twitter_tokenSecret;
					user.twitter.displayName = userFromDB.twitter_displayName;
					user.twitter.images = userFromDB.twitter_images;
				}

				if (userFromDB.facebook_id) {
					user.facebook = {};
					user.facebook.id = userFromDB.facebook_id;
					user.facebook.profileLink = userFromDB.facebook_profile_link;
					user.facebook.token = userFromDB.facebook_token;
					user.facebook.displayName = userFromDB.facebook_displayName;
					user.facebook.image = userFromDB.facebook_image;
					user.facebook.emails = userFromDB.facebook_emails;
				}

				if (userFromDB.local_email) {
					user.local = {};
					user.local.email = userFromDB.local_email;
					user.local.password = userFromDB.local_password;
				}

				//console.log("calling callback with user = " + JSON.stringify(user));
				callback(null, user);
			}
		});
	},

	saveUser : function (user, next) {
		var query = {
		};

		if (user.id) {
			query.userID = user.id;
		}

		if (user.google) {
			query.googleID = user.google.id;
		}

		if (user.twitter) {
			query.twitterID = user.twitter.id;
		}

		if (user.facebook) {
			query.facebookID = user.facebook.id;
		}

		if (user.local) {
			query.localEmail = user.local.email;
		}

		this.findUser(query, function(err, existingUser) {
			if (err) {
				return next(err, null);
			}

			var cypherQuery = "";
			if (existingUser) { // user already exists in DB
				cypherQuery = "MATCH(u:User) WHERE u.id = '" + existingUser.id + "'";

				var setValues = [];

				if (user.displayName) {
					setValues.push(" u.displayName = '" + user.displayName + "'");
				}
				if (user.image) {
					setValues.push(" u.image = '" + user.image + "'");
				}

				if (user.username) {
					setValues.push(" u.username = '" + user.username + "'");
				}

				if (user.email) {
					setValues.push(" u.email = '" + user.email + "'");
				}

				if (user.location) {
					setValues.push(" u.location = '" + user.location + "'");
				}

				if (user.lastSeen) {
					setValues.push(" u.last_seen = '" + user.lastSeen + "'");
				}

				if (user.google) {
					if (user.google.id) {
						setValues.push(" u.google_id = '" + user.google.id + "'");
					}

					if (user.google.token) {
						setValues.push(" u.google_token = '" + user.google.token + "'");
					}

					if (user.google.emails) {
						setValues.push(" u.google_emails = " + JSON.stringify(user.google.emails) + "");
					}

					if (user.google.images) {
						setValues.push(" u.google_images = " + JSON.stringify(user.google.images) + "");
					}

					if (user.google.displayName) {
						setValues.push(" u.google_displayName = '" + user.google.displayName + "'");
					}
				}

				if (user.twitter) {
					if (user.twitter.id) {
						setValues.push(" u.twitter_id = '" + user.twitter.id + "'");
					}

					if (user.twitter.token) {
						setValues.push(" u.twitter_token = '" + user.twitter.token + "'");
					}

					if (user.twitter.tokenSecret) {
						setValues.push(" u.twitter_tokenSecret = '" + user.twitter.tokenSecret + "'");
					}

					if (user.twitter.username) {
						setValues.push(" u.twitter_username = '" + user.twitter.username + "'");
					}

					if (user.twitter.profileLink) {
						setValues.push(" u.twitter_profile_link = '" + user.twitter.profileLink + "'");
					}

					if (user.twitter.displayName) {
						setValues.push(" u.twitter_displayName = '" + user.twitter.displayName + "'");
					}

					if (user.twitter.images) {
						setValues.push(" u.twitter_images = " + JSON.stringify(user.twitter.images) + "");
					}
				}

				if (user.facebook) {
					if (user.facebook.id) {
						setValues.push(" u.facebook_id = '" + user.facebook.id + "'");
					}

					if (user.facebook.profileLink) {
						setValues.push(" u.facebook_profile_link = '" + user.facebook.profileLink + "'");
					}

					console.log("set facebok profile link in db");

					if (user.facebook.token) {
						setValues.push(" u.facebook_token = '" + user.facebook.token + "'");
					}

					if (user.facebook.displayName) {
						setValues.push(" u.facebook_displayName = '" + user.facebook.displayName + "'");
					}

					if (user.facebook.emails) {
						setValues.push(" u.facebook_emails = " + JSON.stringify(user.facebook.emails) + "");
					}

					if (user.facebook.image) {
						setValues.push(" u.facebook_image = '" + user.facebook.image + "'");
					}
				}

				if (user.local) {
					if (user.local.email) {
						setValues.push(" u.local_email = '" + user.local.email + "'");
					}

					if (user.local.password) {
						setValues.push(" u.local_password = '" + user.local.password + "'");
					}
				}

				// add set values to cypherquery
				if (setValues.length > 0) {
					cypherQuery += " SET ";
					for (var i = 0; i < setValues.length; i++) {
						if (i > 0) {
							cypherQuery += " , ";
						}
						cypherQuery += setValues[i];
					}
				} else {
					//shouldn't happen
					return next(new Error("setValues is empty"), null);
				}
			} else { // user doesn't exist in DB
				cypherQuery = "CREATE(u:User {";

				user.id = shortid.generate();
				cypherQuery += "id: '" + user.id + "'";

				if (user.displayName) {
					cypherQuery += ", displayName: '" + user.displayName + "'";
				}

				if (user.image) {
					cypherQuery += ", image: '" + user.image + "'";
				}

				if (user.username) {
					cypherQuery += ", username: '" + user.username + "'";
				}

				if (user.email) {
					cypherQuery += ", email: '" + user.email + "'";
				}

				if (user.location) {
					cypherQuery += ", location: '" + user.location + "'";
				}

				if (user.lastSeen) {
					cypherQuery += ", last_seen: '" + user.lastSeen + "'";
				}

				if (user.google) {
					if (user.google.id) {
						cypherQuery += ", google_id: '" + user.google.id + "'";
					}

					if (user.google.token) {
						cypherQuery += ", google_token: '" + user.google.token + "'";
					}

					if (user.google.emails) {
						cypherQuery += ", google_emails: " + JSON.stringify(user.google.emails) + "";
					}

					if (user.google.images) {
						cypherQuery += ", google_images: " + JSON.stringify(user.google.images) + "";
					}

					if (user.google.displayName) {
						cypherQuery += ", google_displayName: '" + user.google.displayName + "'";
					}
				}

				if (user.twitter) {
					if (user.twitter.id) {
						cypherQuery += ", twitter_id: '" + user.twitter.id + "'";
					}

					if (user.twitter.token) {
						cypherQuery += ", twitter_token: '" + user.twitter.token + "'";
					}

					if (user.twitter.tokenSecret) {
						cypherQuery += ", twitter_tokenSecret: '" + user.twitter.tokenSecret + "'";
					}

					if (user.twitter.username) {
						cypherQuery += ", twitter_username: '" + user.twitter.username + "'";
					}

					if (user.twitter.profileLink) {
						cypherQuery += ", twitter_profile_link: '" + user.twitter.profileLink + "'";
					}

					if (user.twitter.displayName) {
						cypherQuery += ", twitter_displayName: '" + user.twitter.displayName + "'";
					}

					if (user.twitter.images) {
						cypherQuery += ", twitter_images: " + JSON.stringify(user.twitter.images) + "";
					}
				}

				if (user.facebook) {
					if (user.facebook.id) {
						cypherQuery += ", facebook_id: '" + user.facebook.id + "'";
					}

					if (user.facebook.profileLink) {
						cypherQuery += ", facebook_profile_link: '" + user.facebook.profileLink + "'";
					}

					if (user.facebook.token) {
						cypherQuery += ", facebook_token: '" + user.facebook.token + "'";
					}

					if (user.facebook.displayName) {
						cypherQuery += ", facebook_displayName: '" + user.facebook.displayName + "'";
					}

					if (user.facebook.emails) {
						cypherQuery += ", facebook_emails: " + JSON.stringify(user.facebook.emails) + "";
					}

					if (user.facebook.image) {
						cypherQuery += ", facebook_image: '" + user.facebook.image + "'";
					}
				}

				if (user.local) {
					if (user.local.email) {
						cypherQuery += ", local_email: '" + user.local.email + "'";
					}

					if (user.local.password) {
						cypherQuery += ", local_password: '" + user.local.password + "'";
					}
				}

				cypherQuery += "});";
			}

			myDB.cypherQuery(cypherQuery, function(err, result) {
				if (err) {
					return next(err, null);
				}

				/**
					It's critical to pass the user to this function, because in case we created
					a new user node, we want to pass on the new id, which is generated above (uuid).
				**/
				return next(null, user);
			});
		});
	},

	removeAccessForUser: function(userId, provider, callback) {
		if (provider == "facebook") {
			removeQuery = " REMOVE u.facebook_id, u.facebook_profile_link, u.facebook_token, u.facebook_displayName, u.facebook_emails, u.facebook_image ";
		} else if (provider == "twitter") {
			removeQuery = " REMOVE u.twitter_id, u.twitter_token, u.twitter_tokenSecret, u.twitter_username, u.twitter_profile_link, u.twitter_displayName, u.twitter_images ";
		}

		var cypherQuery = "MATCH (u:User {id: '" + userId + "'}) ";
		cypherQuery += removeQuery;
		cypherQuery += " RETURN u;";

		myDB.cypherQuery(cypherQuery, function(err, result) {
			callback(err);
		});

	},

	checkCachedFile : function(cachePath, callback) {
		fs.stat(cachePath, function(err, stats) {
			callback(err);
		});
	},

	constructEntityData: function(entityType, entity, poster, compareDate, numLikes, numComments, numEntries, numShares, numFollowers, amFollowing, numPosts, amLiking, activityType, lastComment, lastCommenter, likeTime, liker, category, socialInfo) {

		var data = {
			type : entityType,
			id : entity.id,
			compareDate: compareDate,
		};

		//social status values
		data.socialStatus = {};
		if (numLikes != null && amLiking != null) {
			data.socialStatus.likes = {numLikes: numLikes, amLiking: amLiking};
		}
		if (numShares != null) {
			data.socialStatus.shares = {numShares: numShares};
		}
		if (numComments != null) {
			data.socialStatus.comments = {numComments: numComments};
		}
		if (numEntries != null) {
			data.socialStatus.entries = {numEntries: numEntries};
		}
		

		if (entityType == "challenge" || entityType == "entry") {
			data.postedDate = entity.created;
			data.postedByUser = poster;
		}

		if (entityType == "challenge") {
			data.image = config.url.challengeImages + entity.id + "." + mime.extension(entity.image_type);
			data.imageType = entity.image_type;
			data.caption = entity.title;
			data.link = config.url.challenge + entity.id;
			data.categoryName = category.name;
			data.categoryID = category.id;
		} else if (entityType == "entry") {
			data.image = config.url.entryImages + entity.id + "." + mime.extension(entity.image_type);
			data.imageType = entity.image_type;
			data.caption = entity.caption;
			data.link = config.url.entry + entity.id;
		} else if (entityType == "user") {
			data.image = entity.image;
			data.caption = entity.displayName;
			data.link = config.url.user + entity.id;
			if (socialInfo) {
				if (socialInfo.facebookLink) {
					data.socialStatus.facebook = {profileLink: socialInfo.facebookLink};
				}
				if (socialInfo.twitterLink) {
					data.socialStatus.twitter = {profileLink: socialInfo.twitterLink};
				}
			}
			if (numFollowers != null && amFollowing != null) {
				data.socialStatus.follows = {numFollowers: numFollowers, amFollowing: amFollowing};
			}

			if (numPosts != null) {
				data.socialStatus.posts = {numPosts: numPosts};
			}
		}

		if (activityType != "none") {
			data.activity = {};
			data.activity.type = activityType;

			if (activityType == "recentlyCommented") {
				if (lastComment) {
					data.activity.comment = lastComment;
					data.activity.comment.postedDate = lastComment.created;
				
					if (lastCommenter) {
						data.activity.comment.postedByUser = lastCommenter;
					}
				
					data.activity.comment.socialStatus = {numLikes: 0};
				}
			} else if (activityType == "recentlyLiked") {
				if (likeTime && liker) {
					data.activity.like = {};
					data.activity.like.postedByUser = liker;
					data.activity.like.postedDate = likeTime;
				}
			}
			
			
		}
		
		return data;
	},

	
	
}

function createNodesForCategory(parentCategoryId, categoryId, categoryObj) {
	if (categoryObj && categoryObj.displayName) {
		var cypherQuery = "";
		if (parentCategoryId != null) {
			cypherQuery += " MATCH (parent:Category {id: '" + parentCategoryId + "'}) MERGE (parent)<-[:BELONGS_TO]-(c:Category {id: '" + categoryId + "'}) ";
		} else {
			cypherQuery += " MERGE (c:Category {id: '" + categoryId + "'}) ";
		}

		cypherQuery += " ON CREATE SET c.name = '" + categoryObj.displayName + "' RETURN c;";
			
		myDB.cypherQuery(cypherQuery, function(err, result){
			if(err) {
				logger.dbError(err, cypherQuery);
				return;
			}

			//now, look for any subcategories
			if (categoryObj.subCategories) {
				for (var key in categoryObj.subCategories) {
					createNodesForCategory(db, categoryId, key, categoryObj.subCategories[key]);
				}
			}
		});
	}
}

