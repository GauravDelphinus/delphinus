var express = require("express");
var logger = require("../logger");
var serverUtils = require("../serverUtils");
var config = require("../config");
var dbDesign = require("../db/dbDesign");

var routes = function() {
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

			dbDesign.getDesigns(req.query.category, function(err, result) {
				if (err) {
					logger.error(err);
					return res.sendStatus(500);
				}

    			return res.json(result);
			});
		});

		return designRouter;
};

module.exports = routes;