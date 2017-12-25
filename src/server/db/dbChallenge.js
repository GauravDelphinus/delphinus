require("../error");
var serverUtils = require("../serverUtils");
var dataUtils = require("../dataUtils");
var dbUtils = require("./dbUtils");
var config = require("../config");
var mime = require("mime");
var logger = require("../logger");

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
	Create a new Challenge node in the db.
	Prototype: challengePrototype
*/
function createChallenge(challengeInfo, done) {
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
		}
	};

	output.image = config.url.challengeImages + challenge.id + "." + mime.extension(challenge.image_type);
	output.imageType = challenge.image_type;
	output.caption = challenge.title;
	output.link = config.url.challenge + challenge.id;
	output.categoryName = category.name;
	output.categoryID = category.id;

	//add activity info
	output.activity = {
		type : challenge.activity_type,
		timestamp : challenge.activity_timestamp,
		userId : challenge.activity_user
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
	getChallenges: getChallenges
};