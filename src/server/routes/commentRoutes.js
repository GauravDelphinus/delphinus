var express = require("express");
var async = require("async");
var shortid = require("shortid");
var config = require("../config");
var logger = require("../logger");
var serverUtils = require("../serverUtils");
var dbUtils = require("../db/dbUtils");
var dbComment = require("../db/dbComment");

var routes = function() {

	var commentRouter = express.Router();

	commentRouter.route("/") // ROUTER for /api/comments

		.get(function(req, res){

			logger.debug("GET received on /api/comments, req.query = " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "entityId",
					type: "id"
				},
				{
					name: "user",
					type: "id"
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			dbComment.getComments(req.query.user, req.query.entityId, function(err, result) {
				if (err) {
					logger.error(err);
					return res.sendStatus(500);
				}

				if (!serverUtils.validateData(result, serverUtils.prototypes.comment)) {
    				return res.sendStatus(500);
    			}

    			return res.json(result);
			});
		})

		.post(function(req, res){

			/**
				POST a new comment node
			**/

			logger.debug("POST received on /api/comments, req.body = " + JSON.stringify(req.body));

			var validationParams = [
				{
					name: "entityId", //base entity id (challenge, entry, etc.)
					type: "id"
				},
				{
					name: "parentId", //parent comment (in case of reply), or the entity Id
					type: "id"
				},
				{
					name: "created",
					type: "timestamp"
				},
				{
					name: "text",
					type: "string"
				}
			];

			if (!serverUtils.validateQueryParams(req.body, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			var commentInfo = {
				id: shortid.generate(),
				parentId: req.body.parentId,
				created: req.body.created,
				text: req.body.text,
				userId: req.user.id			
			};

			if (req.body.entityId) {
				commentInfo.entityId = req.body.entityId;
			}

			dbComment.createComment(commentInfo, function(err, result) {
				if(err) {
					logger.error(err);
					return res.sendStatus(500);
				}

				if (!serverUtils.validateData(result, serverUtils.prototypes.onlyId)) {
					return res.sendStatus(500);
				}

				res.header("Location", "/api/comments/" + result.id);
				return res.status(201).json(result);
			});
		});

	commentRouter.route("/:commentId")

		.get(function(req, res){

			logger.debug("GET received on /api/comments/" + req.params.commentId + ", req.query = " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "commentId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams)) {
				return res.sendStatus(400);
			}

			dbComment.getComment(req.params.commentId, function(err, result) {
				if (err) {
					logger.error(err);
					return res.sendStatus(500);
				}

				if (!serverUtils.validateData(result, serverUtils.prototypes.comment)) {
    				return res.sendStatus(500);
    			}

    			return res.json(result);
			});
		})
		.delete(function(req, res){
			
			/**
				DELETE will permantently delete the specified comment, along with all child comments.  Call with Caution!
			**/

			logger.debug("DELETE received on /api/comments/" + req.params.commentId);

			var validationParams = [
				{
					name: "commentId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			dbComment.deleteComment(req.params.commentId, function(err) {
    			if(err) {
    				logger.error(err);
    				return res.sendStatus(500);
    			}

    			return res.sendStatus(204);
			});
		});

	commentRouter.route("/:commentId/social") // /api/comments/:commentId/social

		.get(function(req, res) { //get current social info

			logger.debug("GET received on /api/comments/" + req.params.commentId + "/like, query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "commentId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams)) {
				return res.sendStatus(400);
			}

			var meId = (req.user) ? (req.user.id) : (0);

			dbComment.getCommentSocialInfo(req.params.commentId, meId, function(err, output) {
				if (err) {
					logger.error(err);
					return res.sendStatus(500);
				}

				if (!serverUtils.validateData(output, serverUtils.prototypes.commentSocialInfo)) {
    				return res.sendStatus(500);
    			}

    			return res.json(output);
			});
		});

	commentRouter.route("/:commentId/like") // /api/comments/:commentId/like

		.put(function(req, res) {

			logger.debug("PUT received on /api/comments/" + req.params.commentId + "/like, req.body = " + JSON.stringify(req.body));

			var validationParams = [
				{
					name: "likeAction",
					type: ["like", "unlike"],
					required: "yes"
				},
				{
					name: "created",
					type: "timestamp",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.body, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			validationParams = [
				{
					name: "commentId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams)) {
				return res.sendStatus(400);
			}

			dbComment.likeComment(req.params.commentId, req.body.likeAction == "like", req.user.id, req.body.created, function(err, likeResult) {
				if (err) {
					logger.error(err);
					return res.sendStatus(500);
				}

				var output = {likeStatus: (likeResult ? "on" : "off")};

				return res.json(output);
			});
		});


	return commentRouter;
};

module.exports = routes;