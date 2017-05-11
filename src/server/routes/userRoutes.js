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
                        cypherQuery = "MATCH (c:Challenge) WHERE (id(c) = " + req.query.challengeId + ") MATCH (c)-[POSTED_BY]->(u:User) RETURN u;";
                  } else if (req.query.entryId) { // filter by user who posted the entry
                        cypherQuery = "MATCH (e:Entry) WHERE (id(e) = " + req.query.entryId + ") MATCH (e)-[POSTED_BY]->(u:User) RETURN u;";
                  } else { // return all users
                        cypherQuery = "MATCH (u:User) RETURN u;";
                  }

                  console.log("Running cypherQuery: " + cypherQuery);
                  db.cypherQuery(cypherQuery, function(err, result){
                        if(err) throw err;

                        //console.log(result.data); // delivers an array of query results
                        //console.log(result.columns); // delivers an array of names of objects getting returned

                        console.log(result.data);
                        res.json(result.data);
                  });
      });

      userRouter.route("/")
      .put(function(req, res) {
            
            console.log("PUT on /api/users, body is " + JSON.stringify(req.body));
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

      userRouter.route("/follow/:followedId") //api/users/follow
      .get(function(req, res) {
      	console.log("GET on /api/users/follow, req.user is " + JSON.stringify(req.user));
      	if (req.user && req.user.id && req.params.followedId) {
      		var cypherQuery = "MATCH (u1:User {id: '" + req.user.id + 
      			"'})-[:FOLLOWING]->(u2:User {id: '" + req.params.followedId + "'}) RETURN u1;";
      		console.log("running cypherQuery: " + cypherQuery);
      		db.cypherQuery(cypherQuery, function(err, result){
                if(err) throw err;

                console.log(JSON.stringify(result.data)); // delivers an array of query results
                //console.log(result.columns); // delivers an array of names of objects getting returned

                console.log(result.data);
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
      	console.log("PUT on /api/users/follow, req.user is " + JSON.stringify(req.user));
      	if (req.user && req.user.id && req.params.followedId) {

      		if (req.body.followAction == "follow") {
      			var cypherQuery = "MATCH (u1:User {id: '" + req.user.id + 
      				"'}), (u2:User {id: '" + req.params.followedId + "'}) CREATE (u1)-[r:FOLLOWING]->(u2) RETURN r;";
      			db.cypherQuery(cypherQuery, function(err, result){
	                if(err) throw err;

	                //console.log(result.data); // delivers an array of query results
	                //console.log(result.columns); // delivers an array of names of objects getting returned

	                var output = {};

	                console.log(result.data);
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

					console.log("result of deletion: " + JSON.stringify(result));
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
		if (req.query.numFollowers) {
			var cypherQuery = "MATCH (u:User {id: '" + req.params.userId + "'})<-[:FOLLOWING]-(f:User) RETURN COUNT(f);";
			db.cypherQuery(cypherQuery, function(err, result) {
				if (err) throw err;

				console.log("result of query = " + JSON.stringify(result));

				var output = {};

				output.numFollowers = parseInt(result.data[0]);
				res.json(output);
			});
		}
	});

	return userRouter;
};

function updateUserInDB(res, user) {
      dataUtils.saveUser(user, function(err) {
            if (err) throw err;

            console.log("sending JSON back: " + JSON.stringify(user));
            res.json(user);
      });
}

module.exports = routes;