var express = require("express");
var tmp = require("tmp");
var path = require("path");
var config = require("../config");
var logger = require("../logger");
var serverUtils = require("../serverUtils");


var routes = function() {
	var typeaheadRouter = express.Router();

	typeaheadRouter.route("/") // Route for /api/typeahead

		.get(function(req, res) {

			logger.debug("GET received on /api/typeahead, query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "sourceType",
					type: ["quote", "idiom"],
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			var output = [];
			if (req.query.sourceType == "quote") {
				output = require("../data/typeahead/quotes.json");
			} else if (req.query.sourceType == "idiom") {
				output = require("../data/typeahead/idioms.json");
			}
			return res.json(output);
		});

	return typeaheadRouter;
};

module.exports = routes;