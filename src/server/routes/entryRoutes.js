var express = require("express");
var async = require("async");
var dataUtils = require("../dataUtils");
var shortid = require("shortid");
var config = require("../config");
var filterUtils = require("../filterUtils");
var logger = require("../logger");
var mime = require("mime");
var fs = require("fs");
var imageProcessor = require("../imageProcessor");
var serverUtils = require("../serverUtils");
var dbEntry = require("../db/dbEntry");
var dbUtils = require("../db/dbUtils");

var routes = function() {

	var entryRouter = express.Router();

	entryRouter.route("/") // ROUTER for /api/entries

		.get(function(req, res){

			logger.debug("GET received on /api/entries, query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "challengeId",
					type: "id"
				},
				{
					name: "postedBy",
					type: "id"
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
				}
			];

			if (!serverUtils.validateQueryParams(req.query, validationParams)) {
				return res.sendStatus(400);
			}

			//if sortBy flag is present, then the limit flag must also be present
			//also, the max limit number is 10
			if (req.query.sortBy) {
				if (!req.query.limit || req.query.limit > config.businessLogic.maxCustomSortedLimit) {
					return res.sendStatus(400);
				}

				dbEntry.getEntriesSorted(req.query.sortBy, req.query.limit, req.query.postedBy, function(err, result) {
					if (err) {
						logger.error(err);
						return res.sendStatus(500);
					}

					if (!serverUtils.validateData(result, serverUtils.prototypes.entry)) {
	    				return res.sendStatus(500);
	    			}

	    			return res.json(result);
				});
			} else {
				var lastFetchedTimestamp = (req.query.ts) ? (req.query.ts) : 0;
				dbEntry.getEntries(req.query.postedBy, req.query.challengeId, lastFetchedTimestamp, function(err, result, newTimeStamp) {
					if (err) {
						logger.error(err);
						return res.sendStatus(500);
					}

					if (!serverUtils.validateData(result, serverUtils.prototypes.entry)) {
	    				return res.sendStatus(500);
	    			}

	    			var output = {ts: newTimeStamp, list: result};
	    			return res.json(output);
				});
			}

			
		})

		.post(function(req, res){

			/**
				POST a new entry node, and link it to the source (Challenge, Design, or IndependentImage)
			**/

			logger.debug("POST received on /api/entries, req.body: " + JSON.stringify(req.body));

			var validationParams = [
				{
					name: "sourceType",
					type: ["challengeId", "designId", "dataURI", "imageURL"],
					required: "yes"
				},
				{
					name: "caption",
					type: "string",
					required: "yes"
				},
				{
					name: "created",
					type: "timestamp",
					required: "yes"
				}
			];

			//build validation params based on sourceType
			if (req.body.sourceType == "challengeId" || req.body.sourceType == "designId") {
				validationParams.push({
					name: "sourceData",
					type: "id"
				});
			} else if (req.body.sourceType == "dataURI") {
				validationParams.push({
					name: "sourceData",
					type: "dataURI"
				});
			} else if (req.body.sourceType == "imageURL") {
				validationParams.push({
					name: "sourceData",
					type: "myURL"
				});
			}

			if (!serverUtils.validateQueryParams(req.body, validationParams) || !req.user) {
				return res.sendStatus(400);
			}
			
			var entryInfo = {
				id: shortid.generate(),
				created: req.body.created,
				title: req.body.caption,
				userId: req.user.id,
				sourceType: req.body.source,
				sourceData: req.body.sourceData
			};

			dbEntry.createEntry(entryInfo, function(err, result) {
				if(err) {
					logger.error(err);
					return res.sendStatus(500);
				}

				var output = {id: result.id};
				if (!serverUtils.validateData(output, serverUtils.prototypes.onlyId)) {
					return res.sendStatus(500);
				}

				res.header("Location", "/api/entries/" + result.id);
				return res.status(201).json(output);
			});
		});

	entryRouter.route("/:entryId")

		.get(function(req, res){

			logger.debug("GET received on /api/entries/" + req.params.entryId + ", query: " + JSON.stringify(req.query));

			var validationParams = [
				{
					name: "entryId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams)) {
				return res.sendStatus(400);
			}

			dbEntry.getEntry(req.params.entryId, function(err, output) {
				if (err) {
					logger.error(err);
					return res.sendStatus(500);
				}

				if (!serverUtils.validateData(output, serverUtils.prototypes.entry)) {
    				return res.sendStatus(500);
    			}

    			return res.json(output);
			});
		})

		.delete(function(req, res){
			
			/**
				DELETE will permantently delete the specified node.  Call with Caution!
				Deletes the comments linked to this Entry up to level 2 (we currently only support comments till level 2)
			**/

			logger.debug("DELETE received on /api/entries/" + req.params.entryId);

			var validationParams = [
				{
					name: "entryId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams)) {
				return res.sendStatus(400);
			}

			dbEntry.deleteEntry(req.params.entryId, function(err) {
    			if(err) {
    				logger.error(err);
    				return res.sendStatus(500);
    			}

    			return res.sendStatus(204);
			});
		});

	entryRouter.route("/:entryId/social") // /api/entries/:entryId/social

		.get(function(req, res) {
			
			logger.debug("GET received on /api/entries/" + req.params.entryId + "/social");

			var validationParams = [
				{
					name: "entryId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams)) {
				return res.sendStatus(400);
			}

			var meId = (req.user) ? (req.user.id) : (0);

			dbEntry.getEntrySocialInfo(req.params.entryId, meId, function(err, output) {
				if (err) {
					logger.error(err);
					return res.sendStatus(500);
				}

				if (!serverUtils.validateData(output, serverUtils.prototypes.entrySocialInfo)) {
    				return res.sendStatus(500);
    			}

    			return res.json(output);
			});

		});

	entryRouter.route("/:entryId/like") // /api/entries/:entryId/like

		.put(function(req, res) {
			
			logger.debug("PUT received on /api/entries/" + req.params.entryId + "/like");

			var validationParams = [
				{
					name: "likeAction",
					type: ["like", "unlike"],
					required: "yes"
				},
				{
					name: "created",
					type: "number",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.body, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			validationParams = [
				{
					name: "entryId",
					type: "id",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.params, validationParams) || !req.user) {
				return res.sendStatus(400);
			}

			dbEntry.likeEntry(req.params.entryId, req.body.likeAction == "like", req.user.id, req.body.created, function(err, likeResult) {
				if (err) {
					logger.error(err);
					return res.sendStatus(500);
				}

				var output = {likeStatus: (likeResult ? "on" : "off")};

				return res.json(output);
			});
		});

	return entryRouter;
};



module.exports = routes;