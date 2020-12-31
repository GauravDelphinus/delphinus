const error = require("../error");
const config = require("../config");
const logger = require("../logger");
const dbUtils = require("./dbUtils");
const serverUtils = require("../serverUtils");

/**
	Get the designs matching the category (if provided) or all designs

	Note: the designs are initialized in the DB from designs.json, so they must be in sync
	Please do not modify anything in the DB interface (including names of fields) without also
	accounting for the entries in designs.json, and ensuring the DB gets updated to reflect the
	new changes.

	designCategory: the id of the design category.  if available, must match the id in designs.json

	return output is a map:
		designCategoryId -> array of design objects under this category.  

		each element in the above array should be of this form:
			{
				id: id of the design, must match that in designs.json
				name: user visible name of the design
				image: publicly accessible url of the design image
				presetArtifactId: the id of the caption (artifact) that should be set as the default.  Must match presets.json
				captionTextSize: whole number that specifies the default text size to set for the caption, when this design is selected (for best visual treatment)
				captionTextColor: a css compatible color value that specifies the default text color to set for the caption, when this design is selected (for best visual treatment)
				captionBackgroundColor: a css compatible color value that specifies the default background color to set for the caption, when this design is selected (for best visual treatment)
			}
**/
function getDesigns(designCategory, done) {
	var cypherQuery = "MATCH (d:Design)";

	if (designCategory) {
		cypherQuery += "-[:BELONGS_TO]->(c:DesignCategory {id: '" + designCategory + "'}) ";
	} else {
		cypherQuery += "-[:BELONGS_TO]->(c:DesignCategory) ";
	}

	cypherQuery += " RETURN d, c;";

	dbUtils.runQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.records.length <= 0) {
			return done(new error.dbResultError(cypherQuery, "> 0", result.records.length));
		}

		var output = {};
		for (var i = 0; i < result.records.length; i++) {
			var record = result.records[i];

			let design = dbUtils.recordGetField(record, "d");
			let category = dbUtils.recordGetField(record, "c");

			let designName = design.name;
			let designId = design.id;
			let categoryName = category.name;
			let categoryId = category.id;

			//fetch preset values for caption
			let presetArtifactId = design.caption_preset_id;
			let captionTextSize = design.caption_default_text_size;
			let captionTextColor = design.caption_default_text_color;
			let captionBackgroundColor = design.caption_default_background_color;


			if (!output.hasOwnProperty(categoryId)) {
				output[categoryId] = {name: categoryName, designList: []};
			}
			output[categoryId].designList.push({
				name: designName, 
				id: designId, 
				image: config.url.designImages + categoryId + "/" + designId + ".jpeg", 
				presetArtifactId: presetArtifactId,
				captionTextSize: captionTextSize,
				captionTextColor: captionTextColor,
				captionBackgroundColor: captionBackgroundColor
			});
		}

		return done(null, output);
	});
}

function getDesign(designId, done) {
	var cypherQuery = "MATCH (d:Design {id: '" + designId + "'})";
	
	cypherQuery += "-[:BELONGS_TO]->(c:DesignCategory) ";
	cypherQuery += " RETURN d, c;";

	dbUtils.runQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.records.length != 1) {
			return done(new error.dbResultError(cypherQuery, 1, result.records.length));
		}
		
		var record = result.records[0];

		var design = dbUtils.recordGetField(record, "d");
		var category = dbUtils.recordGetField(record, "c");

		let designName = design.name;
		let designId = design.id;
		let categoryName = category.name;
		let categoryId = category.id;

		
		var output = {
			caption: designName, 
			id: designId, 
			image: config.url.designImages + categoryId + "/" + designId + ".jpeg",
			imageType: "image/jpeg"
		};

		return done(null, output);
	});
}

function getImageDataForDesign(designId, next) {
	var cypherQuery = "MATCH (d:Design {id: '" + designId + "'})-[:BELONGS_TO]->(c:DesignCategory) RETURN d, c;";
	dbUtils.runQuery(cypherQuery, function(err, output){
    	if (err) {
    		return next(err, null);
    	}

    	var record = output.records[0];

    	var d = dbUtils.recordGetField(record, "d");
    	var c = dbUtils.recordGetField(record, "c");

    	var imageData = {id: d.id, imageType: "image/jpeg", categoryId: c.id};

    	return next(0, imageData);
    });
}

/**
	Create a node in the DB to represent the design category

	categoryId: valid id of the category, must match the value in designs.json
	categoryName: valid name of the category, must match the value in designs.json

	return output: {
		id: id of the category node that was successfully created
	}
**/
function createNodeForDesignCategory(categoryId, categoryName, callback) {
	if (categoryId && categoryName) {

		//before we create the node, check that the category folder exists
		serverUtils.directoryExists(global.appRoot + config.path.designImagesRaw + categoryId, function(err) {
			if (err) {
				return callback(err, 0);
			}

			var cypherQuery = "MERGE (c:DesignCategory {id: '" + categoryId + "'}) ON CREATE SET c.name = '" + categoryName + "' RETURN c;";

			dbUtils.runQuery(cypherQuery, function(err, result) {
				if (err) {
					logger.dbError(cypherQuery);
					return callback(err, 0);
				}

				var record = result.records[0];
				var category = dbUtils.recordGetField(record, "c");

				return callback(0, {id: category.id});
			});
		});
	}
}

/**
	Create a node in the DB to represent the design

	designInfo: {
		id: id of the design that needs to be created
		name: name of the design
		categoryId: id of the category this design belongs to
		presetArtifactId: id of the preset caption/artifact that needs to be selected by default when this design is selected by the user
		captionTextSize: whole number representing the text size that should be used as the default for the caption when using this design
		captionTextColor: css compatible color value representing the text color that should be used as the default for the caption when using this design
		captionBackgroundColor: css compatible color value representing the background color of the caption when using this design
	}

	return output: {
		id: id of the design node that was successfully created
	}
**/
function createNodeForDesign(designInfo, callback) {
	//first check to make sure the image file exists
	serverUtils.fileExists(global.appRoot + config.path.designImagesRaw + designInfo.categoryId + "/" + designInfo.id + ".jpeg", function(err) {
		if (err) {
			return callback(err, 0);
		}

		var cypherQuery = "MATCH (c:DesignCategory {id: '" + designInfo.categoryId + "'}) " +
			" MERGE (d:Design {id: '" + designInfo.id + "'})-[:BELONGS_TO]->(c) " + 
			" SET d.name = '" + designInfo.name + "' , " + 
			" d.caption_preset_id = '" + designInfo.presetArtifactId + "', " + 
			" d.caption_default_text_size = '" + designInfo.captionTextSize + "', " + 
			" d.caption_default_text_color = '" + designInfo.captionTextColor + "', " + 
			" d.caption_default_background_color = '" + designInfo.captionBackgroundColor + "' " + 
			" RETURN d;";

		dbUtils.runQuery(cypherQuery, function(err, result) {
			if (err) {
				return callback(err, 0);
			}

			var record = result.records[0];
			var design = dbUtils.recordGetField(record, "d");

			return callback(0, {id: design.id});
		});
	});
}

var functions = {
	getDesigns: getDesigns,
	getDesign: getDesign,
	createNodeForDesign: createNodeForDesign,
	createNodeForDesignCategory: createNodeForDesignCategory,
	getImageDataForDesign: getImageDataForDesign
};

for(var key in functions) {
    module.exports[key] = functions[key];
}