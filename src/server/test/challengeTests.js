/**
	Test challenges and the business logic around challenges
**/

var dbInit = require("../db/dbInit");
var request = require("request");
var assert = require("chai").assert;
var config = require("../config");
var serverUtils = require("../serverUtils");
var logger = require("../logger");

describe("Challenges", function() {
	this.timeout(10000);

	describe("Getting Challenges", function() {
		//no parameters should default to a chunk being returned
		it("/api/challenges should return a max limit of challenges", function(done) {
			request.get(process.env.HOSTNAME + "/api/challenges", function(err, res, body) {
				if (err) {
					return done(err);
				}

				var body = JSON.parse(body);
				assert.equal(res.statusCode, 200);
				assert.isArray(body.list);
				assert.isAtMost(body.list.length, config.businessLogic.infiniteScrollChunkSize); //should only send in chunks
				assert.isTrue(serverUtils.validateData(body.list, serverUtils.prototypes.challenge)); //validate format
				return done();
			});
		});

		//limit parameter only takes effect if sortBy parameter is also set, otherwise it is ignored
		it("/api/challenges?limit=2 should return a max limit of challenges", function(done) {
			request.get(process.env.HOSTNAME + "/api/challenges?limit=2", function(err, res, body) {
				if (err) {
					return done(err);
				}

				var body = JSON.parse(body);
				assert.equal(res.statusCode, 200);
				assert.isArray(body.list);
				assert.isAtMost(body.list.length, config.businessLogic.infiniteScrollChunkSize); //should only send in chunks
				assert.isTrue(serverUtils.validateData(body.list, serverUtils.prototypes.challenge)); //validate format
				return done();
			});
		});

		//sortBy without limit should return 400
		it("/api/challenges?sortBy=popularity without limit parameter should return 400", function(done) {
			request.get(process.env.HOSTNAME + "/api/challenges?sortBy=popularity", function(err, res, body) {
				if (err) {
					return done(err);
				}

				assert.equal(res.statusCode, 400);
				return done();
			});
		});

		//sortBy with limit greater than config.businessLogic.maxCustomSortedLimit should return 400
		it("/api/challenges?sortBy=popularity with limit greater than config.businessLogic.maxCustomSortedLimit should return 400", function(done) {
			request.get(process.env.HOSTNAME + "/api/challenges?sortBy=popularity&limit=20", function(err, res, body) {
				if (err) {
					return done(err);
				}

				assert.equal(res.statusCode, 400);
				return done();
			});
		});

		//sortBy with limit less than or equal to config.businessLogic.maxCustomSortedLimit should return a valid chunk
		it("/api/challenges?sortBy=popularity with limit less than or equal to config.businessLogic.maxCustomSortedLimit should return a valid chunk", function(done) {
			request.get(process.env.HOSTNAME + "/api/challenges?sortBy=popularity&limit=2", function(err, res, body) {
				if (err) {
					return done(err);
				}

				var body = JSON.parse(body);
				assert.equal(res.statusCode, 200);
				assert.isArray(body);
				assert.isAtMost(body.length, 2); //should only send in 2 chunks max
				assert.isTrue(serverUtils.validateData(body, serverUtils.prototypes.challenge)); //validate format
				return done();
			});
		});
	});
	
	describe("Getting a specific challenge", function() {

		it("/api/challenges/:challengeId with a valid challenge should return the specific challenge details", function(done) {
			request.get(process.env.HOSTNAME + "/api/challenges/" + "HkQawQ4PW", function(err, res, body) {
				if (err) {
					return done(err);
				}

				var body = JSON.parse(body);
				assert.equal(res.statusCode, 200);
				assert.isTrue(serverUtils.validateData(body, serverUtils.prototypes.challenge)); //validate format
				assert.equal(body.type, "challenge");
				assert.equal(body.id, "HkQawQ4PW");
				assert.equal(body.imageType, "image/jpeg");
				assert.equal(body.image, "/contentImages/challenges/HkQawQ4PW.jpeg");
				assert.equal(body.postedDate, "1501996987212");
				assert.equal(body.caption, "My First Challenge Title");
				assert.equal(body.link, "/challenge/HkQawQ4PW");
				assert.equal(body.categoryID, "glamour");
				assert.equal(body.postedByUser.id, "GkQawQ3PW");
				return done();
			});
		});

		it("/api/challenges/:challengeId with an invalid challenge should return 500", function(done) {
			request.get(process.env.HOSTNAME + "/api/challenges/" + "GkQawQ4PW", function(err, res, body) {
				if (err) {
					return done(err);
				}

				assert.equal(res.statusCode, 500);
				return done();
			});
		});
	});
	
	describe("Deleting a specific challenge", function() {

		it("/api/challenges/:challengeId should return 401 for a valid challenge (since we are not logged in and user does not match)", function(done) {
			request.delete(process.env.HOSTNAME + "/api/challenges/" + "HkQawQ4PW", function(err, res, body) {
				if (err) {
					return done(err);
				}

				assert.equal(res.statusCode, 401);
				return done();
			});
		});

		it("/api/challenges/:challengeId should return 500 if the challenge is not valid", function(done) {
			request.delete(process.env.HOSTNAME + "/api/challenges/" + "GkQawQ4PW", function(err, res, body) {
				if (err) {
					return done(err);
				}

				assert.equal(res.statusCode, 500);
				return done();
			});
		});
	});

	describe("Getting the social info for a specific challenge", function() {

		it("/api/challenges/:challengeId/social with a valid challenge should return the social info", function(done) {
			request.get(process.env.HOSTNAME + "/api/challenges/" + "HkQawQ4PW" + "/social", function(err, res, body) {
				if (err) {
					return done(err);
				}

				var body = JSON.parse(body);
				assert.equal(res.statusCode, 200);
				assert.isTrue(serverUtils.validateData(body, serverUtils.prototypes.challengeSocialInfo)); //validate format
				return done();
			});
		});
	});
});


