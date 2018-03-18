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
	
	
	/*
	//call before running any tests in this block
	before(function(done) {
		//initialize DB
		var testData = require("./testData");
		dataUtils.initializeDBWithData(testData, function(err) {
			if (err) {
				//DB couldn't be initialized.
				done(err);
			}
			done();
		});
    });

	//call after running all tests in this block
    after(function(done) {
    	//potentially, remove the db stuff that was added
    	done();
    });



	describe("Challenge Routes", function() {		
		describe("GET /api/challenges?sortBy=dateCreated", function() {
			it("should return list of all challenges sorted by dateCreated", function(done) {
				chai.request(server)
				.get("/api/challenges?sortBy=dateCreated")
				.end(function(err, res) {
					assert.equal(res.status, 200);
					assert.isArray(res.body);
					assert.isAtLeast(res.body.length, 3);
					done();
				});
			});
		});

		describe("GET /api/challenges?sortBy=popularity", function() {
			it("should return list of all challenges sorted by popularity", function(done) {
				chai.request(server)
				.get("/api/challenges?sortBy=popularity")
				.end(function(err, res) {
					assert.equal(res.status, 200);
					assert.isArray(res.body);
					assert.isAtLeast(res.body.length, 3);
					done();
				});
			});
		});

		describe("GET /api/challenges", function() {
			it("should return status 400 because of missing required query parameter: sortBy", function(done) {
				chai.request(server)
				.get("/api/challenges")
				.end(function(err, res) {
					assert.equal(res.status, 400);
					assert.isObject(res.body); //object contains the 400 status message - see http://expressjs.com/en/api.html#res.sendStatus
					done();
				});
			});
		});

		describe("GET /api/challenges/:challengeId", function() {
			it("should return the specific challenge details", function(done) {
				chai.request(server)
				.get("/api/challenges/HkQawQ4PW")
				.end(function(err, res) {
					assert.equal(res.status, 200);
					assert.isObject(res.body);
					assert.equal(res.body.type, "challenge");
					assert.equal(res.body.caption, "My First Challenge Title");
					done();
				});
			});
		});
	});

	describe("Entry Routes", function() {		
		describe("GET /api/entries?sortBy=dateCreated", function() {
			it("should return list of all entries sorted by dateCreated", function(done) {
				chai.request(server)
				.get("/api/entries?sortBy=dateCreated")
				.end(function(err, res) {
					assert.equal(res.status, 200);
					assert.isArray(res.body);
					assert.isAtLeast(res.body.length, 4);
					done();
				});
			});
		});

		describe("GET /api/entries?sortBy=popularity", function() {
			it("should return list of all entries sorted by popularity", function(done) {
				chai.request(server)
				.get("/api/entries?sortBy=popularity")
				.end(function(err, res) {
					assert.equal(res.status, 200);
					assert.isArray(res.body);
					assert.isAtLeast(res.body.length, 4);
					done();
				});
			});
		});

		describe("GET /api/entries", function() {
			it("should return status 400 because of missing required query parameter: sortBy", function(done) {
				chai.request(server)
				.get("/api/entries")
				.end(function(err, res) {
					assert.equal(res.status, 400);
					assert.isObject(res.body); //object contains the 400 status message - see http://expressjs.com/en/api.html#res.sendStatus
					done();
				});
			});
		});

		describe("GET /api/entries/:entryId", function() {
			it("should return the specific entry details", function(done) {
				chai.request(server)
				.get("/api/entries/NkQbwW4PK")
				.end(function(err, res) {
					assert.equal(res.status, 200);
					assert.isObject(res.body);
					assert.equal(res.body.type, "entry");
					assert.equal(res.body.caption, "My Fourth Entry Caption");
					done();
				});
			});
		});
	});
	*/
});


