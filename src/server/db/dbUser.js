
const dataUtils = require("../dataUtils");
const config = require("../config");
const serverUtils = require("../serverUtils");

function findUserExtended(userId, meId, done) {
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
        output.id = user.id;
        output.image = user.image;
        output.displayName = user.displayName;
        output.link = config.url.user + entity.id;
        output.lastSeen = user.last_seen;

		output.socialStatus = {};
		if (user.twitter_profile_link) {
			output.socialStatus.twitter = {profileLink: user.twitter_profile_link};
		}
		if (user.facebook_profile_link) {
			output.socialStatus.facebook = {profileLink: user.facebook_profile_link};
		}
		var numFollowers = result.data[0][1];
		var numPosts = result.data[0][3];
		var numFollowing = result.data[0][2];
		var amFollowing = result.data[0][4] > 0;

		output.socialStatus.follows = {numFollowers: numFollowers, amFollowing: amFollowing, numFollowing: numFollowing};

		output.socialStatus.posts = {numPosts: numPosts};

		if (!serverUtils.validateData(output, userPrototypeExtended)) {
			return done(new Error("Invalid user info"));
		}

		return done(null, output);
	});
}

function findUserBasic(userId, done) {
	var cypherQuery = "MATCH (u:User{id: '" + userId + "'}) WITH u " +
  		" RETURN u.id, u.image, u.displayName;";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result) {
		if (err) {
			return done(err);
		} else if (result.data.length != 1) {
        	return done(new DBResultError(cypherQuery, 1, result.data.length));
        }

        var output = {
        	id: result.data[0][0],
        	image: result.data[0][1],
        	displayName: result.data[0][2],
        	link: config.url.user + result.data[0][0]
        }

		if (!serverUtils.validateData(output, userPrototypeBasic)) {
			return done(new Error("Invalid user info"));
		}
		
		return done(null, output);
	});
}

var userPrototypeExtended = {
	"id" : "id",
	"image": ["oneoftypes", "url", "myURL"],
	"displayName": "string",
	"link" : "myURL",
	"lastSeen" : "timestamp",
	"socialStatus" : {
		"facebook" : {
			"profileLink" : "url"
		},
		"twitter" : {
			"profileLink" : "url"
		},
		"follows" : {
			"numFollowers" : "number",
			"numFollowing" : "number",
			"amFollowing" : [true, false]
		},
		"posts" : {
			"numPosts" : "number"
		}
	}
};

var userPrototypeBasic = {
	"id" : "id",
	"image": ["oneoftypes", "url", "myURL"],
	"displayName" : "string",
	"link" : "myURL"
};

module.exports = {
	findUserExtended : findUserExtended,
	findUserBasic : findUserBasic,
	userPrototypeExtended : userPrototypeExtended,
	userPrototypeBasic : userPrototypeBasic
};