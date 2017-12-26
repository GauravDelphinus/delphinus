require("../error");
var serverUtils = require("../serverUtils");
var dataUtils = require("../dataUtils");
var dbUtils = require("./dbUtils");
var config = require("../config");
var mime = require("mime");
var logger = require("../logger");
var imageProcessor = require("../imageProcessor");

/*
	Get info about a Challenge by looking up the DB
*/
function getChallenge(challengeId, done) {
	var cypherQuery = "MATCH (category:Category)<-[:POSTED_IN]-(c:Challenge {id: '" + challengeId + "'})-[r:POSTED_BY]->(poster:User) " +
		" WITH c, category, poster " +
		" RETURN c, poster, category;";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.data.length != 1) {
			return done(new DBResultError(cypherQuery, 1, result.data.length));
		}

		var challenge = result.data[0][0];
		var poster = result.data[0][1];
		var category = result.data[0][2];

		output = challengeNodeToClientData(challenge, poster, category);

		return done(null ,output);
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

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
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
		cypherQuery += " MATCH (category:Category)<-[:POSTED_IN]-(e:Challenge)-[:POSTED_BY]->(poster:User {id: '" + postedBy + "'}) " + timestampClause +
			" WITH e, poster, category, COLLECT(e) AS all_entities " +
			" UNWIND all_entities AS e " +
			" RETURN e, poster, category " +
			" ORDER BY e.activity_timestamp DESC LIMIT " + config.businessLogic.infiniteScrollChunkSize + ";";
	} else if (categoryId) {
		cypherQuery += " MATCH (poster:User)<-[:POSTED_BY]-(e:Challenge)-[:POSTED_IN]->(category:Category {id: '" + categoryId + "'}) " + timestampClause +
			" WITH e, poster, category " +
			" RETURN e, poster, category " +
			" ORDER BY e.activity_timestamp DESC LIMIT " + config.businessLogic.infiniteScrollChunkSize + ";";
	} else {
		cypherQuery += " MATCH (category:Category)<-[:POSTED_IN]-(e:Challenge)-[:POSTED_BY]->(poster:User) " + timestampClause +
			" WITH e, poster, category " +
			" RETURN e, poster, category " + 
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

			var challenge = result.data[i][0];
			var poster = result.data[i][1];
			var category = result.data[i][2];

			data = challengeNodeToClientData(challenge, poster, category);

			newTimeStamp = data.activity.timestamp;

			output.push(data);
		}

		return done(null, output, newTimeStamp);
	});
}

/*
	Create the challenge node given the information provided
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
	var fs = require('fs');
	var parseDataURI = require("parse-data-uri");
	var parsed = parseDataURI(imageDataURI);

	var imageType = parsed.mimeType;

	//generate path name for challenge image
	var baseDirRaw = global.appRoot + config.path.challengeImagesRaw;
	var name = challengeId + "." + mime.extension(imageType); //generate name of image file
	var fullpathRaw = baseDirRaw + name;
	
	//write the data to a file
	var buffer = parsed.data;
	fs.writeFile(fullpathRaw, buffer, function(err) {
		if (err) {
			return done(new Error("Failed to write file: " + fullpathRaw));
		}

		var baseDir = global.appRoot + config.path.challengeImages;
		var fullPath = baseDir + name;
		imageProcessor.addWatermarkToImage(fullpathRaw, fullPath, function(err, outputPath) {
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
		"title : '" + dataUtils.sanitizeStringForCypher(challengeInfo.title) + "'" +
		"})-[r:POSTED_BY]->(u), (n)-[:POSTED_IN]->(category) RETURN n;";

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
	Delete the matching challenge node from the DB
*/
function deleteChallenge(challengeId, done) {

	var cypherQuery = " MATCH (c:Challenge {id: '" + challengeId + "'}) " +
		" OPTIONAL MATCH (c)<-[:POSTED_IN*1..2]-(challengeComment:Comment) " +
		" OPTIONAL MATCH (c)<-[:PART_OF]-(e:Entry) " + 
		" OPTIONAL MATCH(e)<-[:POSTED_IN*1..2]-(entryComment:Comment) " +
		" DETACH DELETE challengeComment, entryComment, c, e;";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
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

		dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
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
		var cypherQuery = "MATCH (u:User {id: '" + req.user.id + "'})-[r:LIKES]->(c:Challenge {id: '" + challengeId + "'}) " +
			" DELETE r " +
			" RETURN COUNT(r);";

		dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
	        if(err) {
	        	return done(err);
	        } else if (!(result.data.length == 0 || result.data.length == 1)) {
	        	return done(new DBResultError(cypherQuery, "0 or 1", result.data.length));
	        }

	        //now, reset the activity in the challenge, since the person no longer likes this challenge
	        var activityInfo = {
	        	entityId: challengeId,
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

//prototype of challenge info that is needed to create a challenge node in the DB
var challengePrototype = {
	"id" : "id",
	"imageType" : "imageType",
	"created" : "timestamp",
	"title" : "string",
	"userId" : "id", //id of user who is posting this challenge
	"category" : "category" //id of category this challenge belongs to
}

//convert the challenge DB node to data in the format the client expects
function challengeNodeToClientData(challenge, poster, category) {
	var output = {
		type: "challenge",
		id : challenge.id,
		postedDate : challenge.created,
		postedByUser : {
			id : poster.id,
			displayName : poster.displayName,
			image : poster.image,
			lastSeen : poster.last_seen
		},
		image: config.url.challengeImages + challenge.id + "." + mime.extension(challenge.image_type),
		imageType: challenge.image_type,
		caption: challenge.title,
		link: config.url.challenge + challenge.id,
		categoryName: category.name,
		categoryID: category.id,
		activity: {
			type : challenge.activity_type,
			timestamp : challenge.activity_timestamp,
			userId : challenge.activity_user
		}
	};

	if (challenge.activity_type == "comment") {
		output.activity.commentId = challenge.activity_commentid;
	}

	return output;
}

module.exports = {
	createChallenge: createChallenge,
	getChallengeSocialInfo : getChallengeSocialInfo,
	getChallenge : getChallenge,
	getChallenges: getChallenges,
	likeChallenge: likeChallenge,
	deleteChallenge: deleteChallenge
};