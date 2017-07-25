var express = require("express");

var routes = function(db) {
	var categoryRouter = express.Router();

	categoryRouter.route("/") // ROUTER FOR /api/categories

		.get(function(req, res){

			var cypherQuery = "MATCH (c:Category)";

			if (req.query.category) {
				cypherQuery += "-[:BELONGS_TO]->(parent:Category {id: '" + req.query.category + "'}) ";
			} else {
				cypherQuery += " WHERE NOT (c)-[:BELONGS_TO]->() ";
			}

			cypherQuery += " RETURN c;";

			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) throw err;

    			res.json(result.data);
			});
		})

		return categoryRouter;
}

module.exports = routes;