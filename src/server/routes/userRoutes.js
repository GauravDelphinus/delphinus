var express = require("express");
var dataUtils = require("../dataUtils");
var tmp = require("tmp");
var path = require("path");
var config = require("../config");
var logger = require("../logger");
var serverUtils = require("../serverUtils");

var routes = function(db) {
	var userRouter = express.Router();

	userRouter.route("/") // Route for /api/users

		.get(function(req, res) {

			logger.debug("GET received on /api/users, query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "challengeId",
					type: "id"
				},
				{
					name: "entryId",
					type: "id",
				},
				{
					name: "followedId",
					type: "id",
				},
				{
					name: "followingId",
					type: "id",
				},
				{
					name: "likedEntityId",
					type: "id",
				},
				{
					name: "sortBy",
					required: "yes",
					type: ["lastSeen", "popularity"]
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			if (req.query.challengeId) {
				cypherQuery = "MATCH (c:Challenge) WHERE (id(c) = " + req.query.challengeId + ") MATCH (c)-[POSTED_BY]->(u:User) ";
			} else if (req.query.entryId) { // filter by user who posted the entry
                cypherQuery = "MATCH (e:Entry) WHERE (id(e) = " + req.query.entryId + ") MATCH (e)-[POSTED_BY]->(u:User) ";
 			} else if (req.query.followedId) {
          		cypherQuery = "MATCH (followed:User {id: '" + req.query.followedId + "'})<-[:FOLLOWING]-(u:User)";
			} else if (req.query.followingId) {
          		cypherQuery = "MATCH (following:User {id: '" + req.query.followingId + "'})-[:FOLLOWING]->(u:User)";
			} else if (req.query.likedEntityId) {
          		cypherQuery = "MATCH ({id: '" + req.query.likedEntityId + "'})<-[:LIKES]-(u:User)";
			} else { // return all users
                cypherQuery = "MATCH (u:User) ";
			}

			var meId = (req.user) ? (req.user.id) : (0);
          
			cypherQuery += " WITH u " +
          		" OPTIONAL MATCH (u)<-[:FOLLOWING]-(follower:User) " +
          		" WITH u, COUNT(follower) AS numFollowers " +
          		" OPTIONAL MATCH (u)<-[:POSTED_BY]-(c:Challenge) " +
          		" WITH u, numFollowers, COLLECT(c) AS challengesPosted " +
          		" OPTIONAL MATCH (u)<-[:POSTED_BY]-(e:Entry) " +
          		" WITH u, numFollowers, challengesPosted, COLLECT(e) AS entriesPosted " +
          		" OPTIONAL MATCH (u)<-[following:FOLLOWING]-(me:User {id: '" + meId + "'}) " +
          		" RETURN u, numFollowers, size(challengesPosted) + size(entriesPosted) AS numPosts, COUNT(following), (numFollowers + size(challengesPosted) + size(entriesPosted)) AS popularity_count  ";

			if (req.query.sortBy == "lastSeen") {
				cypherQuery += " ORDER BY u.last_seen DESC;";
			} else if (req.query.sortBy == "popularity") {
				cypherQuery += " ORDER BY popularity_count DESC;";
			}

			db.cypherQuery(cypherQuery, function(err, result){
                if(err) {
                	logger.dbError(err, cypherQuery);
                	return res.sendStatus(500);
                }

                var output = [];
    			for (var i = 0; i < result.data.length; i++) {
    				var data = dataUtils.constructEntityData("user", result.data[i][0], null, result.data[i][0].lastSeen, null, null, null, null, result.data[i][1], result.data[i][3] > 0, result.data[i][2], "none", null, null, null, null);
		
					output.push(data);
    			}
                
                return res.json(output);
			});
		});

	userRouter.route("/")

		.put(function(req, res) {
            
            logger.debug("PUT received on /api/users, body: " + JSON.stringify(req.body));

			var validationParams = [
				{
					name: "user",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.body, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

            var user = req.body.user;

            var index = -1;
            var imageDataURI;

            if (user.image) {
            	imageDataURI = user.image;
           		index = imageDataURI.indexOf("base64,");
            }
            
            var data;
            if (index != -1) { // data URI
  				data = imageDataURI.slice(index + 7);
            
				var buffer = new Buffer(data, 'base64');
				var baseDir = global.appRoot + config.path.userImages;

				var fs = require('fs');
				//Create random name for new image file
				tmp.tmpName({ dir: baseDir }, function _tempNameGenerated(err, fullpath) {
					if (err) {
						logger.error("Error with creating a temporary path: " + err);
						return res.sendStatus(500);
					}

					var name = path.parse(fullpath).base;

					fs.writeFileSync(fullpath, buffer);
                  
					user.image = config.url.userImages + name;

					updateUserInDB(res, user, function(err) {
						if (err) {
							logger.error("Failed to save user in DB: " + err);
							return res.sendStatus(500);
						}
					});

					return res.json({}); 
				});
            } else { // URL
				updateUserInDB(res, user, function(err) {
					if (err) {
						logger.error("Failed to save user in DB: " + err);
						return res.sendStatus(500);
					}
				});

				return res.json({}); 
            }
		});

	userRouter.route("/:followedId/follow") //api/users/follow

		.put(function(req, res) {

			logger.debug("PUT received on /api/users/" + req.params.followedId + "/follow, body: " + JSON.stringify(req.body));

			var validationParams = [
				{
					name: "followAction",
					type: ["follow", "unfollow"],
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.body, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			validationParams = [
				{
					name: "followedId",
					required: "yes",
					type: "id"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams)) {
				return res.sendStatus(400);
			}

      		if (req.body.followAction == "follow") {
      			var cypherQuery = "MATCH (u1:User {id: '" + req.user.id + 
      				"'}), (u2:User {id: '" + req.params.followedId + "'}) CREATE (u1)-[r:FOLLOWING]->(u2) RETURN r;";
      			db.cypherQuery(cypherQuery, function(err, result){
	                if(err) {
	                	logger.dbError(err, cypherQuery);
	                	return res.sendStatus(500);
	                }

	                var output = {followStatus: (result.data.length == 1) ? "following" : "not_following"};
	                return res.json(output);
				});
      		} else if (req.body.followAction == "unfollow") {
      			var cypherQuery = "MATCH (u1:User {id: '" + req.user.id + 
      				"'})-[r:FOLLOWING]->(u2:User {id: '" + req.params.followedId + "'}) DELETE r RETURN COUNT(r);";
      			db.cypherQuery(cypherQuery, function(err, result){
	                if(err) {
	                	logger.dbError(err, cypherQuery);
	                	return res.sendStatus(500);
	                }

					var output = {followStatus: (result.data.length == 1) ? "not_following" : "following"};
					return res.json(output);
				});
      		}	
		});

	userRouter.route("/:userId") // /api/users/<id>
		.get(function(req, res) {

			logger.debug("GET received on /api/users/" + req.params.userId + ", query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "userId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams)) {
				return res.sendStatus(400);
			}

			var meId = (req.user) ? (req.user.id) : (0);
                  
            var cypherQuery = "MATCH (u:User{id: '" + req.params.userId + "'}) WITH u " +
                  		" OPTIONAL MATCH (u)<-[:FOLLOWING]-(follower:User) " +
                  		" WITH u, COUNT(follower) AS numFollowers " +
                  		" OPTIONAL MATCH (u)<-[:POSTED_BY]-(c:Challenge) " +
                  		" WITH u, numFollowers, COLLECT(c) AS challengesPosted " +
                  		" OPTIONAL MATCH (u)<-[:POSTED_BY]-(e:Entry) " +
                  		" WITH u, numFollowers, challengesPosted, COLLECT(e) AS entriesPosted " +
                  		" OPTIONAL MATCH (u)<-[following:FOLLOWING]-(me:User {id: '" + meId + "'}) " +
                  		" RETURN u, numFollowers, size(challengesPosted) + size(entriesPosted) AS numPosts, COUNT(following), (numFollowers + size(challengesPosted) + size(entriesPosted)) AS popularity_count  ";

			db.cypherQuery(cypherQuery, function(err, result) {
				if (err) {
					logger.dbError(err, cypherQuery);
					return res.sendStatus(500);
				}

				var socialInfo = {};
				if (result.data[0][0].twitter_profile_link) {
					socialInfo.twitterLink = result.data[0][0].twitter_profile_link;
				}
				if (result.data[0][0].facebook_profile_link) {
					socialInfo.facebookLink = result.data[0][0].facebook_profile_link;
				}
				var data = dataUtils.constructEntityData("user", result.data[0][0], null, result.data[0][0].lastSeen, null, null, null, null, result.data[0][1], result.data[0][3] > 0, result.data[0][2], null, "none", null, null, null, null, null, socialInfo);
				
				return res.json(data);
			});
		});

	return userRouter;
};

function updateUserInDB(res, user, next) {
	dataUtils.saveUser(user, function(err) {
		if (err) {
			next(err);
		}

		res.json(user);
		next(0);
	});
}

module.exports = routes;