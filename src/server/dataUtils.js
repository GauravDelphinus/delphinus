var config = require('./config');
var presets = require("./presets");
var categories = require("./categories");
var shortid = require("shortid");
var fs = require("fs");
var mime = require("mime");
var logger = require("./logger");
var async = require("async");
var serverUtils = require("./serverUtils");
var dynamicConfig = require("./config/dynamicConfig");

module.exports = {

	myDB: null,

	initializeDB : function(db, callback) {
		this.myDB = db;

		var functions = [];
		//enumerate preset filters and create the nodes if not present

		for (let key in presets.presetLayout) {
			let id = key;
			let presetLayoutName = presets.presetLayout[key];

			let cypherQuery = "MERGE (l:Layout {id: '" + id + "'}) ON CREATE SET l.name = '" + presetLayoutName + "', l.layout_type = 'preset' RETURN l;";

			functions.push(async.apply(runQuery, this.myDB, cypherQuery));
		}
		for (let key in presets.presetFilter) {
			let id = key;
			let presetFilterName = presets.presetFilter[key];

			let cypherQuery = "MERGE (f:Filter {id: '" + id + "'}) ON CREATE SET f.name = '" + presetFilterName + "', f.filter_type = 'preset' RETURN f;";

			functions.push(async.apply(runQuery, this.myDB, cypherQuery));
		}
		for (let key in presets.presetArtifact) {
			let id = key;
			let presetArtifactName = presets.presetArtifact[key];

			let cypherQuery = "MERGE (a:Artifact {id: '" + id + "'}) ON CREATE SET a.name = '" + presetArtifactName + "', a.artifact_type = 'preset' RETURN a;";

			functions.push(async.apply(runQuery, this.myDB, cypherQuery));
		}
		for (let key in presets.presetDecoration) {
			let id = key;
			let presetDecorationName = presets.presetDecoration[key];

			let cypherQuery = "MERGE (d:Decoration {id: '" + id + "'}) ON CREATE SET d.name = '" + presetDecorationName + "', d.decoration_type = 'preset' RETURN d;";
			
			functions.push(async.apply(runQuery, this.myDB, cypherQuery));
		}

		//enumerate and create nodes for the categories and subcategories
		for (let key in categories) {
			let id = key;
			let categoryValue = categories[key];

			functions.push(async.apply(createNodesForCategory, this.myDB, null, id, categoryValue));
		}

		let designCategories = require("./designs");
		for (let key in designCategories) {
			let categoryId = key;
			let designList = designCategories[key];
			let categoryName = designList[0]; //first array element is the display name of the category

			functions.push(async.apply(createNodeForDesignCategory, this.myDB, categoryId, categoryName));
			
			
			let designObj = designList[1]; //second array element is the object containing the designs in that category
			for (let key in designObj) {
				let designId = key;

				//value is an array with two elements.  First element is the design name, and second is an object of the form {"defaultPresetArtifactId" : "presetArtifactName"}.  Refer designs.json
				let designName = designObj[key][0];
				let presetArtifactId = designObj[key][1].defaultPresetArtifactId;
				let captionTextSize = designObj[key][1].captionTextSize;
				let captionTextColor = designObj[key][1].captionTextColor;
				let captionBackgroundColor = designObj[key][1].captionBackgroundColor;

				functions.push(async.apply(createNodeForDesign, this.myDB, designId, designName, categoryId, presetArtifactId, captionTextSize, captionTextColor, captionBackgroundColor));
			}
		}

		async.series(functions, function(err) {
			return callback(err);
		});
	},

	getDB : function() {
		return this.myDB;
	},

	initializeDBWithData: function(data, callback) {
		var functions = [];

		//Create users
		for (var i = 0; i < data.users.length; i++) {
			var user = data.users[i];

			functions.push(async.apply(dbUser.createUserNode, user));
		}

		//Create challenges
		for (let i = 0; i < data.challenges.length; i++) {
			var challenge = data.challenges[i];

			functions.push(async.apply(dbChallenge.createChallengeNode, challenge));
		}

		//Create entries
		for (let i = 0; i < data.entries.length; i++) {
			var entry = data.entries[i];

			functions.push(async.apply(dbEntry.createEntryNode, entry));
		}

		async.series(functions, function(err) {
			callback(err);
		});
	},

	getImageDataForChallenge : function(challengeId, next) {
		var fetchChallengeQuery = "MATCH (c:Challenge {id: '" + challengeId + "'}) RETURN c;"
		this.myDB.cypherQuery(fetchChallengeQuery, function(err, output){
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

	getImageDataForDesign : function(designId, next) {
		let myDB = this.myDB;
		var cypherQuery = "MATCH (d:Design {id: '" + designId + "'})-[:BELONGS_TO]->(c:DesignCategory) RETURN d, c;";
		myDB.cypherQuery(cypherQuery, function(err, output){
	    	if (err) {
	    		return next(err, null);
	    	}

	    	var d = output.data[0][0];
	    	var c = output.data[0][1];
	    	var imageData = {id: d.id, imageType: "image/jpeg", categoryId: c.id};

	    	return next(0, imageData);
	    });
	},

	getImageSourceForEntry: function(entryId, next) {
		let myDB = this.myDB;
		var getImageDataForDesign = this.getImageDataForDesign.bind(this);

		// First get the original image from the challenge
		//var fetchChallengeQuery = "MATCH (c:Challenge)<-[:PART_OF]-(e:Entry {id: '" + entryId + "'}) RETURN c.id, c.image_type;"

		//now check what kind of entry this is - challenge, design or independent image
	    var cypherQuery = "MATCH (e:Entry {id: '" + entryId + "'}) " +
	    						" OPTIONAL MATCH (c:Challenge)<-[:PART_OF]-(e) " +
	    						" WITH e, c, COUNT(c) AS c_count " +
	    						" OPTIONAL MATCH (d:Design)<-[:PART_OF]-(e) " +
	    						" WITH e, c, c_count, d, COUNT(d) AS d_count " +
	    						" OPTIONAL MATCH (i:IndependentImage)<-[:PART_OF]-(e) " +
	    						" WITH e, c, c_count, d, d_count, i, COUNT(i) AS i_count " +
	    						" RETURN e.image_type, e.caption, c, c_count, d, d_count, i, i_count;";
	    myDB.cypherQuery(cypherQuery, function(err, result) {
	    	if (err) {
	    		return next(err, null);
	    	} else if (result.data.length != 1) {
	    		return next(new Error("cypherQuery: " + cypherQuery + ", expected 1 result, found: " + result.data.length));
	    	}

	    	var imageType = result.data[0][0];
	    	var imageCaption = result.data[0][1];
	    	var source = "";
	    	var sourceId = "";
	    	var sourceImagePath = "";
	    	var sourceImageUrl = "";
	    	if (result.data[0][3] > 0) {
	    		source = "challengeId";
	    		sourceId = result.data[0][2].id;
	    		sourceImagePath = global.appRoot + config.path.challengeImages + sourceId + "." + mime.extension(imageType);
	    		sourceImageUrl = config.url.challengeImages + sourceId + "." + mime.extension(imageType);
	    		return next(null, {source: source, sourceId: sourceId, sourceImagePath: sourceImagePath, sourceImageUrl: sourceImageUrl, imageType: imageType, imageCaption:imageCaption});
	    	} else if (result.data[0][5] > 0) {
	    		source = "designId";
	    		sourceId = result.data[0][4].id;
	    		
	    		getImageDataForDesign(sourceId, function(err, designData) {
	    			if (err) {
	    				return next(err, null);
	    			}

	    			sourceImagePath = global.appRoot + config.path.designImagesRaw + sourceId + designData.categoryId + "." + mime.extension(imageType);
	    			sourceImageUrl = config.url.designImages + designData.categoryId + "/" + sourceId + "." + mime.extension(imageType);
	    			return next(null, {source: source, sourceId: sourceId, sourceImagePath: sourceImagePath, sourceImageUrl: sourceImageUrl, imageType: imageType, imageCaption:imageCaption});
	    		});
	    	} else if (result.data[0][7] > 0) {
	    		source = "independentImageId";
	    		sourceId = result.data[0][6].id;
	    		sourceImagePath = global.appRoot + config.path.independentImages + sourceId + "." + mime.extension(imageType);
	    		sourceImageUrl = config.url.independentImages + sourceId + "." + mime.extension(imageType);
	    		return next(null, {source: source, sourceId: sourceId, sourceImagePath: sourceImagePath, sourceImageUrl: sourceImageUrl, imageType: imageType, imageCaption:imageCaption});
	    	}
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
		let myDB = this.myDB;

		this.getImageSourceForEntry(entryId, function(err, imageData) {

			if (err) {
				return next(err, null);
			}

	    	var cypherQuery = "MATCH (e:Entry {id: '" + entryId + "'})-[u:USES]->(s) RETURN LABELS(s),s ORDER BY u.order;";
			myDB.cypherQuery(cypherQuery, function(err, result){
    			if(err) {
    				return next(err, null);
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

    			return next(0, { "source": imageData.source, "sourceId" : imageData.sourceId, "soureImagePath" : imageData.sourceImagePath, "sourceImageUrl" : imageData.sourceImageUrl, "imageType" : imageData.imageType, "steps" : steps, "caption" : imageData.imageCaption});
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
		var myDB = this.myDB;
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
					
			myDB.cypherQuery(cypherQuery, function(err){
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

			this.myDB.cypherQuery(cypherQuery, function(err) {
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

	createArtifactNode : function(artifact, callback) {
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

			this.myDB.cypherQuery(cypherQuery, function(err) {
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
					
			this.myDB.cypherQuery(cypherQuery, function(err){
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
}

function createNodesForCategory(db, parentCategoryId, categoryId, categoryObj, callback) {
	if (categoryObj && categoryObj.displayName) {
		var cypherQuery = "";
		if (parentCategoryId != null) {
			cypherQuery += " MATCH (parent:Category {id: '" + parentCategoryId + "'}) MERGE (parent)<-[:BELONGS_TO]-(c:Category {id: '" + categoryId + "'}) ";
		} else {
			cypherQuery += " MERGE (c:Category {id: '" + categoryId + "'}) ";
		}

		cypherQuery += " ON CREATE SET c.name = '" + categoryObj.displayName + "' RETURN c;";
			
		db.cypherQuery(cypherQuery, function(err, result){
			if(err) {
				logger.dbError(cypherQuery);
				return callback(err, 0);
			}

			return callback(0, result);
			/*
			//now, look for any subcategories
			if (categoryObj.subCategories) {
				for (var key in categoryObj.subCategories) {
					createNodesForCategory(db, categoryId, key, categoryObj.subCategories[key]);
				}
			}
			*/
		});
	}
}

function createNodeForDesignCategory(db, categoryId, categoryName, callback) {
	if (categoryId && categoryName) {

		//before we create the node, check that the category folder exists
		serverUtils.directoryExists(global.appRoot + config.path.designImagesRaw + categoryId, function(err) {
			if (err) {
				return callback(err, 0);
			}

			var cypherQuery = "MERGE (c:DesignCategory {id: '" + categoryId + "'}) ON CREATE SET c.name = '" + categoryName + "' RETURN c;";

			db.cypherQuery(cypherQuery, function(err, result) {
				if (err) {
					logger.dbError(cypherQuery);
					return callback(err, 0);
				}

				return callback(0, result);
			});
		});
	}
}

function createNodeForDesign(db, designId, designName, categoryId, presetArtifactId, captionTextSize, captionTextColor, captionBackgroundColor, callback) {
	if (designId && designName) {
		//first check to make sure the image file exists
		serverUtils.fileExists(global.appRoot + config.path.designImagesRaw + categoryId + "/" + designId + ".jpeg", function(err) {
			if (err) {
				return callback(err, 0);
			}

			var cypherQuery = "MATCH (c:DesignCategory {id: '" + categoryId + "'}) " +
				" MERGE (d:Design {id: '" + designId + "'})-[:BELONGS_TO]->(c) " + 
				" SET d.name = '" + designName + "' , " + 
				" d.caption_preset_id = '" + presetArtifactId + "', " + 
				" d.caption_default_text_size = '" + captionTextSize + "', " + 
				" d.caption_default_text_color = '" + captionTextColor + "', " + 
				" d.caption_default_background_color = '" + captionBackgroundColor + "' " + 
				" RETURN d;";

			db.cypherQuery(cypherQuery, function(err, result) {
				if (err) {
					logger.dbError(cypherQuery);
					return callback(err, 0);
				}

				return callback(0, result);
			});
		});
		
	}
}

function runQuery(db, cypherQuery, callback) {
	db.cypherQuery(cypherQuery, function(err, result) {
		if (err) {
			logger.dbError(err, cypherQuery);
			return callback(err, 0);
		}
		return callback(0, result);
	});
}
