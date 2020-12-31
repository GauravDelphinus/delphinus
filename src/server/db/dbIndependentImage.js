require("../error");
var serverUtils = require("../serverUtils");
var dbUtils = require("./dbUtils");
var config = require("../config");
var mime = require("mime");
var logger = require("../logger");
var error = require("../error");
var filterUtils = require("../filterUtils");
var async = require("async");
var stepsHandler = require("../stepsHandler");
var shortid = require("shortid");

/**
	Create an IndependentImage that represents the source of an Entry

	Note: this will create the needed image, and then the node as well

	independentImageInfo: {
		sourceType: one of "imageURL" or "dataURI"
		sourceData: actual image URL or dataURI depending on the sourceType
		userId: the user who created this
		created; created timestamp
	}

	return output : {
		id: id of the newly created IndependentImage node
		imageType: mime type of image that was created
		imagePath: path of file that was created
	}
**/
function createIndependentImage(independentImageInfo, done) {
	var id = shortid.generate();
	var imageData = {
		id: id,
		sourceType: independentImageInfo.sourceType,
		sourceData: independentImageInfo.sourceData
	};

	createImageForIndependentImage(imageData, function(err, info) {
		if (err) {
			return done(err);
		}

		var nodeInfo = {
			userId: independentImageInfo.userId,
			id: id,
			created: independentImageInfo.created,
			imageType: info.imageType
		};
		createIndependentImageNode(nodeInfo, function(err, output) {
			if (err) {
				return done(err);
			}

			return done(null, {id: output.id, imagePath: info.imagePath, imageType: info.imageType});
		});
	});
}

/**
	Create the source image for a new IndependentImage

	imageData: {
		id: id of IndependentImage node, this is used to generate the source image path
		sourceType: one of "imageURL" or "dataURI"
		sourceData: the actual imageURL or dataURI, depending on the sourceType
	}

	return output: {
		imageType: a mime type for the image that was saved
		imagePath: path of the file that was created
	}
**/
function createImageForIndependentImage(imageData, callback) {

	if (imageData.sourceType == "imageURL") {
		//var extension = imageData.split('.').pop();
	   	var imageType = mime.lookup(imageData.sourceData);
		var sourceImagePathOriginal = global.appRoot + config.path.independentImagesOriginal + imageData.id + "." + mime.extension(imageType);
		var sourceImagePathRaw = global.appRoot + config.path.independentImagesRaw + imageData.id + "." + mime.extension(imageType);
		serverUtils.downloadImage(imageData.sourceData, sourceImagePathOriginal, sourceImagePathRaw, true, function(err, outputFileOriginal, outputFileRaw) {
			if (err) {
				return callback(err);
			}

			return callback(0, {imageType: imageType, imagePath: outputFileRaw});
		});
	} else if (imageData.sourceType == "dataURI") {
		var parseDataURI = require("parse-data-uri");
		var parsed = parseDataURI(imageData.sourceData);
		var imageType = parsed.mimeType;
		var sourceImagePathOriginal = global.appRoot + config.path.independentImagesOriginal + imageData.id + "." + mime.extension(imageType);
		var sourceImagePathRaw = global.appRoot + config.path.independentImagesRaw + imageData.id + "." + mime.extension(imageType);
		serverUtils.writeImageFromDataURI(imageData.sourceData, sourceImagePathOriginal, sourceImagePathRaw, true, function(err, outputFileOriginal, outputFileRaw) {
			if (err) {
				return callback(err);
			}

			return callback(0, {imageType: imageType, imagePath: outputFileRaw});
		});
	} else {
		return callback(new Error("Invalid Image Source: " + source));
	}
}

/**
	Create a new node in the DB for IndependentImage.

	Note: this function assumes that the source image has already been created (from imageURL or dataURI)
	by calling the createImageForIndependentImage function

	nodeInfo: {
		userId: user id of the person who is creating the image
		id: the id of the image node
		created: created timestamp
		imageType: mime type of the image
	}

	return output: {
		id: id of the node (should be same as that was passed in)
	}
**/
function createIndependentImageNode(nodeInfo, callback) {
	//create a new independent image node
	var cypherQuery = "MATCH(u:User {id: '" + nodeInfo.userId + "'}) CREATE (i:IndependentImage {" +
		"id: '" + nodeInfo.id + "'," +
		"image_type : '" + nodeInfo.imageType + "'," + 
		"created : '" + nodeInfo.created + "' " + 
		"})-[r:POSTED_BY]->(u) RETURN i;";

	logger.dbDebug(cypherQuery);
	dbUtils.runQuery(cypherQuery, function(err, result){
		if(err) {
			logger.dbError(err, cypherQuery);
			return callback(err);
		} else if (result.records.length != 1) {
			logger.dbResultError(cypherQuery, 1, result.records.length);
			return callback(new Error("cypherQuery returned invalid response."));
		}

		logger.debug("result is: " + JSON.stringify(result));
		let record = result.records[0];
		let independentImage = dbUtils.recordGetField(record, "i");
		return callback(null, {id: independentImage.id});
	});
}

module.exports = {
	createIndependentImage: createIndependentImage,
	createIndependentImageNode: createIndependentImageNode
};
