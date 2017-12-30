require("../error");
var serverUtils = require("../serverUtils");
var logger = require("../logger");
var dataUtils = require("../dataUtils");
var dbUtils = require("../db/dbUtils");
var error = require("../error");

/*
	Get info about a Comment by looking up the DB
*/
function getComment(commentId, done) {
	var cypherQuery = "MATCH (c:Comment {id: '" + commentId + "'})-[r:POSTED_BY]->(poster:User) " +
		" WITH c, poster " +
		" RETURN c, poster;";

	logger.dbDebug(cypherQuery);
	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.data.length != 1) {
			return done(new DBResultError(cypherQuery, 1, result.data.length));
		}

		var comment = result.data[0][0];
		var poster = result.data[0][1];

		var output = {
			type: "comment",
			id: comment.id,
			postedDate: comment.created,
			text: comment.text,
			postedByUser : {
				id : poster.id,
				displayName : poster.display_name,
				image : poster.image
			}
		};

		return done(null, output);
	});
}

// Currently only support getting *all* matching comments, no timestamp or sort order supported
function getComments(postedBy, entityId, done) {
	var cypherQuery = "";

	if (postedBy) {
		cypherQuery +=
			" MATCH (c:Comment)-[:POSTED_BY]->(poster:User {id: '" + postedBy + "'}) ";
	}
	if (entityId) {
		cypherQuery +=
			" MATCH ("
	}
	if (entityId && postedBy) {
		cypherQuery = "MATCH (c:Comment)-[:POSTED_BY]->(poster:User {id: '" + postedBy + "'}), (c)-[:POSTED_IN]->({id: '" + entityId + "'}) ";
	} else if (entityId) {
		cypherQuery = "MATCH (c:Comment)-[:POSTED_IN]->({id: '" + entityId + "'}), (c)-[:POSTED_BY]->(poster:User) ";
	} else if (postedBy) {
		cypherQuery = "MATCH (c:Comment)-[:POSTED_BY]->(poster:User {id: '" + req.query.user + "'}) ";
	} else {
		cypherQuery = "MATCH (c:Comment)-[:POSTED_BY]->(poster:User) ";
	}

	cypherQuery += " RETURN c, poster ORDER BY c.created;";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result) {
		if (err) {
			logger.dbError(err, cypherQuery);
			return done(err, 0);
		}

		var output = [];
		for (var i = 0; i < result.data.length; i++) {
			var data = {};

			var comment = result.data[i][0];
			var poster = result.data[i][1];

			var data = {
				type: "comment",
				id: comment.id,
				postedDate: comment.created,
				text: comment.text,
				postedByUser : {
					id : poster.id,
					displayName : poster.display_name,
					image : poster.image
				}
			};

			output.push(data);
		}

		return done(null, output);
	});
}

/*
	Get info about the social info about a Comment from the DB
*/
function getCommentSocialInfo(commentId, meId, done) {
	var cypherQuery = "MATCH (c:Comment {id: '" + commentId + "'}) " +
		" WITH c " +
		" OPTIONAL MATCH (u2:User)-[:LIKES]->(c) " + 
		" WITH c, COUNT(u2) AS like_count " + 
		" OPTIONAL MATCH (me:User {id: '" + meId + "'})-[like:LIKES]->(c) " +
		" WITH c, like_count, COUNT(like) AS amLiking " +
		" RETURN like_count, amLiking;";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.data.length != 1) {
			return done(new DBResultError(cypherQuery, 1, result.data.length));
		}

		//social status
		var numLikes = result.data[0][0];
		var amLiking = result.data[0][1] > 0;
		var output = {
			likes : {
				numLikes : numLikes,
				amLiking : amLiking
			}
		};

		return done(null, output);
	});
}

function createComment(commentInfo, done) {
	if (!serverUtils.validateData(commentInfo, commentPrototype)) {
		return done(new Error("Invalid comment info"));
	}

	var cypherQuery = "MATCH (e {id: '" + commentInfo.parentId + "'}) " + 
		" MATCH (u:User {id: '" + commentInfo.userId + "'}) CREATE (c:Comment {" +
		"id: '" + commentInfo.id + "', " + 
		"created : '" + commentInfo.created + "', " + 
		"text : '" + dbUtils.sanitizeStringForCypher(commentInfo.text) + "'" + 
		"})-[:POSTED_IN]->(e), (u)<-[r:POSTED_BY]-(c) RETURN c, u;";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.data.length != 1) {
			return done(new Error(dbResultError(cypherQuery, 1, result.data.length)));
		}

		//now, save the activity in the entity
        var activityInfo = {
        	entityId: commentInfo.entityId,
        	type: "comment",
        	timestamp: commentInfo.created,
        	userId: commentInfo.userId,
        	commentId: commentInfo.id
        }
        dbUtils.saveActivity(activityInfo, function(err, result) {
        	if (err) {
        		logger.error(err);
        		return res.sendStatus(500);
        	}

			return done(null, {id: commentInfo.id});
		});
	});
}

/*
	Delete the matching comment node from the DB
*/
function deleteComment(commentId, done) {

	var cypherQuery = "MATCH (c:Comment {id: '" + commentId + "'}) " +
		" OPTIONAL MATCH (c)<-[:POSTED_IN*1..2]-(comment:Comment) " +
		" DETACH DELETE comment, c;";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		}

		return done(null);
	});
}

/*
	Update the Like status of a comment node in the DB, along with the timestamp

	like: true for adding like, and false for removing like
*/
function likeComment(commentId, like, userId, timestamp, done) {
	if (like) {
		var cypherQuery = "MATCH (u:User {id: '" + userId + "'}), (c:Comment {id: '" + commentId + "'}) " +
			" CREATE (u)-[r:LIKES {created: '" + timestamp + "'}]->(c) " +
			" RETURN r;";

		dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
	        if(err) {
	        	return done(err);
	        } else if (!(result.data.length == 0 || result.data.length == 1)) {
	        	return done(new DBResultError(cypherQuery, "0 or 1", result.data.length));
	        }

			return done(null, result.data.length == 1);
		});
	} else {
		var cypherQuery = "MATCH (u:User {id: '" + userId + "'})-[r:LIKES]->(c:Comment {id: '" + commentId + "'}) " +
			" DELETE r " +
			" RETURN COUNT(r);";

		dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
	        if(err) {
	        	return done(err);
	        } else if (!(result.data.length == 0 || result.data.length == 1)) {
	        	return done(new DBResultError(cypherQuery, "0 or 1", result.data.length));
	        }

			return done(null, result.data.length == 0);
		});
	}
}

//prototype of challenge info that is needed to create a challenge node in the DB
var commentPrototype = {
	"id" : "id",
	"parentId" : "id", //parent of this comment.  Could be another comment, or the same as the entityId
	"created" : "timestamp",
	"text" : "string",
	"userId" : "id", //id of user who is posting this comment
	"entityId" : "id" //id of entity in which the comment is being posted.  May be equal to parentId
}

module.exports = {
	getComment: getComment,
	getComments: getComments,
	createComment: createComment,
	getCommentSocialInfo: getCommentSocialInfo,
	likeComment: likeComment
};