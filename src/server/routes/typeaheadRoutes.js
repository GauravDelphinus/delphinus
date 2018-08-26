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
					required: "yes"
				},
				{
					name: "queryType",
					type: ["prefetch", "remote"],
					required: "yes"
				},
				{
					name: "query",
					required: "no",
					type: "string"
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			/*
				Prefetch: these are fetched at init time of client page.  Should keep these
				to a minimum, and these are cached in browser

				Remote: these are fetched at run time as user types, and a query string is passed
				so server can filter and send appropriate results.

				Refer newentry.js routines related to this (setupTypeaheadField function in particular)
				Refer data json files under server/data/typeahead/*.json

				For more on the Twitter Typeahead feature, refer: https://github.com/twitter/typeahead.js,
				https://github.com/twitter/typeahead.js/blob/master/doc/bloodhound.md
			*/
			var output = [];
			if (req.query.queryType == "prefetch") {
				if (req.query.sourceType == "quote") {
					output = require("../data/typeahead/quotes_prefetch.json");
				} else if (req.query.sourceType == "idiom") {
					output = require("../data/typeahead/idioms_prefetch.json");
				}
			} else if (req.query.queryType == "remote") {
				if (!req.query.query) {
					logger.error("Missing required parameter 'query' in case of queryType = remote");
					return res.sendStatus(400);
				}

				if (req.query.sourceType == "quote") {
					output = require("../data/typeahead/quotes_remote.json");
				} else if (req.query.sourceType == "idiom") {
					output = require("../data/typeahead/idioms_remote.json");
				}

				output = filterTypeaheadData(output, req.query.query);
			}
			
			logger.debug("returning to client: array of size: " + output.length);
			return res.json(output);
		});

	return typeaheadRouter;
};

function filterTypeaheadData(data, query) {
	return data.filter(function(item) {
		return item.indexOf(query) !== -1;
	});
}

module.exports = routes;