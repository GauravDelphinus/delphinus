var serverUtils = require("../serverUtils");
var dbUtils = require("./dbUtils");
var config = require("../config");
var mime = require("mime");
var logger = require("../logger");
var error = require("../error");
var filterUtils = require("../filterUtils");
var async = require("async");
var imageProcessor = require("../imageProcessor");
var shortid = require("shortid");
var dbIndependentImage = require("./dbIndependentImage");
var dbChallenge = require("./dbChallenge");
var dbDesign = require("./dbDesign");

/*
	Get Info about an Entry by looking up the DB

	entryId: id of the entry node

	return output prototype: serverUtils.prototypes.entry
*/
function getEntry(entryId, done) {
	var cypherQuery = "MATCH (source)<-[:PART_OF]-(e:Entry {id: '" + entryId + "'})-[:POSTED_BY]->(poster:User) " +
		" WITH e, poster, source, labels(source) AS source_labels " + 
		" RETURN e, poster, source_labels, source;";

	dbUtils.runQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.data.length != 1) {
			return done(new error.DBResultError(cypherQuery, 1, result.data.length));
		}

		var entry = result.data[0][0];
		var poster = result.data[0][1];
		var sourceLabel = result.data[0][2];
		var source = result.data[0][3];

		output = dbUtils.entityNodeToClientData("Entry", entry, poster, null, sourceLabel, source);

		return done(null ,output);
	});
}

/**
	Get the Social Info associated with an entry

	entryId: id of the entry node
	meId: id of the currently logged in user, or 0 if not logged in

	return output prototype: serverUtils.prototypes.entrySocialInfo
**/
function getEntrySocialInfo(entryId, meId, done) {
	var cypherQuery = "MATCH (e:Entry {id: '" + entryId + "'}) " +
		" WITH e " + 
		" OPTIONAL MATCH (u2:User)-[:LIKES]->(e) " + 
		" WITH e, COUNT(u2) AS like_count " + 
		" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(e) " + 
		" WITH e, like_count, COUNT(comment) AS comment_count " + 
		" OPTIONAL MATCH (me:User {id: '" + meId + "'})-[like:LIKES]->(e) " +	
		" WITH e, like_count, comment_count, COUNT(like) AS amLiking " +
		" RETURN like_count, comment_count, amLiking;";

	dbUtils.runQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.data.length != 1) {
			return done(new DBResultError(cypherQuery, 1, result.data.length));
		}

		//social status
		var numLikes = result.data[0][0];
		var numComments = result.data[0][1];
		var amLiking = result.data[0][2] > 0;
		var numShares = 0; //no yet implemented

		var output = {
			likes : {
				numLikes : numLikes,
				amLiking : amLiking
			},
			shares : {
				numShares : numShares
			},
			comments : {
				numComments : numComments
			}
		};

		return done(null ,output);
	});
}

/*
	Fetch all entries from the DB matching the provided criteria.

	Note that info is returned in chunks of size config.businessLogic.chunkSize

	postedBy: id of user who posted the entry, or null/undefined if not desired to match search
	challengeId: id of challenge in which the entry was posted, or null/undefined if not desired to match search
	lastFetchedTimestamp: timestamp to be used for sending the next chunk of data.  Results should have a timestapm LESS than this.  If 0, ignore timestamp

	return output: array whose elements match the serverUtils.prototypes.entry
	return timestamp: new timestamp that will be passed back to client for use to fetch next chunk

	Note: this API will never return more than config.businessLogic.infiniteScrollChunkSize items (this is server defined)
*/
function getEntries(postedBy, challengeId, lastFetchedTimestamp, done) {

	var cypherQuery = "";

	var timestampClause;

	if (lastFetchedTimestamp == 0) {
		timestampClause = "";
	} else {
		timestampClause = " WHERE (e.activity_timestamp < " + lastFetchedTimestamp + ") " ;
	} 

	if (postedBy) {
		cypherQuery += " MATCH (source)<-[:PART_OF]-(e:Entry)-[:POSTED_BY]->(poster:User {id: '" + postedBy + "'}) " + timestampClause;
	} else if (challengeId) {
		cypherQuery += " MATCH (poster:User)<-[:POSTED_BY]-(e:Entry)-[:PART_OF]->(source:Challenge {id: '" + challengeId + "'}) " + timestampClause;
	} else {
		cypherQuery += " MATCH (source)<-[:PART_OF]-(e:Entry)-[:POSTED_BY]->(poster:User) " + timestampClause;
	}

	cypherQuery +=
		" WITH e, poster, labels(source) AS source_labels, source " +
		" RETURN e, poster, source_labels, source " + 
		" ORDER BY e.activity_timestamp DESC LIMIT " + config.businessLogic.infiniteScrollChunkSize + ";";

	dbUtils.runQuery(cypherQuery, function(err, result) {
		if (err) {
			return done(err, 0);
		}

		var newTimeStamp = 0;
		var output = [];
		for (var i = 0; i < result.data.length; i++) {
			var data = {};

			var entry = result.data[i][0];
			var poster = result.data[i][1];
			var sourceLabel = result.data[i][2];
			var source = result.data[i][3];

			data = dbUtils.entityNodeToClientData("Entry", entry, poster, null, sourceLabel, source);

			//update new time stamp to be sent back to client
			newTimeStamp = data.activity.timestamp;

			output.push(data);
		}

		return done(null, output, newTimeStamp);
	});
}

/**
	Extract the entry data, including the source image information

	entryId: id of the entry

	return output: {
		prototype: serverUtils.prototypes.entry
		plus these values:
		sourceImagePath: source image path
		sourceImageUrl: source image url
	}
**/
function getEntrySourceImageData(entryId, next) {

	this.getEntry(entryId, function(err, entry) {
		if (err) {
			return next(err);
		}

		if (entry.sourceType == "challengeId") {
			entry.sourceImagePath = global.appRoot + config.path.challengeImages + entry.sourceId + "." + mime.extension(entry.imageType);
			entry.sourceImageUrl = config.url.challengeImages + sourceId + "." + mime.extension(entry.imageType);
			return next(null, entry);
		} else if (entry.sourceType == "designId") {
			getImageDataForDesign(entry.sourceId, function(err, designData) {
    			if (err) {
    				return next(err, null);
    			}

    			entry.sourceImagePath = global.appRoot + config.path.designImagesRaw + entry.sourceId + designData.categoryId + "." + mime.extension(entry.imageType);
    			entry.sourceImageUrl = config.url.designImages + designData.categoryId + "/" + entry.sourceId + "." + mime.extension(entry.imageType);
    			return next(null, entry);
    		});
		} else if (entry.sourceType == "independentImageId") {
			entry.sourceImagePath = global.appRoot + config.path.independentImages + entry.sourceId + "." + mime.extension(entry.imageType);
    		entry.sourceImageUrl = config.url.independentImages + entry.sourceId + "." + mime.extension(entry.imageType);
    		
    		return next(null, entry);
		}
	});
}

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
function getEntryImageData(entryId, next) {

	this.getEntrySourceImageData(entryId, function(err, entry) {
		if (err) {
			return next(err);
		}

    	var cypherQuery = "MATCH (e:Entry {id: '" + entryId + "'})-[u:USES]->(s) RETURN LABELS(s),s ORDER BY u.order;";
		dbUtils.runQuery(cypherQuery, function(err, result){
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

			return next(0, { "sourceType": entry.sourceType, "sourceId" : entry.sourceId, "soureImagePath" : entry.sourceImagePath, "sourceImageUrl" : entry.sourceImageUrl, "imageType" : entry.imageType, "steps" : steps, "caption" : entry.caption});
		});

    });
}

/*
getImageSourceForEntry: function(entryId, next) {

	this.getEntry(entryId, function(err, entry) {
		if (err) {
			return next(err);
		}

		if (entry.sourceType == "challengeId") {
			entry.sourceImagePath = global.appRoot + config.path.challengeImages + sourceId + "." + mime.extension(entry.imageType);
		} else if (entry.sourceType == "designId") {
			entry.sourceImagePath = global.appRoot + config.path.designImagesRaw + sourceId + "." + mime.extension(entry.imageType);
		} else if (entry.sourceType == "independentImageId") {
			entry.sourceImagePath = global.appRoot + config.path.independentImages + sourceId + "." + mime.extension(entry.imageType);
		}
		
	});

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
}
*/

/*
	Fetch all entries from the DB matching the provided criteria, and sorted by the given sort flag.

	sortBy: currently supported values: 'popularity'
	limit: max. number of results to return
	postedBy: id of user who posted the entry, null or undefined if not specified

	Note: this only supports returning a max config.businessLogic.maxCustomSortedLimit results.  
	This API returns all in one go, and does not support chunked outputs.
*/
function getEntriesSorted(sortBy, limit, postedBy, done) {

	if (sortBy != 'popularity') {
		return done(new Error("Invalid sortBy field: " + sortBy));
	}

	limit = Math.min(limit, config.businessLogic.maxCustomSortedLimit);

	var cypherQuery = "";

	if (postedBy) {
		cypherQuery += " MATCH (source)<-[:PART_OF]-(e:Entry)-[:POSTED_BY]->(poster:User {id: '" + postedBy + "'}) ";
	} else {
		cypherQuery += " MATCH (source)<-[:PART_OF]-(e:Entry)-[:POSTED_BY]->(poster:User) ";
	}

	/*
		PRIORITY is WEIGHTED BASED ON THE BELOW RULES:

		Overall Popularity = (Number of Likes x 5) + (Number of Comments x 2)
	*/
	cypherQuery +=
		" WITH e, poster, labels(source) AS source_labels, source " +
		" OPTIONAL MATCH (u2:User)-[:LIKES]->(e) " + 
		" WITH e, poster, source_labels, source, COUNT(u2) AS like_count " + 
		" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(e) " + 
		" WITH e, poster, source_labels, source, 5 * like_count + 2 * COUNT(comment) AS popularity_count " + 
		" RETURN e, poster, source_labels, source, popularity_count " + 
		" ORDER BY popularity_count DESC LIMIT " + limit + ";";

	dbUtils.runQuery(cypherQuery, function(err, result) {
		if (err) {
			return done(err, 0);
		}

		var output = [];
		for (var i = 0; i < result.data.length; i++) {
			var data = {};

			var entry = result.data[i][0];
			var poster = result.data[i][1];
			var sourceLabel = result.data[i][2];
			var source = result.data[i][3];

			data = dbUtils.entityNodeToClientData("Entry", entry, poster, null, sourceLabel, source);

			output.push(data);
		}

		return done(null, output);
	});
}

/**
	Create a new Entry (including images, nodes, etc.)

	entryInfo: {
		created: timestamp when the entry was created
		title: string representing the caption associated with the entry
		userId: id of user who created this entry
		sourceType: one of "challengeId", "designId", "imageURL" or "dataURI"
		sourceData: actual source data that matches the sourceType (e.g., in case of challengeId it should be a valid id of a challenge,
			and in case of imageURL it should be a valid URL that represents an image, and a dataURI should be a valid dataURI block)
		steps: an array that represents the filter steps that need to be applied to this image.
	}

	return output: {
		id: id of the newly created entry
	}
**/
function createEntry(entryInfo, done) {
	var id = shortid.generate();

	if (!entryInfo.steps) {
		return done(new Error("Entry Steps missing"));
	}

	var entryData = {
		sourceType: entryInfo.sourceType,
		sourceData: entryInfo.sourceData,
		userId: entryInfo.userId,
		id: id,
		created: entryInfo.created,
		steps: entryInfo.steps,
		title: entryInfo.title
	};

	createImagesForEntry(entryData, function(err, info) {
		if (err) {
			return done(err);
		}

		var nodeInfo = {
			id: id,
			created : entryInfo.created,
			title : entryInfo.title,
			userId : entryInfo.userId,
			imageType: info.imageType,
			sourceType: info.sourceType, //this should be one of 'challengeId', 'designId' or 'independentImageId'
			sourceId : info.sourceId //this should have been settled by createImagesForEntry, even for independent images
		};

		createEntryNode(nodeInfo, function(err, output) {
			if (err) {
				return done(err);
			}

			createFilterNodesForEntry(output.id, entryInfo.steps, function(err) {
				if (err) {
					return done(err);
				}

				return done(null, {id: output.id});
			});
		});
	});
}

/**
	Create an Entry Node with the provided information

	entryInfo: {
		id: id of this new entry
		created : timestamp when the entry was created
		title : the caption for the entry
		userId : id of the user who created this entry
		imageType: mime type of the image associated with the entry
		sourceType: one of "challengeId", "designId" or "independentImageId"
		sourceId : the id of the corresponding sourceType
	}

	return output: {
		id: id of the newly created node
	}
**/
function createEntryNode(entryInfo, done) {
	if (!serverUtils.validateData(entryInfo, entryPrototype)) {
		return done(new Error("Invalid entry info"));
	}

	var cypherQuery = " MATCH (u:User {id: '" + entryInfo.userId + "'}) ";

	if (entryInfo.sourceType == "challengeId") { //link to challenge
		cypherQuery += ", (source:Challenge {id: '" + entryInfo.sourceId + "'}) ";
	} else if (entryInfo.sourceType == "designId") {// link to design
		cypherQuery += ", (source:Design {id: '" + entryInfo.sourceId + "'}) ";
	} else if (entryInfo.sourceType == "independentImageId") {// link to Independent Image
		cypherQuery += ", (source:IndependentImage {id: '" + entryInfo.sourceId + "'}) ";
	}

	cypherQuery +=
		" CREATE (source)<-[:PART_OF]-(e:Entry {" +
		"id: '" + entryInfo.id + "', " + 
		"caption: '" + dbUtils.sanitizeStringForCypher(entryInfo.title) + "', " + 
		"created : " + entryInfo.created + ", " + 
		"image_type: '" + entryInfo.imageType + "' " +
		"})-[r:POSTED_BY]->(u) RETURN e;";

	dbUtils.runQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.data.length != 1) {
			return done(new Error(dbResultError(cypherQuery, 1, result.data.length)));
		}

		//now, save the activity in the entity
        var activityInfo = {
        	entityId: result.data[0].id,
        	type: "post",
        	timestamp: entryInfo.created,
        	userId: entryInfo.userId
        }
        dbUtils.saveActivity(activityInfo, function(err, result) {
        	if (err) {
        		return done(err);
        	}

			return done(null, {id: result.id});
		});
	});
}

/*

	source: challenge id:
	---------------------

	input file: /challengeImages/challengeid.jpeg
	output file: /entryImages/entryid.jpeg

	step files:

	/cacheImages/challengeid-fkdfhd.jpeg
	/cacheImages/challengeid-dffdfs.jpeg
	/cacheImages/challengeid-sddfds.jpeg


	source: design id:
	---------------------

	input file: /designImages/designid.jpeg
	output file: /entryImages/entryid.jpeg

	step files:

	/cacheImages/designid-fkdfhd.jpeg
	/cacheImages/designid-dffdfs.jpeg
	/cacheImages/designid-sddfds.jpeg


	source: dataURI:
	---------------------

	input file: /independentEntryImages/independententryid.jpeg
	output file: /entryImages/entryid.jpeg

	step files:

	/cacheImages/independententryid-kdfsdkhfd.jpeg
	/cacheImages/independententryid-dffdfs.jpeg
	/cacheImages/independententryid-sddfds.jpeg


*/

/**
	Create all the images for the entry, such as the step images and the final image

	entryData: {
		id: id of this entry
		sourceType: one of "challengeId", "designId", "imageURL" or "dataURI"
		sourceData: actual source data that matches the sourceType
		userId: id of user who created this entry
		created: timestamp when the entry was created
		steps: steps associated with the entry
		title: caption for the entry
	}

	return output: {
		imageType: mime type of image associated with the entry
		sourceType: one of "challengeId", "designId" or "independentImageId"
		sourceId: id of the source of the entry (e.g., challenge id, or design Id, or independentImage id)
	}
**/
function createImagesForEntry(entryData, done) {

	processImageDataForEntry(entryData, true, function(err, info) {
		if (err) {
			return done(err);
		}

		//now, generate the image(s)
		var singleStepList = filterUtils.extractSingleStepList(entryData.steps);
		var applySingleStepToImageFunctions = [];

		for (var i = 0; i < singleStepList.length; i++) {
			var hash = filterUtils.generateHash(JSON.stringify(singleStepList[i]));
			var targetImagePath = global.appRoot + config.path.cacheImages + info.sourceId + "-" + hash + "." + mime.extension(info.imageType);

			applySingleStepToImageFunctions.push(async.apply(imageProcessor.applyStepsToImage, info.sourceImagePath, targetImagePath, info.imageType, singleStepList[i], dbUtils.escapeSingleQuotes(entryData.title)));
		}

		var imagePaths = []; //list of image paths for each sub step
		async.series(applySingleStepToImageFunctions, function(err, imagePaths) {
			if (err) {
				return done(new Error("Error creating Images for the Entry Steps: " + err));
			}

			//create a copy of the final cumulative/combined (i.e., last step in the array) to the entry image
			var entryImagePath = global.appRoot + config.path.entryImages + entryData.id + "." + mime.extension(info.imageType);
			imageProcessor.addWatermarkToImage(imagePaths[imagePaths.length - 1], entryImagePath, function(err) {
				if (err) {
					return done(new Error("Error creating the final Entry Image: " + err));
				}

				var output = {
					imageType: info.imageType,
					sourceType: info.sourceType,
					sourceId: info.sourceId
				};

				return done(null, output);
			});
		});	
	});
}

/**
	Create the filter nodes for the various steps associated with an entry

	entryId: id of the entry
	steps: steps associated with the entry
**/
function createFilterNodesForEntry(entryId, steps, done) {
	var createFilterNodesFunctions = []; // array of functions that will create the Filter Nodes

	if (steps) {
		if (steps.layouts && steps.layouts.constructor === Array) {
			for (var i = 0; i < steps.layouts.length; i++) {
				var layout = steps.layouts[i];

				if (layout.type == "preset" || layout.type == "custom") {
					createFilterNodesFunctions.push(async.apply(dbFilter.createLayoutNode, layout));
				}
			}
		}

		if (steps.filters && (steps.filters.constructor === Array)) {
			for (var i = 0; i < steps.filters.length; i++) {
				var filter = steps.filters[i];

				if (filter.type == "preset" || filter.type == "custom") {
					createFilterNodesFunctions.push(async.apply(dbFilter.createFilterNode, filter));
				}
			}
		}

		if (steps.artifacts && steps.artifacts.constructor === Array) {
			for (var i = 0; i < steps.artifacts.length; i++) {
				var artifact = steps.artifacts[i];

				if (artifact.type == "preset" || artifact.type == "custom") {
					createFilterNodesFunctions.push(async.apply(dbFilter.createArtifactNode, artifact));
				}
			}
		}

		if (steps.decorations && steps.decorations.constructor === Array) {
			for (var i = 0; i < steps.decorations.length; i++) {
				var decoration = steps.decorations[i];

				if (decoration.type == "preset" || decoration.type == "custom") {
					createFilterNodesFunctions.push(async.apply(dbFilter.createDecorationNode, decoration));
				}
			}
		}
	}
	

	// LAYOUTS

	async.series(createFilterNodesFunctions, function(err, filterNodes) {
		if (err) {
			return done(new Error("Created Entry Node, but error creating Filter Nodes"));
		}

		var cypherQuery = "MATCH (e:Entry {id: '" + entryId + "'}) ";
		for (var i = 0; i < filterNodes.length; i++) {

			// Now associate filters to the new entry
			cypherQuery += " MATCH (s" + i + " {id: '" + filterNodes[i] + "'}) ";
		}

		if (filterNodes.length > 0) {
			cypherQuery += " CREATE ";
		}
		
		for (var i = 0; i < filterNodes.length; i++) {
			if (i > 0) {
				cypherQuery += " , ";
			}
			cypherQuery += " (s" + i + ")<-[:USES {order : '" + i + "'}]-(e) ";
		}

		cypherQuery += " return e;";

		dbUtils.runQuery(cypherQuery, function(err, result){
			if(err) {
				return done(err);
			} else if (result.data.length != 1) {
				return done(new DBResultError(cypherQuery, 1, result.data.length));
			}

			return done(null);
		});
	});
}

/*
	Find out if the given user has the permissions to delete
	the given entry
*/
function canDeleteEntry(entryId, userId, done) {
	getEntry(entryId, function(err, entry) {
		if (err) {
			return done(err);
		}

		//only the person who posted the challenge can delete it
		return done(null, entry.postedByUser.id == userId);
	});
}

/*
	Delete the matching entry node (and associated dependencies) from the DB
*/
function deleteEntry(entryId, done) {

	var cypherQuery = "MATCH (e:Entry {id: '" + entryId + "'}) " +
		" OPTIONAL MATCH (e)<-[:POSTED_IN*1..2]-(comment:Comment) " +
		" DETACH DELETE comment, e;";

	dbUtils.runQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		}

		return done(null);
	});
}

/*
	Update the Like status of a entry node in the DB, along with the timestamp

	This also internally will update the activity info in the corresponding Entry Node in the DB

	like: true for adding like, and false for removing like
*/
function likeEntry(entryId, like, userId, timestamp, done) {
	if (like) {
		
		var cypherQuery = "MATCH (u:User {id: '" + userId + "'}), (c:Entry {id: '" + entryId + "'}) " +
			" CREATE (u)-[r:LIKES {created: '" + timestamp + "'}]->(c) " +
			" RETURN r;";

		dbUtils.runQuery(cypherQuery, function(err, result){
	        if(err) {
	        	return done(err);
	        } else if (!(result.data.length == 0 || result.data.length == 1)) {
	        	return done(new DBResultError(cypherQuery, "0 or 1", result.data.length));
	        }

	        //now, save the activity in the entry
	        var activityInfo = {
	        	entityId: entryId,
	        	type: "like",
	        	timestamp: timestamp,
	        	userId: userId
	        }
	        dbUtils.saveActivity(activityInfo, function(err, id) {
	        	if (err) {
	        		return done(err);
	        	}

	        	return done(null, result.data.length == 1);
	        });

		});
	} else {

		var cypherQuery = "MATCH (u:User {id: '" + userId + "'})-[r:LIKES]->(c:Entry {id: '" + entryId + "'}) " +
			" DELETE r " +
			" RETURN COUNT(r);";

		dbUtils.runQuery(cypherQuery, function(err, result){
	        if(err) {
	        	return done(err);
	        } else if (!(result.data.length == 0 || result.data.length == 1)) {
	        	return done(new DBResultError(cypherQuery, "0 or 1", result.data.length));
	        }

	        //now, reset the activity in the entry, since the person no longer likes this entry
	        var activityInfo = {
	        	entityId: entryId,
	        	type: "post",
	        	timestamp: timestamp,
	        	userId: userId
	        }
	        dbUtils.saveActivity(activityInfo, function(err, id) {
	        	if (err) {
	        		return done(err);
	        	}

				return done(null, result.data.length == 0);
	        });
			
		});
	}
}

/**
	Process the entry data and extract image related information
	This will prep for any details needed to create an entry

	entryData: {
		id: id of this entry
		sourceType: one of "challengeId", "designId", "imageURL" or "dataURI"
		sourceData: actual source data that matches the sourceType
		userId: id of user who created this entry
		created: timestamp when the entry was created
		steps: steps associated with the entry
		title: caption for the entry
	}

	createNodesIfNotFound - true if we want to create the independnetImage nodes along the way (in case we're ready to create the entry)
		false if we only want to generate temporary images and no nodes (e.g., previewing an image or presets and not yet ready to post the entry)

	return output: {
		sourceImagePath: path that has the entry's source image (e.g., challenge, design or independent image) saved into it
		sourceFileIsTemp: whether the source file represented by sourceImagePath is temp or persistent (indication for whether it needs to be deleted later)
		imageType: mime type of image
		sourceType: one of "challengeId", "designId", or "independentImageId" 
		sourceId: actual id associated with the sourceType
	}
**/
function processImageDataForEntry (entryData, createNodesIfNotFound, next) {
	//logger.debug("processImageDataForEntry: entryData: " + JSON.stringify(serverUtils.makeObjectPrintFriendly(entryData)) + ", createNodesIfNotFound = " + createNodesIfNotFound);
	async.waterfall([
	    function(callback) {
	    	if (entryData.sourceType == "challengeId") {
	    		var challengeId = entryData.sourceData;
				if (!challengeId) {
					logger.error("Challenge ID missing.");
					return callback(new Error("Challenge ID Missing."));
				}

				dbChallenge.getChallenge(challengeId, function(err, challenge){
					if (err) {
						return callback(err);
					}

					var sourceImagePath = global.appRoot + config.path.challengeImagesRaw + challengeId + "." + mime.extension(challenge.imageType);

					return callback(null, {sourceImagePath: sourceImagePath, sourceFileIsTemp: false, imageType: challenge.imageType, sourceType: "challengeId", sourceId: challengeId});
				});
			} else {
				return callback(null, null);
			}
	    },
	    function(info, callback) {
	    	if (info == null && entryData.sourceType == "imageURL") {
	    		var imageURL = entryData.sourceData;
	    		if (!imageURL) {
	    			logger.error("Missing Image URL.");
	    			return callback(new Error("Missing Image URL"));
	    		}

	    		if (createNodesIfNotFound) {
	    			dbIndependentImage.createIndependentImageNode(entryData.sourceType, imageURL, entryData.userId, function(err, data) {
		    			if (err) {
		    				return callback(err);
		    			}

		    			var sourceImagePath = global.appRoot + config.path.independentImagesRaw + data.id + "." + mime.extension(data.imageType);
		    			return callback(null, {sourceImagePath: sourceImagePath, sourceFileIsTemp: false, imageType: data.imageType, sourceType: "independentImageId", sourceId: data.id});
		    		});
	    		} else {
	    			serverUtils.downloadImage(imageURL, null, function(err, outputPath) {
	    				if (err) {
	    					return callback(err);
	    				}

	    				var extension = imageURL.split('.').pop();
	    				var imageType = mime.lookup(extension);
	    				return callback(null, {sourceImagePath: outputPath, sourceFileIsTemp: true, imageType: imageType, sourceType: null, sourceId: 0});
	    			});
	    		}
	    	} else {
	    		return callback(null, info);
	    	}
	    },
	    function(info, callback) {
	    	if (info == null && entryData.sourceType == "dataURI") {
	    		var dataURI = entryData.sourceData;
	    		if (!dataURI) {
	    			logger.error("Missing Image URI");
	    			return callback(new Error("Missing Image URI"));
	    		}

				if (createNodesIfNotFound) {

					var independentImageInfo = {
						sourceType: "dataURI",
						sourceData: entryData.sourceData,
						userId: entryData.userId,
						created: entryData.created
					};

					dbIndependentImage.createIndependentImage(independentImageInfo, function(err, output) {
						if (err) {
							return callback(err);
						}

						return callback(null, {sourceImagePath: output.imagePath, sourceFileIsTemp: false, imageType: output.imageType, sourceType: "independentImageId", sourceId: output.id});
					});
	    		} else {
	    			serverUtils.writeImageFromDataURI(dataURI, null, function(err, outputPath) {
	    				if (err) {
	    					return callback(err);
	    				}

	    				var parseDataURI = require("parse-data-uri");
						var parsed = parseDataURI(dataURI);
	    				return callback(null, {sourceImagePath: outputPath, sourceFileIsTemp: true, imageType: parsed.mimeType, sourceType: null, sourceId: 0});
	    			});
	    		}
	    	} else {
	    		return callback(null, info);
	    	}
	    },
	    function(info, callback) {
	    	if (info == null && entryData.sourceType == "designId") {
	    		var designId = entryData.sourceData;
	    		if (!designId ) {
	    			logger.error("Missing Design ID");
	    			return callback(new Error("Missing Design ID"));
	    		}

	    		dbDesign.getImageDataForDesign(designId, function(err, imageData){
					if (err) {
						return callback(err);
					}

					var sourceImagePath = global.appRoot + config.path.designImagesRaw + imageData.categoryId + "/" + designId + "." + mime.extension(imageData.imageType);

					return callback(null, {sourceImagePath: sourceImagePath, sourceFileIsTemp: false, imageType: "image/jpeg", sourceType: "designId", sourceId: imageData.id});
				});
	    	} else {
	    		return callback(null, info);
	    	}
	    }
	], function (err, info) {
		if (err) {
			logger.error("Some error encountered: " + err);
			return next(err, null);
		} else if (info == null) {
			logger.error("Info is null, meaning none of the inputs were valid.");
			return next(new Error("Info is null, meaning none of the inputs were valid."), null);
		}

		return next(0, info);
	});
}

var entryPrototype = {
	"id" : "id",
	"created" : "timestamp",
	"title" : "string",
	"userId" : "id", //id of user who is posting this entry
	"sourceType" : ["challengeId", "designId", "independentImageId"],
	"sourceId" : "id",
	"imageType": "imageType"
}

module.exports = {
	createEntry: createEntry,
	getEntry: getEntry,
	getEntrySocialInfo: getEntrySocialInfo,
	getEntries: getEntries,
	getEntriesSorted: getEntriesSorted,
	getEntryImageData: getEntryImageData,
	deleteEntry: deleteEntry,
	likeEntry: likeEntry,
	processImageDataForEntry: processImageDataForEntry,
	createEntryNode: createEntryNode
};