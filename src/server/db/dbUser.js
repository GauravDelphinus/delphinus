
const dataUtils = require("../dataUtils");
const config = require("../config");
const serverUtils = require("../serverUtils");
const logger = require("../logger");


function getUser(userId, done) {
	var cypherQuery = "MATCH (u:User{id: '" + userId + "'}) WITH u " +
  		" RETURN u;";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result) {
		if (err) {
			return done(err);
		} else if (result.data.length != 1) {
        	return done(new DBResultError(cypherQuery, 1, result.data.length));
        }

        var user = result.data[0];

        var output = {
        	type: "user",
        	id: userId,
        	image: user.image,
        	caption: user.display_name,
        	link: config.url.user + userId
        }

        output.activity = {lastSeen: user.activity_last_seen};
		
		return done(null, output);
	});
}

function getUserSocialInfo(userId, meId, done) {
	var cypherQuery = "MATCH (u:User{id: '" + userId + "'}) WITH u " +
  		" OPTIONAL MATCH (u)<-[:FOLLOWING]-(follower:User) " +
  		" WITH u, COUNT(follower) AS numFollowers " +
  		" OPTIONAL MATCH (u)-[:FOLLOWING]->(followed:User) " +
  		" WITH u, numFollowers, COUNT(followed) AS numFollowing " +
  		" OPTIONAL MATCH (u)<-[:POSTED_BY]-(c:Challenge) " +
  		" WITH u, numFollowers, numFollowing, COLLECT(c) AS challengesPosted " +
  		" OPTIONAL MATCH (u)<-[:POSTED_BY]-(e:Entry) " +
  		" WITH u, numFollowers, numFollowing, challengesPosted, COLLECT(e) AS entriesPosted " +
  		" OPTIONAL MATCH (u)<-[following:FOLLOWING]-(me:User {id: '" + meId + "'}) " +
  		" RETURN u, numFollowers, numFollowing, size(challengesPosted) + size(entriesPosted) AS numPosts, COUNT(following), (numFollowers + size(challengesPosted) + size(entriesPosted)) AS popularity_count  ";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result) {
		if (err) {
			return done(err);
		} else if (result.data.length != 1) {
        	return done(new DBResultError(cypherQuery, 1, result.data.length));
        }

        var user = result.data[0][0];

        var output = {};

		if (user.twitter_profile_link) {
			output.twitter = {profileLink: user.twitter_profile_link};
		}
		if (user.facebook_profile_link) {
			output.facebook = {profileLink: user.facebook_profile_link};
		}

		var numFollowers = result.data[0][1];
		var numPosts = result.data[0][3];
		var numFollowing = result.data[0][2];
		var amFollowing = result.data[0][4] > 0;

		output.follows = {numFollowers: numFollowers, amFollowing: amFollowing, numFollowing: numFollowing};

		output.posts = {numPosts: numPosts};

		return done(null, output);
	});
}

function getUsers(meId, followedId, followingId, likedEntityId, lastFetchedTimestamp, done) {
	
	var cypherQuery = "";

	var timestampClause;

	if (lastFetchedTimestamp == 0) {
		timestampClause = "";
	} else {
		timestampClause = " AND (u.activity_last_seen < " + lastFetchedTimestamp + ") " ;
	} 

	if (followedId) {
  		cypherQuery = "MATCH (followed:User {id: '" + followedId + "'})<-[:FOLLOWING]-(u:User) ";
	} else if (followingId) {
  		cypherQuery = "MATCH (following:User {id: '" + followingId + "'})-[:FOLLOWING]->(u:User) ";
	} else if (likedEntityId) {
  		cypherQuery = "MATCH ({id: '" + likedEntityId + "'})<-[:LIKES]-(u:User) ";
	} else {
		cypherQuery = "MATCH (u:User) ";
	}
  
	cypherQuery += " WHERE (u.id <> '" + meId + "') " + timestampClause +
		" WITH u " +
  		" RETURN u " +
  		" ORDER BY u.activity_last_seen DESC LIMIT " + config.businessLogic.infiniteScrollChunkSize + ";";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result) {
		if (err) {
			logger.dbError(err, cypherQuery);
			return done(err, 0);
		}

		var newTimeStamp = 0;
		var output = [];
		for (var i = 0; i < result.data.length; i++) {
			var data = {};

			var user = result.data[i];

			var data = {
				type: "user",
	        	id: user.id,
	        	image: user.image,
	        	caption: user.display_name,
	        	link: config.url.user + user.id
	        }

	        output.activity = {lastSeen: user.activity_last_seen};

			//update new time stamp to be sent back to client
			newTimeStamp = user.activity_last_seen;

			output.push(data);
		}

		return done(null, output, newTimeStamp);
	});
}

function followUser(followerId, followedId, follow, done) {
	if (follow) {
		var cypherQuery = "MATCH (u1:User {id: '" + followerId + "'}), (u2:User {id: '" + followedId + "'}) " +
			" CREATE (u1)-[r:FOLLOWING]->(u2) " +
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
		var cypherQuery = "MATCH (u1:User {id: '" + followerId + "'})-[r:FOLLOWING]->(u2:User {id: '" + followedId + "'}) " +
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

var userPrototypeBasic = {
	"id" : "id",
	"image": ["oneoftypes", "url", "myURL"],
	"displayName" : "string",
	"link" : "myURL"
};

module.exports = {
	getUser : getUser,
	getUserSocialInfo : getUserSocialInfo,
	getUsers: getUsers,
	followUser: followUser,
	userPrototypeBasic : userPrototypeBasic
};