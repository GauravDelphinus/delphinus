
const dataUtils = require("../dataUtils");
const config = require("../config");
const serverUtils = require("../serverUtils");
const logger = require("../logger");
const error = require("../error");

function getUser(userId, done) {
	var cypherQuery = "MATCH (u:User{id: '" + userId + "'}) WITH u " +
  		" RETURN u;";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result) {
		if (err) {
			return done(err);
		} else if (result.data.length != 1) {
        	return done(new error.DBResultError(cypherQuery, 1, result.data.length));
        }

        var user = result.data[0];

        var output = {
        	type: "user",
        	id: user.id,
        	image: user.image,
        	displayName: user.display_name,
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
        	return done(new error.DBResultError(cypherQuery, 1, result.data.length));
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
	        	displayName: user.display_name,
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

/*
	Fetch all entries from the DB matching the provided criteria, and sorted by the given sort flag.

	Note: this only supports limited output given the performance hit.  This API returns all in one go,
	and does not support chunked outputs.
*/
function getUsersSorted(sortBy, limit, meId, done) {

	limit = Math.min(limit, config.businessLogic.maxCustomSortedLimit);

	cypherQuery = "MATCH (u:User) ";
  
  	/*
		PRIORITY is WEIGHTED BASED ON THE BELOW RULES:

		Overall Popularity = (Number of Followers x 5) + (Number of Challenges Posted x 4) + (Number of Entries Posted x 3) + (Number of Comments Posted)
	*/
	cypherQuery += " WHERE (u.id <> '" + meId + "') " +
		" WITH u " +
		" OPTIONAL MATCH (u)<-[:FOLLOWING]-(follower:User) " +
  		" WITH u, COUNT(follower) AS numFollowers " +
  		" OPTIONAL MATCH (u)<-[:POSTED_BY]-(c:Challenge) " +
  		" WITH u, numFollowers, COUNT(c) AS numChallenges " +
  		" OPTIONAL MATCH (u)<-[:POSTED_BY]-(e:Entry) " +
  		" WITH u, numFollowers, numChallenges, COUNT(e) AS numEntries " +
  		" OPTIONAL MATCH (u)<-[:POSTED_BY]-(comment:Comment) " +
  		" WITH u, 5 * numFollowers + 4 * numChallenges + 3 * numEntries + COUNT(comment) AS popularity_count " +
  		" RETURN u, popularity_count " +
  		" ORDER BY popularity_count DESC LIMIT " + limit + ";";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result) {
		if (err) {
			logger.dbError(err, cypherQuery);
			return done(err, 0);
		}

		var output = [];
		for (var i = 0; i < result.data.length; i++) {
			var data = {};

			var user = result.data[i][0];

			var data = {
				type: "user",
	        	id: user.id,
	        	image: user.image,
	        	displayName: user.display_name,
	        	link: config.url.user + user.id
	        }

	        output.activity = {lastSeen: user.activity_last_seen};

			output.push(data);
		}

		return done(null, output);
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
	        	return done(new error.DBResultError(cypherQuery, "0 or 1", result.data.length));
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
	        	return done(new error.DBResultError(cypherQuery, "0 or 1", result.data.length));
	        }

			return done(null, result.data.length == 0);
		});
	}	
}

function findUser (query, callback) {
	var findUserQuery = "MATCH(u:User) WHERE ";
	var addOr = false;

	if (query.userID) {
		findUserQuery += " u.id = '" + query.userID + "'";
		addOr = true;
	}

	if (query.googleID) {
		if (addOr) {
			findUserQuery += " OR ";
		}
		findUserQuery += " u.google_id = '" + query.googleID + "'";
		addOr = true;
	}

	if (query.twitterID) {
		if (addOr) {
			findUserQuery += " OR ";
		}
		findUserQuery += " u.twitter_id = '" + query.twitterID + "'";
		addOr = true;
	}

	if (query.facebookID) {
		if (addOr) {
			findUserQuery += " OR ";
		}
		findUserQuery += " u.facebook_id = '" + query.facebookID + "'";
		addOr = true;
	}

	if (query.localEmail) {
		if (addOr) {
			findUserQuery += " OR ";
		}
		findUserQuery += " u.local_email = '" + query.localEmail + "'";

		if (query.type == "extended") { // search in other accounts as well
			findUserQuery += " OR '" + query.localEmail + "' IN u.google_emails ";
			findUserQuery += " OR '" + query.localEmail + "' IN u.facebook_emails ";
		}
		addOr = true;
	}

	findUserQuery += " RETURN u;";

	dataUtils.getDB().cypherQuery(findUserQuery, function(err, result) {
		if (err) {
			logger.dbError(err, findUserQuery);
			return callback(err, null);
		}

		if (result.data.length == 0) {
			// no user found
			callback(null, null);
		} else {
			var userFromDB = result.data[0];

			var user = {};

			if (userFromDB.id) {
				user.id = userFromDB.id;
			}

			if (userFromDB.display_name) {
				user.displayName = userFromDB.display_name;
			}

			if (userFromDB.image) {
				user.image = userFromDB.image;
			}

			if (userFromDB.username) {
				user.username = userFromDB.username;
			}

			if (userFromDB.email) {
				user.email = userFromDB.email;
			}

			if(userFromDB.location) {
				user.location = userFromDB.location;
			}

			if (userFromDB.google_id) {
				user.google = {};
				user.google.id = userFromDB.google_id;
				user.google.displayName = userFromDB.google_display_name;
				user.google.token = userFromDB.google_token;
				user.google.emails = userFromDB.google_emails;
				user.google.images = userFromDB.google_images;
			}

			if (userFromDB.twitter_id) {
				user.twitter = {};
				user.twitter.id = userFromDB.twitter_id;
				user.twitter.username = userFromDB.twitter_username;
				user.twitter.profileLink = userFromDB.twitter_profile_link;
				user.twitter.token = userFromDB.twitter_token;
				user.twitter.tokenSecret = userFromDB.twitter_token_secret;
				user.twitter.displayName = userFromDB.twitter_display_name;
				user.twitter.images = userFromDB.twitter_images;
			}

			if (userFromDB.facebook_id) {
				user.facebook = {};
				user.facebook.id = userFromDB.facebook_id;
				user.facebook.profileLink = userFromDB.facebook_profile_link;
				user.facebook.token = userFromDB.facebook_token;
				user.facebook.displayName = userFromDB.facebook_display_name;
				user.facebook.image = userFromDB.facebook_image;
				user.facebook.emails = userFromDB.facebook_emails;
			}

			if (userFromDB.local_email) {
				user.local = {};
				user.local.email = userFromDB.local_email;
				user.local.password = userFromDB.local_password;
			}

			callback(null, user);
		}
	});
}

function saveUser (user, next) {
	var query = {
	};

	if (user.id) {
		query.userID = user.id;
	}

	if (user.google) {
		query.googleID = user.google.id;
	}

	if (user.twitter) {
		query.twitterID = user.twitter.id;
	}

	if (user.facebook) {
		query.facebookID = user.facebook.id;
	}

	if (user.local) {
		query.localEmail = user.local.email;
	}

	this.findUser(query, function(err, existingUser) {
		if (err) {
			logger.dbError(err, query);
			return next(err, null);
		}

		var cypherQuery = "";
		if (existingUser) { // user already exists in DB
			cypherQuery = "MATCH(u:User) WHERE u.id = '" + existingUser.id + "'";

			var setValues = [];

			if (user.displayName) {
				setValues.push(" u.display_name = '" + user.displayName + "'");
			}
			if (user.image) {
				setValues.push(" u.image = '" + user.image + "'");
			}

			if (user.username) {
				setValues.push(" u.username = '" + user.username + "'");
			}

			if (user.email) {
				setValues.push(" u.email = '" + user.email + "'");
			}

			if (user.location) {
				setValues.push(" u.location = '" + user.location + "'");
			}

			if (user.activity && user.activity.lastSeen) {
				setValues.push(" u.activity_last_seen = " + user.activity.lastSeen + "");
			}

			if (user.google) {
				if (user.google.id) {
					setValues.push(" u.google_id = '" + user.google.id + "'");
				}

				if (user.google.token) {
					setValues.push(" u.google_token = '" + user.google.token + "'");
				}

				if (user.google.emails) {
					setValues.push(" u.google_emails = " + JSON.stringify(user.google.emails) + "");
				}

				if (user.google.images) {
					setValues.push(" u.google_images = " + JSON.stringify(user.google.images) + "");
				}

				if (user.google.displayName) {
					setValues.push(" u.google_display_name = '" + user.google.displayName + "'");
				}
			}

			if (user.twitter) {
				if (user.twitter.id) {
					setValues.push(" u.twitter_id = '" + user.twitter.id + "'");
				}

				if (user.twitter.token) {
					setValues.push(" u.twitter_token = '" + user.twitter.token + "'");
				}

				if (user.twitter.tokenSecret) {
					setValues.push(" u.twitter_token_secret = '" + user.twitter.tokenSecret + "'");
				}

				if (user.twitter.username) {
					setValues.push(" u.twitter_username = '" + user.twitter.username + "'");
				}

				if (user.twitter.profileLink) {
					setValues.push(" u.twitter_profile_link = '" + user.twitter.profileLink + "'");
				}

				if (user.twitter.displayName) {
					setValues.push(" u.twitter_display_name = '" + user.twitter.displayName + "'");
				}

				if (user.twitter.images) {
					setValues.push(" u.twitter_images = " + JSON.stringify(user.twitter.images) + "");
				}
			}

			if (user.facebook) {
				if (user.facebook.id) {
					setValues.push(" u.facebook_id = '" + user.facebook.id + "'");
				}

				if (user.facebook.profileLink) {
					setValues.push(" u.facebook_profile_link = '" + user.facebook.profileLink + "'");
				}

				if (user.facebook.token) {
					setValues.push(" u.facebook_token = '" + user.facebook.token + "'");
				}

				if (user.facebook.displayName) {
					setValues.push(" u.facebook_display_name = '" + user.facebook.displayName + "'");
				}

				if (user.facebook.emails) {
					setValues.push(" u.facebook_emails = " + JSON.stringify(user.facebook.emails) + "");
				}

				if (user.facebook.image) {
					setValues.push(" u.facebook_image = '" + user.facebook.image + "'");
				}
			}

			if (user.local) {
				if (user.local.email) {
					setValues.push(" u.local_email = '" + user.local.email + "'");
				}

				if (user.local.password) {
					setValues.push(" u.local_password = '" + user.local.password + "'");
				}
			}

			// add set values to cypherquery
			if (setValues.length > 0) {
				cypherQuery += " SET ";
				for (var i = 0; i < setValues.length; i++) {
					if (i > 0) {
						cypherQuery += " , ";
					}
					cypherQuery += setValues[i];
				}
			} else {
				//shouldn't happen
				logger.error("saveUser: setValues is empty");
				return next(new Error("setValues is empty"), null);
			}
		} else { // user doesn't exist in DB
			cypherQuery = "CREATE(u:User {";

			user.id = shortid.generate();
			cypherQuery += "id: '" + user.id + "'";

			if (user.displayName) {
				cypherQuery += ", display_name: '" + user.displayName + "'";
			}

			if (user.image) {
				cypherQuery += ", image: '" + user.image + "'";
			}

			if (user.username) {
				cypherQuery += ", username: '" + user.username + "'";
			}

			if (user.email) {
				cypherQuery += ", email: '" + user.email + "'";
			}

			if (user.location) {
				cypherQuery += ", location: '" + user.location + "'";
			}

			if (user.lastSeen) {
				cypherQuery += ", activity_last_seen: " + user.activity.lastSeen + "";
			}

			if (user.google) {
				if (user.google.id) {
					cypherQuery += ", google_id: '" + user.google.id + "'";
				}

				if (user.google.token) {
					cypherQuery += ", google_token: '" + user.google.token + "'";
				}

				if (user.google.emails) {
					cypherQuery += ", google_emails: " + JSON.stringify(user.google.emails) + "";
				}

				if (user.google.images) {
					cypherQuery += ", google_images: " + JSON.stringify(user.google.images) + "";
				}

				if (user.google.displayName) {
					cypherQuery += ", google_display_name: '" + user.google.displayName + "'";
				}
			}

			if (user.twitter) {
				if (user.twitter.id) {
					cypherQuery += ", twitter_id: '" + user.twitter.id + "'";
				}

				if (user.twitter.token) {
					cypherQuery += ", twitter_token: '" + user.twitter.token + "'";
				}

				if (user.twitter.tokenSecret) {
					cypherQuery += ", twitter_token_secret: '" + user.twitter.tokenSecret + "'";
				}

				if (user.twitter.username) {
					cypherQuery += ", twitter_username: '" + user.twitter.username + "'";
				}

				if (user.twitter.profileLink) {
					cypherQuery += ", twitter_profile_link: '" + user.twitter.profileLink + "'";
				}

				if (user.twitter.displayName) {
					cypherQuery += ", twitter_display_name: '" + user.twitter.displayName + "'";
				}

				if (user.twitter.images) {
					cypherQuery += ", twitter_images: " + JSON.stringify(user.twitter.images) + "";
				}
			}

			if (user.facebook) {
				if (user.facebook.id) {
					cypherQuery += ", facebook_id: '" + user.facebook.id + "'";
				}

				if (user.facebook.profileLink) {
					cypherQuery += ", facebook_profile_link: '" + user.facebook.profileLink + "'";
				}

				if (user.facebook.token) {
					cypherQuery += ", facebook_token: '" + user.facebook.token + "'";
				}

				if (user.facebook.displayName) {
					cypherQuery += ", facebook_display_name: '" + user.facebook.displayName + "'";
				}

				if (user.facebook.emails) {
					cypherQuery += ", facebook_emails: " + JSON.stringify(user.facebook.emails) + "";
				}

				if (user.facebook.image) {
					cypherQuery += ", facebook_image: '" + user.facebook.image + "'";
				}
			}

			if (user.local) {
				if (user.local.email) {
					cypherQuery += ", local_email: '" + user.local.email + "'";
				}

				if (user.local.password) {
					cypherQuery += ", local_password: '" + user.local.password + "'";
				}
			}

			cypherQuery += "});";
		}

		dataUtils.getDB().cypherQuery(cypherQuery, function(err) {
			if (err) {
				logger.dbError(err, cypherQuery);
				return next(err, null);
			}

			/**
				It's critical to pass the user to this function, because in case we created
				a new user node, we want to pass on the new id, which is generated above (uuid).
			**/
			return next(null, user);
		});
	});
}

function createUserNode(user, done) {
	var cypherQuery = "MERGE (u:User {id: '" + user.id + "'}) ON CREATE SET " +
		"u.display_name = '" + user.displayName + "', " +
		"u.image = '" + user.image + "', " +
		"u.activity_last_seen = " + user.activity.lastSeen + " RETURN u;";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err) {
		if (err) {
			return done(err);
		}
		return done(null, {id: result.id});
	});
}

function removeAccessForUser(userId, provider, callback) {
	var removeQuery;
	if (provider == "facebook") {
		removeQuery = " REMOVE u.facebook_id, u.facebook_profile_link, u.facebook_token, u.facebook_display_name, u.facebook_emails, u.facebook_image ";
	} else if (provider == "twitter") {
		removeQuery = " REMOVE u.twitter_id, u.twitter_token, u.twitter_token_secret, u.twitter_username, u.twitter_profile_link, u.twitter_display_name, u.twitter_images ";
	}

	var cypherQuery = "MATCH (u:User {id: '" + userId + "'}) ";
	cypherQuery += removeQuery;
	cypherQuery += " RETURN u;";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err) {
		callback(err);
	});

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
	getUsersSorted: getUsersSorted,
	findUser: findUser,
	saveUser: saveUser,
	removeAccessForUser: removeAccessForUser,
	followUser: followUser,
	userPrototypeBasic : userPrototypeBasic
};