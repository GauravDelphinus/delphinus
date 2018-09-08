require("../error");
var serverUtils = require("../serverUtils");
var dbUtils = require("./dbUtils");
var config = require("../config");
var mime = require("mime");
var logger = require("../logger");
var stepsHandler = require("../stepsHandler");
var imageHandler = require("../imageHandler");
var error = require("../error");

/*
	Get info about a Challenge by looking up the DB
*/
function getChallenge(challengeId, done) {
	var cypherQuery = "MATCH (category:Category)<-[:POSTED_IN]-(c:Challenge {id: '" + challengeId + "'})-[r:POSTED_BY]->(poster:User) " +
		" WITH c, category, poster " +
		" RETURN c, poster, category;";

	dbUtils.runQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.data.length != 1) {
			return done(new error.DBResultError(cypherQuery, 1, result.data.length));
		}

		var challenge = result.data[0][0];
		var poster = result.data[0][1];
		var category = result.data[0][2];

		output = dbUtils.entityNodeToClientData("Challenge", challenge, poster, category);

		return done(null, output);
	});
}

/*
	Get info about the social info about a Challenge from the DB
*/
function getChallengeSocialInfo(challengeId, meId, done) {
	var cypherQuery = "MATCH (c:Challenge {id: '" + challengeId + "'}) " +
		" WITH c " +
		" OPTIONAL MATCH (u2:User)-[:LIKES]->(c) " + 
		" WITH c, COUNT(u2) AS like_count " + 
		" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
		" WITH c, like_count, COUNT(comment) as comment_count " + 
		" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) " +
		" WITH c, like_count, comment_count, COUNT(entry) AS entry_count " +
		" OPTIONAL MATCH (me:User {id: '" + meId + "'})-[like:LIKES]->(c) " +
		" WITH c, like_count, comment_count, entry_count, COUNT(like) AS amLiking " +
		" RETURN like_count, comment_count, entry_count, amLiking;";

	dbUtils.runQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.data.length != 1) {
			return done(new DBResultError(cypherQuery, 1, result.data.length));
		}

		//social status
		var numLikes = result.data[0][0];
		var numComments = result.data[0][1];
		var numEntries = result.data[0][2];
		var amLiking = result.data[0][3] > 0;
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
			},
			entries : {
				numEntries : numEntries
			}
		};

		return done(null, output);
	});
}

/*
	Fetch all challenges from the DB matching the provided criteria.

	Note that info is returned in chunks of size config.businessLogic.chunkSize
*/
function getChallenges(postedBy, categoryId, lastFetchedTimestamp, done) {

	var cypherQuery = "";

	var timestampClause;

	if (lastFetchedTimestamp == 0) {
		timestampClause = "";
	} else {
		timestampClause = " WHERE (e.activity_timestamp < " + lastFetchedTimestamp + ") " ;
	} 

	if (postedBy) {
		cypherQuery += " MATCH (category:Category)<-[:POSTED_IN]-(e:Challenge)-[:POSTED_BY]->(poster:User {id: '" + postedBy + "'}) " + timestampClause;
	} else if (categoryId) {
		cypherQuery += " MATCH (poster:User)<-[:POSTED_BY]-(e:Challenge)-[:POSTED_IN]->(category:Category {id: '" + categoryId + "'}) " + timestampClause;
	} else {
		cypherQuery += " MATCH (category:Category)<-[:POSTED_IN]-(e:Challenge)-[:POSTED_BY]->(poster:User) " + timestampClause;	
	}

	cypherQuery +=
		" WITH e, poster, category " +
		" RETURN e, poster, category " + 
		" ORDER BY e.activity_timestamp DESC LIMIT " + config.businessLogic.infiniteScrollChunkSize + ";";

	dbUtils.runQuery(cypherQuery, function(err, result) {
		if (err) {
			return done(err, 0);
		}

		var newTimeStamp = 0;
		var output = [];
		for (var i = 0; i < result.data.length; i++) {
			var data = {};

			var challenge = result.data[i][0];
			var poster = result.data[i][1];
			var category = result.data[i][2];

			data = dbUtils.entityNodeToClientData("Challenge", challenge, poster, category);

			newTimeStamp = data.activity.timestamp;

			output.push(data);
		}

		return done(null, output, newTimeStamp);
	});
}

/*
	Fetch all challenges from the DB matching the provided criteria, and sorted by the given sort flag.

	Note: this only supports limited output given the performance hit.  This API returns all in one go,
	and does not support chunked outputs.
*/
function getChallengesSorted(sortBy, limit, postedBy, categoryId, done) {

	limit = Math.min(limit, config.businessLogic.maxCustomSortedLimit);

	var cypherQuery = "";

	if (postedBy) {
		cypherQuery += " MATCH (category:Category)<-[:POSTED_IN]-(e:Challenge)-[:POSTED_BY]->(poster:User {id: '" + postedBy + "'}) ";
	} else if (categoryId) {
		cypherQuery += " MATCH (poster:User)<-[:POSTED_BY]-(e:Challenge)-[:POSTED_IN]->(category:Category {id: '" + categoryId + "'}) ";
	} else {
		cypherQuery += " MATCH (category:Category)<-[:POSTED_IN]-(e:Challenge)-[:POSTED_BY]->(poster:User) ";
	}

	/*
		PRIORITY is WEIGHTED BASED ON THE BELOW RULES:

		Overall Popularity = (Number of Likes x 5) + (Number of Comments x 2) + (Number of Entries x 10)
	*/
	cypherQuery +=
		" WITH e, poster, category " +
		" OPTIONAL MATCH (u2:User)-[:LIKES]->(e) " + 
		" WITH e, poster, category, COUNT(u2) AS like_count " + 
		" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(e) " + 
		" WITH e, poster, category, like_count, COUNT(comment) as comment_count " + 
		" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(e) " +
		" WITH e, poster, category, 5 * like_count + 2 * comment_count + 10 * COUNT(entry) AS popularity_count " +
		" RETURN e, poster, category, popularity_count " + 
		" ORDER BY popularity_count DESC LIMIT " + limit + ";";

	dbUtils.runQuery(cypherQuery, function(err, result) {
		if (err) {
			return done(err, 0);
		}

		var output = [];
		for (var i = 0; i < result.data.length; i++) {
			var data = {};

			var challenge = result.data[i][0];
			var poster = result.data[i][1];
			var category = result.data[i][2];

			data = dbUtils.entityNodeToClientData("Challenge", challenge, poster, category);

			output.push(data);
		}

		return done(null, output);
	});
}

/**
	Create the node for the given Challenge Category

	nodeInfo: prototype this.categoryPrototype

	return output: {
		id: id of the created node
	}

**/
function createCategoryNode(nodeInfo, callback) {
	if (!serverUtils.validateData(nodeInfo, categoryPrototype)) {
		return done(new Error("Invalid category info"));
	}

	var cypherQuery = " MERGE (c:Category {id: '" + nodeInfo.id + "'}) " +
		" ON CREATE SET c.name = '" + nodeInfo.name + "' RETURN c;";
		
	dbUtils.runQuery(cypherQuery, function(err, result){
		if(err) {
			return callback(err);
		}

		return callback(0, {id: result.data[0].id});
	});
}

/*
	Create the challenge given the information provided
*/
function createChallenge(challengeInfo, done) {
	createImageForChallenge(challengeInfo.id, challengeInfo.imageDataURI, function(err, info) {
		if (err) {
			return done(err);
		}

		challengeInfo.imageType = info.imageType;
		delete challengeInfo.imageDataURI; //this is because createChallengeNode does not need this
		createChallengeNode(challengeInfo, function(err, nodeInfo) {
			if (err) {
				return done(err);
			}

			return done(null, {id: nodeInfo.id});
		});
	});
}

/*
	Create the Raw and Watermarked (public) images for the challenge
*/
function createImageForChallenge(challengeId, imageDataURI, done) {
	// Store the incoming base64 encoded image into a local image file first
	var parseDataURI = require("parse-data-uri");
	var parsed = parseDataURI(imageDataURI);

	var imageType = parsed.mimeType;

	//generate path name for challenge image
	var name = challengeId + "." + mime.extension(imageType); //generate name of image file
	var fullpathRaw = global.appRoot + config.path.challengeImagesRaw + name;
	var fullpathOriginal = global.appRoot + config.path.challengeImagesOriginal + name;
	
	//write the data to a file
	serverUtils.writeImageFromDataURI(imageDataURI, fullpathOriginal, fullpathRaw, true, function(err, pathOriginal, pathRaw) {
		if (err) {
			return done(err);
		}

		var baseDir = global.appRoot + config.path.challengeImages;
		var fullPath = baseDir + name;
		imageHandler.addWatermarkToImage(pathRaw, fullPath, function(err, outputPath) {
			if (err) {
				return done(new Error("Failed to apply watermark: " + fullPath));
			}

			return done(null, {imageType: imageType});
		});
	});
}

/*
	Create a new Challenge node in the db.
	Prototype: challengePrototype
*/
function createChallengeNode(challengeInfo, done) {
	if (!serverUtils.validateData(challengeInfo, challengePrototype)) {
		return done(new Error("Invalid challenge info"));
	}

	var cypherQuery = "MATCH(u:User {id: '" + challengeInfo.userId + "'}) MATCH (category:Category {id: '" + challengeInfo.category + "'}) " +
		"CREATE (n:Challenge {" +
		"id: '" + challengeInfo.id + "'," +
		"image_type : '" + challengeInfo.imageType + "'," + 
		"created : " + challengeInfo.created + "," + 
		"title : '" + dbUtils.sanitizeStringForCypher(challengeInfo.title) + "'" +
		"})-[r:POSTED_BY]->(u), (n)-[:POSTED_IN]->(category) RETURN n;";

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
        	timestamp: challengeInfo.created,
        	userId: challengeInfo.userId
        }
        dbUtils.saveActivity(activityInfo, function(err, result) {
        	if (err) {
        		logger.error(err);
        		return res.sendStatus(500);
        	}

			return done(null, {id: result.id});
		});
	});
}

/*
	Find out if the given user has the permissions to delete
	the given challenge
*/
function canDeleteChallenge(challengeId, userId, done) {
	getChallenge(challengeId, function(err, challenge) {
		if (err) {
			return done(err);
		}

		//only the person who posted the challenge can delete it
		return done(null, challenge.postedByUser.id == userId);
	});
}

/*
	Delete the matching challenge node from the DB
*/
function deleteChallenge(challengeId, done) {

	var cypherQuery = " MATCH (c:Challenge {id: '" + challengeId + "'}) " +
		" OPTIONAL MATCH (c)<-[:POSTED_IN*1..2]-(challengeComment:Comment) " +
		" OPTIONAL MATCH (c)<-[:PART_OF]-(e:Entry) " + 
		" OPTIONAL MATCH(e)<-[:POSTED_IN*1..2]-(entryComment:Comment) " +
		" DETACH DELETE challengeComment, entryComment, c, e;";

	dbUtils.runQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		}

		return done(null);
	});
}

/*
	Update the Like status of a challenge node in the DB, along with the timestamp

	This also internally will update the activity info in the corresponding Challenge Node in the DB

	like: true for adding like, and false for removing like
*/
function likeChallenge(challengeId, like, userId, timestamp, done) {
	if (like) {
		var cypherQuery = "MATCH (u:User {id: '" + userId + "'}), (c:Challenge {id: '" + challengeId + "'}) " +
			" CREATE (u)-[r:LIKES {created: '" + timestamp + "'}]->(c) " +
			" RETURN r;";

		dbUtils.runQuery(cypherQuery, function(err, result){
	        if(err) {
	        	return done(err);
	        } else if (!(result.data.length == 0 || result.data.length == 1)) {
	        	return done(new DBResultError(cypherQuery, "0 or 1", result.data.length));
	        }

	        //now, save the activity in the challenge
	        var activityInfo = {
	        	entityId: challengeId,
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
		var cypherQuery = "MATCH (u:User {id: '" + userId + "'})-[r:LIKES]->(c:Challenge {id: '" + challengeId + "'}) " +
			" DELETE r " +
			" RETURN COUNT(r);";

		dbUtils.runQuery(cypherQuery, function(err, result){
	        if(err) {
	        	return done(err);
	        } else if (!(result.data.length == 0 || result.data.length == 1)) {
	        	return done(new DBResultError(cypherQuery, "0 or 1", result.data.length));
	        }

	        //now, reset the activity in the challenge, since the person no longer likes this challenge
	        var activityInfo = {
	        	entityId: challengeId,
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

//prototype of challenge info that is needed to create a challenge node in the DB
var challengePrototype = {
	"id" : "id",
	"imageType" : "imageType",
	"created" : "timestamp",
	"title" : "string",
	"userId" : "id", //id of user who is posting this challenge
	"category" : "category" //id of category this challenge belongs to
}

var categoryPrototype = {
	"id" : "category",
	"name" : "string"
}

module.exports = {
	createChallenge: createChallenge,
	getChallengeSocialInfo : getChallengeSocialInfo,
	getChallenge : getChallenge,
	getChallenges: getChallenges,
	getChallengesSorted: getChallengesSorted,
	likeChallenge: likeChallenge,
	deleteChallenge: deleteChallenge,
	createCategoryNode: createCategoryNode,
	createChallengeNode: createChallengeNode,
	canDeleteChallenge: canDeleteChallenge
};