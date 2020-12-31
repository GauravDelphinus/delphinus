var express = require("express");
var logger = require("../logger");
var serverUtils = require("../serverUtils");
var dbUtils = require("../db/dbUtils");
var routes = function() {
	var categoryRouter = express.Router();

	categoryRouter.route("/") // ROUTER FOR /api/categories

		.get(function(req, res){

			logger.debug("GET received on /api/categories, query = " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "category",
					type: "category"
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			var cypherQuery = "MATCH (c:Category)";

			if (req.query.category) {
				cypherQuery += "-[:BELONGS_TO]->(parent:Category {id: '" + req.query.category + "'}) ";
			} else {
				cypherQuery += " WHERE NOT (c)-[:BELONGS_TO]->() ";
			}

			cypherQuery += " RETURN c;";

			dbUtils.runQuery(cypherQuery, function(err, result){
    			if(err) {
    				return res.sendStatus(500);
    			} else if (result.records.length <= 0) {
    				logger.dbResultError(cypherQuery, "> 0", result.records.length);
    				return res.sendStatus(500);
    			}

    			var output = [];
    			for (var i = 0; i < result.records.length; i++) {
    				var record = result.records[i];
    				var category = dbUtils.recordGetField(record, "c");
    				output.push({name: category.name, id: category.id});
    			}

    			if (!serverUtils.validateData(output, serverUtils.prototypes.category)) {
    				return res.sendStatus(500);
    			}

    			return res.json(output);
			});
		});

		return categoryRouter;
};

module.exports = routes;