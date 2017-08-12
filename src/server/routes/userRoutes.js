var express = require("express");
var dataUtils = require("../dataUtils");
var tmp = require("tmp");
var path = require("path");
var config = require("../config");

var routes = function(db) {
	var userRouter = express.Router();

      userRouter.route("/") // Route for /api/users

      .get(function(req, res) {
                  // Filter by user who posted the challenge
                  if (req.query.challengeId) {
                        cypherQuery = "MATCH (c:Challenge) WHERE (id(c) = " + req.query.challengeId + ") MATCH (c)-[POSTED_BY]->(u:User) ";
                  } else if (req.query.entryId) { // filter by user who posted the entry
                        cypherQuery = "MATCH (e:Entry) WHERE (id(e) = " + req.query.entryId + ") MATCH (e)-[POSTED_BY]->(u:User) ";
                  } else if (req.query.followedId) {
                  		cypherQuery = "MATCH (followed:User {id: '" + req.query.followedId + "'})<-[:FOLLOWING]-(u:User)"
                  } else if (req.query.followingId) {
                  		cypherQuery = "MATCH (following:User {id: '" + req.query.followingId + "'})-[:FOLLOWING]->(u:User)"
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

				if (req.query.sortBy) {
					if (req.query.sortBy == "lastSeen") {
						cypherQuery += " ORDER BY u.last_seen DESC;";
					} else if (req.query.sortBy == "popularity") {
						cypherQuery += " ORDER BY popularity_count DESC;";
					}
				}

                  db.cypherQuery(cypherQuery, function(err, result){
                        if(err) throw err;

                        var output = [];
		    			for (var i = 0; i < result.data.length; i++) {
		    				var data = dataUtils.constructEntityData("user", result.data[i][0], null, result.data[i][0].lastSeen, null, null, null, null, result.data[i][1], result.data[i][3] > 0, result.data[i][2], "none", null, null, null, null);
				
							output.push(data);
		    			}
                        
                        res.json(output);
                  });
      });

      userRouter.route("/")
      .put(function(req, res) {
            
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
                        if (err) throw err;

                        var name = path.parse(fullpath).base;

                        fs.writeFileSync(fullpath, buffer);
                  
                       user.image = config.url.userImages + name;

                       updateUserInDB(res, user);
                        
                  });
            } else { // URL
                  updateUserInDB(res, user);
            }
      });

      userRouter.route("/:followedId/follow") //api/users/follow
      .get(function(req, res) {
      	if (req.user && req.user.id && req.params.followedId) {
      		var cypherQuery = "MATCH (u1:User {id: '" + req.user.id + 
      			"'})-[:FOLLOWING]->(u2:User {id: '" + req.params.followedId + "'}) RETURN u1;";
      		db.cypherQuery(cypherQuery, function(err, result){
                if(err) throw err;

                var output = {};
                if (result.data.length == 1) {
                	output = {followStatus : "following"};
                } else {
                	output = {followStatus : "not_following"};
                }
                res.json(output);
			});
      	}
      })
      .put(function(req, res) {
      	if (req.user && req.user.id && req.params.followedId) {

      		if (req.body.followAction == "follow") {
      			var cypherQuery = "MATCH (u1:User {id: '" + req.user.id + 
      				"'}), (u2:User {id: '" + req.params.followedId + "'}) CREATE (u1)-[r:FOLLOWING]->(u2) RETURN r;";
      			db.cypherQuery(cypherQuery, function(err, result){
	                if(err) throw err;

	                var output = {};

	                if (result.data.length == 1) {

	                	output.followStatus = "following";
	                } else {

	                	output.followStatus = "not_following";
	                }
	                res.json(output);
				});
      		} else if (req.body.followAction == "unfollow") {
      			var cypherQuery = "MATCH (u1:User {id: '" + req.user.id + 
      				"'})-[r:FOLLOWING]->(u2:User {id: '" + req.params.followedId + "'}) DELETE r RETURN COUNT(r);";
      			db.cypherQuery(cypherQuery, function(err, result){
	                if(err) throw err;

					var output = {};

					if (result.data.length == 1) {
						output.followStatus = "not_following";
					} else {
						output.followStatus = "following";
					}
					
					res.json(output);
				});
      		}
      		
      	}
	});

	userRouter.route("/:userId") // /api/users/<id>
	.get(function(req, res) {
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

			//var cypherQuery = "MATCH (u:User {id: '" + req.params.userId + "'})<-[:FOLLOWING]-(f:User) RETURN COUNT(f);";

			console.log("running query: " + cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result) {
				if (err) throw err;

				var socialInfo = {};
				if (result.data[0][0].twitter_profile_link) {
					socialInfo.twitterLink = result.data[0][0].twitter_profile_link;
					console.log("adding twitter link: " + socialInfo.twitterLink);
				}
				if (result.data[0][0].facebook_profile_link) {
					socialInfo.facebookLink = result.data[0][0].facebook_profile_link;
					console.log("adding facebook link: " + socialInfo.facebookLink);
				}
				var data = dataUtils.constructEntityData("user", result.data[0][0], null, result.data[0][0].lastSeen, null, null, null, null, result.data[0][1], result.data[0][3] > 0, result.data[0][2], null, "none", null, null, null, null, null, socialInfo);
				
				res.json(data);
			});
	});

	return userRouter;
};

function updateUserInDB(res, user) {
      dataUtils.saveUser(user, function(err) {
            if (err) throw err;

            res.json(user);
      });
}

module.exports = routes;