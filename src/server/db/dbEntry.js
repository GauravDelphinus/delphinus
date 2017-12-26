require("../error");
var serverUtils = require("../serverUtils");
var dataUtils = require("../dataUtils");
var dbUtils = require("./dbUtils");
var config = require("../config");
var mime = require("mime");
var logger = require("../logger");

/*
	Get Info about an Entry by looking up the DB
*/
function getEntry(entryId, done) {
	var cypherQuery = "MATCH (e:Entry {id: '" + entryId + "'})-[:POSTED_BY]->(poster:User) " +
		" WITH e, poster " + 
		" RETURN e, poster;";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.data.length != 1) {
			return done(new DBResultError(cypherQuery, 1, result.data.length));
		}

		var entry = result.data[0][0];
		var poster = result.data[0][1];

		output = entryNodeToClientData(entry, poster);

		return done(null ,output);
	});
}

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

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
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
		cypherQuery += " MATCH (e:Entry)-[:POSTED_BY]->(poster:User {id: '" + postedBy + "'}) " + timestampClause +
			" WITH poster, COLLECT(e) AS all_entities " +
			" UNWIND all_entities AS e " +
			" RETURN e, poster " +
			" ORDER BY e.activity_timestamp DESC LIMIT " + config.businessLogic.infiniteScrollChunkSize + ";";
	} else if (challengeId) {
		cypherQuery += " MATCH (poster:User)<-[:POSTED_BY]-(e:Entry)-[:PART_OF]->(challenge:Challenge {id: '" + challengeId + "'}) " + timestampClause +
			" WITH e, poster " +
			" RETURN e, poster " +
			" ORDER BY e.activity_timestamp DESC LIMIT " + config.businessLogic.infiniteScrollChunkSize + ";";
	} else {
		cypherQuery += " MATCH (e:Entry)-[:POSTED_BY]->(poster:User) " + timestampClause +
			" WITH e, poster " +
			" RETURN e, poster " + 
			" ORDER BY e.activity_timestamp DESC LIMIT " + config.businessLogic.infiniteScrollChunkSize + ";";
	}

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result) {
		if (err) {
			logger.dbError(err, cypherQuery);
			return done(err, 0);
		}

		var newTimeStamp = 0;
		var output = [];
		for (var i = 0; i < result.data.length; i++) {
			var data = {};

			var entry = result.data[i][0];
			var poster = result.data[i][1];

			data = entryNodeToClientData(entry, poster);

			//update new time stamp to be sent back to client
			newTimeStamp = data.activity.timestamp;

			output.push(data);
		}

		return done(null, output, newTimeStamp);
	});
}


/*
	Create a new Entry node in the db.
	Prototype: entryPrototype
*/
function createEntryOld(entryInfo, done) {
	if (!serverUtils.validateData(entryInfo, entryPrototype)) {
		return done(new Error("Invalid entry info"));
	}

	var cypherQuery = " MATCH (u:User {id: '" + entryInfo.userId + "'}) CREATE (e:Entry {" +
					"id: '" + entryInfo.id + "', " + 
					"caption: '" + dataUtils.sanitizeStringForCypher(entryInfo.title) + "', " + 
					"created : " + entryInfo.created + " " + 
					"})-[r:POSTED_BY]->(u) ";

	if (entryInfo.source == "challengeId") { //link to challenge
		cypherQuery = "MATCH (c:Challenge {id: '" + entryInfo.sourceId + "'}) " +
					cypherQuery +
					", (c)<-[:PART_OF]-(e) RETURN e;";
	} else if (entryInfo.source == "designId") {// link to design
		cypherQuery = "MATCH (d:Design {id: '" + entryInfo.sourceId + "'}) " +
					cypherQuery +
					", (d)<-[:BASED_ON]-(e) RETURN e;";
	} else { //independent entry
		cypherQuery += " RETURN e;";
	}

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
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

function createEntry(entryInfo, done) {

	if (!entryInfo.steps) {
		return done(new Error("Entry Steps missing"));
	}

	var entryData = {
		sourceType: entryInfo.sourceType,
		sourceData: entryInfo.sourceData,
		userId: entryInfo.userId
	};

	createImagesForEntry(entryData, entryInfo.steps, entryInfo.title, function(err, info) {
		if (err) {
			return done(err);
		}

		entryInfo.imageType = info.imageType;
		if (entryInfo.sourceType == "imageURL" || entryInfo.sourceType == "dataURI") {
			entryInfo.sourceType = "independentImageId";
		}
		entryInfo.sourceId = info.sourceId;

		createEntryNode(entryInfo, function(err, nodeInfo) {
			if (err) {
				return done(err);
			}

			createFilterNodesForEntry(nodeInfo.id, entryInfo.steps, function(err) {
				if (err) {
					return done(err);
				}

				return done(null, {id: nodeInfo.id});
			});
		});
	});
}

function createEntryNode(entryInfo, done) {
	if (!serverUtils.validateData(entryInfo, entryPrototype)) {
		return done(new Error("Invalid entry info"));
	}

	var cypherQuery = " MATCH (u:User {id: '" + entryInfo.userId + "'}) CREATE (e:Entry {" +
					"id: '" + entryInfo.id + "', " + 
					"caption: '" + dataUtils.sanitizeStringForCypher(entryInfo.title) + "', " + 
					"created : " + entryInfo.created + ", " + 
					"image_type: '" + entryInfo.imageType + "' " +
					"})-[r:POSTED_BY]->(u) ";

	if (entryInfo.sourceType == "challengeId") { //link to challenge
		cypherQuery = "MATCH (c:Challenge {id: '" + entryInfo.sourceId + "'}) " +
					cypherQuery +
					", (c)<-[:PART_OF]-(e) RETURN e;";
	} else if (entryInfo.sourceType == "designId") {// link to design
		cypherQuery = "MATCH (d:Design {id: '" + entryInfo.sourceId + "'}) " +
					cypherQuery +
					", (d)<-[:BASED_ON]-(e) RETURN e;";
	} else if (entryInfo.sourceType == "independentImageId") {// link to Independent Image
		cypherQuery = "MATCH (i:IndependentImage {id: '" + entryInfo.sourceId + "'}) " +
					cypherQuery +
					", (d)<-[:BASED_ON]-(e) RETURN e;";
	}

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
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
function createImagesForEntry(entryData, steps, caption, done) {

	filterUtils.processImageDataForEntry(entryData, true, function(err, info) {
		if (err) {
			logger.error("Error in processImageDataForEntry: " + err);
			return res.sendStatus(500);
		}

		//now, generate the image(s)
		var singleStepList = filterUtils.extractSingleStepList(steps);
		var applySingleStepToImageFunctions = [];

		for (var i = 0; i < singleStepList.length; i++) {
			var hash = filterUtils.generateHash(JSON.stringify(singleStepList[i]));
			var targetImagePath = global.appRoot + config.path.cacheImages + info.sourceId + "-" + hash + "." + mime.extension(info.imageType);

			applySingleStepToImageFunctions.push(async.apply(imageProcessor.applyStepsToImage, info.sourceImagePath, targetImagePath, info.imageType, singleStepList[i], dataUtils.escapeSingleQuotes(caption)));
		}

		var imagePaths = []; //list of image paths for each sub step
		async.series(applySingleStepToImageFunctions, function(err, imagePaths) {
			if (err) {
				return done(new Error("Error creating Images for the Entry Steps: " + err));
			}

			//create a copy of the final cumulative/combined (i.e., last step in the array) to the entry image
			var entryImagePath = global.appRoot + config.path.entryImages + id + "." + mime.extension(info.imageType);
			//serverUtils.copyFile(imagePaths[imagePaths.length - 1], entryImagePath, function(err) {
			imageProcessor.addWatermarkToImage(imagePaths[imagePaths.length - 1], entryImagePath, function(err) {
				if (err) {
					return done(new Error("Error creating the final Entry Image: " + err));
				}

				var output = {imageType: info.imageType};
				if (req.body.source == "dataURI" || req.body.source == "imageURL") {
					output.independentImageId = info.sourceId;
				}

				return done(null, output);
			});
		});	
	});
}

function createFilterNodesForEntry(entryId, steps, done) {
	var createFilterNodesFunctions = []; // array of functions that will create the Filter Nodes

	if (steps) {
		if (steps.layouts && steps.layouts.constructor === Array) {
			for (var i = 0; i < steps.layouts.length; i++) {
				var layout = steps.layouts[i];

				if (layout.type == "preset" || layout.type == "custom") {
					createFilterNodesFunctions.push(async.apply(dataUtils.createLayoutNode, layout));
				}
			}
		}

		if (steps.filters && (steps.filters.constructor === Array)) {
			for (var i = 0; i < steps.filters.length; i++) {
				var filter = steps.filters[i];

				if (filter.type == "preset" || filter.type == "custom") {
					createFilterNodesFunctions.push(async.apply(dataUtils.createFilterNode, filter));
				}
			}
		}

		if (steps.artifacts && steps.artifacts.constructor === Array) {
			for (var i = 0; i < steps.artifacts.length; i++) {
				var artifact = steps.artifacts[i];

				if (artifact.type == "preset" || artifact.type == "custom") {
					createFilterNodesFunctions.push(async.apply(dataUtils.createArtifactNode, artifact));
				}
			}
		}

		if (steps.decorations && steps.decorations.constructor === Array) {
			for (var i = 0; i < steps.decorations.length; i++) {
				var decoration = steps.decorations[i];

				if (decoration.type == "preset" || decoration.type == "custom") {
					createFilterNodesFunctions.push(async.apply(dataUtils.createDecorationNode, decoration));
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

		db.cypherQuery(cypherQuery, function(err, result){
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
	Delete the matching entry node (and associated dependencies) from the DB
*/
function deleteEntry(entryId, done) {

	var cypherQuery = "MATCH (e:Entry {id: '" + entryId + "'}) " +
		" OPTIONAL MATCH (e)<-[:POSTED_IN*1..2]-(comment:Comment) " +
		" DETACH DELETE comment, e;";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
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

		dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
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
		var cypherQuery = "MATCH (u:User {id: '" + req.user.id + "'})-[r:LIKES]->(c:Entry {id: '" + entryId + "'}) " +
			" DELETE r " +
			" RETURN COUNT(r);";

		dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
	        if(err) {
	        	return done(err);
	        } else if (!(result.data.length == 0 || result.data.length == 1)) {
	        	return done(new DBResultError(cypherQuery, "0 or 1", result.data.length));
	        }

	        //now, reset the activity in the entry, since the person no longer likes this entry
	        var activityInfo = {
	        	entityId: entryId,
	        	type: "post"
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

var entryPrototype = {
	"id" : "id",
	"created" : "timestamp",
	"title" : "string",
	"userId" : "id", //id of user who is posting this entry
	"sourceType" : ["challengeId", "designId", "independentImageId"],
	"sourceId" : "id"
}

//convert the entry DB node to data in the format the client expects
function entryNodeToClientData(entry, poster) {
	var output = {
		type: "entry",
		id : entry.id,
		postedDate : entry.created,
		postedByUser : {
			id : poster.id,
			displayName : poster.displayName,
			image : poster.image,
			lastSeen : poster.last_seen
		},
		image: config.url.entryImages + entry.id + "." + mime.extension(entry.image_type),
		imageType: entry.image_type,
		caption: entry.caption,
		link: config.url.entry + entry.id,
		activity : {
			type : entry.activity_type,
			timestamp : entry.activity_timestamp,
			userId : entry.activity_user
		}
	};

	if (entry.activity_type == "comment") {
		output.activity.commentId = entry.activity_commentid;
	}

	return output;
}

module.exports = {
	createEntry: createEntry,
	getEntry: getEntry,
	getEntrySocialInfo: getEntrySocialInfo,
	getEntries: getEntries,
	deleteEntry: deleteEntry,
	likeEntry: likeEntry
};