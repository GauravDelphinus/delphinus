var express = require("express");
var tmp = require("tmp");
var path = require("path");
var config = require("../config");
var logger = require("../logger");
var serverUtils = require("../serverUtils");
var mime = require("mime");
var async = require("async");
var dbUser = require("../db/dbUser");

var routes = function() {
	var userRouter = express.Router();

	userRouter.route("/") // Route for /api/users

		.get(function(req, res) {

			logger.debug("GET received on /api/users, query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "followedId",
					type: "id",
				},
				{
					name: "followingId",
					type: "id",
				},
				{
					name: "likedEntityId",
					type: "id",
				},
				{
					name: "ts", //last fetched timestamp
					type: "timestamp"
				},
				{
					name: "sortBy",
					type: ["popularity"]
				},
				{
					name: "limit",
					type: "number"
				},
				{
					name: "excludeMe",
					type: ["true", "false"]
				},
				{
					name: "key",
					type: "string"
				},
				{
					name: "signature",
					type: "string"
				},
				{
					name: "random",
					type: ["true"]
				},
				{
					name: "forChallenge",
					type: "id"
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			var meId = (req.user && req.query.excludeMe && (req.query.excludeMe == "true")) ? (req.user.id) : (0);

			// used only by content generator - private use only to get all local users
			if (req.query.random && req.query.random == "true") {

				//verify digital signature
				if (!req.query.key || !req.query.signature || !serverUtils.verifyDigitalSignature(req.query.key, req.query.signature)) {
					return res.sendStatus(401); //unauthorized
				}

				dbUser.getRandomUser(req.query.forChallenge, function(err, result) {
					if (err) {
						logger.error(err);
						return res.sendStatus(500);
					}

					if (!serverUtils.validateData(result, serverUtils.prototypes.user)) {
						return res.sendStatus(500);
					}

					return res.json(result);
				});
			} else if (req.query.sortBy) {
				//if sortBy flag is present, then the limit flag must also be present
				//also, the max limit number is 10
				if (!req.query.limit || req.query.limit > config.businessLogic.maxCustomSortedLimit) {
					return res.sendStatus(400);
				}

				dbUser.getUsersSorted(req.query.sortBy, req.query.limit, meId, function(err, result) {
					if (err) {
						logger.error(err);
						return res.sendStatus(500);
					}

					if (!serverUtils.validateData(result, serverUtils.prototypes.user)) {
	    				return res.sendStatus(500);
	    			}

	    			return res.json(result);
				});
			} else {
				var lastFetchedTimestamp = (req.query.ts) ? (req.query.ts) : 0;
				dbUser.getUsers(meId, req.query.followedId, req.query.followingId, req.query.likedEntityId, lastFetchedTimestamp, function(err, result, newTimeStamp) {
					if (err) {
						logger.error(err);
						return res.sendStatus(500);
					}

					if (!serverUtils.validateData(result, serverUtils.prototypes.user)) {
	    				return res.sendStatus(500);
	    			}

	    			var output = {ts: newTimeStamp, list: result};
	    			return res.json(output);
				});
			}
		});


	userRouter.route("/:userId") // /api/users/<id>
		.get(function(req, res) {

			logger.debug("GET received on /api/users/" + req.params.userId + ", query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "userId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams)) {
				return res.sendStatus(400);
			}

			dbUser.getUser(req.params.userId, function(err, userInfo) {
				if (err) {
					logger.error(err);
					return res.sendStatus(500);
				}

				if (!serverUtils.validateData(userInfo, serverUtils.prototypes.user)) {
					return res.sendStatus(500);
				}

				return res.json(userInfo);
			});

		})

		.patch(function(req, res) {
            
            logger.debug("PATCH received on /api/users/" + req.params.userId + ", req.body: " + serverUtils.makePrintFriendly(req.body));

			var validationParams = [
				{
					name: "imageData",
					type: "imageData"
				},
				{
					name: "displayName",
					type: "string"
				}
			];

			//check for private data
			if (!req.user && req.body.user) {
				// verify the digital signature to make sure this is coming from the content generator
				if (req.body.key && req.body.signature) {
					if (serverUtils.verifyDigitalSignature(req.body.key, req.body.signature)) {
						req.user = req.body.user;
					}
				}
			}

			if (!serverUtils.validateQueryParams(req.body, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			if (req.user.id != req.params.userId) {
				//forbidden.  We only allow the current logged-in user to update his info
				logger.warn("Forbidden. Request to update user '" + req.params.userId + "' received from a different user: '" + req.user.id + "'");
				return res.sendStatus(403);
			}

			var findUserQuery = {userID: req.params.userId};
			dbUser.findUser(findUserQuery, function(err, user) {
				if (err) {
					//user not found
					logger.warn("Trying to update a user '" + req.params.userId + "' that doesn't exist. " + err);
					return res.sendStatus(404);
				}

				async.waterfall([
				    function(callback) {
				    	if (req.body.imageData) {
				    		var parseDataURI = require("parse-data-uri");
							var parsed = parseDataURI(req.body.imageData);
				        
							var buffer = parsed.data;
							var targetImagePath = global.appRoot + config.path.userImages + req.params.userId + "." + mime.extension(parsed.mimeType);

							var fs = require('fs');

							fs.writeFile(targetImagePath, buffer, function(err) {
								if (err) {
									logger.error("Failed to write file: " + targetImagePath);
									callback(new Error("Failed to write file: " + targetImagePath), null);
								}
								
								user.image = config.url.userImages + req.params.userId + "." + mime.extension(parsed.mimeType);

								callback(null, user);
							});
				    	} else {
				    		callback(null, user);
				    	}
				    },
				    function(user, callback) {
				        if (req.body.displayName) {
				        	user.displayName = req.body.displayName;
				        }
				        callback(null, user);
				    }
				], function (err, user) {
					if (err) {
						logger.error("Some error encountered: " + err);
						res.sendStatus(500);
					}

				    updateUserInDB(res, user, function(err) {
						if (err) {
							logger.error("Failed to save user in DB: " + err);
							return res.sendStatus(500);
						}

						return res.status(200).json({image: user.image, displayName: user.displayName});
					});
				});
			});
		});

	userRouter.route("/:userId/social") // /api/users/<id>/social
		.get(function(req, res) {

			logger.debug("GET received on /api/users/" + req.params.userId + "/social, query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "userId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams)) {
				return res.sendStatus(400);
			}

			var meId = (req.user) ? (req.user.id) : (0);

			dbUser.getUserSocialInfo(req.params.userId, meId, function(err, output) {
				if (err) {
					logger.error(err);
					return res.sendStatus(500);
				}

				if (!serverUtils.validateData(output, serverUtils.prototypes.userSocialInfo)) {
					return res.sendStatus(500);
				}

				return res.json(output);
			});

		});

	userRouter.route("/:followedId/follow") //api/users/follow

		.put(function(req, res) {

			logger.debug("PUT received on /api/users/" + req.params.followedId + "/follow, body: " + JSON.stringify(req.body));

			var validationParams = [
				{
					name: "followAction",
					type: ["follow", "unfollow"],
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.body, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			validationParams = [
				{
					name: "followedId",
					required: "yes",
					type: "id"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams)) {
				return res.sendStatus(400);
			}

      		dbUser.followUser(req.user.id, req.params.followedId, req.body.followAction == "follow", function(err, followResult) {
				if (err) {
					logger.error(err);
					return res.sendStatus(500);
				}

				var output = {followStatus: (followResult ? "on" : "off")};
				return res.json(output);
			});
		});


	return userRouter;
};

function updateUserInDB(res, user, next) {
	dbUser.saveUser(user, function(err) {
		next(err);
	});
}

module.exports = routes;