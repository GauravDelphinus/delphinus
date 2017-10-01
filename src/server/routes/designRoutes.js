var express = require("express");
var logger = require("../logger");
var serverUtils = require("../serverUtils");
var config = require("../config");

var routes = function(db) {
	var designRouter = express.Router();

	designRouter.route("/") // ROUTER FOR /api/designs

		.get(function(req, res){

			logger.debug("GET received on /api/designs, query = " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "category",
					type: "designCategory"
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			var cypherQuery = "MATCH (d:Design)";

			if (req.query.category) {
				cypherQuery += "-[:BELONGS_TO]->(c:DesignCategory {id: '" + req.query.category + "'}) ";
			} else {
				cypherQuery += "-[:BELONGS_TO]->(c:DesignCategory) ";
			}

			cypherQuery += " RETURN d, c;";

			logger.dbDebug(cypherQuery);
			db.cypherQuery(cypherQuery, function(err, result){
    			if(err) {
    				logger.dbError(err, cypherQuery);
    				return res.sendStatus(500);
    			} else if (result.data.length <= 0) {
    				logger.dbResultError(cypherQuery, "> 0", result.data.length);
    				return res.sendStatus(500);
    			}

    			var output = {};
    			for (var i = 0; i < result.data.length; i++) {
    				let designName = result.data[i][0].name;
    				let designId = result.data[i][0].id;
    				let presetArtifactId = result.data[i][0].presetArtifactId;
    				let categoryName = result.data[i][1].name;
    				let categoryId = result.data[i][1].id;


    				if (!output.hasOwnProperty(categoryId)) {
    					output[categoryId] = {name: categoryName, designList: []};
    				}
    				output[categoryId].designList.push({name: designName, id: designId, image: config.url.designImages + categoryId + "/" + designId + ".jpeg", presetArtifactId: presetArtifactId});
    			}

    			return res.json(output);
			});
		});

		return designRouter;
};

module.exports = routes;