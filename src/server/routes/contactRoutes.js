var express = require("express");
var logger = require("../logger");
var serverUtils = require("../serverUtils");

var routes = function() {
	var contactRouter = express.Router();

	contactRouter.route("/")
		.post(function(req, res) {
			logger.debug("POST received on /api/contact, body: " + JSON.stringify(req.body));

			var validationParams = [
				{
					name: "name",
					required: "yes",
					type: "string"
				},
				{
					name: "email",
					type: "email",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.body, validationParams)) {
				return res.sendStatus(400);
			}

			//TODO add code for sending email
			return res.sendStatus(200);
		})

	return contactRouter;
};

module.exports = routes;