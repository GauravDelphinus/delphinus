var express = require("express");
var dataUtils = require("../dataUtils");

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

	return userRouter;
};

module.exports = routes;