var express = require("express");
var config = require("../config");
var dynamicConfig = require("../config/dynamicConfig");
var serverUtils = require("../serverUtils");
var logger = require("../logger");
var passport = require("passport");

var routes = function(db) {
	var socialRouter = express.Router();

	socialRouter.route("/")
		.post(function(req, res) {
			logger.debug("POST received on /api/social, body: " + JSON.stringify(req.body));

			var validationParams = [
				{
					name: "message",
					required: "yes",
					type: "string"
				},
				{
					name: "link",
					type: "myURL",
					required: "yes"
				},
				{
					name: "target",
					required: "yes",
					type: ["facebook", "twitter"]
				}
			];

			if (!serverUtils.validateQueryParams(req.body, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			if (req.body.target == "facebook") {
				var facebook = require('../services/facebook')();
				facebook.postUpdate(req.body.message, dynamicConfig.hostname + req.body.link, req.user.facebook.token, function(error, data) {
					if (error) {
						logger.error("Error posting to facebook, error: " + error);
						res.sendStatus(500);
		        	} else {
		        		res.status(201).json({id: data.id});
		        	}
				});
			} else if (req.body.target == "twitter") {
				var twitter = require('../services/twitter')();
		        twitter.postUpdate(req.body.message, req.user.twitter.token, req.user.twitter.tokenSecret, function (error, data) {
		        	if (error) {
		        		res.sendStatus(500);
		        	} else {
		        		res.status(201).json({id: data.id});
		        	}
		        });
			}
		})

		.get(function(req, res) {
			logger.debug("GET received on /api/social, query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "target",
					required: "yes",
					type: ["facebook", "twitter"]
				},
				{
					name: "attribute",
					type: ["permissions"]
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			//send one of three possible permissions to the client:
			//offline - meaning the user is not signed in
			//read - meaning the user has read access to Facebook (can only sign-in and read)
			//publish - meaning the user has write/publish access to Facebook (can share)
			var jsonObj = {};
			if (req.query.target == "facebook") {
				if (req.query.attribute == "permissions") {
					if (req.user && req.user.facebook && req.user.facebook.token) {
						
						//already logged in - check for permissions
						var facebook = require('../services/facebook')(dynamicConfig.facebookClientId, dynamicConfig.facebookClientSecret);
                		facebook.getPermissions(req.user.facebook.token, function (error, permissions) {
                			if (error) {
                				jsonObj.permissions = "offline"; //must be offline
                				return res.json(jsonObj);
                			}

                			jsonObj.permissions = "read";
                			for (var i = 0; i < permissions.length; i++) {
                				if (permissions[i].permission == "publish_actions" && permissions[i].status == "granted") {
                					jsonObj.permissions = "publish"; //have publish permissions
                					break;
                				}
                			}

                			return res.json(jsonObj);
                		});
					} else {
						jsonObj.permissions = "offline"; //must be offline
						return res.json(jsonObj);
					}
				}
			}
			
		});

	return socialRouter;
};

module.exports = routes;