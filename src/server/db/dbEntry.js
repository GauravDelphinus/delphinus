require("../error");
var serverUtils = require("../serverUtils");
var dataUtils = require("../dataUtils");
var dbUtils = require("./dbUtils");
var config = require("../config");
var mime = require("mime");
var logger = require("../logger");

function lookupEntryBasicInfo(entryId, done) {
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

		var output = {
			type: "entry",
			id : entry.id,
			postedDate : entry.created,
			postedByUser : {
				id : poster.id,
				displayName : poster.displayName,
				image : poster.image,
				lastSeen : poster.last_seen
			}
		};

		output.image = config.url.entryImages + entry.id + "." + mime.extension(entry.image_type);
		output.imageType = entry.image_type;
		output.caption = entry.caption;
		output.link = config.url.entry + entry.id;

		return done(null, output);
	});
}

/*
	Lookup extended information about the entry with the given ID from the DB
*/
function lookupEntryExtendedInfo(entryId, meId, done) {
	var cypherQuery = "MATCH (e:Entry {id: '" + entryId + "'})-[:POSTED_BY]->(poster:User) " +
		" WITH e, poster " + 
		" OPTIONAL MATCH (u2:User)-[:LIKES]->(e) " + 
		" WITH e, poster, COUNT(u2) AS like_count " + 
		" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(e) " + 
		" WITH e, poster, like_count, COUNT(comment) AS comment_count " + 
		" OPTIONAL MATCH (me:User {id: '" + meId + "'})-[like:LIKES]->(e) " +	
		" RETURN e, poster, like_count, comment_count, COUNT(like);";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.data.length != 1) {
			return done(new DBResultError(cypherQuery, 1, result.data.length));
		}

		var entry = result.data[0][0];
		var poster = result.data[0][1];

		var output = {
			type: "entry",
			id : entry.id,
			postedDate : entry.created,
			postedByUser : {
				id : poster.id,
				displayName : poster.displayName,
				image : poster.image,
				lastSeen : poster.last_seen
			}
		};

		output.image = config.url.entryImages + entry.id + "." + mime.extension(entry.image_type);
		output.imageType = entry.image_type;
		output.caption = entry.caption;
		output.link = config.url.entry + entry.id;

		output.activity = {
			type : entry.activity_type,
			timestamp : entry.activity_timestamp,
			userId : entry.activity_user
		};

		if (entry.activity_type == "comment") {
			output.activity.commentId = entry.activity_commentid;
		}

		//social status
		var numLikes = result.data[0][2];
		var numComments = result.data[0][3];
		var amLiking = result.data[0][4] > 0;
		var numShares = 0; //no yet implemented
		output.socialStatus = {
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

function lookupEntrySocialInfo(entryId, meId, done) {
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

function fetchEntries(postedBy, challengeId, lastFetchedTimestamp, done) {

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

			var entity = result.data[i][0];
			var poster = result.data[i][1];

			data.type = "entry";
			data.id = entity.id;

			data.postedDate = entity.created;
			data.postedByUser = {};
			data.postedByUser.id = poster.id;
			data.postedByUser.displayName = poster.displayName;
			data.postedByUser.image = poster.image;
			data.postedByUser.lastSeen = poster.last_seen;

			data.image = config.url.entryImages + entity.id + "." + mime.extension(entity.image_type);
			data.caption = entity.caption;
			data.link = config.url.entry + entity.id;
			
			data.imageType = entity.image_type;

			data.activity = {};
			data.activity.type = entity.activity_type;
			data.activity.timestamp = entity.activity_timestamp;
			data.activity.userId = entity.activity_user;
			if (entity.activity_type == "comment") {
				data.activity.commentId = entity.activity_commentid;
			}

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
function createEntry(entryInfo, done) {
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



var entryPrototype = {
	"id" : "id",
	"created" : "timestamp",
	"title" : "string",
	"userId" : "id", //id of user who is posting this challenge
	"source" : ["challengeId", "designId"], //independent images not yet supported (add when they are)
	"sourceId" : "string"
}

module.exports = {
	createEntry: createEntry,
	lookupEntryExtendedInfo: lookupEntryExtendedInfo,
	lookupEntryBasicInfo: lookupEntryBasicInfo,
	lookupEntrySocialInfo: lookupEntrySocialInfo,
	fetchEntries: fetchEntries
};