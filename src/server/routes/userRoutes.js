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

            var imageDataURI = user.image;
           
            var index = imageDataURI.indexOf("base64,");
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
                  
                       user.image = "/users/images/" + name;

                       updateUserInDB(res, user);
                        
                  });
            } else { // URL
                  updateUserInDB(res, user);
            }
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