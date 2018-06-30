const dbUtils = require("./dbUtils");
const logger = require("../logger");
const shortid = require("shortid");

/**
	Create artifact node.  Format:

	//for presets
	artifact: {
		type: "preset",
		preset: "bannerBottom", etc. (one of the values in presets.json)
	}

	//for custom
	artifact: {
		type: "custom",
		banner: {
			backgroundColor: #ff00aa, (hex color code)
			textColor: #ff00aa, (hex color code)
			fontName: "arial" (fixed for now)
			location: "bottom", "top", "center", "below", "below", "above"
		}
	}
**/
function createArtifactNode(artifact, callback) {
	if (artifact.type == "preset") {
		//preset nodes are created in dbInit.js
		return callback(null, artifact.preset);
	} else if (artifact.type == "custom") {
		var cypherQuery = "CREATE (a:Artifact {";

		var id = shortid.generate();

		cypherQuery += " id : '" + id + "' ";
		cypherQuery += ", artifact_type : 'custom' ";

		if (artifact.banner) {
			cypherQuery += ", banner : 'on'";
			cypherQuery += ", banner_location : '" + artifact.banner.location + "'";
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
	Given the artifact object from the DB node, construct the artifact object
	for the purpose of processing as a filter step
**/
function getArtifactFromNode(artifactFromDB) {
	var artifact = {};

	if (artifactFromDB.artifact_type == "preset") {
		artifact.type = "preset";

		artifact.preset = artifactFromDB.id;			
	} else if (artifactFromDB.artifact_type == "custom") {
		artifact.type = "custom";

		if (artifactFromDB.banner == "on") { //actual banner text is stored in entry.caption
			artifact.banner = {};
			artifact.banner.location = artifactFromDB.banner_location;
			artifact.banner.fontName = artifactFromDB.banner_fontName;
			artifact.banner.backgroundColor = artifactFromDB.banner_backgroundColor;
			artifact.banner.textColor = artifactFromDB.banner_textColor;
		}
	} else {
		logger.error("Invalid type '" + artifactFromDB.artifact_type + "' found for artifactFromDB.artifact_type");
		return null;
	}

	return artifact;
}

/**
	Create layout node.  Format:

	layout: {
		type: "preset",
		preset: "originalLayout", etc. (one of the values in presets.json)
	}

	layout: {
		type: "custom",
		mirror: "flip" | "flop",
		rotation: {
			degrees: <number>
			color: <color>
		},
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
		//preset nodes are created in dbInit.js
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
	Given the layout object from the DB node, construct the layout object
	for the purpose of processing as a filter step
**/
function getLayoutFromNode(layoutFromDB) {
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
	} else {
		logger.error("Invalid type '" + layoutFromDB.layout_type + "' found for layoutFromDB.layout_type");
		return null;
	}

	return layout;
}

/**
	Create a new filter Node in the db with the supplied information in JSON format.

	Returns the id of the newly created node.

	Currently only Preset Filters are supported (see preset.json)

	Format:
	filter: {
		type: "preset",
		preset: "noFilter", etc. (one of the values in presets.json)
	}
**/
function createFilterNode(filter, callback) {
	if (filter.type == "preset") {
		//preset nodes are created in dbInit.js
		return callback(null, filter.preset);
	} else {
		return callback(new Error("Invalid filter.type value passed to createFilterNode: " + filter.type), 0);
	}
}

/**
	Given the filter object from the DB node, construct the filter object
	for the purpose of processing as a filter step
**/
function getFilterFromNode(filterFromDB) {
	var filter = {};

	if (filterFromDB.filter_type == "preset") {
		filter.type = "preset";

		filter.preset = filterFromDB.id;
	} else {
		loger.error("Invalid type '" + filterFromDB.filter_type + "' found for filterFromDB.filter_type");
		return null;
	}

	return filter;
}

/**
	Create decoration node.

	Input format:

	decoration: {
		type: "preset",
		preset: "noBorder", etc. (one of the values in presets.json)
	}

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
	Given the decoration object from the DB node, construct the decoration object
	for the purpose of processing as a filter step
**/
function getDecorationFromNode(decorationFromDB) {
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
		logger.error("Invalid type '" + decorationFromDB.decoration_type + "' found for decorationFromDB.decoration_type");
		return null;
	}

	return decoration;
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

			if (stepFromDB[0][0] == "Artifact") {
				var artifact = getArtifactFromNode(stepFromDB[1]);
				if (artifact) {
					artifacts.push(artifact);
				}
			} else if (stepFromDB[0][0] == "Layout") {
				var layout = getLayoutFromNode(stepFromDB[1]);
				if (layout) {
					layouts.push(layout);
				}
			} else if (stepFromDB[0][0] == "Filter") {
				var filter = getFilterFromNode(stepFromDB[1]);
				if (filter) {
					filters.push(filter);
				}
			} else if (stepFromDB[0][0] == "Decoration") {
				var decoration = getDecorationFromNode(stepFromDB[1]);
				if (decoration) {
					decorations.push(decoration);
				}
			}
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